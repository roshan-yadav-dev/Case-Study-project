import { z } from "zod";

export const inventoryProductIdParamSchema = z.object({
    productId: z.string({ message: "Invalid product ID" }).uuid("Invalid product ID"),
});

export const stockInSchema = z.object({
    quantity: z
        .union([z.number(), z.string()], { message: "Quantity is required" })
        .transform((val) => (typeof val === "string" ? parseInt(val, 10) : val))
        .refine((val) => !isNaN(val) && val > 0 && Number.isInteger(val), {
            message: "Quantity must be a positive integer greater than zero",
        }),
    reason: z
        .string({ message: "Reason is required" })
        .trim()
        .min(1, "Reason is required"),
});

export type StockInDto = z.infer<typeof stockInSchema>;

export const inventoryQuerySchema = z.object({
    page: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 1))
        .refine((val) => !isNaN(val) && val >= 1, { message: "Page must be a positive integer" }),
    limit: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 10))
        .refine((val) => !isNaN(val) && val >= 1, { message: "Limit must be a positive integer" })
        .transform((val) => Math.min(val, 100)),
});

export type InventoryQueryDto = z.infer<typeof inventoryQuerySchema>;

export const movementQuerySchema = z.object({
    page: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 1))
        .refine((val) => !isNaN(val) && val >= 1, { message: "Page must be a positive integer" }),
    limit: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 20))
        .refine((val) => !isNaN(val) && val >= 1, { message: "Limit must be a positive integer" })
        .transform((val) => Math.min(val, 100)),
});

export type MovementQueryDto = z.infer<typeof movementQuerySchema>;
