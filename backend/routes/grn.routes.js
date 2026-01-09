import express from "express";
import {
  createGRN,
  getGRNs,
  getGRNById,
  updateGRN,
  updateGRNItem,
  createQualityCheck,
  getGRNDashboard,
  getPOItemsForGRN
} from "../controllers/grn.controller.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// GRN Dashboard
router.get("/dashboard", verifyToken, getGRNDashboard);

// GRN CRUD operations
router.get("/", verifyToken, getGRNs);
router.get("/:id", verifyToken, getGRNById);
router.post("/", verifyToken, createGRN);
router.put("/:id", verifyToken, updateGRN);

// GRN Items operations
router.put("/items/:id", verifyToken, updateGRNItem);

// Quality Check operations
router.post("/quality-checks", verifyToken, createQualityCheck);

// PO Items for GRN creation
router.get("/po/:po_id/items", verifyToken, getPOItemsForGRN);

export default router;
