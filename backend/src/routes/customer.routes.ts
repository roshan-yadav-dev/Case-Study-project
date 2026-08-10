import { Router } from "express";
import { UserRole } from "../../generated/prisma";
import { CustomerController } from "../controllers/customer.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";

const router = Router();

const READ_ROLES = [UserRole.ADMIN, UserRole.SALES, UserRole.WAREHOUSE, UserRole.ACCOUNTS];
const WRITE_ROLES = [UserRole.ADMIN, UserRole.SALES];

// All routes require valid JWT authentication
router.use(authenticate);

// Create Customer (ADMIN, SALES)
router.post("/", authorizeRoles(...WRITE_ROLES), CustomerController.createCustomer);

// List Customers with pagination, search, status & type filter (ALL 4 ROLES)
router.get("/", authorizeRoles(...READ_ROLES), CustomerController.getCustomers);

// Get Customer Detail + Follow-Up History (ALL 4 ROLES)
router.get("/:id", authorizeRoles(...READ_ROLES), CustomerController.getCustomerById);

// Update Customer (ADMIN, SALES)
router.patch("/:id", authorizeRoles(...WRITE_ROLES), CustomerController.updateCustomer);

// Add Follow-Up Note & Update Customer followUpDate (ADMIN, SALES)
router.post("/:id/followups", authorizeRoles(...WRITE_ROLES), CustomerController.addFollowUp);

export default router;
