import { Request, Response } from "express";
import { InventoryService } from "../services/inventory.service";
import { NotFoundError } from "../services/product.service";
import {
    inventoryProductIdParamSchema,
    inventoryQuerySchema,
    movementQuerySchema,
    stockInSchema,
} from "../validators/inventory.validator";

export class InventoryController {
    /**
     * GET /api/inventory
     * Retrieve paginated inventory summary.
     */
    static async getInventory(req: Request, res: Response): Promise<void> {
        try {
            const queryResult = inventoryQuerySchema.safeParse(req.query);

            if (!queryResult.success) {
                const formattedErrors = queryResult.error.issues.map((i) => i.message).join(", ");
                res.status(400).json({
                    success: false,
                    message: formattedErrors || "Invalid query parameters",
                });
                return;
            }

            const result = await InventoryService.getInventory(queryResult.data);

            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: "Failed to retrieve inventory",
            });
        }
    }

    /**
     * GET /api/inventory/low-stock
     * Retrieve list of products with currentStock <= minimumStock.
     */
    static async getLowStockInventory(req: Request, res: Response): Promise<void> {
        try {
            const queryResult = inventoryQuerySchema.safeParse(req.query);

            if (!queryResult.success) {
                const formattedErrors = queryResult.error.issues.map((i) => i.message).join(", ");
                res.status(400).json({
                    success: false,
                    message: formattedErrors || "Invalid query parameters",
                });
                return;
            }

            const result = await InventoryService.getLowStockInventory(queryResult.data);

            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: "Failed to retrieve low stock inventory",
            });
        }
    }

    /**
     * POST /api/inventory/:productId/stock-in
     * Perform an inbound stock addition operation.
     */
    static async stockIn(req: Request, res: Response): Promise<void> {
        try {
            const paramResult = inventoryProductIdParamSchema.safeParse(req.params);

            if (!paramResult.success) {
                res.status(400).json({
                    success: false,
                    message: "Invalid product ID",
                });
                return;
            }

            const bodyResult = stockInSchema.safeParse(req.body);

            if (!bodyResult.success) {
                const formattedErrors = bodyResult.error.issues.map((i) => i.message).join(", ");
                res.status(400).json({
                    success: false,
                    message: formattedErrors || "Invalid stock-in payload",
                });
                return;
            }

            const createdBy = req.user?.id;
            if (!createdBy) {
                res.status(401).json({
                    success: false,
                    message: "Authentication required",
                });
                return;
            }

            const result = await InventoryService.stockIn(
                paramResult.data.productId,
                bodyResult.data,
                createdBy
            );

            res.status(201).json({
                success: true,
                message: "Stock added successfully",
                data: result,
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
                message: "Failed to process stock-in operation",
            });
        }
    }

    /**
     * GET /api/inventory/:productId/movements
     * Retrieve paginated stock movement audit trail for a product.
     */
    static async getMovements(req: Request, res: Response): Promise<void> {
        try {
            const paramResult = inventoryProductIdParamSchema.safeParse(req.params);

            if (!paramResult.success) {
                res.status(400).json({
                    success: false,
                    message: "Invalid product ID",
                });
                return;
            }

            const queryResult = movementQuerySchema.safeParse(req.query);

            if (!queryResult.success) {
                const formattedErrors = queryResult.error.issues.map((i) => i.message).join(", ");
                res.status(400).json({
                    success: false,
                    message: formattedErrors || "Invalid query parameters",
                });
                return;
            }

            const result = await InventoryService.getMovements(
                paramResult.data.productId,
                queryResult.data
            );

            res.status(200).json({
                success: true,
                data: result,
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
                message: "Failed to retrieve stock movement history",
            });
        }
    }
}
