import { Router } from "express";
import { UserRole } from "../../generated/prisma";
import { InventoryController } from "../controllers/inventory.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";

const router = Router();

const READ_ROLES = [UserRole.ADMIN, UserRole.SALES, UserRole.WAREHOUSE, UserRole.ACCOUNTS];
const STOCK_IN_ROLES = [UserRole.ADMIN, UserRole.WAREHOUSE];

// All inventory endpoints require valid JWT authentication
router.use(authenticate);

// Get inventory summary list (ALL 4 ROLES)
router.get("/", authorizeRoles(...READ_ROLES), InventoryController.getInventory);

// Get low stock products (ALL 4 ROLES)
router.get("/low-stock", authorizeRoles(...READ_ROLES), InventoryController.getLowStockInventory);

// Get stock movement history for product (ALL 4 ROLES)
router.get("/:productId/movements", authorizeRoles(...READ_ROLES), InventoryController.getMovements);

// Perform Stock IN operation (ADMIN, WAREHOUSE)
router.post("/:productId/stock-in", authorizeRoles(...STOCK_IN_ROLES), InventoryController.stockIn);

export default router;
