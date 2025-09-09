// controllers/masterController.js
import mongoose from "mongoose";
import RollAssignment from "../../models/rollAssignment.js";
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
 * POST /tailors/master/allocate-to-tailor
 * Body:
 *  - parentAssignmentId: string (required)  <-- must be a MasterTailor assignment
 *  - parentConsumptionId: string (required)
 *  - targetTailorId: string (required)
 *  - amount: number (required)
 *  - unitType?: string (optional, default preserved from parent)
 *
 * Behaviour:
 *  - Only MasterTailor (req.user.role === 'MasterTailor') can call this.
 *  - Increments parent clothConsumptions.$.allocated by amount (so remaining = approvedAmount - allocated)
 *  - Creates a new RollAssignment for the target Tailor with a single consumption row referencing parentAssignmentId/parentConsumptionId
 *  - Returns { success, allocation, parentAssignment } populated
 */
export const masterAllocateToTailor = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    // enforce caller is MasterTailor
    const caller = req.user;
    if (!caller || String(caller.role || "").toLowerCase() !== "MasterTailor") {
      return res.status(403).json({ success: false, message: "Only MasterTailor can allocate to tailors" });
    }
    
    const { parentAssignmentId, parentConsumptionId, targetTailorId, amount, unitType } = req.body;
    console.log("masterAllocateToTailor called by", caller._id, "with", { parentAssignmentId, parentConsumptionId, targetTailorId, amount, unitType });
    if (!parentAssignmentId || !parentConsumptionId || !targetTailorId) {
      return res.status(400).json({ success: false, message: "parentAssignmentId, parentConsumptionId and targetTailorId are required" });
    }
    if (!isValidObjectId(parentAssignmentId) || !isValidObjectId(parentConsumptionId) || !isValidObjectId(targetTailorId)) {
      return res.status(400).json({ success: false, message: "Invalid id(s) provided" });
    }
    const amt = Number(amount);
    if (!isFinite(amt) || amt <= 0) {
      return res.status(400).json({ success: false, message: "amount must be a positive number" });
    }

    // load parent assignment
    const parent = await RollAssignment.findById(parentAssignmentId).lean();
    if (!parent) return res.status(404).json({ success: false, message: "Parent assignment not found" });

    // ensure parent tailor exists & is MasterTailor
    const parentTailorId = parent.tailorId;
    if (!parentTailorId) return res.status(400).json({ success: false, message: "Parent assignment has no tailorId" });

    const parentTailor = await User.findById(parentTailorId).lean();
    if (!parentTailor) return res.status(404).json({ success: false, message: "Parent tailor not found" });
    if (String((parentTailor.role || "").toLowerCase()) !== "mastertailor") {
      return res.status(403).json({ success: false, message: "Parent assignment does not belong to a MasterTailor" });
    }

    // find parent consumption
    const parentConsumption = (parent.clothConsumptions || []).find((c) => String(c._id) === String(parentConsumptionId));
    if (!parentConsumption) return res.status(404).json({ success: false, message: "Parent consumption row not found" });

    // compute current approved and allocated for safety checks
    const approvedAmount = Number(parentConsumption.approvedAmount ?? parentConsumption.amount ?? 0);
    const currentlyAllocated = Number(parentConsumption.allocated ?? 0);
    const remainingBefore = Math.max(0, approvedAmount - currentlyAllocated);

    if (amt > remainingBefore) {
      return res.status(400).json({
        success: false,
        message: `Requested amount (${amt}) exceeds parent's remaining (${remainingBefore}).`,
      });
    }

    // Begin transaction attempt
    try {
      await session.startTransaction();

      // increment parent allocated
      const updateRes = await RollAssignment.updateOne(
        { _id: parentAssignmentId, "clothConsumptions._id": parentConsumptionId },
        { $inc: { "clothConsumptions.$.allocated": amt } },
        { session }
      );

      if (!updateRes || updateRes.matchedCount === 0) {
        await session.abortTransaction();
        return res.status(500).json({ success: false, message: "Failed to update parent consumption (transaction)" });
      }

      // create child assignment for the target tailor
      // copy relevant fields from parentConsumption: fabricType, itemType, unitType (prefer parent's unit)
      const childConsumption = {
        clothAmountId: parentConsumption.clothAmountId ? parentConsumption.clothAmountId : undefined,
        rollId: parentConsumption.rollId ? parentConsumption.rollId : undefined,
        fabricType: parentConsumption.fabricType ?? undefined,
        itemType: parentConsumption.itemType ?? undefined,
        unitType: unitType ?? parentConsumption.unitType ?? "meters",
        amount: amt,
        approvedAmount: amt,
        parentAssignmentId: parentAssignmentId,
        parentConsumptionId: parentConsumptionId,
      };

      const assignmentData = {
        tailorId: targetTailorId,
        assignedDate: new Date(),
        clothConsumptions: [childConsumption],
        status: "allocated",
        requestedBy: caller._id || null,
        approvedBy: caller._id || null,
        approvedAt: new Date(),
      };

      const createdArr = await RollAssignment.create([assignmentData], { session });
      const created = createdArr[0];

      await session.commitTransaction();

      // populate created child and updated parent to return to client
      const populatedChild = await RollAssignment.findById(created._id)
        .populate("tailorId", "username firstName lastName name phone role")
        .populate("requestedBy", "username")
        .populate("approvedBy", "username")
        .populate("clothConsumptions.clothAmountId", "fabricType itemType unit amount serialNumber")
        .lean();

      const populatedParent = await RollAssignment.findById(parentAssignmentId)
        .populate("tailorId", "username firstName lastName name phone role")
        .populate("requestedBy", "username")
        .populate("approvedBy", "username")
        .populate("clothConsumptions.clothAmountId", "fabricType itemType unit amount serialNumber")
        .lean();

      return res.status(201).json({
        success: true,
        message: "Allocated to tailor and parent allocation updated",
        allocation: populatedChild,
        parentAssignment: populatedParent,
      });
    } catch (txErr) {
      // transaction failed — fallback to non-transactional flow
      console.error("masterAllocateToTailor transaction failed, falling back:", txErr && txErr.stack ? txErr.stack : txErr);
      try {
        await session.abortTransaction();
      } catch (abErr) {
        // ignore
      }

      // perform optimistic updates without transaction
      const parentUpdate = await RollAssignment.updateOne(
        { _id: parentAssignmentId, "clothConsumptions._id": parentConsumptionId },
        { $inc: { "clothConsumptions.$.allocated": amt } }
      );

      if (!parentUpdate || parentUpdate.matchedCount === 0) {
        return res.status(500).json({ success: false, message: "Failed to update parent consumption (fallback)" });
      }

      const created = await RollAssignment.create({
        tailorId: targetTailorId,
        assignedDate: new Date(),
        clothConsumptions: [
          {
            clothAmountId: parentConsumption.clothAmountId ? parentConsumption.clothAmountId : undefined,
            rollId: parentConsumption.rollId ? parentConsumption.rollId : undefined,
            fabricType: parentConsumption.fabricType ?? undefined,
            itemType: parentConsumption.itemType ?? undefined,
            unitType: unitType ?? parentConsumption.unitType ?? "meters",
            amount: amt,
            approvedAmount: amt,
            parentAssignmentId,
            parentConsumptionId,
          },
        ],
        status: "allocated",
        requestedBy: caller._id || null,
        approvedBy: caller._id || null,
        approvedAt: new Date(),
      });

      const populatedChild = await RollAssignment.findById(created._id)
        .populate("tailorId", "username firstName lastName name phone role")
        .populate("requestedBy", "username")
        .populate("approvedBy", "username")
        .populate("clothConsumptions.clothAmountId", "fabricType itemType unit amount serialNumber")
        .lean();

      const populatedParent = await RollAssignment.findById(parentAssignmentId)
        .populate("tailorId", "username firstName lastName name phone role")
        .populate("requestedBy", "username")
        .populate("approvedBy", "username")
        .populate("clothConsumptions.clothAmountId", "fabricType itemType unit amount serialNumber")
        .lean();

      return res.status(201).json({
        success: true,
        message: "Allocated to tailor and parent allocation updated (fallback)",
        allocation: populatedChild,
        parentAssignment: populatedParent,
      });
    }
  } catch (err) {
    console.error("masterAllocateToTailor error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, message: "Internal server error", error: String(err) });
  } finally {
    try { await session.endSession(); } catch (e) { /* ignore */ }
  }
};

