import express from "express";
import {
  runReorderCheckController,
  createAutoRequisition,
  getLowStockAlertsController,
  getExpiryAlertsController,
  getReorderRules,
  createReorderRule,
  updateReorderRule,
  deleteReorderRule,
  getAlerts,
  acknowledgeAlert,
  resolveAlert
} from "../controllers/reorder.controller.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Reorder check and automation
router.get("/run", verifyToken, runReorderCheckController);
router.post("/auto-requisition", verifyToken, createAutoRequisition);

// Alerts
router.get("/alerts", verifyToken, getAlerts);
router.get("/low-stock", verifyToken, getLowStockAlertsController);
router.get("/expiry", verifyToken, getExpiryAlertsController);
router.patch("/alerts/:id/acknowledge", verifyToken, acknowledgeAlert);
router.patch("/alerts/:id/resolve", verifyToken, resolveAlert);

// Reorder rules
router.get("/rules", verifyToken, getReorderRules);
router.post("/rules", verifyToken, createReorderRule);
router.put("/rules/:id", verifyToken, updateReorderRule);
router.delete("/rules/:id", verifyToken, deleteReorderRule);

export default router;
