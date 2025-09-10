// controllers/cloths/addClothRoll.js
import mongoose from "mongoose";
import ClothAmount from "../../models/clothAmount.js";
import ClothRoll from "../../models/clothRoll.js";
import MasterClothAmount from "../../models/masterClothAmount.js";

const normalize = (v) => (v === undefined || v === null ? undefined : String(v).trim().toLowerCase());
const capitalizeFirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const isValidObjectId = (id) => { if (!id) return false; try { return mongoose.Types.ObjectId.isValid(String(id)); } catch (e) { return false; } };

/**
 * POST /api/cloths/add
 * Body: { rollNo?, amount, fabricType, unitType, itemType, createdBy?, creditMasterTailorId? }
 */
const addClothRoll = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let { rollNo, amount, fabricType, unitType, itemType, createdBy, creditMasterTailorId } = req.body;

    // normalize
    fabricType = normalize(fabricType) || "";
    itemType = normalize(itemType) || "";
    unitType = normalize(unitType) || "meters";
    rollNo = rollNo === undefined || rollNo === null ? undefined : String(rollNo).trim();

    // validate
    const amountNum = Number(amount);
    if (amount === undefined || isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ message: "amount must be a positive number" });
    }

    // if rollNo provided, ensure uniqueness before creating audit
    if (rollNo) {
      const existsRoll = await ClothRoll.findOne({ rollNo }).lean();
      if (existsRoll) {
        return res.status(409).json({ message: "This cloth roll already exists" });
      }
    }

    // aggregator filter & update (atomic upsert)
    const filter = { fabricType, itemType, unitType };
    const update = {
      $inc: { amount: amountNum },
      $setOnInsert: { fabricType, itemType, unitType },
    };
    const opts = { new: true, upsert: true, setDefaultsOnInsert: true };

    // Use transaction if available
    if (mongoose.connection.readyState === 1 && typeof session.startTransaction === "function") {
      session.startTransaction();
      try {
        const clothAmountDoc = await ClothAmount.findOneAndUpdate(filter, update, { ...opts, session }).lean();

        // create audit roll (use ClothRoll model)
        const rollDoc = await new ClothRoll({
          rollNo,
          amount: amountNum,
          fabricType,
          itemType,
          unitType,
          createdBy,
          clothAmountRef: clothAmountDoc._id
        }).save({ session });

        // optionally credit master stock
        if (creditMasterTailorId && isValidObjectId(creditMasterTailorId)) {
          const masterFilter = { masterTailorId: creditMasterTailorId, fabricType, itemType, unitType };
          const masterUpdate = { $inc: { amount: amountNum }, $setOnInsert: { masterTailorId: creditMasterTailorId, fabricType, itemType, unitType, clothAmountRef: clothAmountDoc._id } };
          await MasterClothAmount.findOneAndUpdate(masterFilter, masterUpdate, { upsert: true, new: true, setDefaultsOnInsert: true, session });
        }

        await session.commitTransaction();
        session.endSession();

        const result = rollDoc.toObject();
        result.fabricType = capitalizeFirst(result.fabricType);
        result.itemType = capitalizeFirst(result.itemType);

        return res.status(201).json({
          message: "Successfully added the cloth roll (aggregated total updated)",
          data: result,
        });
      } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error("Transaction error:", err);
        if (err && err.code === 11000) {
          return res.status(409).json({ message: "Duplicate key error", error: err.message });
        }
        throw err;
      }
    }

    // Fallback: no transactions — do upsert then create roll, rollback on roll error
    const clothAmountDoc = await ClothAmount.findOneAndUpdate(filter, update, opts).lean();

    try {
      const rollDoc = await new ClothRoll({
        rollNo,
        amount: amountNum,
        fabricType,
        itemType,
        unitType,
        createdBy,
        clothAmountRef: clothAmountDoc._id
      }).save();

      // credit master if requested (best-effort)
      if (creditMasterTailorId && isValidObjectId(creditMasterTailorId)) {
        const masterFilter = { masterTailorId: creditMasterTailorId, fabricType, itemType, unitType };
        const masterUpdate = { $inc: { amount: amountNum }, $setOnInsert: { masterTailorId: creditMasterTailorId, fabricType, itemType, unitType, clothAmountRef: clothAmountDoc._id } };
        await MasterClothAmount.findOneAndUpdate(masterFilter, masterUpdate, { upsert: true, new: true, setDefaultsOnInsert: true });
      }

      const result = rollDoc.toObject();
      result.fabricType = capitalizeFirst(result.fabricType);
      result.itemType = capitalizeFirst(result.itemType);

      return res.status(201).json({
        message: "Successfully added the cloth roll (aggregated total updated)",
        data: result,
      });
    } catch (err) {
      console.error("Error saving ClothRoll (fallback):", err);
      // rollback increment if duplicate rollNo or other unique error
      if (err && err.code === 11000) {
        await ClothAmount.findOneAndUpdate(filter, { $inc: { amount: -amountNum } });
        return res.status(409).json({ message: "rollNo already exists, operation aborted", error: err.message });
      }
      throw err;
    }
  } catch (error) {
    console.error("addClothRoll error:", error);
    return res.status(500).json({ message: "Something went wrong", error: error.message });
  }
};

export default addClothRoll;




