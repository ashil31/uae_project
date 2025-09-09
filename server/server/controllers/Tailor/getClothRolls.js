// controllers/getClothRolls.js
import mongoose from "mongoose";
import ClothRoll from "../../models/clothRoll.js";
import ClothAmount from "../../models/clothAmount.js";

/**
 * getClothRolls
 *
 * Returns a unified list of:
 *  - grouped results for clothAmountId (type: "group")
 *  - single roll entries for rolls missing clothAmountId (type: "roll")
 *
 * Response: { success: true, data: [...], overall: { totalAssigned, totalClothAmount, totalAvailable, breakdownByUnit, breakdownByFabric, breakdownByFabricItem } }
 */
const getClothRolls = async (req, res) => {
  try {
    const matchStage = {};
    // Scope to user if desired (set ENABLE_USER_SCOPE=true to enable)
    if (req.user && req.user._id && process.env.ENABLE_USER_SCOPE === "true") {
      matchStage.createdBy = mongoose.Types.ObjectId(req.user._id);
    }

    // Debug sample to inspect raw documents
    const sample = await ClothRoll.find(matchStage).limit(5).lean();
    console.log("sample ClothRoll docs:", sample);

    //
    // 1) grouped pipeline for documents that HAVE clothAmountId (non-null)
    //
    const groupedPipeline = [
      { $match: matchStage },
      { $match: { clothAmountId: { $ne: null } } },
      {
        $group: {
          _id: "$clothAmountId",
          totalAssigned: {
            $sum: {
              $cond: [
                { $ifNull: ["$amount", false] },
                "$amount",
                { $cond: [{ $ifNull: ["$quantity", false] }, "$quantity", 1] }
              ]
            }
          },
          rollCount: { $sum: 1 },
          sampleRolls: { $push: { _id: "$_id", rollNo: "$rollNo", amount: "$amount", fabricType: "$fabricType", itemType: "$itemType", unitType: "$unitType", status: "$status" } }
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
        $addFields: {
          clothAmount: "$clothAmountDoc",
          available: {
            $cond: [
              { $ifNull: ["$clothAmountDoc.amount", false] },
              { $subtract: ["$clothAmountDoc.amount", "$totalAssigned"] },
              null
            ]
          }
        }
      },
      {
        $project: {
          _id: 0,
          clothAmountId: "$_id",
          totalAssigned: 1,
          rollCount: 1,
          available: 1,
          clothAmount: {
            _id: "$clothAmount._id",
            fabricType: "$clothAmount.fabricType",
            itemType: "$clothAmount.itemType",
            unitType: "$clothAmount.unitType",
            amount: "$clothAmount.amount"
          },
          sampleRolls: { $slice: ["$sampleRolls", 5] }
        }
      },
      { $sort: { "clothAmount._id": -1 } }
    ];

    const grouped = await ClothRoll.aggregate(groupedPipeline);

    const groupedFormatted = (grouped || []).map((g) => ({
      type: "group",
      id: String(g.clothAmountId),
      clothAmountId: g.clothAmountId,
      clothAmount: g.clothAmount || null,
      totalAssigned: g.totalAssigned || 0,
      rollCount: g.rollCount || 0,
      available: (typeof g.available === "number" ? g.available : null),
      sampleRolls: g.sampleRolls || []
    }));

    //
    // 2) standalone rolls that DON'T have clothAmountId
    //
    const unknownMatch = { ...matchStage, $or: [{ clothAmountId: { $exists: false } }, { clothAmountId: null }] };
    const unknownRolls = await ClothRoll.find(unknownMatch).lean();

    const unknownFormatted = (unknownRolls || []).map((r) => ({
      type: "roll",
      id: String(r._id),
      rollId: String(r._id),
      clothAmountId: null,
      clothAmount: null,
      totalAssigned: r.amount != null ? Number(r.amount) : 1,
      rollCount: 1,
      available: null,
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

    // Merge grouped + unknown in a single array
    const data = [...groupedFormatted, ...unknownFormatted];

    // Compute overall totals AND breakdowns
    const overall = data.reduce(
      (acc, entry) => {
        const assigned = Number(entry.totalAssigned || 0);
        acc.totalAssigned += assigned;

        if (entry.clothAmount && typeof entry.clothAmount.amount === "number") {
          acc.totalClothAmount += Number(entry.clothAmount.amount);
        }

        if (typeof entry.available === "number") acc.totalAvailable += Number(entry.available);

        // derive representative values
        const samples = Array.isArray(entry.sampleRolls) && entry.sampleRolls.length ? entry.sampleRolls : [];
        const unit = (entry.clothAmount && entry.clothAmount.unitType) || (samples[0] && samples[0].unitType) || "Unknown";
        const fabric = (entry.clothAmount && entry.clothAmount.fabricType) || (samples[0] && samples[0].fabricType) || "Unknown";
        const item = (entry.clothAmount && entry.clothAmount.itemType) || (samples[0] && samples[0].itemType) || "Unknown";

        // breakdown by unit
        acc.breakdownByUnit[unit] = (acc.breakdownByUnit[unit] || 0) + assigned;

        // breakdown by fabric
        acc.breakdownByFabric[fabric] = (acc.breakdownByFabric[fabric] || 0) + assigned;

        // breakdown by fabric+item (server-side grouping for frontend)
        const fiKey = `${fabric}||${item}`;
        const existing = acc.breakdownByFabricItem[fiKey] || { fabric, item, totalAssigned: 0, available: null };
        existing.totalAssigned += assigned;

        // set/merge availability: prefer numeric available if present on entry
        if (existing.available === null && typeof entry.available === "number") {
          existing.available = entry.available;
        }
        acc.breakdownByFabricItem[fiKey] = existing;

        return acc;
      },
      {
        totalAssigned: 0,
        totalClothAmount: 0,
        totalAvailable: 0,
        breakdownByUnit: {},      // { meters: 123, kilos: 45, unit: 10 }
        breakdownByFabric: {},    // { cotton: 100, silk: 20, Unknown: 5 }
        breakdownByFabricItem: {} // { "cotton||shirt": { fabric, item, totalAssigned, available }, ... }
      }
    );

    // convert breakdownByFabricItem from keyed object to array for easier frontend consumption
    const breakdownByFabricItemArray = Object.entries(overall.breakdownByFabricItem).map(([key, val]) => ({
      key,
      fabric: val.fabric,
      item: val.item,
      totalAssigned: val.totalAssigned,
      available: val.available
    }));

    // Final response
    return res.status(200).json({
      success: true,
      data,
      overall: {
        totalAssigned: Number(overall.totalAssigned),
        totalClothAmount: Number(overall.totalClothAmount),
        totalAvailable: Number(overall.totalAvailable),
        breakdownByUnit: overall.breakdownByUnit,
        breakdownByFabric: overall.breakdownByFabric,
        breakdownByFabricItem: breakdownByFabricItemArray
      }
    });
  } catch (err) {
    console.error("Error in getClothRolls:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export default getClothRolls;
