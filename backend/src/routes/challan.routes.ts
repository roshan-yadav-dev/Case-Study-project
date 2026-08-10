import { Router } from "express";
import { UserRole } from "../../generated/prisma";
import { ChallanController } from "../controllers/challan.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";

const router = Router();

const READ_ROLES = [UserRole.ADMIN, UserRole.SALES, UserRole.WAREHOUSE, UserRole.ACCOUNTS];
const WRITE_ROLES = [UserRole.ADMIN, UserRole.SALES];

// All challan routes require valid JWT authentication
router.use(authenticate);

// Create DRAFT Sales Challan (ADMIN, SALES)
router.post("/", authorizeRoles(...WRITE_ROLES), ChallanController.createChallan);

// List Sales Challans with search and status filtering (ALL 4 ROLES)
router.get("/", authorizeRoles(...READ_ROLES), ChallanController.getChallans);

// Get Challan Detail with Product Snapshots (ALL 4 ROLES)
router.get("/:id", authorizeRoles(...READ_ROLES), ChallanController.getChallanById);

// Update DRAFT Sales Challan (ADMIN, SALES)
router.patch("/:id", authorizeRoles(...WRITE_ROLES), ChallanController.updateDraftChallan);

// Confirm Sales Challan & Execute Inventory Stock OUT (ADMIN, SALES)
router.post("/:id/confirm", authorizeRoles(...WRITE_ROLES), ChallanController.confirmChallan);

// Cancel DRAFT Sales Challan (ADMIN, SALES)
router.post("/:id/cancel", authorizeRoles(...WRITE_ROLES), ChallanController.cancelChallan);

export default router;
