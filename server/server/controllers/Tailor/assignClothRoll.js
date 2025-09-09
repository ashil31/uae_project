import mongoose from 'mongoose';
import RollAssignment from '../../models/rollAssignment.js';
import ClothAmount from '../../models/clothAmount.js';
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

/**
 * Helper: compute cumulative totals assigned to a given tailor across all RollAssignment docs.
 * Returns array of objects: { clothAmountId, totalAssigned, available, fabricType, itemType, unit }
 * Defensive: returns [] on error.
 */
const computeMasterTotals = async (tailorId) => {
  try {
    if (!isValidObjectId(tailorId)) {
      console.warn('computeMasterTotals: invalid tailorId passed', tailorId);
      return [];
    }
    const objId = mongoose.Types.ObjectId(String(tailorId));

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
    clothDocs.forEach((c) => {
      clothMap[String(c._id)] = c;
    });

    return agg.map((a) => {
      const id = String(a._id);
      const doc = clothMap[id] || null;
      return {
        clothAmountId: id,
        totalAssigned: a.totalAssigned || 0,
        available: doc ? (typeof doc.amount === 'number' ? doc.amount : 0) : null,
        fabricType: doc?.fabricType ?? doc?.fabric ?? doc?.fabric_type ?? null,
        itemType: doc?.itemType ?? doc?.item ?? doc?.item_type ?? null,
        unit: doc?.unit ?? doc?.unitType ?? null,
        clothDoc: doc ?? null,
      };
    });
  } catch (err) {
    console.error('computeMasterTotals failed:', err && err.stack ? err.stack : err);
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

    // Verify tailor exists
    const tailor = await User.findById(tailorId).lean();
    if (!tailor) return res.status(404).json({ message: 'Tailor not found' });

    // Build totals per clothAmountId and validate rows (admin flow: amount only is required)
    const totals = {};
    const clothAmountIds = [];
    for (let i = 0; i < clothConsumptions.length; i++) {
      const c = clothConsumptions[i];
      if (!c || typeof c !== 'object') {
        return res.status(400).json({ message: `Row ${i + 1}: invalid consumption object` });
      }

      if (!c.clothAmountId) return res.status(400).json({ message: `Row ${i + 1}: clothAmountId is required` });
      if (!isValidObjectId(c.clothAmountId)) {
        return res.status(400).json({ message: `Row ${i + 1}: clothAmountId is not a valid id` });
      }

      if (!c.unitType) return res.status(400).json({ message: `Row ${i + 1}: unitType is required` });

      const num = Number(c.amount);
      if (!isFinite(num) || num <= 0) {
        return res.status(400).json({ message: `Row ${i + 1}: amount must be a positive number` });
      }

      const id = String(c.clothAmountId);
      totals[id] = (totals[id] || 0) + num;
      clothAmountIds.push(id);
    }

    const uniqIds = [...new Set(clothAmountIds)];
    let createdAssignment = null;

    // --- Build assignmentTotals (per clothAmountId) ---
    // ---------- robust fetch + diagnostics for clothDocsForTotals ----------
    // ---------- robust fetch + diagnostics for clothDocsForTotals (FIXED) ----------
    const normalizeAndCastIds = (ids = []) => {
      return ids
        .map((id) => (typeof id === 'string' ? id.trim() : id))
        .filter(Boolean)
        .map((id) => {
          try { return mongoose.Types.ObjectId(String(id)); }
          catch (e) { return null; }
        })
        .filter(Boolean);
    };

    let clothDocsForTotals = [];
    try {
      console.log('DEBUG assignClothRoll: mongoose connection name:', mongoose.connection && mongoose.connection.name);
      console.log('DEBUG assignClothRoll: ClothAmount model db name:',
        ClothAmount && ClothAmount.db && ClothAmount.db.name ? ClothAmount.db.name : '(unknown)');
      console.log('DEBUG uniqIds raw:', uniqIds);

      const objectIds = normalizeAndCastIds(uniqIds);
      console.log('DEBUG uniqIds -> objectIds:', objectIds.map(String));

      // Try to fetch using the session (if present). Use .lean()
      try {
        clothDocsForTotals = objectIds.length
          ? await ClothAmount.find({ _id: { $in: objectIds } }).session(session).lean()
          : [];
        console.log('DEBUG found with session count:', clothDocsForTotals.length, clothDocsForTotals.map(d => String(d._id)));
      } catch (sessErr) {
        console.error('DEBUG find with session failed:', sessErr && sessErr.stack ? sessErr.stack : sessErr);
        clothDocsForTotals = [];
      }

      // If nothing found with session, try without session to detect session/connection mismatch
      if ((!clothDocsForTotals || clothDocsForTotals.length === 0) && objectIds.length) {
        try {
          const withoutSession = await ClothAmount.find({ _id: { $in: objectIds } }).lean();
          console.log('DEBUG found WITHOUT session count:', withoutSession.length, withoutSession.map(d => String(d._id)));
          if (withoutSession && withoutSession.length) clothDocsForTotals = withoutSession;
        } catch (noSessErr) {
          console.error('DEBUG find without session failed:', noSessErr && noSessErr.stack ? noSessErr.stack : noSessErr);
        }
      }

      // --- BUILD MAP used later (this was missing) ---
      var clothMapForTotals = {};
      if (Array.isArray(clothDocsForTotals)) {
        clothDocsForTotals.forEach((d) => {
          clothMapForTotals[String(d._id)] = d;
        });
      }
      console.log('DEBUG clothMapForTotals keys:', Object.keys(clothMapForTotals));
    } catch (e) {
      console.error('DEBUG Failed to fetch cloth docs for totals (outer):', e && e.stack ? e.stack : e);
      clothDocsForTotals = [];
      var clothMapForTotals = {};
    }
    // -------------------------------------------------------------------


    const assignmentTotals = uniqIds.map((id) => {
      const doc = clothMapForTotals[id] || {};
      return {
        clothAmountId: id,
        fabricType: doc?.fabricType ?? doc?.fabric ?? doc?.fabric_type ?? null,
        itemType: doc?.itemType ?? doc?.item ?? doc?.item_type ?? null,
        unit: doc?.unit ?? doc?.unitType ?? null,
        assignedTotal: totals[id] || 0,
        availableBefore: typeof doc.amount === 'number' ? doc.amount : null,
      };
    });

    // --- NEW: Group by (fabricType, itemType, unit) ---
    const groupedMap = assignmentTotals.reduce((acc, t) => {
      const fabricNorm = (t.fabricType || 'UNKNOWN').toString().trim().toLowerCase();
      const itemNorm = (t.itemType || 'UNKNOWN').toString().trim().toLowerCase();
      const unitNorm = (t.unit || 'UNKNOWN').toString().trim().toLowerCase();
      const key = `${fabricNorm}||${itemNorm}||${unitNorm}`;

      if (!acc[key]) {
        acc[key] = {
          fabricType: t.fabricType || null,
          itemType: t.itemType || null,
          unit: t.unit || null,
          assignedTotal: 0,
          availableBeforeSum: 0,
          clothAmountIds: [],
        };
      }
      acc[key].assignedTotal += Number(t.assignedTotal || 0);
      if (typeof t.availableBefore === 'number') {
        acc[key].availableBeforeSum += t.availableBefore;
      }
      if (t.clothAmountId) acc[key].clothAmountIds.push(t.clothAmountId);

      return acc;
    }, {});

    const assignmentGroupedTotals = Object.values(groupedMap).map((g) => ({
      ...g,
      // simple arithmetic assuming same unit: avail after = sum(avail before) - sum(assigned)
      availableAfterSum:
        typeof g.availableBeforeSum === 'number' && typeof g.assignedTotal === 'number'
          ? g.availableBeforeSum - g.assignedTotal
          : null,
    }));

    // Attempt transaction first
    try {
      await session.startTransaction();

      // normalize & cast uniqIds to ObjectId (trim strings too)
      const objectIds = (uniqIds || [])
        .map(id => (typeof id === 'string' ? id.trim() : id))
        .filter(Boolean)
        .map(id => {
          try { return mongoose.Types.ObjectId(String(id)); }
          catch (e) { return null; }
        })
        .filter(Boolean);

      console.log('DEBUG transactional - objectIds:', objectIds.map(String));

      // fetch using session and casted ids
      const clothAmounts = objectIds.length
        ? await ClothAmount.find({ _id: { $in: objectIds } }).session(session)
        : [];

      console.log('DEBUG transactional - found clothAmounts ids:', clothAmounts.map(c => String(c._id)));

      // ensure all exist
      if (clothAmounts.length !== objectIds.length) {
        const foundIds = clothAmounts.map((c) => String(c._id));
        const missing = objectIds.map(String).filter((id) => !foundIds.includes(id));
        await session.abortTransaction();
        console.error('DEBUG transactional - missing ids:', missing);
        return res.status(404).json({ message: `ClothAmount(s) not found: ${missing.join(', ')}` });
      }
    

      // validate availability
      for (const ca of clothAmounts) {
      const id = String(ca._id);
      const reqTotal = totals[id] || 0;
      const avail = typeof ca.amount === 'number' ? ca.amount : 0;
      if (reqTotal > avail) {
        await session.abortTransaction();
        return res
          .status(400)
          .json({ message: `Requested total ${reqTotal} exceeds available ${avail} for ClothAmount ${id}` });
      }
    }

    // deduct
    const touchedIds = [];
    for (const ca of clothAmounts) {
      const id = String(ca._id);
      const deduct = totals[id] || 0;
      if (deduct > 0) {
        ca.amount = (typeof ca.amount === 'number' ? ca.amount : 0) - deduct;
        if (ca.amount < 0) ca.amount = 0; // safety
        await ca.save({ session });
        touchedIds.push(id);
      }
    }

    // create assignment in session — preserve optional parent fields if provided
    const assignmentData = {
      tailorId,
      assignedDate: assignedDate ? new Date(assignedDate) : new Date(),
      clothConsumptions: clothConsumptions.map((c) => ({
        clothAmountId: c.clothAmountId,
        fabricType: c.fabricType ? String(c.fabricType).trim() : undefined,
        itemType: c.itemType ? String(c.itemType).trim() : undefined,
        unitType: String(c.unitType).trim(),
        amount: Number(c.amount),
        approvedAmount: Number(c.amount),
        ...(typeof c.waste !== 'undefined' ? { waste: Number(c.waste) } : {}),
        parentAssignmentId: c.parentAssignmentId ? c.parentAssignmentId : undefined,
        parentConsumptionId: c.parentConsumptionId ? c.parentConsumptionId : undefined,
      })),
      status: 'approved',
      requestedBy: req.user?._id || null,
      approvedBy: req.user?._id || null,
      approvedAt: new Date(),
    };

    const createdArr = await RollAssignment.create([assignmentData], { session });
    createdAssignment = createdArr[0];

    await session.commitTransaction();

    // After commit, fetch populated assignment and updated cloth amounts
    const populated = await populateAssignment(createdAssignment._id);
    const updatedClothAmounts = touchedIds.length
      ? await ClothAmount.find({ _id: { $in: touchedIds } }).lean()
      : [];

    // compute master totals (cumulative) for the tailor — defensive call
    const masterTotals = await computeMasterTotals(tailorId).catch((e) => {
      console.error('computeMasterTotals (post-transaction) failed:', e && e.stack ? e.stack : e);
      return [];
    });

    return res.status(201).json({
      message: 'Assignment created and amounts deducted (transactional)',
      assignment: populated,
      updatedClothAmounts,
      // detailed per-id totals (keep/remove as you like)
      assignmentTotals,
      // ✅ consolidated totals per fabric+item+unit (what admin wants)
      assignmentGroupedTotals,
      masterTotals,
    });
  } catch (txErr) {
    console.error('Transaction attempt failed — falling back:', txErr && txErr.stack ? txErr.stack : txErr);
    try {
      await session.abortTransaction();
    } catch (abortErr) {
      console.error('abortTransaction failed:', abortErr && abortErr.stack ? abortErr.stack : abortErr);
    }
    // fallthrough to fallback non-transactional flow below
  }

  // Fallback non-transactional atomic updates
  const applied = [];
  try {
    for (const id of uniqIds) {
      const deduct = totals[id] || 0;
      if (deduct <= 0) continue;

      const updated = await ClothAmount.findOneAndUpdate(
        { _id: id, amount: { $gte: deduct } },
        { $inc: { amount: -deduct } },
        { new: true }
      ).lean();

      if (!updated) {
        // rollback prior applied
        for (const a of applied) {
          try {
            await ClothAmount.findByIdAndUpdate(a.id, { $inc: { amount: a.deducted } });
          } catch (rbErr) {
            console.error('Rollback update failed for', a, rbErr && rbErr.stack ? rbErr.stack : rbErr);
          }
        }
        return res.status(400).json({
          message: `Insufficient amount for ClothAmount ${id}. Operation aborted, previous updates rolled back.`,
        });
      }
      applied.push({ id, deducted: deduct });
    }

    const assignmentData = {
      tailorId,
      assignedDate: assignedDate ? new Date(assignedDate) : new Date(),
      clothConsumptions: clothConsumptions.map((c) => ({
        clothAmountId: c.clothAmountId,
        fabricType: c.fabricType ? String(c.fabricType).trim() : undefined,
        itemType: c.itemType ? String(c.itemType).trim() : undefined,
        unitType: String(c.unitType).trim(),
        amount: Number(c.amount),
        approvedAmount: Number(c.amount),
        ...(typeof c.waste !== 'undefined' ? { waste: Number(c.waste) } : {}),
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
    const updatedClothAmounts2 = applied.length
      ? await ClothAmount.find({ _id: { $in: applied.map((a) => a.id) } }).lean()
      : [];

    // compute master totals (cumulative) for the tailor — defensive call
    const masterTotals = await computeMasterTotals(tailorId).catch((e) => {
      console.error('computeMasterTotals (fallback) failed:', e && e.stack ? e.stack : e);
      return [];
    });

    return res.status(201).json({
      message: 'Assignment created and amounts deducted (non-transactional fallback)',
      assignment: populated,
      updatedClothAmounts: updatedClothAmounts2,
      assignmentTotals,
      assignmentGroupedTotals,
      masterTotals,
    });
  } catch (fallbackErr) {
    console.error('Fallback flow failed:', fallbackErr && fallbackErr.stack ? fallbackErr.stack : fallbackErr);
    // rollback any partial applied changes
    try {
      if (Array.isArray(applied) && applied.length) {
        for (const a of applied) {
          await ClothAmount.findByIdAndUpdate(a.id, { $inc: { amount: a.deducted } });
        }
      }
    } catch (rollbackErr) {
      console.error(
        'Rollback after fallback failure failed:',
        rollbackErr && rollbackErr.stack ? rollbackErr.stack : rollbackErr
      );
    }
    const isDev = process.env.NODE_ENV !== 'production';
    return res.status(500).json({
      message: 'Failed during non-transactional assignment flow',
      error: isDev
        ? (fallbackErr && fallbackErr.stack ? fallbackErr.stack : String(fallbackErr))
        : 'Internal server error',
    });
  }
} catch (err) {
  console.error('assignClothRoll error (outer):', err && err.stack ? err.stack : err);
  const isDev = process.env.NODE_ENV !== 'production';
  return res.status(500).json({
    message: 'Internal server error',
    error: isDev ? (err && err.stack ? err.stack : String(err)) : 'Internal server error',
  });
} finally {
  try {
    await session.endSession();
  } catch (e) {
    console.error('endSession failed:', e && e.stack ? e.stack : e);
  }
}
};

export default assignClothRoll;
