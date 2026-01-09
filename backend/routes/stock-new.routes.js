import express from "express";
import { getStockStatus, getStockMovements, getCurrentStock } from "../controllers/stock-new.controller.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply JWT middleware to all routes
router.use(verifyToken);

// GET /api/stock/status - Get stock status
router.get("/status", getStockStatus);

// GET /api/stock/movements - Get stock movements
router.get("/movements", getStockMovements);

// GET /api/stock/current - Get current stock for item
router.get("/current", getCurrentStock);

export default router;
