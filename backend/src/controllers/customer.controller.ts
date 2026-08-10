import { Request, Response } from "express";
import { CustomerService, NotFoundError } from "../services/customer.service";
import {
    addFollowUpSchema,
    createCustomerSchema,
    customerIdParamSchema,
    customerQuerySchema,
    updateCustomerSchema,
} from "../validators/customer.validator";

export class CustomerController {
    /**
     * POST /api/customers
     * Create a new customer profile.
     */
    static async createCustomer(req: Request, res: Response): Promise<void> {
        try {
            const parseResult = createCustomerSchema.safeParse(req.body);

            if (!parseResult.success) {
                const formattedErrors = parseResult.error.issues.map((i) => i.message).join(", ");
                res.status(400).json({
                    success: false,
                    message: formattedErrors || "Invalid customer creation data",
                });
                return;
            }

            const customer = await CustomerService.createCustomer(parseResult.data);

            res.status(201).json({
                success: true,
                message: "Customer created successfully",
                data: { customer },
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: "Failed to create customer",
            });
        }
    }

    /**
     * GET /api/customers
     * Fetch paginated customers with search & filter parameters.
     */
    static async getCustomers(req: Request, res: Response): Promise<void> {
        try {
            const queryResult = customerQuerySchema.safeParse(req.query);

            if (!queryResult.success) {
                const formattedErrors = queryResult.error.issues.map((i) => i.message).join(", ");
                res.status(400).json({
                    success: false,
                    message: formattedErrors || "Invalid query parameters",
                });
                return;
            }

            const result = await CustomerService.getCustomers(queryResult.data);

            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: "Failed to retrieve customers",
            });
        }
    }

    /**
     * GET /api/customers/:id
     * Fetch customer detail and complete follow-up audit trail.
     */
    static async getCustomerById(req: Request, res: Response): Promise<void> {
        try {
            const paramResult = customerIdParamSchema.safeParse(req.params);

            if (!paramResult.success) {
                res.status(400).json({
                    success: false,
                    message: "Invalid customer ID",
                });
                return;
            }

            const customer = await CustomerService.getCustomerById(paramResult.data.id);

            res.status(200).json({
                success: true,
                data: { customer },
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
                message: "Failed to retrieve customer detail",
            });
        }
    }

    /**
     * PATCH /api/customers/:id
     * Update customer fields selectively.
     */
    static async updateCustomer(req: Request, res: Response): Promise<void> {
        try {
            const paramResult = customerIdParamSchema.safeParse(req.params);

            if (!paramResult.success) {
                res.status(400).json({
                    success: false,
                    message: "Invalid customer ID",
                });
                return;
            }

            const bodyResult = updateCustomerSchema.safeParse(req.body);

            if (!bodyResult.success) {
                const formattedErrors = bodyResult.error.issues.map((i) => i.message).join(", ");
                res.status(400).json({
                    success: false,
                    message: formattedErrors || "At least one updateable field must be provided",
                });
                return;
            }

            const customer = await CustomerService.updateCustomer(paramResult.data.id, bodyResult.data);

            res.status(200).json({
                success: true,
                message: "Customer updated successfully",
                data: { customer },
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
                message: "Failed to update customer",
            });
        }
    }

    /**
     * POST /api/customers/:id/followups
     * Record a new follow-up entry and update the customer's upcoming follow-up date.
     */
    static async addFollowUp(req: Request, res: Response): Promise<void> {
        try {
            const paramResult = customerIdParamSchema.safeParse(req.params);

            if (!paramResult.success) {
                res.status(400).json({
                    success: false,
                    message: "Invalid customer ID",
                });
                return;
            }

            const bodyResult = addFollowUpSchema.safeParse(req.body);

            if (!bodyResult.success) {
                const formattedErrors = bodyResult.error.issues.map((i) => i.message).join(", ");
                res.status(400).json({
                    success: false,
                    message: formattedErrors || "Invalid follow-up payload",
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

            const followUp = await CustomerService.addFollowUp(
                paramResult.data.id,
                bodyResult.data,
                createdBy
            );

            res.status(201).json({
                success: true,
                message: "Follow-up added successfully",
                data: { followUp },
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
                message: "Failed to add follow-up",
            });
        }
    }
}
