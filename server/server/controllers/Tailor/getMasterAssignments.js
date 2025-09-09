// controllers/masterController.js
import mongoose from "mongoose";
import RollAssignment from "../../models/rollAssignment.js";
import ClothAmount from "../../models/clothAmount.js";
import User from "../../models/user.js";

/* small helper */
const isValidObjectId = (id) => {
  if (!id) return false;
  try {
    return mongoose.Types.ObjectId.isValid(String(id));
  } catch (e) {
    return false;
  }
};

/**
 * GET /tailors/master/assignments
 * Returns:
 *  - assignments: array of roll assignments (populated)
 *  - masterTotals: array of { clothAmountId, totalAssigned, available, fabricType, itemType, unit }
 *
 * The frontend expects clothConsumptions to include numeric approvedAmount, allocated and remaining fields.
 */
/**
 * GET /tailors/master/assignments?masterTailorId=<optional>
 *
 * If masterTailorId is provided, results are scoped to that tailor's assignments.
 * Otherwise, returns global results (all assignments).
 */
export const getMasterAssignments = async (req, res) => {
  try {
    const { masterTailorId } = req.query;

    // Build assignment match filter
    let assignmentMatch = {};

    // Helper: strict master-role test (case-insensitive)
    const isMasterRole = (user) => {
      if (!user) return false;
      const r = (user.role || "").toString().trim();
      return r.toLowerCase() === "mastertailor" || r === "MasterTailor";
    };

    if (masterTailorId) {
      if (!isValidObjectId(masterTailorId)) {
        return res.status(400).json({ success: false, message: 'masterTailorId is not a valid id' });
      }
      // Ensure the user exists and is a MasterTailor
      const user = await User.findById(masterTailorId).lean();
      if (!user) {
        return res.status(404).json({ success: false, message: 'Master tailor not found' });
      }
      if (!isMasterRole(user)) {
        return res.status(403).json({ success: false, message: 'User is not a MasterTailor' });
      }
      assignmentMatch.tailorId = new mongoose.Types.ObjectId(String(masterTailorId));
    } else {
      // No specific master ID — find all users with role === 'MasterTailor'
      const masters = await User.find({ role: "MasterTailor" }).select("_id").lean();
      if (!masters || masters.length === 0) {
        // no master tailors — return empty shaped response
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

    // Fetch assignments (populated) for frontend use
    const assignments = await RollAssignment.find(assignmentMatch)
      .populate("tailorId", "username firstName lastName name phone role")
      .populate("requestedBy", "username")
      .populate("approvedBy", "username")
      .populate("clothConsumptions.clothAmountId", "fabricType itemType unit amount serialNumber")
      .sort({ createdAt: -1 })
      .lean();

    // Normalize per-consumption numeric fields for frontend safety
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

    // Aggregation pipeline grouping by normalized fabric/item/unit
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
          _assignedAmount: { $ifNull: ["$clothConsumptions.amount", 0] },
          _clothAmountId: "$clothConsumptions.clothAmountId"
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
          totalAssigned: { $sum: "$_assignedAmount" },
          rows: { $sum: 1 },
          clothAmountIds: { $addToSet: { $cond: [{ $ifNull: ["$_clothAmountId", false] }, "$_clothAmountId", null] } }
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
          }
        }
      },

      {
        $lookup: {
          from: "clothamounts",
          let: { ids: "$clothAmountIds" },
          pipeline: [
            { $match: { $expr: { $in: ["$_id", { $ifNull: ["$$ids", []] }] } } },
            { $group: { _id: null, totalAvailable: { $sum: { $ifNull: ["$amount", 0] } } } }
          ],
          as: "availAgg"
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
          available: { $ifNull: [{ $arrayElemAt: ["$availAgg.totalAvailable", 0] }, null] }
        }
      },

      { $sort: { totalAssigned: -1 } }
    ];

    const grouped = await RollAssignment.aggregate(pipeline);

    const masterTotals = grouped.map((g) => ({
      fabricType: g.fabricType || null,
      itemType: g.itemType || null,
      unit: g.unit || null,
      totalAssigned: Number(g.totalAssigned || 0),
      rows: Number(g.rows || 0),
      clothAmountIds: (g.clothAmountIds || []).map((id) => String(id)),
      available: typeof g.available === "number" ? g.available : null,
    }));

    // summary metrics for UI
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
    console.error("getMasterAssignments (grouped, master role check) error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, message: "Server error fetching master assignments" });
  }
};




