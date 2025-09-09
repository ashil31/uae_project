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
export const getMasterAssignments = async (req, res) => {
  try {
    // Fetch all master assignments (adjust filter if you want only status:'approved' or a date range)
    const assignments = await RollAssignment.find({})
      .populate("tailorId", "username firstName lastName name phone")
      .populate("requestedBy", "username")
      .populate("approvedBy", "username")
      .populate("clothConsumptions.clothAmountId", "fabricType itemType unit amount serialNumber")
      .sort({ createdAt: -1 })
      .lean();

    // Normalize per-consumption numeric fields for frontend safety
    const normalized = (assignments || []).map((a) => ({
      ...a,
      clothConsumptions: (a.clothConsumptions || []).map((c) => {
        const approvedAmount = Number(c.approvedAmount ?? c.amount ?? 0);
        const allocated = Number(c.allocated ?? c.allocation ?? 0); // in case some docs store allocated differently
        const remaining = Math.max(0, approvedAmount - allocated);
        return {
          ...c,
          approvedAmount,
          allocated,
          remaining,
        };
      }),
    }));

    // Compute masterTotals: aggregate sums per clothAmountId
    // Compute masterTotals: aggregate sums per clothAmountId but also capture consumption-level fields
    const agg = await RollAssignment.aggregate([
      { $unwind: "$clothConsumptions" },
      {
        $group: {
          _id: "$clothConsumptions.clothAmountId",
          totalAssigned: { $sum: "$clothConsumptions.amount" },
          // take the first non-null values from the consumption rows (if available)
          fabricTypeFromConsumption: { $first: "$clothConsumptions.fabricType" },
          itemTypeFromConsumption: { $first: "$clothConsumptions.itemType" },
          unitTypeFromConsumption: { $first: "$clothConsumptions.unitType" },
        },
      },
      // (optional) remove groups where _id is null if any stray rows exist
      { $match: { _id: { $ne: null } } },
      // lookup the ClothAmount doc for availability and canonical fields
      {
        $lookup: {
          from: "clothamounts",              // collection name - ensure this matches your actual collection name
          localField: "_id",
          foreignField: "_id",
          as: "clothDocs",
        },
      },
      { $unwind: { path: "$clothDocs", preserveNullAndEmptyArrays: true } },
      // project the shape we want
      {
        $project: {
          _id: 1,
          totalAssigned: 1,
          fabricTypeFromConsumption: 1,
          itemTypeFromConsumption: 1,
          unitTypeFromConsumption: 1,
          clothDoc: "$clothDocs",
        },
      },
    ]);

    console.log("Aggregation result:", agg);

    // Map to masterTotals using consumption fields first, falling back to clothDoc fields
    const masterTotals = agg.map((a) => {
      const id = String(a._id);
      const doc = a.clothDoc ?? null;
      // prefer consumption-level fields when present; fallback to clothDoc fields
      const fabricType = a.fabricTypeFromConsumption ?? doc?.fabricType ?? doc?.fabric ?? doc?.fabric_type ?? null;
      const itemType = a.itemTypeFromConsumption ?? doc?.itemType ?? doc?.item ?? doc?.item_type ?? null;
      const unit = a.unitTypeFromConsumption ?? doc?.unit ?? doc?.unitType ?? null;
      const available = doc && typeof doc.amount === "number" ? doc.amount : null;

      return {
        clothAmountId: id,
        totalAssigned: Number(a.totalAssigned || 0),
        available,
        fabricType,
        itemType,
        unit,
        clothDoc: doc,
      };
    });


    console.log(masterTotals);

    return res.json({
      success: true,
      assignments: normalized,
      masterTotals,
    });
  } catch (err) {
    console.error("getMasterAssignments error:", err && err.stack ? err.stack : err);
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
