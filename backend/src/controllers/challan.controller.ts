import { Request, Response } from "express";
import {
    BadRequestError,
    ChallanService,
    ConflictError,
    InsufficientStockError,
    NotFoundError,
} from "../services/challan.service";
import {
    challanIdParamSchema,
    challanQuerySchema,
    createChallanSchema,
    updateChallanSchema,
} from "../validators/challan.validator";

export class ChallanController {
    /**
     * POST /api/challans
     * Create a new DRAFT Sales Challan.
     */
    static async createChallan(req: Request, res: Response): Promise<void> {
        try {
            const parseResult = createChallanSchema.safeParse(req.body);

            if (!parseResult.success) {
                const formattedErrors = parseResult.error.issues.map((i) => i.message).join(", ");
                res.status(400).json({
                    success: false,
                    message: formattedErrors || "Invalid challan creation payload",
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

            const challan = await ChallanService.createChallan(parseResult.data, createdBy);

            res.status(201).json({
                success: true,
                message: "Sales challan created successfully",
                data: { challan },
            });
        } catch (error: any) {
            if (error instanceof NotFoundError) {
                res.status(404).json({
                    success: false,
                    message: error.message,
                });
                return;
            }

            if (error instanceof BadRequestError) {
                res.status(400).json({
                    success: false,
                    message: error.message,
                });
                return;
            }

            res.status(500).json({
                success: false,
                message: "Failed to create sales challan",
            });
        }
    }

    /**
     * GET /api/challans
     * List sales challans with search and status filtering.
     */
    static async getChallans(req: Request, res: Response): Promise<void> {
        try {
            const queryResult = challanQuerySchema.safeParse(req.query);

            if (!queryResult.success) {
                const formattedErrors = queryResult.error.issues.map((i) => i.message).join(", ");
                res.status(400).json({
                    success: false,
                    message: formattedErrors || "Invalid query parameters",
                });
                return;
            }

            const result = await ChallanService.getChallans(queryResult.data);

            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: "Failed to retrieve sales challans",
            });
        }
    }

    /**
     * GET /api/challans/:id
     * Retrieve complete details and line item snapshots for a single sales challan.
     */
    static async getChallanById(req: Request, res: Response): Promise<void> {
        try {
            const paramResult = challanIdParamSchema.safeParse(req.params);

            if (!paramResult.success) {
                res.status(400).json({
                    success: false,
                    message: "Invalid challan ID",
                });
                return;
            }

            const challan = await ChallanService.getChallanById(paramResult.data.id);

            res.status(200).json({
                success: true,
                data: { challan },
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
                message: "Failed to retrieve sales challan detail",
            });
        }
    }

    /**
     * PATCH /api/challans/:id
     * Update an unconfirmed DRAFT sales challan.
     */
    static async updateDraftChallan(req: Request, res: Response): Promise<void> {
        try {
            const paramResult = challanIdParamSchema.safeParse(req.params);

            if (!paramResult.success) {
                res.status(400).json({
                    success: false,
                    message: "Invalid challan ID",
                });
                return;
            }

            const bodyResult = updateChallanSchema.safeParse(req.body);

            if (!bodyResult.success) {
                const formattedErrors = bodyResult.error.issues.map((i) => i.message).join(", ");
                res.status(400).json({
                    success: false,
                    message: formattedErrors || "Invalid update payload",
                });
                return;
            }

            const challan = await ChallanService.updateDraftChallan(paramResult.data.id, bodyResult.data);

            res.status(200).json({
                success: true,
                message: "Challan updated successfully",
                data: { challan },
            });
        } catch (error: any) {
            if (error instanceof NotFoundError) {
                res.status(404).json({
                    success: false,
                    message: error.message,
                });
                return;
            }

            if (error instanceof BadRequestError) {
                res.status(400).json({
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
                message: "Failed to update sales challan",
            });
        }
    }

    /**
     * POST /api/challans/:id/confirm
     * Confirm DRAFT sales challan and execute atomic inventory OUT stock deduction.
     */
    static async confirmChallan(req: Request, res: Response): Promise<void> {
        try {
            const paramResult = challanIdParamSchema.safeParse(req.params);

            if (!paramResult.success) {
                res.status(400).json({
                    success: false,
                    message: "Invalid challan ID",
                });
                return;
            }

            const authenticatedUserId = req.user?.id;
            if (!authenticatedUserId) {
                res.status(401).json({
                    success: false,
                    message: "Authentication required",
                });
                return;
            }

            const challan = await ChallanService.confirmChallan(paramResult.data.id, authenticatedUserId);

            res.status(200).json({
                success: true,
                message: "Challan confirmed successfully",
                data: { challan },
            });
        } catch (error: any) {
            if (error instanceof NotFoundError) {
                res.status(404).json({
                    success: false,
                    message: error.message,
                });
                return;
            }

            if (error instanceof InsufficientStockError) {
                res.status(400).json({
                    success: false,
                    message: error.message,
                    details: error.details,
                });
                return;
            }

            if (error instanceof BadRequestError) {
                res.status(400).json({
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
                message: "Failed to confirm sales challan",
            });
        }
    }

    /**
     * POST /api/challans/:id/cancel
     * Cancel a DRAFT sales challan without mutating stock.
     */
    static async cancelChallan(req: Request, res: Response): Promise<void> {
        try {
            const paramResult = challanIdParamSchema.safeParse(req.params);

            if (!paramResult.success) {
                res.status(400).json({
                    success: false,
                    message: "Invalid challan ID",
                });
                return;
            }

            const challan = await ChallanService.cancelChallan(paramResult.data.id);

            res.status(200).json({
                success: true,
                message: "Challan cancelled successfully",
                data: { challan },
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
                message: "Failed to cancel sales challan",
            });
        }
    }
}
