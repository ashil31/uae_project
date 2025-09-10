// server/controllers/Tailor/assignClothRoll.js
import mongoose from 'mongoose';
import RollAssignment from '../../models/rollAssignment.js';
import ClothAmount from '../../models/clothAmount.js';
import ClothRoll from '../../models/clothRoll.js';
import User from '../../models/user.js';
import MasterClothAmount from '../../models/masterClothAmount.js';

const isValidObjectId = (id) => {
  if (!id) return false;
  try { return mongoose.Types.ObjectId.isValid(String(id)); } catch (e) { return false; }
};

const lowerTrim = (v) => {
  if (v === undefined || v === null) return "";
  return String(v).toLowerCase().trim();
};

const normalizeForMaster = (v, fallback = 'unknown') => {
  if (v === undefined || v === null) return fallback;
  const s = String(v).trim().toLowerCase();
  return s.length ? s : fallback;
};

const populateAssignment = async (id) =>
  RollAssignment.findById(id)
    .populate('tailorId', 'username firstName lastName skillLevel role')
    .populate('requestedBy', 'username')
    .populate('approvedBy', 'username')
    .populate('clothConsumptions.clothAmountId', 'fabricType itemType unit amount')
    .populate('clothConsumptions.masterClothAmountId', 'masterTailorId fabricType itemType unitType amount clothAmountRef')
    .lean();

const computeMasterTotals = async (tailorId) => {
  try {
    if (!isValidObjectId(tailorId)) return [];
    const objId = new mongoose.Types.ObjectId(String(tailorId));

    const agg = await RollAssignment.aggregate([
      { $match: { tailorId: objId } },
      { $unwind: '$clothConsumptions' },
      {
        $addFields: {
          _fabric: { $toLower: { $ifNull: ['$clothConsumptions.fabricType', ''] } },
          _item: { $toLower: { $ifNull: ['$clothConsumptions.itemType', ''] } },
          _unit: { $toLower: { $ifNull: ['$clothConsumptions.unitType', 'meters'] } },
          _approved: { $ifNull: ['$clothConsumptions.approvedAmount', '$clothConsumptions.amount', 0] },
          _allocated: { $ifNull: ['$clothConsumptions.allocated', 0] },
          _remaining: { $max: [{ $subtract: [{ $ifNull: ['$clothConsumptions.approvedAmount', '$clothConsumptions.amount', 0] }, { $ifNull: ['$clothConsumptions.allocated', 0] }] }, 0] },
          _masterId: '$clothConsumptions.masterClothAmountId',
          _clothAmountId: '$clothConsumptions.clothAmountId'
        }
      },
      {
        $group: {
          _id: { fabric: '$_fabric', item: '$_item', unit: '$_unit' },
          fabricDisplay: { $first: '$clothConsumptions.fabricType' },
          itemDisplay: { $first: '$clothConsumptions.itemType' },
          unitDisplay: { $first: '$clothConsumptions.unitType' },
          totalAssigned: { $sum: '$_approved' },
          totalRemaining: { $sum: '$_remaining' },
          clothAmountIds: { $addToSet: { $cond: [{ $ifNull: ['$_clothAmountId', false] }, '$_clothAmountId', null] } },
          masterClothAmountIds: { $addToSet: { $cond: [{ $ifNull: ['$_masterId', false] }, '$_masterId', null] } },
          rows: { $sum: 1 }
        }
      },
      { $addFields: {
          clothAmountIds: { $filter: { input: '$clothAmountIds', as: 'id', cond: { $ne: ['$$id', null] } } },
          masterClothAmountIds: { $filter: { input: '$masterClothAmountIds', as: 'id', cond: { $ne: ['$$id', null] } } },
          available: { $ifNull: ['$totalRemaining', 0] }
        }
      },
      { $project: { _id: 0, key: '$_id', fabricType: '$fabricDisplay', itemType: '$itemDisplay', unit: '$unitDisplay', totalAssigned: 1, rows: 1, clothAmountIds: 1, masterClothAmountIds: 1, available: 1 } },
      { $sort: { totalAssigned: -1 } }
    ]);

    const results = [];
    for (const g of agg) {
      let masterPool = null;
      if (Array.isArray(g.masterClothAmountIds) && g.masterClothAmountIds.length) {
        const mid = g.masterClothAmountIds[0];
        try { masterPool = await MasterClothAmount.findById(mid).lean(); } catch (e) { masterPool = null; }
      } else {
        if (g.fabricType || g.itemType || g.unit) {
          const q = {};
          if (g.fabricType) q.fabricType = lowerTrim(g.fabricType);
          if (g.itemType) q.itemType = lowerTrim(g.itemType);
          if (g.unit) q.unitType = lowerTrim(g.unit);
          masterPool = await MasterClothAmount.findOne(q).lean().catch(() => null);
        }
      }

      results.push({
        fabricType: g.fabricType ?? null,
        itemType: g.itemType ?? null,
        unit: g.unit ?? null,
        totalAssigned: Number(g.totalAssigned || 0),
        rows: Number(g.rows || 0),
        clothAmountIds: (g.clothAmountIds || []).map(String),
        masterClothAmountIds: (g.masterClothAmountIds || []).map(String),
        available: typeof g.available === 'number' ? g.available : null,
        masterClothAmountId: masterPool ? String(masterPool._id) : null,
        masterBalance: masterPool ? (typeof masterPool.amount === 'number' ? masterPool.amount : 0) : null
      });
    }

    return results;
  } catch (err) {
    console.error('computeMasterTotals failed:', err);
    return [];
  }
};

