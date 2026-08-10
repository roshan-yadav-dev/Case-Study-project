import { z } from "zod";
import { ChallanStatus } from "../../generated/prisma";

export const challanIdParamSchema = z.object({
    id: z.string({ message: "Invalid challan ID" }).uuid("Invalid challan ID"),
});

const challanItemInputSchema = z.object({
    productId: z
        .string({ message: "Invalid product ID" })
        .uuid("Invalid product ID"),
    quantity: z
        .union([z.number(), z.string()], { message: "Quantity is required" })
        .transform((val) => (typeof val === "string" ? parseInt(val, 10) : val))
        .refine((val) => !isNaN(val) && val > 0 && Number.isInteger(val), {
            message: "Quantity must be a positive integer greater than zero",
        }),
});

export const createChallanSchema = z
    .object({
        customerId: z
            .string({ message: "Invalid customer ID" })
            .uuid("Invalid customer ID"),
        items: z
            .array(challanItemInputSchema, { message: "Challan must contain at least one item" })
            .min(1, "Challan must contain at least one item"),
        status: z
            .enum([ChallanStatus.DRAFT], {
                message: "Challans can only be initially created as DRAFT",
            })
            .optional()
            .default(ChallanStatus.DRAFT),
    })
    .refine(
        (data) => {
            const productIds = data.items.map((i) => i.productId);
            const uniqueProductIds = new Set(productIds);
            return uniqueProductIds.size === productIds.length;
        },
        {
            message: "A product cannot appear more than once in the same challan",
            path: ["items"],
        }
    );

export type CreateChallanDto = z.infer<typeof createChallanSchema>;

export const updateChallanSchema = z
    .object({
        customerId: z.string().uuid("Invalid customer ID").optional(),
        items: z
            .array(challanItemInputSchema)
            .min(1, "Challan must contain at least one item")
            .optional(),
    })
    .refine((data) => Object.values(data).some((val) => val !== undefined), {
        message: "At least one updateable field must be provided",
    })
    .refine(
        (data) => {
            if (!data.items) return true;
            const productIds = data.items.map((i) => i.productId);
            const uniqueProductIds = new Set(productIds);
            return uniqueProductIds.size === productIds.length;
        },
        {
            message: "A product cannot appear more than once in the same challan",
            path: ["items"],
        }
    );

export type UpdateChallanDto = z.infer<typeof updateChallanSchema>;

const challanStatusValues = ["DRAFT", "CONFIRMED", "CANCELLED"] as const;

export const challanQuerySchema = z.object({
    page: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 1))
        .refine((val) => !isNaN(val) && val >= 1, { message: "Page must be a positive integer" }),
    limit: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 10))
        .refine((val) => !isNaN(val) && val >= 1, { message: "Page must be a positive integer" })
        .transform((val) => Math.min(val, 100)),
    status: z.enum(challanStatusValues).optional(),
    customerId: z.string().uuid("Invalid customer ID").optional(),
    search: z.string().trim().optional(),
});

export type ChallanQueryDto = z.infer<typeof challanQuerySchema>;
