// controllers/Tailor/masterAllocateToTailor.js
import mongoose from "mongoose";
import RollAssignment from "../../models/rollAssignment.js";
import MasterClothAmount from "../../models/masterClothAmount.js";

const isValidObjectIdLocal = (id) => {
  if (!id) return false;
  try {
    return mongoose.Types.ObjectId.isValid(String(id));
  } catch (e) {
    return false;
  }
};

const populateAssignmentById = (id) =>
  RollAssignment.findById(id)
    .populate("tailorId", "username firstName lastName name phone role")
    .populate("requestedBy", "username")
    .populate("approvedBy", "username")
    .populate("clothConsumptions.clothAmountId", "fabricType itemType unit amount serialNumber")
    .populate("clothConsumptions.masterClothAmountId", "masterTailorId fabricType itemType unitType amount clothAmountRef")
    .lean();

export const masterAllocateToTailor = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    if (!req.user || !req.user._id) return res.status(401).json({ success: false, message: "Unauthorized" });
    const caller = req.user;
    if (String(caller.role ?? "").toLowerCase() !== "mastertailor")
      return res.status(403).json({ success: false, message: "Only MasterTailor can allocate to tailors" });

    // Accept either:
    // - parentAssignmentId + parentConsumptionId + targetTailorId + amount
    // OR
    // - masterClothAmountId + targetTailorId + amount
    const {
      parentAssignmentId,
      parentConsumptionId,
      masterClothAmountId,
      targetTailorId,
      amount,
      unitType
    } = req.body;

    if (!targetTailorId || !amount) return res.status(400).json({ success: false, message: "targetTailorId and amount are required" });

    const amt = Number(amount);
    if (!isFinite(amt) || amt <= 0) return res.status(400).json({ success: false, message: "amount must be a positive number" });

    // validate ids
    if (!isValidObjectIdLocal(targetTailorId)) return res.status(400).json({ success: false, message: "Invalid targetTailorId" });

    const usingParent = parentAssignmentId && parentConsumptionId;
    const usingMasterPool = masterClothAmountId && isValidObjectIdLocal(masterClothAmountId);

    if (!usingParent && !usingMasterPool) {
      return res.status(400).json({ success: false, message: "Either parentAssignmentId+parentConsumptionId OR masterClothAmountId must be provided" });
    }

    // If using parent, load parent assignment and verify the parent consumption exists and has enough amount
    let parent = null;
    let parentConsumption = null;
    let keyFabric = "", keyItem = "", keyUnit = unitType ?? "meters";

    if (usingParent) {
      if (!isValidObjectIdLocal(parentAssignmentId) || !isValidObjectIdLocal(parentConsumptionId))
        return res.status(400).json({ success: false, message: "Invalid parent ids" });

      parent = await RollAssignment.findById(parentAssignmentId).lean();
      if (!parent) return res.status(404).json({ success: false, message: "Parent assignment not found" });

      parentConsumption = (parent.clothConsumptions || []).find((c) => String(c._id) === String(parentConsumptionId));
      if (!parentConsumption) return res.status(404).json({ success: false, message: "Parent consumption row not found" });

      const availableInParent = Number(parentConsumption.amount ?? 0);
      if (amt > availableInParent) return res.status(400).json({ success: false, message: `Requested amount (${amt}) exceeds parent's available (${availableInParent}).` });

      keyFabric = (parentConsumption.fabricType ?? "").toString().trim().toLowerCase();
      keyItem = (parentConsumption.itemType ?? "").toString().trim().toLowerCase();
      keyUnit = (unitType ?? parentConsumption.unitType ?? "meters").toString().trim().toLowerCase();
    }

    // If using master pool (direct), load master doc and verify caller is owner
    let masterDoc = null;
    try {
      await session.startTransaction();

      if (usingParent) {
        // decrement parent consumption subdoc (atomic)
        const parentUpdateRes = await RollAssignment.updateOne(
          { _id: parentAssignmentId, "clothConsumptions._id": parentConsumptionId, "clothConsumptions.amount": { $gte: amt } },
          { $inc: { "clothConsumptions.$.amount": -amt } },
          { session }
        );
        if (!parentUpdateRes.matchedCount || parentUpdateRes.modifiedCount === 0) {
          await session.abortTransaction();
          return res.status(400).json({ success: false, message: "Requested amount exceeds parent's available (concurrent update or mismatch)" });
        }
      }

      if (usingMasterPool) {
        masterDoc = await MasterClothAmount.findById(masterClothAmountId).session(session);
        if (!masterDoc) {
          await session.abortTransaction();
          return res.status(404).json({ success: false, message: "Master pool not found" });
        }
        // ensure that caller is the owner of this master pool
        if (!masterDoc.masterTailorId || String(masterDoc.masterTailorId) !== String(caller._id)) {
          await session.abortTransaction();
          return res.status(403).json({ success: false, message: "You are not owner of this master pool" });
        }
      } else {
        // using parent: find master pool referenced by parent consumption, prefer that; else try to find by fabric/item/unit for caller
        if (parentConsumption.masterClothAmountId && isValidObjectIdLocal(parentConsumption.masterClothAmountId)) {
          masterDoc = await MasterClothAmount.findById(parentConsumption.masterClothAmountId).session(session);
        } else {
          masterDoc = await MasterClothAmount.findOne({
            masterTailorId: new mongoose.Types.ObjectId(String(caller._id)),
            fabricType: keyFabric,
            itemType: keyItem,
            unitType: keyUnit
          }).session(session);
        }
        if (!masterDoc) {
          await session.abortTransaction();
          return res.status(404).json({ success: false, message: "Master pool not found for this fabric/item/unit" });
        }
      }

      const masterAvailable = typeof masterDoc.amount === "number" ? masterDoc.amount : 0;
      if (amt > masterAvailable) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: `Not enough master stock. Requested ${amt}, available ${masterAvailable}` });
      }

      // decrement master pool
      masterDoc.amount = masterAvailable - amt;
      if (masterDoc.amount < 0) masterDoc.amount = 0;
      await masterDoc.save({ session });

      // create child assignment referencing masterClothAmountId
      const childConsumption = {
        masterClothAmountId: masterDoc._id,
        rollId: (parentConsumption && parentConsumption.rollId) ? parentConsumption.rollId : undefined,
        fabricType: (parentConsumption ? parentConsumption.fabricType : undefined) ?? undefined,
        itemType: (parentConsumption ? parentConsumption.itemType : undefined) ?? undefined,
        unitType: unitType ?? (parentConsumption ? parentConsumption.unitType : "meters"),
        amount: amt,
        approvedAmount: amt,
        parentAssignmentId: usingParent ? parentAssignmentId : undefined,
        parentConsumptionId: usingParent ? parentConsumptionId : undefined,
      };

      const assignmentData = {
        tailorId: new mongoose.Types.ObjectId(String(targetTailorId)),
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

      const populatedChild = await populateAssignmentById(created._id);
      const populatedParent = usingParent ? await populateAssignmentById(parentAssignmentId) : null;
      const updatedMaster = await MasterClothAmount.findById(masterDoc._id).lean();

      return res.status(201).json({
        success: true,
        message: "Allocated to tailor and master stock deducted",
        allocation: populatedChild,
        parentAssignment: populatedParent,
        updatedMasterStock: updatedMaster,
      });
    } catch (txErr) {
      console.error("masterAllocateToTailor transaction failed, falling back:", txErr && txErr.stack ? txErr.stack : txErr);
      try { await session.abortTransaction(); } catch (e) {}
      // Fallback non-transactional behavior kept minimal:
      if (usingParent) {
        // attempt fallback decrement parent
        const updateResult = await RollAssignment.updateOne(
          { _id: parentAssignmentId, "clothConsumptions._id": parentConsumptionId, "clothConsumptions.amount": { $gte: amt } },
          { $inc: { "clothConsumptions.$.amount": -amt } }
        );
        if (!updateResult.matchedCount || updateResult.modifiedCount === 0) {
          return res.status(400).json({ success: false, message: "Requested amount exceeds parent's available (fallback)" });
        }
      }

      // Resolve master doc for fallback
      let masterUpdated = null;
      if (usingMasterPool) {
        masterUpdated = await MasterClothAmount.findOneAndUpdate(
          { _id: masterClothAmountId, amount: { $gte: amt } },
          { $inc: { amount: -amt } },
          { new: true }
        ).lean();
      } else {
        masterUpdated = await MasterClothAmount.findOneAndUpdate(
          {
            masterTailorId: new mongoose.Types.ObjectId(String(caller._id)),
            fabricType: keyFabric,
            itemType: keyItem,
            unitType: keyUnit,
            amount: { $gte: amt },
          },
          { $inc: { amount: -amt } },
          { new: true }
        ).lean();
      }

      if (!masterUpdated) {
        return res.status(400).json({ success: false, message: "Insufficient master stock (fallback). Parent decrement already applied." });
      }

      const created = await RollAssignment.create({
        tailorId: new mongoose.Types.ObjectId(String(targetTailorId)),
        assignedDate: new Date(),
        clothConsumptions: [
          {
            masterClothAmountId: masterUpdated._id,
            rollId: (parentConsumption && parentConsumption.rollId) ? parentConsumption.rollId : undefined,
            fabricType: (parentConsumption ? parentConsumption.fabricType : undefined) ?? undefined,
            itemType: (parentConsumption ? parentConsumption.itemType : undefined) ?? undefined,
            unitType: unitType ?? (parentConsumption ? parentConsumption.unitType : "meters"),
            amount: amt,
            approvedAmount: amt,
            parentAssignmentId: usingParent ? parentAssignmentId : undefined,
            parentConsumptionId: usingParent ? parentConsumptionId : undefined,
          },
        ],
        status: "allocated",
        requestedBy: caller._id || null,
        approvedBy: caller._id || null,
        approvedAt: new Date(),
      });

      const populatedChild = await populateAssignmentById(created._id);
      const populatedParent = usingParent ? await populateAssignmentById(parentAssignmentId) : null;

      return res.status(201).json({
        success: true,
        message: "Allocated to tailor (fallback) and master stock deducted",
        allocation: populatedChild,
        parentAssignment: populatedParent,
        updatedMasterStock: masterUpdated,
      });
    }
  } catch (err) {
    console.error("masterAllocateToTailor outer error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, message: "Internal server error", error: String(err) });
  } finally {
    try { await session.endSession(); } catch (e) {}
  }
};

export default masterAllocateToTailor;
