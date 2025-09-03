import express from "express";
import AdminRoute from '../../middlewares/AdminRoute.js';
import {
  addLog,
  getLogs,
  updateLog,
  getTailorLogs,} from "../../controllers/Production/productionLogController.js";

const router = express.Router();

// ➤ Add a new log
router.post("/",AdminRoute, addLog);

// ➤ Get all logs
router.get("/",AdminRoute, getLogs);

// ➤ Update a log
router.put("/:logId",AdminRoute, updateLog);

// ➤ Get logs for a specific tailor
router.get("/tailor/:tailorId",AdminRoute, getTailorLogs);

export default router;
