// server/controllers/Tailor/assignClothRoll.js
import mongoose from 'mongoose';
import RollAssignment from '../../models/rollAssignment.js';
import ClothAmount from '../../models/clothAmount.js';
import ClothRoll from '../../models/clothRoll.js';
import User from '../../models/user.js';

const isValidObjectId = (id) => {
  if (!id) return false;
  try {
    return mongoose.Types.ObjectId.isValid(String(id));
  } catch (e) {
    return false;
  }
};

const populateAssignment = async (id) =>
  RollAssignment.findById(id)
    .populate('tailorId', 'username firstName lastName skillLevel')
    .populate('requestedBy', 'username')
    .populate('approvedBy', 'username')
    .populate('clothConsumptions.clothAmountId', 'fabricType itemType unit amount')
    .lean();

const computeMasterTotals = async (tailorId) => {
  try {
    if (!isValidObjectId(tailorId)) return [];
    const objId = new mongoose.Types.ObjectId(String(tailorId));

    const agg = await RollAssignment.aggregate([
      { $match: { tailorId: objId } },
      { $unwind: '$clothConsumptions' },
      {
        $group: {
          _id: '$clothConsumptions.clothAmountId',
          totalAssigned: { $sum: '$clothConsumptions.amount' },
        },
      },
    ]);

    if (!agg || !agg.length) return [];

    const ids = agg.map((a) => a._id).filter(Boolean);
    const clothDocs = ids.length ? await ClothAmount.find({ _id: { $in: ids } }).lean() : [];

    const clothMap = {};
    clothDocs.forEach((c) => { clothMap[String(c._id)] = c; });

    return agg.map((a) => {
      const id = String(a._id);
      const doc = clothMap[id] || null;
      return {
        clothAmountId: id,
        totalAssigned: a.totalAssigned || 0,
        available: doc ? (typeof doc.amount === 'number' ? doc.amount : 0) : null,
        fabricType: doc?.fabricType ?? null,
        itemType: doc?.itemType ?? null,
        unit: doc?.unit ?? null,
        clothDoc: doc ?? null,
      };
    });
  } catch (err) {
    console.error('computeMasterTotals failed:', err);
    return [];
  }
};

