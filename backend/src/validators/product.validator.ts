import { z } from "zod";

export const productIdParamSchema = z.object({
    id: z.string({ message: "Invalid product ID" }).uuid("Invalid product ID"),
});

export const createProductSchema = z.object({
    name: z
        .string({ message: "Product name is required" })
        .trim()
        .min(1, "Product name is required"),
    sku: z
        .string({ message: "SKU is required" })
        .trim()
        .min(1, "SKU is required")
        .transform((val) => val.toUpperCase()),
    category: z
        .string({ message: "Category is required" })
        .trim()
        .min(1, "Category is required"),
    unitPrice: z
        .union([z.number(), z.string()])
        .transform((val) => (typeof val === "string" ? parseFloat(val) : val))
        .refine((val) => !isNaN(val) && val >= 0, {
            message: "Unit price must be a non-negative number",
        }),
    currentStock: z
        .union([z.number(), z.string()])
        .optional()
        .transform((val) => (val === undefined ? 0 : typeof val === "string" ? parseInt(val, 10) : val))
        .refine((val) => !isNaN(val) && val >= 0 && Number.isInteger(val), {
            message: "Current stock must be a non-negative integer",
        }),
    minimumStock: z
        .union([z.number(), z.string()])
        .optional()
        .transform((val) => (val === undefined ? 0 : typeof val === "string" ? parseInt(val, 10) : val))
        .refine((val) => !isNaN(val) && val >= 0 && Number.isInteger(val), {
            message: "Minimum stock must be a non-negative integer",
        }),
    warehouseLocation: z
        .string({ message: "Warehouse location is required" })
        .trim()
        .min(1, "Warehouse location is required"),
});

export type CreateProductDto = z.infer<typeof createProductSchema>;

export const updateProductSchema = z
    .object({
        name: z.string().trim().min(1, "Product name cannot be empty").optional(),
        sku: z
            .string()
            .trim()
            .min(1, "SKU cannot be empty")
            .transform((val) => val.toUpperCase())
            .optional(),
        category: z.string().trim().min(1, "Category cannot be empty").optional(),
        unitPrice: z
            .union([z.number(), z.string()])
            .transform((val) => (typeof val === "string" ? parseFloat(val) : val))
            .refine((val) => !isNaN(val) && val >= 0, {
                message: "Unit price must be a non-negative number",
            })
            .optional(),
        minimumStock: z
            .union([z.number(), z.string()])
            .transform((val) => (typeof val === "string" ? parseInt(val, 10) : val))
            .refine((val) => !isNaN(val) && val >= 0 && Number.isInteger(val), {
                message: "Minimum stock must be a non-negative integer",
            })
            .optional(),
        warehouseLocation: z
            .string()
            .trim()
            .min(1, "Warehouse location cannot be empty")
            .optional(),
    })
    .refine((data) => Object.values(data).some((val) => val !== undefined), {
        message: "At least one updateable field must be provided",
    });

export type UpdateProductDto = z.infer<typeof updateProductSchema>;

export const productQuerySchema = z.object({
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
    search: z.string().trim().optional(),
    category: z.string().trim().optional(),
    warehouseLocation: z.string().trim().optional(),
    lowStock: z
        .string()
        .optional()
        .transform((val) => (val === "true" ? true : val === "false" ? false : undefined)),
});

export type ProductQueryDto = z.infer<typeof productQuerySchema>;
