// controllers/cloths/addClothRoll.js
import mongoose from "mongoose";
import ClothAmount from "../../models/clothAmount.js";
import ClothRoll from "../../models/clothRoll.js";

const trimOrEmpty = (v) => (v === undefined || v === null ? "" : String(v).trim());
const capitalizeFirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

/**
 * POST /api/cloths/add
 * Body expected exactly from frontend:
 * { rollNo?, amount, fabricType, unitType, itemType, createdBy?, primaryField? }
 *
 * - primaryField (optional): "fabric" | "item" — if provided server will use that to decide grouping.
 * - If primaryField not provided, controller will prefer itemType when it's non-empty (so frontend
 *   can simply send itemType and the server will treat it as item grouping).
 *
 * Important: THIS CONTROLLER PRESERVES THE ORIGINAL CASE (no lowercasing) — only trims inputs.
 */
const addClothRoll = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let { rollNo, amount, fabricType, unitType, itemType, createdBy, primaryField } = req.body;

    // preserve case — only trim
    fabricType = trimOrEmpty(fabricType);
    itemType = trimOrEmpty(itemType);
    unitType = trimOrEmpty(unitType) || "meters";
    rollNo = rollNo === undefined || rollNo === null ? undefined : String(rollNo).trim();

    // validate amount
    const amountNum = Number(amount);
    if (amount === undefined || isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ message: "amount must be a positive number" });
    }

    // uniqueness check for rollNo if provided
    if (rollNo) {
      const existsRoll = await ClothRoll.findOne({ rollNo }).lean();
      if (existsRoll) {
        return res.status(409).json({ message: "This cloth roll already exists" });
      }
    }

    // decide grouping fields based on primaryField or heuristics
    const placeholderSet = new Set(["", "unknown", "n/a", "-", "none"]);

    const fabricNorm = fabricType.trim();
    const itemNorm = itemType.trim();

    const isFabricMeaningful = fabricNorm.length > 0 && !placeholderSet.has(fabricNorm.toLowerCase());
    const isItemMeaningful = itemNorm.length > 0 && !placeholderSet.has(itemNorm.toLowerCase());

    // default grouping: prefer item when provided AND meaningful
    // if primaryField provided, obey it.
    let groupBy = "fabric"; // default
    if (primaryField === "item") groupBy = "item";
    else if (primaryField === "fabric") groupBy = "fabric";
    else {
      // heuristics: prefer item if meaningful
      if (isItemMeaningful) groupBy = "item";
      else if (isFabricMeaningful) groupBy = "fabric";
      else groupBy = "fabric";
    }

    // Build filter for ClothAmount upsert according to grouping choice
    const filter = {};
    if (groupBy === "fabric") {
      if (isFabricMeaningful) filter.fabricType = fabricType;
      if (isItemMeaningful) filter.itemType = itemType;
    } else {
      // groupBy === "item"
      if (isItemMeaningful) filter.itemType = itemType;
      // don't include fabric as grouping key to avoid ambiguous aggregates
    }
    filter.unitType = unitType;

    // Prepare update and setOnInsert using the exact payload casing
    const update = { $inc: { amount: amountNum } };
    const setOnInsert = {};
    if (isFabricMeaningful) setOnInsert.fabricType = fabricType;
    if (isItemMeaningful) setOnInsert.itemType = itemType;
    setOnInsert.unitType = unitType;
    update.$setOnInsert = setOnInsert;

    const opts = { new: true, upsert: true, setDefaultsOnInsert: true };

    // Log for debugging: show exactly what we got and how we will group
    console.log("addClothRoll incoming:", { rollNo, amount: amountNum, fabricType, itemType, unitType, primaryField, groupBy, filter });

    // Use transaction if available
    if (mongoose.connection.readyState === 1 && typeof session.startTransaction === "function") {
      console.log("addClothRoll using transaction");
      session.startTransaction();
      try {
        const clothAmountDoc = await ClothAmount.findOneAndUpdate(filter, update, { ...opts, session }).lean();
        console.log("addClothRoll updated ClothAmount =>", clothAmountDoc);
        const rollDoc = await new ClothRoll({
          rollNo,
          amount: amountNum,
          fabricType,
          itemType,
          unitType,
          createdBy,
          clothAmountRef: clothAmountDoc._id,
        }).save({ session });
        console.log("addClothRoll created roll =>", rollDoc);
        await session.commitTransaction();

        session.endSession();

        const result = rollDoc.toObject();
        result.fabricType = result.fabricType ? result.fabricType.trim() : "";
        result.itemType = result.itemType ? result.itemType.trim() : "";

        return res.status(201).json({
          message: "Successfully added the cloth roll (aggregated total updated)",
          data: result,
        });
      } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error("Transaction error in addClothRoll:", err);
        if (err && err.code === 11000) {
          return res.status(409).json({ message: "Duplicate key error", error: err.message });
        }
        throw err;
      }
    }

    // Fallback (no transaction)
    const clothAmountDoc = await ClothAmount.findOneAndUpdate(filter, update, opts).lean();
    console.log("addClothRoll updated ClothAmount (no transaction) =>", clothAmountDoc);

    try {
      const rollDoc = await new ClothRoll({
        rollNo,
        amount: amountNum,
        fabricType,
        itemType,
        unitType,
        createdBy,
        clothAmountRef: clothAmountDoc._id,
      }).save();

      const result = rollDoc.toObject();
      result.fabricType = result.fabricType ? result.fabricType.trim() : "";
      result.itemType = result.itemType ? result.itemType.trim() : "";
      console.log("addClothRoll created roll (no transaction) =>", result);

      return res.status(201).json({
        message: "Successfully added the cloth roll (aggregated total updated)",
        data: result,
      });
    } catch (err) {
      console.error("Error saving ClothRoll (fallback):", err);
      if (err && err.code === 11000) {
        try {
          await ClothAmount.findOneAndUpdate(filter, { $inc: { amount: -amountNum } });
        } catch (e) {
          console.error("Error rolling back ClothAmount increment:", e);
        }
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
