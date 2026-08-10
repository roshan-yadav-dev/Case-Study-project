import { Router } from "express";
import { UserRole } from "../../generated/prisma";
import { ProductController } from "../controllers/product.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";

const router = Router();

const READ_ROLES = [UserRole.ADMIN, UserRole.SALES, UserRole.WAREHOUSE, UserRole.ACCOUNTS];
const WRITE_ROLES = [UserRole.ADMIN, UserRole.WAREHOUSE];

// All product endpoints require valid JWT authentication
router.use(authenticate);

// Create Product (ADMIN, WAREHOUSE)
router.post("/", authorizeRoles(...WRITE_ROLES), ProductController.createProduct);

// List Products with pagination, search, category, location, and lowStock filtering (ALL 4 ROLES)
router.get("/", authorizeRoles(...READ_ROLES), ProductController.getProducts);

// Get Product Detail (ALL 4 ROLES)
router.get("/:id", authorizeRoles(...READ_ROLES), ProductController.getProductById);

// Update Product details excluding stock (ADMIN, WAREHOUSE)
router.patch("/:id", authorizeRoles(...WRITE_ROLES), ProductController.updateProduct);

export default router;