/**
 * GET /tailors/master/assignments?masterTailorId=<optional>
 * - Returns assignments (populated) and grouped totals aggregated by fabric+item+unit,
 *   calculated purely from RollAssignment documents (no ClothAmount/ClothRoll read).
 * - If masterTailorId provided, scope only to that MasterTailor; otherwise returns global.
 */
export const getMasterAssignments = async (req, res) => {
  try {
    const { masterTailorId } = req.query;

    // build assignment filter: if supplied, restrict to that master tailor
    const assignmentMatch = {};
    if (masterTailorId) {
      if (!isValidObjectId(masterTailorId)) {
        return res.status(400).json({ success: false, message: "masterTailorId is not a valid id" });
      }
      assignmentMatch.tailorId = new mongoose.Types.ObjectId(String(masterTailorId));
    }

    // Fetch assignments (populated)
    const assignments = await RollAssignment.find(assignmentMatch)
      .populate("tailorId", "username firstName lastName name phone role")
      .populate("requestedBy", "username")
      .populate("approvedBy", "username")
      .populate("clothConsumptions.clothAmountId", "fabricType itemType unit amount serialNumber")
      .sort({ createdAt: -1 })
      .lean();

    // ensure clothConsumptions numeric fields are normalized
    const normalized = (assignments || []).map((a) => ({
      ...a,
      clothConsumptions: (a.clothConsumptions || []).map((c) => {
        const approvedAmount = Number(c.approvedAmount ?? c.amount ?? 0);
        const allocated = Number(c.allocated ?? 0);
        const remaining = Math.max(0, approvedAmount - allocated);
        return { ...c, approvedAmount, allocated, remaining };
      }),
    }));

    // Aggregate grouping purely on RollAssignment rows: fabric/item/unit keys and sum totals & distinct clothAmountIds
    const pipeline = [
      { $match: assignmentMatch },
      { $unwind: "$clothConsumptions" },

      // derive strings with preference to consumption fields, fallback to clothConsumptions.clothAmountId lookup fields (if populated)
      {
        $addFields: {
          _fabric: {
            $trim: {
              input: { $ifNull: ["$clothConsumptions.fabricType", ""] }
            }
          },
          _item: {
            $trim: {
              input: { $ifNull: ["$clothConsumptions.itemType", ""] }
            }
          },
          _unit: {
            $trim: {
              input: { $ifNull: ["$clothConsumptions.unitType", "meters"] }
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
            $filter: { input: "$clothAmountIds", as: "id", cond: { $ne: ["$$id", null] } }
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
          clothAmountIds: 1
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
    }));

    const totalAssignments = normalized.length;
    const totalConsumptionRows = normalized.reduce((acc, a) => acc + (a.clothConsumptions ? a.clothConsumptions.length : 0), 0);
    const totalAssignedAmount = normalized.reduce((acc, a) => acc + (a.clothConsumptions || []).reduce((s, c) => s + Number(c.approvedAmount ?? c.amount ?? 0), 0), 0);
    const distinctClothAmountCount = masterTotals.reduce((acc, m) => acc + (Array.isArray(m.clothAmountIds) ? m.clothAmountIds.length : 0), 0);

    return res.json({
      success: true,
      assignments: normalized,
      masterTotals,
      summary: {
        scopedToTailorId: masterTailorId ?? null,
        totalAssignments,
        totalConsumptionRows,
        totalAssignedAmount,
        distinctClothAmountCount
      },
    });
  } catch (err) {
    console.error("getMasterAssignments (no admin amounts) error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, message: "Server error fetching master assignments" });
  }
};
