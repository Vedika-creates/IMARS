import express from "express";
import { getReorderRules, createReorderRule, getAlerts, runReorderCheck } from "../controllers/reorder-new.controller.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply JWT middleware to all routes
router.use(verifyToken);

// GET /api/reorder/rules - Get reorder rules
router.get("/rules", getReorderRules);

// POST /api/reorder/rules - Create reorder rule
router.post("/rules", createReorderRule);

// GET /api/reorder/alerts - Get alerts
router.get("/alerts", getAlerts);

// GET /api/reorder/check - Run reorder check
router.get("/check", runReorderCheck);

export default router;