const assignClothRoll = async (req, res) => {
  const session = await mongoose.connection.startSession();
  try {
    const { tailorId, assignedDate, clothConsumptions } = req.body;

    // Basic validation
    if (!tailorId) return res.status(400).json({ message: 'tailorId is required' });
    if (!isValidObjectId(tailorId)) return res.status(400).json({ message: 'tailorId is not a valid id' });

    if (!Array.isArray(clothConsumptions) || clothConsumptions.length === 0) {
      return res.status(400).json({ message: 'clothConsumptions array is required' });
    }

    const tailor = await User.findById(tailorId).lean();
    if (!tailor) return res.status(404).json({ message: 'Tailor not found' });

    // Separate rows by type and validate per-row shape
    const totalsByClothAmount = {}; // clothAmountId -> total requested
    const totalsByRoll = {}; // rollId -> total requested
    const clothAmountIds = new Set();
    const rollIds = new Set();

    for (let i = 0; i < clothConsumptions.length; i++) {
      const c = clothConsumptions[i];
      if (!c || typeof c !== 'object') {
        return res.status(400).json({ message: `Row ${i + 1}: invalid consumption object` });
      }

      if (!c.unitType) return res.status(400).json({ message: `Row ${i + 1}: unitType is required` });

      const num = Number(c.amount);
      if (!isFinite(num) || num <= 0) {
        return res.status(400).json({ message: `Row ${i + 1}: amount must be a positive number` });
      }

      if (c.clothAmountId && c.rollId) {
        return res.status(400).json({ message: `Row ${i + 1}: provide either clothAmountId OR rollId, not both` });
      }

      if (c.clothAmountId) {
        if (!isValidObjectId(c.clothAmountId)) {
          return res.status(400).json({ message: `Row ${i + 1}: clothAmountId is not a valid id` });
        }
        const id = String(c.clothAmountId);
        totalsByClothAmount[id] = (totalsByClothAmount[id] || 0) + num;
        clothAmountIds.add(id);
      } else if (c.rollId) {
        if (!isValidObjectId(c.rollId)) {
          return res.status(400).json({ message: `Row ${i + 1}: rollId is not a valid id` });
        }
        const id = String(c.rollId);
        totalsByRoll[id] = (totalsByRoll[id] || 0) + num;
        rollIds.add(id);
      } else {
        return res.status(400).json({ message: `Row ${i + 1}: either clothAmountId or rollId is required` });
      }
    }

    // Prepare ObjectId arrays (use `new` to construct)
    const toObjectIds = (arr) => arr.map((x) => new mongoose.Types.ObjectId(String(x)));
    const clothAmountObjectIds = Array.from(clothAmountIds).length ? toObjectIds(Array.from(clothAmountIds)) : [];
    const rollObjectIds = Array.from(rollIds).length ? toObjectIds(Array.from(rollIds)) : [];

    // Start transactional attempt
    try {
      await session.startTransaction();

      // Load ClothAmount docs (for clothAmountId rows)
      const clothAmountDocs = clothAmountObjectIds.length
        ? await ClothAmount.find({ _id: { $in: clothAmountObjectIds } }).session(session)
        : [];

      const clothAmountMap = {};
      clothAmountDocs.forEach((d) => { clothAmountMap[String(d._id)] = d; });

      // Validate clothAmount totals
      for (const [id, reqTotal] of Object.entries(totalsByClothAmount)) {
        const doc = clothAmountMap[id];
        if (!doc) {
          await session.abortTransaction();
          return res.status(404).json({ message: `ClothAmount not found: ${id}` });
        }
        const avail = typeof doc.amount === 'number' ? doc.amount : 0;
        if (reqTotal > avail) {
          await session.abortTransaction();
          return res.status(400).json({ message: `Requested ${reqTotal} exceeds available ${avail} for ClothAmount ${id}` });
        }
      }

      // Load ClothRoll docs (for rollId rows)
      const rollDocs = rollObjectIds.length ? await ClothRoll.find({ _id: { $in: rollObjectIds } }).session(session) : [];
      const rollMap = {};
      rollDocs.forEach((r) => { rollMap[String(r._id)] = r; });

      // Collect clothAmountIds referenced by rolls so we can also deduct from corresponding ClothAmount
      const clothAmountsReferencedByRolls = new Set();

      for (const [id, reqTotal] of Object.entries(totalsByRoll)) {
        const rollDoc = rollMap[id];
        if (!rollDoc) {
          await session.abortTransaction();
          return res.status(404).json({ message: `ClothRoll not found: ${id}` });
        }
        const availRoll = typeof rollDoc.amount === 'number' ? rollDoc.amount : 0;
        if (reqTotal > availRoll) {
          await session.abortTransaction();
          return res.status(400).json({ message: `Requested ${reqTotal} exceeds available ${availRoll} for ClothRoll ${id}` });
        }
        if (rollDoc.clothAmountId) {
          clothAmountsReferencedByRolls.add(String(rollDoc.clothAmountId));
        }
      }

      // If any rolls reference clothAmountId, load those ClothAmount docs (if not already loaded)
      const referencedClothAmountIds = Array.from(clothAmountsReferencedByRolls).filter((id) => !clothAmountMap[id]);
      const referencedObjectIds = referencedClothAmountIds.length ? toObjectIds(referencedClothAmountIds) : [];
      if (referencedObjectIds.length) {
        const referencedDocs = await ClothAmount.find({ _id: { $in: referencedObjectIds } }).session(session);
        referencedDocs.forEach((d) => { clothAmountMap[String(d._id)] = d; });
      }

      // Now validate that clothAmounts referenced by rolls have enough aggregate amount
      for (const [rollId, reqTotal] of Object.entries(totalsByRoll)) {
        const rollDoc = rollMap[rollId];
        if (!rollDoc) continue;
        if (rollDoc.clothAmountId) {
          const caId = String(rollDoc.clothAmountId);
          const caDoc = clothAmountMap[caId];
          if (!caDoc) {
            await session.abortTransaction();
            return res.status(404).json({ message: `ClothAmount referenced by roll ${rollId} not found: ${caId}` });
          }
          const rollContribution = reqTotal;
          const previouslyRequestedForClothAmount = totalsByClothAmount[caId] || 0;
          const totalRequestedAgainstClothAmount = previouslyRequestedForClothAmount + rollContribution;
          const availCA = typeof caDoc.amount === 'number' ? caDoc.amount : 0;
          if (totalRequestedAgainstClothAmount > availCA) {
            await session.abortTransaction();
            return res.status(400).json({
              message: `Requested via roll(${rollId}) + other rows (${totalRequestedAgainstClothAmount}) exceeds available ${availCA} for ClothAmount ${caId}`,
            });
          }
        }
      }

      // All validations passed — apply deductions:

      // 1) Deduct from clothAmount docs per totalsByClothAmount
      const touchedClothAmountIds = new Set();
      for (const [id, reqTotal] of Object.entries(totalsByClothAmount)) {
        const doc = clothAmountMap[id];
        doc.amount = (typeof doc.amount === 'number' ? doc.amount : 0) - Number(reqTotal);
        if (doc.amount < 0) doc.amount = 0;
        await doc.save({ session });
        touchedClothAmountIds.add(id);
      }

      // 2) For roll rows: deduct roll.amount and also deduct clothAmount.amount (if roll references clothAmountId)
      const touchedRollIds = [];
      for (const [id, reqTotal] of Object.entries(totalsByRoll)) {
        const rollDoc = rollMap[id];
        rollDoc.amount = (typeof rollDoc.amount === 'number' ? rollDoc.amount : 0) - Number(reqTotal);
        if (rollDoc.amount < 0) rollDoc.amount = 0;
        await rollDoc.save({ session });
        touchedRollIds.push(id);

        if (rollDoc.clothAmountId) {
          const caId = String(rollDoc.clothAmountId);
          const caDoc = clothAmountMap[caId];
          if (caDoc) {
            caDoc.amount = (typeof caDoc.amount === 'number' ? caDoc.amount : 0) - Number(reqTotal);
            if (caDoc.amount < 0) caDoc.amount = 0;
            await caDoc.save({ session });
            touchedClothAmountIds.add(caId);
          }
        }
      }

      // Build assignment doc & create it within transaction
      const assignmentData = {
        tailorId,
        assignedDate: assignedDate ? new Date(assignedDate) : new Date(),
        clothConsumptions: clothConsumptions.map((c) => ({
          clothAmountId: c.clothAmountId ? c.clothAmountId : undefined,
          rollId: c.rollId ? c.rollId : undefined,
          fabricType: c.fabricType ? String(c.fabricType).trim() : undefined,
          itemType: c.itemType ? String(c.itemType).trim() : undefined,
          unitType: String(c.unitType).trim(),
          amount: Number(c.amount),
          approvedAmount: Number(c.amount),
          parentAssignmentId: c.parentAssignmentId ? c.parentAssignmentId : undefined,
          parentConsumptionId: c.parentConsumptionId ? c.parentConsumptionId : undefined,
        })),
        status: 'approved',
        requestedBy: req.user?._id || null,
        approvedBy: req.user?._id || null,
        approvedAt: new Date(),
      };

      const createdArr = await RollAssignment.create([assignmentData], { session });
      const createdAssignment = createdArr[0];

      await session.commitTransaction();

      // After commit get populated assignment + updated docs
      const populated = await populateAssignment(createdAssignment._id);
      const updatedClothAmounts = touchedClothAmountIds.size
        ? await ClothAmount.find({ _id: { $in: Array.from(touchedClothAmountIds) } }).lean()
        : [];
      const updatedRolls = touchedRollIds.length ? await ClothRoll.find({ _id: { $in: touchedRollIds } }).lean() : [];
      const masterTotals = await computeMasterTotals(tailorId).catch(() => []);

      return res.status(201).json({
        message: 'Assignment created and amounts deducted (transactional)',
        assignment: populated,
        updatedClothAmounts,
        updatedRolls,
        masterTotals,
      });
    } catch (txErr) {
      console.error('Transaction attempt failed — falling back to non-transactional flow:', txErr);
      try { await session.abortTransaction(); } catch (e) {}
      // continue to fallback
    }

    // ---------------------------------------------------------------------
    // Fallback non-transactional flow (best-effort with conservative checks)
    // ---------------------------------------------------------------------
    try {
      // 1) Deduct clothAmount totals (atomic conditional updates)
      const applied = [];
      for (const [id, reqTotal] of Object.entries(totalsByClothAmount)) {
        const updated = await ClothAmount.findOneAndUpdate(
          { _id: id, amount: { $gte: Number(reqTotal) } },
          { $inc: { amount: -Number(reqTotal) } },
          { new: true }
        ).lean();
        if (!updated) {
          // rollback any applied
          for (const a of applied) {
            await ClothAmount.findByIdAndUpdate(a.id, { $inc: { amount: a.deducted } });
          }
          return res.status(400).json({ message: `Insufficient amount for ClothAmount ${id}. Operation aborted.` });
        }
        applied.push({ id, deducted: Number(reqTotal) });
      }

      // 2) Deduct roll amounts (and associated clothAmount if applicable)
      const appliedRolls = [];
      // build a local rollMap for fallback checks (load current rolls)
      const fallbackRollDocs = rollObjectIds.length ? await ClothRoll.find({ _id: { $in: rollObjectIds } }).lean() : [];
      const fallbackRollMap = {};
      fallbackRollDocs.forEach((r) => { fallbackRollMap[String(r._id)] = r; });

      for (const [id, reqTotal] of Object.entries(totalsByRoll)) {
        const updatedRoll = await ClothRoll.findOneAndUpdate(
          { _id: id, amount: { $gte: Number(reqTotal) } },
          { $inc: { amount: -Number(reqTotal) } },
          { new: true }
        ).lean();

        if (!updatedRoll) {
          // rollback previous roll updates and cloth amount updates
          for (const ar of appliedRolls) {
            await ClothRoll.findByIdAndUpdate(ar.id, { $inc: { amount: ar.deducted } });
          }
          for (const a of applied) {
            await ClothAmount.findByIdAndUpdate(a.id, { $inc: { amount: a.deducted } });
          }
          return res.status(400).json({ message: `Insufficient amount for ClothRoll ${id}. Operation aborted.` });
        }
        appliedRolls.push({ id, deducted: Number(reqTotal) });

        // also deduct aggregate cloth amount if roll references one
        const maybeRoll = fallbackRollMap[id];
        const caRef = (updatedRoll && updatedRoll.clothAmountId) || (maybeRoll && maybeRoll.clothAmountId);
        if (caRef) {
          const caId = String(caRef);
          const updated = await ClothAmount.findOneAndUpdate(
            { _id: caId, amount: { $gte: Number(reqTotal) } },
            { $inc: { amount: -Number(reqTotal) } },
            { new: true }
          ).lean();

          if (!updated) {
            // rollback all
            for (const ar of appliedRolls) {
              await ClothRoll.findByIdAndUpdate(ar.id, { $inc: { amount: ar.deducted } });
            }
            for (const a of applied) {
              await ClothAmount.findByIdAndUpdate(a.id, { $inc: { amount: a.deducted } });
            }
            return res.status(400).json({ message: `Insufficient aggregate amount for ClothAmount ${caId} referenced by roll ${id}. Operation aborted.` });
          }
          // record that we deducted from aggregate as well
          applied.push({ id: caId, deducted: Number(reqTotal) });
        }
      }

      // Create assignment record (non-transactional)
      const assignmentData = {
        tailorId,
        assignedDate: assignedDate ? new Date(assignedDate) : new Date(),
        clothConsumptions: clothConsumptions.map((c) => ({
          clothAmountId: c.clothAmountId ? c.clothAmountId : undefined,
          rollId: c.rollId ? c.rollId : undefined,
          fabricType: c.fabricType ? String(c.fabricType).trim() : undefined,
          itemType: c.itemType ? String(c.itemType).trim() : undefined,
          unitType: String(c.unitType).trim(),
          amount: Number(c.amount),
          approvedAmount: Number(c.amount),
          parentAssignmentId: c.parentAssignmentId ? c.parentAssignmentId : undefined,
          parentConsumptionId: c.parentConsumptionId ? c.parentConsumptionId : undefined,
        })),
        status: 'approved',
        requestedBy: req.user?._id || null,
        approvedBy: req.user?._id || null,
        approvedAt: new Date(),
      };

      const created = await RollAssignment.create(assignmentData);
      const populated = await populateAssignment(created._id);

      const touchedClothAmounts = Array.from(new Set([
        ...Object.keys(totalsByClothAmount || {}),
        ...Array.from(rollIds).map((rId) => (fallbackRollMap && fallbackRollMap[rId] && fallbackRollMap[rId].clothAmountId) || null).filter(Boolean),
      ]));

      const updatedClothAmounts = touchedClothAmounts.length ? await ClothAmount.find({ _id: { $in: touchedClothAmounts } }).lean() : [];
      const updatedRolls = Array.from(rollIds).length ? await ClothRoll.find({ _id: { $in: Array.from(rollIds) } }).lean() : [];
      const masterTotals = await computeMasterTotals(tailorId).catch(() => []);

      return res.status(201).json({
        message: 'Assignment created and amounts deducted (non-transactional fallback)',
        assignment: populated,
        updatedClothAmounts,
        updatedRolls,
        masterTotals,
      });
    } catch (fallbackErr) {
      console.error('Fallback flow failed:', fallbackErr);
      // Attempt to rollback best-effort not possible here; respond with error
      return res.status(500).json({ message: 'Failed during non-transactional assignment flow', error: String(fallbackErr) });
    }
  } catch (outerErr) {
    console.error('assignClothRoll error (outer):', outerErr);
    return res.status(500).json({ message: 'Internal server error', error: String(outerErr) });
  } finally {
    try { await session.endSession(); } catch (e) { console.error('endSession failed:', e); }
  }
};

export default assignClothRoll;
