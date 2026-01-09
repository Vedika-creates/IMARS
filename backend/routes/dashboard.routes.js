import express from 'express';
const router = express.Router();
import dashboardController from '../controllers/dashboard.controller.js';

// Get dashboard statistics
router.get('/stats', dashboardController.getDashboardStats);

// Get recent alerts
router.get('/alerts', dashboardController.getRecentAlerts);

export default router;
