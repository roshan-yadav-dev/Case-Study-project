import { Router } from "express";
import { UserRole } from "../../generated/prisma";
import { AuthController } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";

const router = Router();

// Public authentication endpoint
router.post("/login", AuthController.login);

// Protected user profile endpoint
router.get("/me", authenticate, AuthController.me);

// Temporary RBAC verification endpoints
router.get("/test/admin", authenticate, authorizeRoles(UserRole.ADMIN), AuthController.testAdmin);
router.get("/test/sales", authenticate, authorizeRoles(UserRole.SALES), AuthController.testSales);
router.get("/test/warehouse", authenticate, authorizeRoles(UserRole.WAREHOUSE), AuthController.testWarehouse);
router.get("/test/accounts", authenticate, authorizeRoles(UserRole.ACCOUNTS), AuthController.testAccounts);

export default router;
