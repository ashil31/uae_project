import ProductionLog from "../../models/Production.js";
import Tailor from "../../models/tailor.js";
import Order from "../../models/order.js";

export const addLog = async (req, res) => {
  try {
    const { tailorId, orderId, unitsCompleted, materialsUsed, date, note } = req.body;

    if (!tailorId || !orderId || !unitsCompleted) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    // 🔎 Validate Tailor
    const tailor = await Tailor.findById(tailorId);
    if (!tailor) {
      return res.status(404).json({ message: "Tailor not found" });
    }

    // 🔎 Validate Order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const log = new ProductionLog({
      tailorId,
      orderId,
      unitsCompleted,
      materialsUsed,
      date: date || new Date(),
      note,
    });

    const savedLog = await log.save();

    return res.status(201).json({
      message: "Log added successfully",
      log: savedLog,
    });
  } catch (error) {
    console.error("Error in addLog:", error.message);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
};

/**
 * @desc Get all logs
 * @route GET /api/logs
 */
export const getLogs = async (req, res) => {
  try {
    const logs = await ProductionLog.find()
      .populate("tailorId", "name email")
      .populate("orderId", "products totalAmount");
    return res.status(200).json({ success: true, logs });
  } catch (error) {
    console.error("Error in getLogs:", error.message);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
};

/**
 * @desc Get single log by ID
 * @route GET /api/logs/:id
 */
export const getLogById = async (req, res) => {
  try {
    const log = await ProductionLog.findById(req.params.id)
      .populate("tailorId", "name email")
      .populate("orderId", "products totalAmount");

    if (!log) {
      return res.status(404).json({ message: "Log not found" });
    }

    return res.status(200).json({ success: true, log });
  } catch (error) {
    console.error("Error in getLogById:", error.message);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
};

/**
 * @desc Get logs for a specific tailor
 * @route GET /api/logs/tailor/:tailorId
 */
export const getTailorLogs = async (req, res) => {
  try {
    const logs = await ProductionLog.find({ tailorId: req.params.tailorId })
      .populate("orderId", "products totalAmount");

    return res.status(200).json({ success: true, logs });
  } catch (error) {
    console.error("Error in getTailorLogs:", error.message);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
};

/**
 * @desc Update a log
 * @route PUT /api/logs/:id
 */
export const updateLog = async (req, res) => {
  try {
    const { unitsCompleted, materialsUsed, date, note } = req.body;

    const log = await ProductionLog.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ message: "Log not found" });
    }

    if (unitsCompleted !== undefined) log.unitsCompleted = unitsCompleted;
    if (materialsUsed !== undefined) log.materialsUsed = materialsUsed;
    if (date !== undefined) log.date = date;
    if (note !== undefined) log.note = note;

    await log.save();

    return res.status(200).json({ message: "Log updated successfully", log });
  } catch (error) {
    console.error("Error in updateLog:", error.message);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
};

/**
 * @desc Delete a log
 * @route DELETE /api/logs/:id
 */
export const deleteLog = async (req, res) => {
  try {
    const log = await ProductionLog.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ message: "Log not found" });
    }

    await log.deleteOne();

    return res.status(200).json({ message: "Log deleted successfully" });
  } catch (error) {
    console.error("Error in deleteLog:", error.message);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
};