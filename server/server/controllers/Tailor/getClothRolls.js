// controllers/getClothRolls.js
import mongoose from "mongoose";
import ClothRoll from "../../models/clothRoll.js";
import ClothAmount from "../../models/clothAmount.js";
import RollAssignment from "../../models/rollAssignment.js";

const norm = (v) => (v === undefined || v === null ? "" : String(v).toLowerCase().trim());

/**
 * getClothRolls
 * Response: { success: true, data: [...], overall: { breakdownByFabricItem: [...] } }
 *
 * available is computed as totalClothAmount - totalAssignedToTailors
 * using RollAssignment.clothConsumptions (preferred clothAmountId when present).
 */
const getClothRolls = async (req, res) => {
  try {
    const matchStage = {};
    if (req.user && req.user._id && process.env.ENABLE_USER_SCOPE === "true") {
      matchStage.createdBy = mongoose.Types.ObjectId(req.user._id);
    }

    //
    // 1) grouped pipeline for docs that HAVE clothAmountId (existing behaviour)
    //
    const groupedPipeline = [
      { $match: matchStage },
      { $match: { clothAmountId: { $ne: null } } },
      {
        $group: {
          _id: "$clothAmountId",
          totalAssignedRolls: {
            $sum: {
              $cond: [
                { $ifNull: ["$amount", false] },
                "$amount",
                { $cond: [{ $ifNull: ["$quantity", false] }, "$quantity", 1] }
              ]
            }
          },
          rollCount: { $sum: 1 },
          sampleRolls: {
            $push: {
              _id: "$_id",
              rollNo: "$rollNo",
              amount: "$amount",
              fabricType: "$fabricType",
              itemType: "$itemType",
              unitType: "$unitType",
              status: "$status"
            }
          }
        }
      },
      {
        $lookup: {
          from: ClothAmount.collection.name,
          localField: "_id",
          foreignField: "_id",
          as: "clothAmountDoc"
        }
      },
      { $unwind: { path: "$clothAmountDoc", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          clothAmountId: "$_id",
          totalAssignedRolls: 1,
          rollCount: 1,
          clothAmount: {
            _id: "$clothAmountDoc._id",
            fabricType: "$clothAmountDoc.fabricType",
            itemType: "$clothAmountDoc.itemType",
            unitType: "$clothAmountDoc.unitType",
            amount: "$clothAmountDoc.amount"
          },
          sampleRolls: { $slice: ["$sampleRolls", 5] }
        }
      },
      { $sort: { "clothAmount._id": -1 } }
    ];

    const grouped = await ClothRoll.aggregate(groupedPipeline);
    const groupedFormatted = (grouped || []).map((g) => ({
      type: "group",
      clothAmountId: g.clothAmountId ? String(g.clothAmountId) : null,
      clothAmount: g.clothAmount || null,
      totalAssignedRolls: Number(g.totalAssignedRolls || 0),
      rollCount: Number(g.rollCount || 0),
      sampleRolls: g.sampleRolls || []
    }));

    //
    // 2) standalone rolls that DON'T have clothAmountId
    //
    const unknownMatch = { ...matchStage, $or: [{ clothAmountId: { $exists: false } }, { clothAmountId: null }] };
    const unknownRolls = await ClothRoll.find(unknownMatch).lean();
    const unknownFormatted = (unknownRolls || []).map((r) => ({
      type: "roll",
      rollId: String(r._id),
      clothAmountId: null,
      clothAmount: null,
      totalAssignedRolls: r.amount != null ? Number(r.amount) : 0,
      rollCount: 1,
      sampleRolls: [{
        _id: String(r._id),
        rollNo: r.rollNo,
        amount: r.amount,
        fabricType: r.fabricType,
        itemType: r.itemType,
        unitType: r.unitType,
        status: r.status
      }]
    }));

    // merged data
    const data = [...groupedFormatted, ...unknownFormatted];

    //
    // 3) compute totals from ClothAmount collection grouped by fabric + item + unit
    //
    const clothAmountTotalsRaw = await ClothAmount.aggregate([
      {
        $group: {
          _id: {
            fabricType: "$fabricType",
            itemType: "$itemType",
            unitType: "$unitType"
          },
          totalClothAmount: { $sum: "$amount" },
          sampleIds: { $push: "$_id" }
        }
      }
    ]);

    const clothAmountTotalsMap = {};
    (clothAmountTotalsRaw || []).forEach((t) => {
      const fabric = norm(t._id?.fabricType);
      const item = norm(t._id?.itemType);
      const unit = norm(t._id?.unitType) || "";
      const key = `${fabric}||${item}||${unit}`;
      clothAmountTotalsMap[key] = {
        totalClothAmount: Number(t.totalClothAmount || 0),
        clothAmountId: (Array.isArray(t.sampleIds) && t.sampleIds.length > 0) ? String(t.sampleIds[0]) : null
      };
    });

    //
    // 4) aggregate RollAssignment : two aggregations
    //    A) by clothAmountId when present (preferred)
    //    B) by fabric|item|unit when clothAmountId is not present
    //
    // A) by clothAmountId
    const assignmentByClothAmountRaw = await RollAssignment.aggregate([
      { $unwind: "$clothConsumptions" },
      { $match: { "clothConsumptions.clothAmountId": { $ne: null } } },
      {
        $group: {
          _id: "$clothConsumptions.clothAmountId",
          totalAssignedToTailors: { $sum: { $ifNull: ["$clothConsumptions.amount", 0] } }
        }
      }
    ]);
    const assignmentByClothAmountMap = {};
    (assignmentByClothAmountRaw || []).forEach((t) => {
      const id = t._id ? String(t._id) : null;
      if (id) assignmentByClothAmountMap[id] = Number(t.totalAssignedToTailors || 0);
    });

    // B) by fabric|item|unit for clothConsumptions without clothAmountId
    const assignmentByFiRaw = await RollAssignment.aggregate([
      { $unwind: "$clothConsumptions" },
      { $match: { $or: [{ "clothConsumptions.clothAmountId": { $exists: false } }, { "clothConsumptions.clothAmountId": null }] } },
      {
        $group: {
          _id: {
            fabricType: "$clothConsumptions.fabricType",
            itemType: "$clothConsumptions.itemType",
            unitType: "$clothConsumptions.unitType"
          },
          totalAssignedToTailors: { $sum: { $ifNull: ["$clothConsumptions.amount", 0] } }
        }
      }
    ]);
    const assignmentByFiMap = {};
    (assignmentByFiRaw || []).forEach((t) => {
      const fabric = norm(t._id?.fabricType);
      const item = norm(t._id?.itemType);
      const unit = norm(t._id?.unitType) || "";
      const key = `${fabric}||${item}||${unit}`;
      assignmentByFiMap[key] = Number(t.totalAssignedToTailors || 0);
    });

    //
    // 5) Build breakdown map and merge totals + assignments
    //
    const breakdownMap = {};

    // initialize from clothAmountTotalsMap so totals are present even if no rolls exist
    Object.entries(clothAmountTotalsMap).forEach(([key, v]) => {
      const [fabricRaw, itemRaw, unitRaw] = key.split("||").map(s => s ?? "");
      breakdownMap[key] = {
        fabric: fabricRaw || "",
        item: itemRaw || "",
        unit: unitRaw || "",
        clothAmountId: v.clothAmountId || null,
        totalClothAmount: Number(v.totalClothAmount || 0),
        totalAssignedRolls: 0,
        totalAssignedToTailors: 0,
        available: null
      };
    });

    // add roll-based totals (grouped & unknown)
    data.forEach((entry) => {
      const sample = (entry.sampleRolls && entry.sampleRolls[0]) || {};
      const fabric = norm(entry.clothAmount?.fabricType ?? sample.fabricType ?? "");
      const item = norm(entry.clothAmount?.itemType ?? sample.itemType ?? "");
      const unit = norm(entry.clothAmount?.unitType ?? sample.unitType ?? "");
      const key = `${fabric}||${item}||${unit}`;
      if (!breakdownMap[key]) {
        breakdownMap[key] = { fabric, item, unit, clothAmountId: null, totalClothAmount: null, totalAssignedRolls: 0, totalAssignedToTailors: 0, available: null };
      }
      breakdownMap[key].totalAssignedRolls = (breakdownMap[key].totalAssignedRolls || 0) + Number(entry.totalAssignedRolls || 0);

      if (entry.clothAmountId) breakdownMap[key].clothAmountId = breakdownMap[key].clothAmountId || String(entry.clothAmountId);
    });

    // merge assignment totals and compute available
    Object.entries(breakdownMap).forEach(([key, val]) => {
      // assigned to tailors: prefer mapping by clothAmountId
      let assignedToTailors = 0;
      if (val.clothAmountId && assignmentByClothAmountMap[String(val.clothAmountId)] !== undefined) {
        assignedToTailors = assignmentByClothAmountMap[String(val.clothAmountId)];
      } else if (assignmentByFiMap[key] !== undefined) {
        assignedToTailors = assignmentByFiMap[key];
      } else {
        assignedToTailors = 0;
      }
      val.totalAssignedToTailors = Number(assignedToTailors || 0);

      // ensure totalClothAmount exists where possible (came from clothAmountTotalsMap)
      if (clothAmountTotalsMap[key]) {
        val.totalClothAmount = clothAmountTotalsMap[key].totalClothAmount;
      } else {
        // no clothAmount doc found for this fabric/item/unit; leave null
        val.totalClothAmount = val.totalClothAmount ?? null;
      }

      // available = totalClothAmount - totalAssignedToTailors when totalClothAmount exists
      if (typeof val.totalClothAmount === "number" && !isNaN(val.totalClothAmount)) {
        val.available = Math.max(0, Number(val.totalClothAmount || 0) - Number(val.totalAssignedToTailors || 0));
      } else {
        // fallback: no clothAmount doc -> set available to 0 (can't infer stock)
        val.available = 0;
      }
    });

    // convert to array for frontend
    const breakdownByFabricItem = Object.entries(breakdownMap).map(([compositeKey, val]) => {
      const [fabricRaw, itemRaw, unitRaw] = compositeKey.split("||").map(s => s ?? "");
      return {
        key: compositeKey,
        clothAmountId: val.clothAmountId || null,
        fabric: fabricRaw || "",
        item: itemRaw || "",
        unit: unitRaw || "",
        totalAssignedRolls: Number(val.totalAssignedRolls || 0),
        totalAssignedToTailors: Number(val.totalAssignedToTailors || 0),
        totalClothAmount: typeof val.totalClothAmount === "number" ? val.totalClothAmount : null,
        available: typeof val.available === "number" ? val.available : 0
      };
    });

    // sort for stable display
    breakdownByFabricItem.sort((a, b) => {
      const fa = (a.fabric || "").localeCompare(b.fabric || "");
      if (fa !== 0) return fa;
      return (a.item || "").localeCompare(b.item || "");
    });

    // Final response
    return res.status(200).json({
      success: true,
      data,
      overall: {
        totalAssigned: 0,
        totalClothAmount: 0,
        totalAvailable: 0,
        breakdownByFabricItem
      }
    });
  } catch (err) {
    console.error("Error in getClothRolls:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
  }
};

export default getClothRolls;
