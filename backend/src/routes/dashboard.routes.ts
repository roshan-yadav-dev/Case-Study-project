import { Router } from "express";
import { UserRole } from "../../generated/prisma";
import { DashboardController } from "../controllers/dashboard.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";

const router = Router();

const DASHBOARD_READ_ROLES = [
    UserRole.ADMIN,
    UserRole.SALES,
    UserRole.WAREHOUSE,
    UserRole.ACCOUNTS,
];

// All dashboard endpoints require authentication and read access for all 4 roles
router.use(authenticate);
router.use(authorizeRoles(...DASHBOARD_READ_ROLES));

// GET /api/dashboard/summary
router.get("/summary", DashboardController.getSummary);

// GET /api/dashboard/sales-summary
router.get("/sales-summary", DashboardController.getSalesSummary);

// GET /api/dashboard/low-stock
router.get("/low-stock", DashboardController.getLowStock);

// GET /api/dashboard/recent-activity
router.get("/recent-activity", DashboardController.getRecentActivity);

export default router;
