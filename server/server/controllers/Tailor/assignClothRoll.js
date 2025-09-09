// server/controllers/Tailor/assignClothRoll.js
import mongoose from 'mongoose';
import RollAssignment from '../../models/rollAssignment.js';
import ClothAmount from '../../models/clothAmount.js';
import ClothRoll from '../../models/clothRoll.js';
import User from '../../models/user.js';

const isValidObjectId = (id) => {
  if (!id) return false;
  try { return mongoose.Types.ObjectId.isValid(String(id)); } catch (e) { return false; }
};

const lowerTrim = (v) => {
  if (v === undefined || v === null) return "";
  return String(v).toLowerCase().trim();
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
    const { tailorId, assignedDate, clothConsumptions, assignToMaster, masterTailorId } = req.body;

    if (!tailorId) return res.status(400).json({ message: 'tailorId is required' });
    if (!isValidObjectId(tailorId)) return res.status(400).json({ message: 'tailorId is not a valid id' });

    if (!Array.isArray(clothConsumptions) || clothConsumptions.length === 0) {
      return res.status(400).json({ message: 'clothConsumptions array is required' });
    }

    const tailor = await User.findById(tailorId).lean();
    if (!tailor) return res.status(404).json({ message: 'Tailor not found' });

    // Decide master assignment behavior (optional)
    const envMaster = process.env.MASTER_TAILOR_ID;
    const wantMaster = Boolean(assignToMaster) || Boolean(envMaster && assignToMaster !== false);
    const resolvedMasterId = (masterTailorId && isValidObjectId(masterTailorId)) ? String(masterTailorId) : (envMaster && isValidObjectId(envMaster) ? String(envMaster) : null);

    //
    // RESOLVE / ALLOCATE consumption rows into concrete processedConsumptions:
    // - If row has clothAmountId or rollId: keep as-is
    // - Otherwise: find matching ClothAmount docs (based on provided fabricType/itemType/unitType fields)
    //   * if multiple docs match, allocate requested amount across them in FIFO order (using doc.amount)
    //   * if not enough total available -> error row X
    //
    const processedConsumptions = []; // final list of rows with explicit clothAmountId or rollId

    for (let i = 0; i < clothConsumptions.length; i++) {
      const r = clothConsumptions[i];
      if (!r || typeof r !== 'object') {
        return res.status(400).json({ message: `Row ${i + 1}: invalid consumption object` });
      }
      const unitRaw = (r.unitType || r.unit || 'meters');
      const unit = lowerTrim(unitRaw);

      // If row already includes clothAmountId or rollId, accept (but still validate amount later)
      if (r.clothAmountId || r.rollId) {
        processedConsumptions.push({
          clothAmountId: r.clothAmountId ? String(r.clothAmountId) : undefined,
          rollId: r.rollId ? String(r.rollId) : undefined,
          fabricType: r.fabricType ? String(r.fabricType).trim() : undefined,
          itemType: r.itemType ? String(r.itemType).trim() : undefined,
          unitType: unit || 'meters',
          amount: Number(r.amount)
        });
        continue;
      }

      // else attempt to resolve using fabricType/itemType/unitType
      const fabricRaw = r.fabricType ?? "";
      const itemRaw = r.itemType ?? "";
      const fabric = lowerTrim(fabricRaw);
      const item = lowerTrim(itemRaw);

      if (!fabric && !item) {
        return res.status(400).json({ message: `Row ${i + 1}: either clothAmountId/rollId must be provided OR fabricType/itemType must be present to resolve an aggregate clothAmount.` });
      }

      // Build query with whichever fields are present (exact-match on provided fields)
      const query = {};
      if (fabric) query.fabricType = fabric;
      if (item) query.itemType = item;
      if (unit) query.unitType = unit;

      // Find all matching ClothAmount docs (we will allocate across them)
      const matches = await ClothAmount.find(query).sort({ _id: 1 }).lean();

      if (!matches || matches.length === 0) {
        // If we tried with unit filter and found nothing, try relaxing unit constraint (if unit was provided)
        if (unit && (fabric || item)) {
          const relaxedQuery = {};
          if (fabric) relaxedQuery.fabricType = fabric;
          if (item) relaxedQuery.itemType = item;
          const matchesRelaxed = await ClothAmount.find(relaxedQuery).sort({ _id: 1 }).lean();
          if (matchesRelaxed && matchesRelaxed.length) {
            // use relaxed matches
            matches.splice(0, matches.length, ...matchesRelaxed);
          }
        }
      }

      if (!matches || matches.length === 0) {
        return res.status(400).json({ message: `Row ${i + 1}: couldn't resolve a ClothAmount for fabric="${fabricRaw}" item="${itemRaw}" unit="${unitRaw}". Provide clothAmountId or create corresponding ClothAmount.` });
      }

      // compute total available across matches
      let totalAvailableAcrossMatches = 0;
      matches.forEach(m => { totalAvailableAcrossMatches += (typeof m.amount === 'number' ? m.amount : 0); });

      const requestedAmount = Number(r.amount || 0);
      if (!isFinite(requestedAmount) || requestedAmount <= 0) {
        return res.status(400).json({ message: `Row ${i + 1}: amount must be a positive number` });
      }

      if (requestedAmount > totalAvailableAcrossMatches) {
        return res.status(400).json({ message: `Row ${i + 1}: requested ${requestedAmount} exceeds aggregate available ${totalAvailableAcrossMatches} for matching ClothAmount(s).` });
      }

      // Allocate across matches in FIFO (or doc order)
      let remaining = requestedAmount;
      for (let m of matches) {
        if (remaining <= 0) break;
        const avail = typeof m.amount === 'number' ? m.amount : 0;
        if (avail <= 0) continue;
        const deduct = Math.min(avail, remaining);
        processedConsumptions.push({
          clothAmountId: String(m._id),
          fabricType: m.fabricType ?? (r.fabricType || ""),
          itemType: m.itemType ?? (r.itemType || ""),
          unitType: m.unitType ,
          amount: Number(deduct)
        });
        remaining -= deduct;
      }

      if (remaining > 0) {
        // This should not happen because of prior check, but guard anyway
        return res.status(400).json({ message: `Row ${i + 1}: unable to allocate full requested amount (${requestedAmount}), remaining ${remaining}` });
      }
    } // end for each input row

    // processedConsumptions now has rows each with clothAmountId OR rollId
    // Build totals by clothAmountId & rollId (simple aggregation)
    const totalsByClothAmount = {};
    const totalsByRoll = {};
    const clothAmountIdsSet = new Set();
    const rollIdsSet = new Set();

    for (let i = 0; i < processedConsumptions.length; i++) {
      const c = processedConsumptions[i];
      if (!c || typeof c !== 'object') return res.status(400).json({ message: `Processed row ${i + 1} invalid` });
      if (!c.unitType) return res.status(400).json({ message: `Processed row ${i + 1}: unitType required` });
      const num = Number(c.amount);
      if (!isFinite(num) || num <= 0) return res.status(400).json({ message: `Processed row ${i + 1}: amount must be positive` });

      if (c.clothAmountId) {
        if (!isValidObjectId(c.clothAmountId)) return res.status(400).json({ message: `Processed row ${i + 1}: clothAmountId not valid` });
        const id = String(c.clothAmountId);
        totalsByClothAmount[id] = (totalsByClothAmount[id] || 0) + num;
        clothAmountIdsSet.add(id);
      } else if (c.rollId) {
        if (!isValidObjectId(c.rollId)) return res.status(400).json({ message: `Processed row ${i + 1}: rollId not valid` });
        const id = String(c.rollId);
        totalsByRoll[id] = (totalsByRoll[id] || 0) + num;
        rollIdsSet.add(id);
      } else {
        return res.status(400).json({ message: `Processed row ${i + 1}: either clothAmountId or rollId is required` });
      }
    }

    // Helpers
    const toObjectIds = (arr) => arr.map((x) => new mongoose.Types.ObjectId(String(x)));
    const clothAmountObjectIds = Array.from(clothAmountIdsSet).length ? toObjectIds(Array.from(clothAmountIdsSet)) : [];
    const rollObjectIds = Array.from(rollIdsSet).length ? toObjectIds(Array.from(rollIdsSet)) : [];

    // Now follow your existing transactional deduction flow, using totalsByClothAmount & totalsByRoll
    try {
      await session.startTransaction();

      // Load cloth amounts
      const clothDocs = clothAmountObjectIds.length ? await ClothAmount.find({ _id: { $in: clothAmountObjectIds } }).session(session) : [];
      const clothMap = {};
      clothDocs.forEach(d => { clothMap[String(d._id)] = d; });

      // validate cloth totals
      for (const [id, reqTotal] of Object.entries(totalsByClothAmount)) {
        const doc = clothMap[id];
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

      // Load rolls
      const rollDocs = rollObjectIds.length ? await ClothRoll.find({ _id: { $in: rollObjectIds } }).session(session) : [];
      const rollMap = {};
      rollDocs.forEach(r => { rollMap[String(r._id)] = r; });

      // validate rolls and collect cloth amounts referenced by rolls
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
        if (rollDoc.clothAmountId) clothAmountsReferencedByRolls.add(String(rollDoc.clothAmountId));
      }

      // Ensure we have cloth docs referenced by rolls loaded too
      const referencedIds = Array.from(clothAmountsReferencedByRolls).filter(id => !clothMap[id]);
      if (referencedIds.length) {
        const referencedObjectIds = toObjectIds(referencedIds);
        const referencedDocs = await ClothAmount.find({ _id: { $in: referencedObjectIds } }).session(session);
        referencedDocs.forEach(d => { clothMap[String(d._id)] = d; });
      }

      // Validate combined total against cloth amounts referenced by rolls
      for (const [rollId, reqTotal] of Object.entries(totalsByRoll)) {
        const rollDoc = rollMap[rollId];
        if (!rollDoc) continue;
        if (rollDoc.clothAmountId) {
          const caId = String(rollDoc.clothAmountId);
          const caDoc = clothMap[caId];
          if (!caDoc) {
            await session.abortTransaction();
            return res.status(404).json({ message: `ClothAmount referenced by roll ${rollId} not found: ${caId}` });
          }
          const rollContribution = reqTotal;
          const prevRequestedForCloth = totalsByClothAmount[caId] || 0;
          const totalRequestedAgainstCloth = prevRequestedForCloth + rollContribution;
          const availCA = typeof caDoc.amount === 'number' ? caDoc.amount : 0;
          if (totalRequestedAgainstCloth > availCA) {
            await session.abortTransaction();
            return res.status(400).json({ message: `Requested via roll(${rollId}) + other rows (${totalRequestedAgainstCloth}) exceeds available ${availCA} for ClothAmount ${caId}` });
          }
        }
      }

      // Apply deductions to clothAmounts
      const touchedClothAmountIds = new Set();
      for (const [id, reqTotal] of Object.entries(totalsByClothAmount)) {
        const doc = clothMap[id];
        doc.amount = (typeof doc.amount === 'number' ? doc.amount : 0) - Number(reqTotal);
        if (doc.amount < 0) doc.amount = 0;
        await doc.save({ session });
        touchedClothAmountIds.add(id);
      }

      // Apply deductions to rolls (and their clothAmount if referenced)
      const touchedRollIds = [];
      for (const [id, reqTotal] of Object.entries(totalsByRoll)) {
        const rollDoc = rollMap[id];
        rollDoc.amount = (typeof rollDoc.amount === 'number' ? rollDoc.amount : 0) - Number(reqTotal);
        if (rollDoc.amount < 0) rollDoc.amount = 0;
        await rollDoc.save({ session });
        touchedRollIds.push(id);

        if (rollDoc.clothAmountId) {
          const caId = String(rollDoc.clothAmountId);
          const caDoc = clothMap[caId];
          if (caDoc) {
            caDoc.amount = (typeof caDoc.amount === 'number' ? caDoc.amount : 0) - Number(reqTotal);
            if (caDoc.amount < 0) caDoc.amount = 0;
            await caDoc.save({ session });
            touchedClothAmountIds.add(caId);
          }
        }
      }

      // Create primary assignment with processedConsumptions (these have clothAmountId/rollId and amounts)
      const assignmentData = {
        tailorId,
        assignedDate: assignedDate ? new Date(assignedDate) : new Date(),
        clothConsumptions: processedConsumptions.map((c) => ({
          clothAmountId: c.clothAmountId ? c.clothAmountId : undefined,
          rollId: c.rollId ? c.rollId : undefined,
          fabricType: c.fabricType ? String(c.fabricType).trim() : undefined,
          itemType: c.itemType ? String(c.itemType).trim() : undefined,
          unitType: String(c.unitType).trim(),
          amount: Number(c.amount),
          approvedAmount: Number(c.amount),
        })),
        status: 'approved',
        requestedBy: req.user?._id || null,
        approvedBy: req.user?._id || null,
        approvedAt: new Date(),
      };

      const createdArr = await RollAssignment.create([assignmentData], { session });
      const createdAssignment = createdArr[0];

      // Optionally create master assignment (mirror) WITHOUT deducting stock again
      let masterAssignmentPopulated = null;
      if (wantMaster && resolvedMasterId && isValidObjectId(resolvedMasterId) && String(resolvedMasterId) !== String(tailorId)) {
        const masterUser = await User.findById(resolvedMasterId).session(session).lean();
        if (!masterUser) {
          await session.abortTransaction();
          return res.status(404).json({ message: 'Master tailor id provided not found' });
        }
        const masterData = {
          tailorId: resolvedMasterId,
          assignedDate: assignedDate ? new Date(assignedDate) : new Date(),
          clothConsumptions: processedConsumptions.map((c) => ({
            clothAmountId: c.clothAmountId ? c.clothAmountId : undefined,
            rollId: c.rollId ? c.rollId : undefined,
            fabricType: c.fabricType ? String(c.fabricType).trim() : undefined,
            itemType: c.itemType ? String(c.itemType).trim() : undefined,
            unitType: String(c.unitType).trim(),
            amount: Number(c.amount),
            approvedAmount: Number(c.amount),
            parentAssignmentId: createdAssignment._id,
          })),
          status: 'approved',
          requestedBy: req.user?._id || null,
          approvedBy: req.user?._id || null,
          approvedAt: new Date(),
        };

        const masterArr = await RollAssignment.create([masterData], { session });
        const masterAssignment = masterArr[0];
        masterAssignmentPopulated = await populateAssignment(masterAssignment._id);
      }

      await session.commitTransaction();

      const populated = await populateAssignment(createdAssignment._id);
      const updatedClothAmounts = touchedClothAmountIds.size ? await ClothAmount.find({ _id: { $in: Array.from(touchedClothAmountIds) } }).lean() : [];
      const updatedRolls = touchedRollIds.length ? await ClothRoll.find({ _id: { $in: touchedRollIds } }).lean() : [];
      const masterTotals = await computeMasterTotals(tailorId).catch(() => []);

      return res.status(201).json({
        message: 'Assignment created and amounts deducted (transactional)',
        assignment: populated,
        masterAssignment: masterAssignmentPopulated,
        updatedClothAmounts,
        updatedRolls,
        masterTotals,
      });

    } catch (txErr) {
      console.error('Transaction attempt failed — falling back to non-transactional flow:', txErr);
      try { await session.abortTransaction(); } catch (e) {}
      // fallback below
    }

    // --------------------------
    // Non-transactional fallback
    // --------------------------
    try {
      // Deduct cloth amounts atomically
      const applied = [];
      for (const [id, reqTotal] of Object.entries(totalsByClothAmount)) {
        const updated = await ClothAmount.findOneAndUpdate(
          { _id: id, amount: { $gte: Number(reqTotal) } },
          { $inc: { amount: -Number(reqTotal) } },
          { new: true }
        ).lean();
        if (!updated) {
          for (const a of applied) {
            await ClothAmount.findByIdAndUpdate(a.id, { $inc: { amount: a.deducted } });
          }
          return res.status(400).json({ message: `Insufficient amount for ClothAmount ${id}. Operation aborted.` });
        }
        applied.push({ id, deducted: Number(reqTotal) });
      }

      // Deduct rolls and referenced cloth amounts
      const appliedRolls = [];
      const fallbackRollDocs = rollObjectIds.length ? await ClothRoll.find({ _id: { $in: rollObjectIds } }).lean() : [];
      const fallbackRollMap = {};
      fallbackRollDocs.forEach(r => { fallbackRollMap[String(r._id)] = r; });

      for (const [id, reqTotal] of Object.entries(totalsByRoll)) {
        const updatedRoll = await ClothRoll.findOneAndUpdate(
          { _id: id, amount: { $gte: Number(reqTotal) } },
          { $inc: { amount: -Number(reqTotal) } },
          { new: true }
        ).lean();

        if (!updatedRoll) {
          for (const ar of appliedRolls) {
            await ClothRoll.findByIdAndUpdate(ar.id, { $inc: { amount: ar.deducted } });
          }
          for (const a of applied) {
            await ClothAmount.findByIdAndUpdate(a.id, { $inc: { amount: a.deducted } });
          }
          return res.status(400).json({ message: `Insufficient amount for ClothRoll ${id}. Operation aborted.` });
        }
        appliedRolls.push({ id, deducted: Number(reqTotal) });

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
            for (const ar of appliedRolls) {
              await ClothRoll.findByIdAndUpdate(ar.id, { $inc: { amount: ar.deducted } });
            }
            for (const a of applied) {
              await ClothAmount.findByIdAndUpdate(a.id, { $inc: { amount: a.deducted } });
            }
            return res.status(400).json({ message: `Insufficient aggregate amount for ClothAmount ${caId} referenced by roll ${id}. Operation aborted.` });
          }
          applied.push({ id: caId, deducted: Number(reqTotal) });
        }
      }

      // Create assignment (non-transactional) using processedConsumptions
      const assignmentData = {
        tailorId,
        assignedDate: assignedDate ? new Date(assignedDate) : new Date(),
        clothConsumptions: processedConsumptions.map((c) => ({
          clothAmountId: c.clothAmountId ? c.clothAmountId : undefined,
          rollId: c.rollId ? c.rollId : undefined,
          fabricType: c.fabricType ? String(c.fabricType).trim() : undefined,
          itemType: c.itemType ? String(c.itemType).trim() : undefined,
          unitType: String(c.unitType).trim(),
          amount: Number(c.amount),
          approvedAmount: Number(c.amount),
        })),
        status: 'approved',
        requestedBy: req.user?._id || null,
        approvedBy: req.user?._id || null,
        approvedAt: new Date(),
      };

      const created = await RollAssignment.create(assignmentData);
      const populated = await populateAssignment(created._id);

      // Optionally create master assignment (mirror) non-transactional
      let masterAssignmentPopulated = null;
      if (wantMaster && resolvedMasterId && isValidObjectId(resolvedMasterId) && String(resolvedMasterId) !== String(tailorId)) {
        const masterUser = await User.findById(resolvedMasterId).lean();
        if (masterUser) {
          const masterData = {
            tailorId: resolvedMasterId,
            assignedDate: assignedDate ? new Date(assignedDate) : new Date(),
            clothConsumptions: processedConsumptions.map((c) => ({
              clothAmountId: c.clothAmountId ? c.clothAmountId : undefined,
              rollId: c.rollId ? c.rollId : undefined,
              fabricType: c.fabricType ? String(c.fabricType).trim() : undefined,
              itemType: c.itemType ? String(c.itemType).trim() : undefined,
              unitType: String(c.unitType).trim(),
              amount: Number(c.amount),
              approvedAmount: Number(c.amount),
              parentAssignmentId: created._id,
            })),
            status: 'approved',
            requestedBy: req.user?._id || null,
            approvedBy: req.user?._id || null,
            approvedAt: new Date(),
          };

          const masterCreated = await RollAssignment.create(masterData);
          masterAssignmentPopulated = await populateAssignment(masterCreated._id);
        }
      }

      const touchedClothAmounts = Array.from(new Set([
        ...Object.keys(totalsByClothAmount || {}),
        ...Array.from(rollIdsSet).map((rId) => (fallbackRollMap && fallbackRollMap[rId] && fallbackRollMap[rId].clothAmountId) || null).filter(Boolean),
      ]));

      const updatedClothAmounts = touchedClothAmounts.length ? await ClothAmount.find({ _id: { $in: touchedClothAmounts } }).lean() : [];
      const updatedRolls = Array.from(rollIdsSet).length ? await ClothRoll.find({ _id: { $in: Array.from(rollIdsSet) } }).lean() : [];
      const masterTotals = await computeMasterTotals(tailorId).catch(() => []);

      return res.status(201).json({
        message: 'Assignment created and amounts deducted (non-transactional fallback)',
        assignment: populated,
        masterAssignment: masterAssignmentPopulated,
        updatedClothAmounts,
        updatedRolls,
        masterTotals,
      });

    } catch (fallbackErr) {
      console.error('Fallback flow failed:', fallbackErr);
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