const assignClothRoll = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { tailorId, assignedDate, clothConsumptions, assignToMaster, masterTailorId } = req.body;
    console.log('assignClothRoll: received body:', req.body);

    if (!tailorId) return res.status(400).json({ message: 'tailorId is required' });
    if (!isValidObjectId(tailorId)) return res.status(400).json({ message: 'tailorId is not a valid id' });

    if (!Array.isArray(clothConsumptions) || clothConsumptions.length === 0) {
      return res.status(400).json({ message: 'clothConsumptions array is required' });
    }

    const tailor = await User.findById(tailorId).lean();
    if (!tailor) return res.status(404).json({ message: 'Tailor not found' });

    // Resolve masterTailorId: prefer payload masterTailorId, else env fallback
    const envMaster = process.env.MASTER_TAILOR_ID;
    const resolvedMasterId = masterTailorId 
    const wantMaster = Boolean(resolvedMasterId);

    const processedConsumptions = [];
    console.log('assignClothRoll: processing clothConsumptions:', clothConsumptions);
    console.log('assignClothRoll: resolvedMasterId:', resolvedMasterId, 'wantMaster:', wantMaster);
    console.log('assignClothRoll: tailorId:', tailorId);

    // Resolve input rows into concrete clothAmountId / rollId rows
    for (let i = 0; i < clothConsumptions.length; i++) {
      const r = clothConsumptions[i];
      if (!r || typeof r !== 'object') {
        return res.status(400).json({ message: `Row ${i + 1}: invalid consumption object` });
      }
      const unitRaw = (r.unitType || r.unit || 'meters');
      const unit = lowerTrim(unitRaw);

      // if explicit ids given, accept them
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

      // otherwise, resolve via fabric/item aggregate against ClothAmount
      const fabricRaw = r.fabricType ?? "";
      const itemRaw = r.itemType ?? "";
      const fabric = lowerTrim(fabricRaw);
      const item = lowerTrim(itemRaw);

      if (!fabric && !item) {
        return res.status(400).json({ message: `Row ${i + 1}: either clothAmountId/rollId must be provided OR fabricType/itemType must be present to resolve an aggregate clothAmount.` });
      }

      const query = {};
      if (fabric) query.fabricType = fabric;
      if (item) query.itemType = item;
      if (unit) query.unitType = unit;

      let matches = await ClothAmount.find(query).sort({ _id: 1 }).lean();
      if ((!matches || matches.length === 0) && (fabric || item)) {
        const relaxedQuery = {};
        if (fabric) relaxedQuery.fabricType = fabric;
        if (item) relaxedQuery.itemType = item;
        const matchesRelaxed = await ClothAmount.find(relaxedQuery).sort({ _id: 1 }).lean();
        if (matchesRelaxed && matchesRelaxed.length) matches = matchesRelaxed;
      }

      if (!matches || matches.length === 0) {
        return res.status(400).json({ message: `Row ${i + 1}: couldn't resolve a ClothAmount for fabric="${fabricRaw}" item="${itemRaw}" unit="${unitRaw}". Provide clothAmountId or create corresponding ClothAmount.` });
      }

      let totalAvailableAcrossMatches = 0;
      matches.forEach(m => { totalAvailableAcrossMatches += (typeof m.amount === 'number' ? m.amount : 0); });

      const requestedAmount = Number(r.amount || 0);
      if (!isFinite(requestedAmount) || requestedAmount <= 0) {
        return res.status(400).json({ message: `Row ${i + 1}: amount must be a positive number` });
      }

      if (requestedAmount > totalAvailableAcrossMatches) {
        return res.status(400).json({ message: `Row ${i + 1}: requested ${requestedAmount} exceeds aggregate available ${totalAvailableAcrossMatches} for matching ClothAmount(s).` });
      }

      // split across matching ClothAmount docs in FIFO (_id asc) manner
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
          unitType: m.unitType,
          amount: Number(deduct)
        });
        remaining -= deduct;
      }

      if (remaining > 0) {
        return res.status(400).json({ message: `Row ${i + 1}: unable to allocate full requested amount (${requestedAmount}), remaining ${remaining}` });
      }
    }

    // Build totals to validate and deduct
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

    const toObjectIds = (arr) => arr.map((x) => new mongoose.Types.ObjectId(String(x)));
    const clothAmountObjectIds = Array.from(clothAmountIdsSet).length ? toObjectIds(Array.from(clothAmountIdsSet)) : [];
    const rollObjectIds = Array.from(rollIdsSet).length ? toObjectIds(Array.from(rollIdsSet)) : [];

    // ---------- Transactional attempt ----------
    try {
      await session.startTransaction();

      // Preload cloth amounts (read-check)
      const clothDocs = clothAmountObjectIds.length ? await ClothAmount.find({ _id: { $in: clothAmountObjectIds } }).session(session) : [];
      const clothMap = {};
      clothDocs.forEach(d => { clothMap[String(d._id)] = d; });

      for (const [id, reqTotal] of Object.entries(totalsByClothAmount)) {
        const doc = clothMap[id];
        if (!doc) { await session.abortTransaction(); return res.status(404).json({ message: `ClothAmount not found: ${id}` }); }
        const avail = typeof doc.amount === 'number' ? doc.amount : 0;
        if (reqTotal > avail) { await session.abortTransaction(); return res.status(400).json({ message: `Requested ${reqTotal} exceeds available ${avail} for ClothAmount ${id}` }); }
      }

      // Preload rolls and referenced cloth amounts
      const rollDocs = rollObjectIds.length ? await ClothRoll.find({ _id: { $in: rollObjectIds } }).session(session) : [];
      const rollMap = {};
      rollDocs.forEach(r => { rollMap[String(r._id)] = r; });

      const clothAmountsReferencedByRolls = new Set();
      for (const [id, reqTotal] of Object.entries(totalsByRoll)) {
        const rollDoc = rollMap[id];
        if (!rollDoc) { await session.abortTransaction(); return res.status(404).json({ message: `ClothRoll not found: ${id}` }); }
        const availRoll = typeof rollDoc.amount === 'number' ? rollDoc.amount : 0;
        if (reqTotal > availRoll) { await session.abortTransaction(); return res.status(400).json({ message: `Requested ${reqTotal} exceeds available ${availRoll} for ClothRoll ${id}` }); }
        if (rollDoc.clothAmountId) clothAmountsReferencedByRolls.add(String(rollDoc.clothAmountId));
      }

      const referencedIds = Array.from(clothAmountsReferencedByRolls).filter(id => !clothMap[id]);
      if (referencedIds.length) {
        const referencedObjectIds = toObjectIds(referencedIds);
        const referencedDocs = await ClothAmount.find({ _id: { $in: referencedObjectIds } }).session(session);
        referencedDocs.forEach(d => { clothMap[String(d._id)] = d; });
      }

      // Validate combined roll+cloth requests
      for (const [rollId, reqTotal] of Object.entries(totalsByRoll)) {
        const rollDoc = rollMap[rollId];
        if (!rollDoc) continue;
        if (rollDoc.clothAmountId) {
          const caId = String(rollDoc.clothAmountId);
          const caDoc = clothMap[caId];
          if (!caDoc) { await session.abortTransaction(); return res.status(404).json({ message: `ClothAmount referenced by roll ${rollId} not found: ${caId}` }); }
          const rollContribution = reqTotal;
          const prevRequestedForCloth = totalsByClothAmount[caId] || 0;
          const totalRequestedAgainstCloth = prevRequestedForCloth + rollContribution;
          const availCA = typeof caDoc.amount === 'number' ? caDoc.amount : 0;
          if (totalRequestedAgainstCloth > availCA) { await session.abortTransaction(); return res.status(400).json({ message: `Requested via roll(${rollId}) + other rows (${totalRequestedAgainstCloth}) exceeds available ${availCA} for ClothAmount ${caId}` }); }
        }
      }

      // --- Deduct clothAmounts atomically inside transaction ---
      const touchedClothAmountIds = new Set();
      for (const [id, reqTotal] of Object.entries(totalsByClothAmount)) {
        const updated = await ClothAmount.findOneAndUpdate(
          { _id: id, amount: { $gte: Number(reqTotal) } },
          { $inc: { amount: -Number(reqTotal) } },
          { new: true, session }
        );
        if (!updated) {
          await session.abortTransaction();
          return res.status(400).json({ message: `Requested ${reqTotal} exceeds available for ClothAmount ${id}` });
        }
        touchedClothAmountIds.add(id);
      }

      // --- Deduct rolls atomically and their referenced clothAmount if any ---
      const touchedRollIds = [];
      for (const [id, reqTotal] of Object.entries(totalsByRoll)) {
        const updatedRoll = await ClothRoll.findOneAndUpdate(
          { _id: id, amount: { $gte: Number(reqTotal) } },
          { $inc: { amount: -Number(reqTotal) } },
          { new: true, session }
        );
        if (!updatedRoll) {
          await session.abortTransaction();
          return res.status(400).json({ message: `Requested ${reqTotal} exceeds available for ClothRoll ${id}` });
        }
        touchedRollIds.push(id);

        if (updatedRoll.clothAmountId) {
          const caId = String(updatedRoll.clothAmountId);
          const updatedCA = await ClothAmount.findOneAndUpdate(
            { _id: caId, amount: { $gte: Number(reqTotal) } },
            { $inc: { amount: -Number(reqTotal) } },
            { new: true, session }
          );
          if (!updatedCA) {
            await session.abortTransaction();
            return res.status(400).json({ message: `Insufficient aggregate amount for ClothAmount ${caId} referenced by roll ${id}` });
          }
          touchedClothAmountIds.add(caId);
        }
      }

      // Create primary assignment (child / target tailor)
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

      const [createdAssignment] = await RollAssignment.create([assignmentData], { session });

      // Optionally create master assignment & credit MasterClothAmount pools (same transaction)
      let masterAssignmentPopulated = null;
      const createdMasterPoolIds = [];
      if (wantMaster || isValidObjectId(resolvedMasterId) || String(resolvedMasterId) !== String(tailorId)) {
        const masterUser = await User.findById(resolvedMasterId).session(session).lean();
        console.log('assignClothRoll: masterUser:', masterUser);
        if (!masterUser) {
          await session.abortTransaction();
          return res.status(404).json({ message: 'Master tailor id provided not found' });
        }

        const masterConsumptions = [];
        for (const c of processedConsumptions) {
          const fabric = normalizeForMaster(c.fabricType);
          const item = normalizeForMaster(c.itemType);
          const unit = normalizeForMaster(c.unitType, 'meters');
          const increment = Number(c.amount || c.approvedAmount || 0);
          if (!isFinite(increment) || increment <= 0) continue;

          const query = {
            masterTailorId: new mongoose.Types.ObjectId(String(resolvedMasterId)),
            fabricType: fabric,
            itemType: item,
            unitType: unit
          };

          const setOnInsert = {
            masterTailorId: new mongoose.Types.ObjectId(String(resolvedMasterId)),
            fabricType: fabric,
            itemType: item,
            unitType: unit,
            clothAmountRef: c.clothAmountId ? new mongoose.Types.ObjectId(String(c.clothAmountId)) : null
          };

          const upsertResp = await MasterClothAmount.findOneAndUpdate(
            query,
            { $inc: { amount: increment }, $setOnInsert: setOnInsert },
            { upsert: true, new: true, session }
          );

          console.log('assignClothRoll: upserted master pool:', upsertResp ? String(upsertResp._id) : upsertResp);
          if (upsertResp && upsertResp._id) createdMasterPoolIds.push(String(upsertResp._id));

          masterConsumptions.push({
            masterClothAmountId: upsertResp ? upsertResp._id : undefined,
            clothAmountId: c.clothAmountId ? c.clothAmountId : undefined,
            rollId: c.rollId ? c.rollId : undefined,
            fabricType: c.fabricType ? String(c.fabricType).trim() : undefined,
            itemType: c.itemType ? String(c.itemType).trim() : undefined,
            unitType: String(c.unitType).trim(),
            amount: Number(c.amount),
            approvedAmount: Number(c.amount),
            parentAssignmentId: createdAssignment._id,
          });
        }

        if (masterConsumptions.length) {
          const masterData = {
            tailorId: resolvedMasterId,
            assignedDate: assignedDate ? new Date(assignedDate) : new Date(),
            clothConsumptions: masterConsumptions,
            status: 'approved',
            requestedBy: req.user?._id || null,
            approvedBy: req.user?._id || null,
            approvedAt: new Date(),
          };

          const [masterAssignment] = await RollAssignment.create([masterData], { session });
          masterAssignmentPopulated = await populateAssignment(masterAssignment._id);
        }
      }

      await session.commitTransaction();
      console.log('Transaction committed successfully for assignment:', String(createdAssignment._id));
      console.log('Touched ClothAmount ids:', Array.from(touchedClothAmountIds));
      console.log('Touched ClothRoll ids:', touchedRollIds);
      console.log('Created MasterClothAmount ids:', createdMasterPoolIds);

      const populated = await populateAssignment(createdAssignment._id);
      const updatedClothAmounts = touchedClothAmountIds.size ? await ClothAmount.find({ _id: { $in: Array.from(touchedClothAmountIds) } }).lean() : [];
      const updatedRolls = touchedRollIds.length ? await ClothRoll.find({ _id: { $in: touchedRollIds } }).lean() : [];
      const masterTotals = (wantMaster && resolvedMasterId) ? await computeMasterTotals(resolvedMasterId).catch(() => []) : await computeMasterTotals(tailorId).catch(() => []);
      const updatedMasterPools = createdMasterPoolIds.length ? await MasterClothAmount.find({ _id: { $in: createdMasterPoolIds } }).lean() : [];

      return res.status(201).json({
        message: 'Assignment created and amounts deducted (transactional)',
        assignment: populated,
        masterAssignment: masterAssignmentPopulated,
        updatedClothAmounts,
        updatedRolls,
        masterTotals,
        updatedMasterPools,
      });
    } catch (txErr) {
      console.error('Transaction attempt failed — falling back to non-transactional flow:', txErr);
      try { await session.abortTransaction(); } catch (e) {}
      // fallback to non-transactional flow below
    }

    // ---------- Non-transactional fallback (keeps same semantics but without session) ----------
    try {
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

      // Create assignment (non-transactional)
      const created = await RollAssignment.create({
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
      });

      const populated = await populateAssignment(created._id);

      // Optionally create master assignment (non-transactional)
      let masterAssignmentPopulated = null;
      const updatedMasterPoolIds = [];
      if (wantMaster || isValidObjectId(resolvedMasterId)) {
        const masterUser = await User.findById(resolvedMasterId).lean();
        console.log('Non-transactional fallback: masterUser:', masterUser);
        if (masterUser) {
          const masterConsumptions = [];
          for (const c of processedConsumptions) {
            const fabric = normalizeForMaster(c.fabricType);
            const item = normalizeForMaster(c.itemType);
            const unit = normalizeForMaster(c.unitType, 'meters');
            const increment = Number(c.amount || c.approvedAmount || 0);
            if (!isFinite(increment) || increment <= 0) continue;

            const query = {
              masterTailorId: new mongoose.Types.ObjectId(String(resolvedMasterId)),
              fabricType: fabric,
              itemType: item,
              unitType: unit
            };
            console.log('Non-transactional master pool query:', query, 'increment:', increment);
            const setOnInsert = {
              masterTailorId: new mongoose.Types.ObjectId(String(resolvedMasterId)),
              fabricType: fabric,
              itemType: item,
              unitType: unit,
              clothAmountRef: c.clothAmountId ? new mongoose.Types.ObjectId(String(c.clothAmountId)) : null
            };

            const upsertResp = await MasterClothAmount.findOneAndUpdate(
              query,
              { $inc: { amount: increment }, $setOnInsert: setOnInsert },
              { upsert: true, new: true }
            );
            console.log('Non-transactional upserted master pool:', upsertResp ? String(upsertResp._id) : upsertResp);
            if (upsertResp && upsertResp._id) updatedMasterPoolIds.push(String(upsertResp._id));

            masterConsumptions.push({
              masterClothAmountId: upsertResp._id,
              clothAmountId: c.clothAmountId ? c.clothAmountId : undefined,
              rollId: c.rollId ? c.rollId : undefined,
              fabricType: c.fabricType ? String(c.fabricType).trim() : undefined,
              itemType: c.itemType ? String(c.itemType).trim() : undefined,
              unitType: String(c.unitType).trim(),
              amount: Number(c.amount),
              approvedAmount: Number(c.amount),
              parentAssignmentId: created._id,
            });
          }
          console.log('Non-transactional masterConsumptions:', masterConsumptions);
          if (masterConsumptions.length) {
            const masterCreated = await RollAssignment.create({
              tailorId: resolvedMasterId,
              assignedDate: assignedDate ? new Date(assignedDate) : new Date(),
              clothConsumptions: masterConsumptions,
              status: 'approved',
              requestedBy: req.user?._id || null,
              approvedBy: req.user?._id || null,
              approvedAt: new Date(),
            });
            masterAssignmentPopulated = await populateAssignment(masterCreated._id);
          }
        }
      }

      const touchedClothAmounts = Array.from(new Set([
        ...Object.keys(totalsByClothAmount || {}),
        ...Array.from(rollIdsSet).map((rId) => (fallbackRollMap && fallbackRollMap[rId] && fallbackRollMap[rId].clothAmountId) || null).filter(Boolean),
      ]));
      console.log('Touched clothAmounts (fallback):', touchedClothAmounts);
      console.log('Touched rolls (fallback):', Array.from(rollIdsSet));
      console.log('Updated master pool ids (fallback):', updatedMasterPoolIds);
      const updatedClothAmounts = touchedClothAmounts.length ? await ClothAmount.find({ _id: { $in: touchedClothAmounts } }).lean() : [];
      const updatedRolls = Array.from(rollIdsSet).length ? await ClothRoll.find({ _id: { $in: Array.from(rollIdsSet) } }).lean() : [];
      const masterTotals = (wantMaster && resolvedMasterId) ? await computeMasterTotals(resolvedMasterId).catch(() => []) : await computeMasterTotals(tailorId).catch(() => []);
      const updatedMasterPools = updatedMasterPoolIds.length ? await MasterClothAmount.find({ _id: { $in: updatedMasterPoolIds } }).lean() : [];
      console.log('Non-transactional fallback completed successfully');
      console.log('masterAssignmentPopulated:', masterAssignmentPopulated);
      console.log('updatedMasterPools:', updatedMasterPools);
      console.log('masterTotals', masterTotals);
      console.log('updatedRolls', updatedRolls);
      console.log('updatedClothAmounts', updatedClothAmounts);
      return res.status(201).json({
        message: 'Assignment created and amounts deducted (non-transactional fallback)',
        assignment: populated,
        masterAssignment: masterAssignmentPopulated,
        updatedClothAmounts,
        updatedRolls,
        masterTotals,
        updatedMasterPools,
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
