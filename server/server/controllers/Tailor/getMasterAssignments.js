// server/controllers/masterController.js
import mongoose from "mongoose";
import RollAssignment from "../../models/rollAssignment.js";
import ClothAmount from "../../models/clothAmount.js";
import User from "../../models/user.js";
import MasterClothAmount from "../../models/masterClothAmount.js";

const isValidObjectId = (id) => {
  if (!id) return false;
  try {
    return mongoose.Types.ObjectId.isValid(String(id));
  } catch (e) {
    return false;
  }
};

export const getMasterAssignments = async (req, res) => {
  try {
    const { masterTailorId } = req.query;

    let assignmentMatch = {};

    const isMasterRole = (user) => {
      if (!user) return false;
      const r = (user.role || "").toString().trim();
      return r.toLowerCase() === "mastertailor" || r === "MasterTailor";
    };

    if (masterTailorId) {
      if (!isValidObjectId(masterTailorId)) {
        return res.status(400).json({ success: false, message: 'masterTailorId is not a valid id' });
      }
      const user = await User.findById(masterTailorId).lean();
      if (!user) {
        return res.status(404).json({ success: false, message: 'Master tailor not found' });
      }
      if (!isMasterRole(user)) {
        return res.status(403).json({ success: false, message: 'User is not a MasterTailor' });
      }
      assignmentMatch.tailorId = new mongoose.Types.ObjectId(String(masterTailorId));
    } else {
      const masters = await User.find({ role: "MasterTailor" }).select("_id").lean();
      if (!masters || masters.length === 0) {
        return res.json({
          success: true,
          assignments: [],
          masterTotals: [],
          summary: {
            scopedToTailorId: null,
            totalAssignments: 0,
            totalConsumptionRows: 0,
            totalAssignedAmount: 0,
            distinctClothAmounts: 0,
          },
          perClothCount: []
        });
      }
      assignmentMatch.tailorId = { $in: masters.map((m) => m._id) };
    }

    const assignments = await RollAssignment.find(assignmentMatch)
      .populate("tailorId", "username firstName lastName name phone role")
      .populate("requestedBy", "username")
      .populate("approvedBy", "username")
      .populate("clothConsumptions.clothAmountId", "fabricType itemType unit amount serialNumber")
      .populate("clothConsumptions.masterClothAmountId", "masterTailorId fabricType itemType unitType amount clothAmountRef")
      .sort({ createdAt: -1 })
      .lean();

    const normalizedAssignments = (assignments || []).map((a) => ({
      ...a,
      clothConsumptions: (a.clothConsumptions || []).map((c) => {
        const approvedAmount = Number(c.approvedAmount ?? c.amount ?? 0);
        const allocated = Number(c.allocated ?? c.allocation ?? 0);
        const remaining = Math.max(0, approvedAmount - allocated);
        return {
          ...c,
          approvedAmount,
          allocated,
          remaining,
        };
      }),
    }));

    // Aggregation grouping by fabric/item/unit as earlier but then attach MasterClothAmount doc info
    const pipeline = [
      { $match: assignmentMatch },
      { $unwind: "$clothConsumptions" },
      {
        $lookup: {
          from: "clothamounts",
          localField: "clothConsumptions.clothAmountId",
          foreignField: "_id",
          as: "consClothDoc"
        }
      },
      { $unwind: { path: "$consClothDoc", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          _fabric: {
            $trim: {
              input: {
                $ifNull: [
                  "$clothConsumptions.fabricType",
                  "$consClothDoc.fabricType",
                  "$consClothDoc.fabric",
                  ""
                ]
              }
            }
          },
          _item: {
            $trim: {
              input: {
                $ifNull: [
                  "$clothConsumptions.itemType",
                  "$consClothDoc.itemType",
                  "$consClothDoc.item",
                  ""
                ]
              }
            }
          },
          _unit: {
            $trim: {
              input: {
                $ifNull: [
                  "$clothConsumptions.unitType",
                  "$consClothDoc.unit",
                  "$consClothDoc.unitType",
                  "meters"
                ]
              }
            }
          },
          _approvedAmount: { $ifNull: ["$clothConsumptions.approvedAmount", "$clothConsumptions.amount", 0] },
          _allocated: { $ifNull: ["$clothConsumptions.allocated", 0] },
          _remaining: { $max: [{ $subtract: [{ $ifNull: ["$clothConsumptions.approvedAmount", "$clothConsumptions.amount", 0] }, { $ifNull: ["$clothConsumptions.allocated", 0] }] }, 0] },
          _clothAmountId: "$clothConsumptions.clothAmountId",
          _masterClothAmountId: "$clothConsumptions.masterClothAmountId"
        }
      },
      {
        $group: {
          _id: {
            fabricLower: { $toLower: { $ifNull: ["$_fabric", ""] } },
            itemLower: { $toLower: { $ifNull: ["$_item", ""] } },
            unitLower: { $toLower: { $ifNull: ["$_unit", "meters"] } }
          },
          fabricDisplay: { $first: "$_fabric" },
          itemDisplay: { $first: "$_item" },
          unitDisplay: { $first: "$_unit" },
          totalAssigned: { $sum: "$_approvedAmount" },
          totalRemaining: { $sum: "$_remaining" },
          rows: { $sum: 1 },
          clothAmountIds: { $addToSet: { $cond: [{ $ifNull: ["$_clothAmountId", false] }, "$_clothAmountId", null] } },
          masterClothAmountIds: { $addToSet: { $cond: [{ $ifNull: ["$_masterClothAmountId", false] }, "$_masterClothAmountId", null] } }
        }
      },
      {
        $addFields: {
          clothAmountIds: {
            $filter: {
              input: "$clothAmountIds",
              as: "id",
              cond: { $ne: ["$$id", null] }
            }
          },
          masterClothAmountIds: {
            $filter: {
              input: "$masterClothAmountIds",
              as: "id",
              cond: { $ne: ["$$id", null] }
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          key: "$_id",
          fabricType: "$fabricDisplay",
          itemType: "$itemDisplay",
          unit: "$unitDisplay",
          totalAssigned: 1,
          rows: 1,
          clothAmountIds: 1,
          masterClothAmountIds: 1,
          available: { $ifNull: ["$totalRemaining", 0] }
        }
      },
      { $sort: { totalAssigned: -1 } }
    ];

    const grouped = await RollAssignment.aggregate(pipeline);

    // Attach master pool doc info (if any)
    const masterTotals = [];
    for (const g of grouped) {
      let masterPool = null;
      if (Array.isArray(g.masterClothAmountIds) && g.masterClothAmountIds.length) {
        try {
          masterPool = await MasterClothAmount.findById(g.masterClothAmountIds[0]).lean();
        } catch (e) {
          masterPool = null;
        }
      } else {
        // fallback - attempt lookup by normalized keys
        const fabric = g.fabricType ? g.fabricType.toString().trim().toLowerCase() : "";
        const item = g.itemType ? g.itemType.toString().trim().toLowerCase() : "";
        const unit = g.unit ? g.unit.toString().trim().toLowerCase() : "meters";
        if (fabric || item) {
          masterPool = await MasterClothAmount.findOne({ fabricType: fabric, itemType: item, unitType: unit }).lean().catch(() => null);
        }
      }

      masterTotals.push({
        fabricType: g.fabricType || null,
        itemType: g.itemType || null,
        unit: g.unit || null,
        totalAssigned: Number(g.totalAssigned || 0),
        rows: Number(g.rows || 0),
        clothAmountIds: (g.clothAmountIds || []).map((id) => String(id)),
        masterClothAmountIds: (g.masterClothAmountIds || []).map((id) => String(id)),
        available: typeof g.available === "number" ? g.available : null,
        masterClothAmountId: masterPool ? String(masterPool._id) : null,
        masterBalance: masterPool ? (typeof masterPool.amount === "number" ? masterPool.amount : 0) : null,
      });
    }

    const totalAssignments = normalizedAssignments.length;
    const totalConsumptionRows = normalizedAssignments.reduce((acc, a) => acc + (a.clothConsumptions ? a.clothConsumptions.length : 0), 0);
    const totalAssignedAmount = normalizedAssignments.reduce((acc, a) => {
      const sumForAssignment = (a.clothConsumptions || []).reduce((s, c) => s + (Number(c.approvedAmount ?? c.amount ?? 0)), 0);
      return acc + sumForAssignment;
    }, 0);
    const distinctClothAmounts = masterTotals.reduce((acc, m) => acc + (Array.isArray(m.clothAmountIds) ? m.clothAmountIds.length : 0), 0);

    const perClothCount = masterTotals.map((m) => ({
      fabricType: m.fabricType,
      itemType: m.itemType,
      unit: m.unit,
      totalAssigned: m.totalAssigned,
      rows: m.rows,
      available: m.available,
      clothAmountIds: m.clothAmountIds,
      masterClothAmountId: m.masterClothAmountId,
      masterBalance: m.masterBalance,
    }));

    return res.json({
      success: true,
      assignments: normalizedAssignments,
      masterTotals,
      summary: {
        scopedToTailorId: masterTailorId ?? null,
        totalAssignments,
        totalConsumptionRows,
        totalAssignedAmount,
        distinctClothAmounts,
      },
      perClothCount,
    });
  } catch (err) {
    console.error("getMasterAssignments error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, message: "Server error fetching master assignments" });
  }
};
