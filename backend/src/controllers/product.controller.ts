import { Request, Response } from "express";
import { ConflictError, NotFoundError, ProductService } from "../services/product.service";
import {
    createProductSchema,
    productIdParamSchema,
    productQuerySchema,
    updateProductSchema,
} from "../validators/product.validator";

export class ProductController {
    /**
     * POST /api/products
     * Create a new product item in the catalog.
     */
    static async createProduct(req: Request, res: Response): Promise<void> {
        try {
            const parseResult = createProductSchema.safeParse(req.body);

            if (!parseResult.success) {
                const formattedErrors = parseResult.error.issues.map((i) => i.message).join(", ");
                res.status(400).json({
                    success: false,
                    message: formattedErrors || "Invalid product creation data",
                });
                return;
            }

            const product = await ProductService.createProduct(parseResult.data);

            res.status(201).json({
                success: true,
                message: "Product created successfully",
                data: { product },
            });
        } catch (error: any) {
            if (error instanceof ConflictError) {
                res.status(409).json({
                    success: false,
                    message: error.message,
                });
                return;
            }

            res.status(500).json({
                success: false,
                message: "Failed to create product",
            });
        }
    }

    /**
     * GET /api/products
     * List products with pagination, search, category, location, and lowStock filtering.
     */
    static async getProducts(req: Request, res: Response): Promise<void> {
        try {
            const queryResult = productQuerySchema.safeParse(req.query);

            if (!queryResult.success) {
                const formattedErrors = queryResult.error.issues.map((i) => i.message).join(", ");
                res.status(400).json({
                    success: false,
                    message: formattedErrors || "Invalid query parameters",
                });
                return;
            }

            const result = await ProductService.getProducts(queryResult.data);

            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: "Failed to retrieve products",
            });
        }
    }

    /**
     * GET /api/products/:id
     * Retrieve detailed profile for a single product.
     */
    static async getProductById(req: Request, res: Response): Promise<void> {
        try {
            const paramResult = productIdParamSchema.safeParse(req.params);

            if (!paramResult.success) {
                res.status(400).json({
                    success: false,
                    message: "Invalid product ID",
                });
                return;
            }

            const product = await ProductService.getProductById(paramResult.data.id);

            res.status(200).json({
                success: true,
                data: { product },
            });
        } catch (error: any) {
            if (error instanceof NotFoundError) {
                res.status(404).json({
                    success: false,
                    message: error.message,
                });
                return;
            }

            res.status(500).json({
                success: false,
                message: "Failed to retrieve product detail",
            });
        }
    }

    /**
     * PATCH /api/products/:id
     * Update product details (excluding currentStock).
     */
    static async updateProduct(req: Request, res: Response): Promise<void> {
        try {
            const paramResult = productIdParamSchema.safeParse(req.params);

            if (!paramResult.success) {
                res.status(400).json({
                    success: false,
                    message: "Invalid product ID",
                });
                return;
            }

            // Reject direct currentStock update attempts
            if (req.body && "currentStock" in req.body) {
                res.status(400).json({
                    success: false,
                    message: "Stock updates must be performed via inventory stock-in operations",
                });
                return;
            }

            const bodyResult = updateProductSchema.safeParse(req.body);

            if (!bodyResult.success) {
                const formattedErrors = bodyResult.error.issues.map((i) => i.message).join(", ");
                res.status(400).json({
                    success: false,
                    message: formattedErrors || "At least one updateable field must be provided",
                });
                return;
            }

            const product = await ProductService.updateProduct(paramResult.data.id, bodyResult.data);

            res.status(200).json({
                success: true,
                message: "Product updated successfully",
                data: { product },
            });
        } catch (error: any) {
            if (error instanceof NotFoundError) {
                res.status(404).json({
                    success: false,
                    message: error.message,
                });
                return;
            }

            if (error instanceof ConflictError) {
                res.status(409).json({
                    success: false,
                    message: error.message,
                });
                return;
            }

            res.status(500).json({
                success: false,
                message: "Failed to update product",
            });
        }
    }
}