/**
 * POST /tailors/master/allocate
 * Payload expected (example):
 * {
 *   parentAssignmentId?: String,        // optional - when allocating from a specific parent assignment consumption
 *   parentConsumptionId?: String,      // optional
 *   targetTailorId: String,            // required
 *   amount: Number,                    // required
 *   unitType: String,                  // optional (default 'meters')
 *   fabricType?: String,
 *   itemType?: String,
 *   note?: String
 * }
 *
 * Behaviour:
 *  - find clothAmountId when parentConsumptionId provided; else attempt best-effort match using fabricType+itemType.
 *  - deduct cloth amount from ClothAmount.amount (transaction if possible).
 *  - create a RollAssignment (status: 'allocated'/'approved') pointing to targetTailorId and containing the consumption row.
 *  - return allocation doc + updatedClothAmounts (for frontend to refresh rolls).
 */
export const masterAllocate = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { parentAssignmentId, parentConsumptionId, targetTailorId, amount, unitType = "meters", fabricType, itemType, note } = req.body;

    if (!targetTailorId || !isValidObjectId(targetTailorId)) {
      return res.status(400).json({ success: false, message: "targetTailorId is required and must be a valid id" });
    }
    const amt = Number(amount);
    if (!isFinite(amt) || amt <= 0) {
      return res.status(400).json({ success: false, message: "amount must be a positive number" });
    }

    // Find clothAmountId:
    let clothAmountId = null;
    if (parentAssignmentId && parentConsumptionId) {
      // try to resolve from the parent assignment's consumption
      if (!isValidObjectId(parentAssignmentId) || !isValidObjectId(parentConsumptionId)) {
        return res.status(400).json({ success: false, message: "parent ids must be valid" });
      }
      const parent = await RollAssignment.findById(parentAssignmentId).lean();
      const consumption = (parent?.clothConsumptions || []).find((c) => String(c._id) === String(parentConsumptionId));
      clothAmountId = consumption?.clothAmountId ?? null;
    }

    // If still not found, try to match a ClothAmount by fabricType + itemType with sufficient available amount
    if (!clothAmountId) {
      if (!fabricType && !itemType) {
        return res.status(400).json({ success: false, message: "Either parentConsumptionId or fabricType/itemType is required to resolve clothAmount" });
      }
      // best-effort: find first cloth that matches fabricType/itemType with amount >= requested
      const query = {};
      if (fabricType) query.$or = [{ fabricType }, { fabric: fabricType }, { fabric_type: fabricType }];
      if (itemType) {
        query.$or = query.$or ? [...query.$or, { itemType }, { item: itemType }, { item_type: itemType }] : [{ itemType }, { item: itemType }, { item_type: itemType }];
      }
      // prefer those with sufficient amount, fallback to any
      let found = await ClothAmount.findOne({ ...query, amount: { $gte: amt } }).lean();
      if (!found) found = await ClothAmount.findOne(query).lean();
      if (!found) {
        return res.status(404).json({ success: false, message: "No matching cloth amount found for allocation" });
      }
      clothAmountId = String(found._id);
    }

    // start transaction
    try {
      await session.startTransaction();

      // lock and validate clothAmount
      const cloth = await ClothAmount.findOne({ _id: clothAmountId }).session(session);
      if (!cloth) {
        await session.abortTransaction();
        return res.status(404).json({ success: false, message: "ClothAmount not found" });
      }
      const available = typeof cloth.amount === "number" ? cloth.amount : 0;
      if (amt > available) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: `Not enough cloth available. Requested ${amt}, available ${available}` });
      }

      cloth.amount = available - amt;
      if (cloth.amount < 0) cloth.amount = 0;
      await cloth.save({ session });

      // build allocation (a RollAssignment entry)
      const allocation = {
        tailorId: targetTailorId,
        assignedDate: new Date(),
        clothConsumptions: [
          {
            clothAmountId,
            fabricType: fabricType ?? cloth.fabricType ?? cloth.fabric,
            itemType: itemType ?? cloth.itemType ?? cloth.item,
            unitType: unitType ?? cloth.unit ?? "meters",
            amount: amt,
            approvedAmount: amt,
            note: note ?? undefined,
            parentAssignmentId: parentAssignmentId ?? undefined,
            parentConsumptionId: parentConsumptionId ?? undefined,
          },
        ],
        status: "allocated",
        requestedBy: req.user?._id || null,
        approvedBy: req.user?._id || null,
        approvedAt: new Date(),
      };

      const createdArr = await RollAssignment.create([allocation], { session });
      const created = createdArr[0];

      await session.commitTransaction();

      // populate created allocation for response
      const populated = await RollAssignment.findById(created._id)
        .populate("tailorId", "username firstName lastName name phone")
        .populate("clothConsumptions.clothAmountId", "fabricType itemType unit amount serialNumber")
        .lean();

      // return updated cloth amounts for frontend to refresh rolls list
      const updatedClothAmounts = await ClothAmount.find({ _id: clothAmountId }).lean();

      return res.status(201).json({
        success: true,
        message: "Allocation created",
        allocation: populated,
        updatedClothAmounts,
      });
    } catch (txErr) {
      console.error("masterAllocate transaction failed, attempting fallback:", txErr && txErr.stack ? txErr.stack : txErr);
      try {
        await session.abortTransaction();
      } catch (ab) {
        console.error("abortTransaction error:", ab && ab.stack ? ab.stack : ab);
      }
      // fallback non-transactional optimistic update
      const updated = await ClothAmount.findOneAndUpdate(
        { _id: clothAmountId, amount: { $gte: amt } },
        { $inc: { amount: -amt } },
        { new: true }
      ).lean();
      if (!updated) {
        return res.status(400).json({ success: false, message: "Insufficient amount for allocation (fallback)" });
      }
      const created = await RollAssignment.create({
        tailorId: targetTailorId,
        assignedDate: new Date(),
        clothConsumptions: [
          {
            clothAmountId,
            fabricType: fabricType ?? updated.fabricType ?? updated.fabric,
            itemType: itemType ?? updated.itemType ?? updated.item,
            unitType: unitType ?? updated.unit ?? "meters",
            amount: amt,
            approvedAmount: amt,
            note: note ?? undefined,
            parentAssignmentId: parentAssignmentId ?? undefined,
            parentConsumptionId: parentConsumptionId ?? undefined,
          },
        ],
        status: "allocated",
        requestedBy: req.user?._id || null,
        approvedBy: req.user?._id || null,
        approvedAt: new Date(),
      });
      const populated = await RollAssignment.findById(created._id)
        .populate("tailorId", "username firstName lastName name phone")
        .populate("clothConsumptions.clothAmountId", "fabricType itemType unit amount serialNumber")
        .lean();
      return res.status(201).json({
        success: true,
        message: "Allocation created (fallback)",
        allocation: populated,
        updatedClothAmounts: [updated],
      });
    }
  } catch (err) {
    console.error("masterAllocate outer error:", err && err.stack ? err.stack : err);
    const isDev = process.env.NODE_ENV !== "production";
    return res.status(500).json({
      success: false,
      message: isDev ? (err && err.stack ? err.stack : String(err)) : "Internal server error",
    });
  } finally {
    try {
      await session.endSession();
    } catch (e) {
      console.error("endSession failed:", e && e.stack ? e.stack : e);
    }
  }
};
