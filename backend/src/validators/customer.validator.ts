import { z } from "zod";
import { CustomerStatus, CustomerType } from "../../generated/prisma";

export const customerIdParamSchema = z.object({
    id: z.string({ message: "Invalid customer ID" }).uuid("Invalid customer ID"),
});

const customerTypeValues = ["RETAIL", "WHOLESALE", "DISTRIBUTOR"] as const;
const customerStatusValues = ["LEAD", "ACTIVE", "INACTIVE"] as const;

export const createCustomerSchema = z.object({
    name: z
        .string({ message: "Customer name is required" })
        .trim()
        .min(1, "Customer name is required"),
    mobile: z
        .string({ message: "Mobile number is required" })
        .trim()
        .min(1, "Mobile number is required"),
    email: z
        .string()
        .trim()
        .toLowerCase()
        .email("Invalid email format")
        .optional()
        .or(z.literal(""))
        .transform((val) => (val === undefined || val === "" ? null : val)),
    businessName: z
        .string({ message: "Business name is required" })
        .trim()
        .min(1, "Business name is required"),
    gstNumber: z
        .string()
        .trim()
        .optional()
        .or(z.literal(""))
        .transform((val) => (val === undefined || val === "" ? null : val)),
    customerType: z.enum(customerTypeValues, {
        message: "Invalid customer type",
    }),
    address: z
        .string({ message: "Address is required" })
        .trim()
        .min(1, "Address is required"),
    status: z
        .enum(customerStatusValues, {
            message: "Invalid customer status",
        })
        .optional()
        .default(CustomerStatus.LEAD),
    followUpDate: z
        .string()
        .optional()
        .or(z.literal(""))
        .transform((val) => (val ? new Date(val) : null))
        .refine((val) => val === null || !isNaN(val.getTime()), {
            message: "Invalid follow-up date format",
        }),
    notes: z
        .string()
        .trim()
        .optional()
        .or(z.literal(""))
        .transform((val) => (val === undefined || val === "" ? null : val)),
});

export type CreateCustomerDto = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = z
    .object({
        name: z.string().trim().min(1, "Customer name cannot be empty").optional(),
        mobile: z.string().trim().min(1, "Mobile number cannot be empty").optional(),
        email: z
            .string()
            .trim()
            .toLowerCase()
            .email("Invalid email format")
            .or(z.literal(""))
            .transform((val) => (val === "" ? null : val))
            .optional(),
        businessName: z.string().trim().min(1, "Business name cannot be empty").optional(),
        gstNumber: z
            .string()
            .trim()
            .or(z.literal(""))
            .transform((val) => (val === "" ? null : val))
            .optional(),
        customerType: z.enum(customerTypeValues).optional(),
        address: z.string().trim().min(1, "Address cannot be empty").optional(),
        status: z.enum(customerStatusValues).optional(),
        followUpDate: z
            .string()
            .or(z.literal(""))
            .transform((val) => (val ? new Date(val) : null))
            .refine((val) => val === null || !isNaN(val.getTime()), {
                message: "Invalid follow-up date format",
            })
            .optional(),
        notes: z
            .string()
            .trim()
            .or(z.literal(""))
            .transform((val) => (val === "" ? null : val))
            .optional(),
    })
    .refine((data) => Object.values(data).some((val) => val !== undefined), {
        message: "At least one updateable field must be provided",
    });

export type UpdateCustomerDto = z.infer<typeof updateCustomerSchema>;

export const addFollowUpSchema = z.object({
    followUpDate: z
        .string({ message: "Follow-up date is required" })
        .min(1, "Follow-up date is required")
        .transform((val) => new Date(val))
        .refine((val) => !isNaN(val.getTime()), {
            message: "Invalid follow-up date format",
        }),
    notes: z
        .string({ message: "Follow-up notes are required" })
        .trim()
        .min(1, "Follow-up notes are required"),
});

export type AddFollowUpDto = z.infer<typeof addFollowUpSchema>;

export const customerQuerySchema = z.object({
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
    status: z.enum(customerStatusValues).optional(),
    customerType: z.enum(customerTypeValues).optional(),
});

export type CustomerQueryDto = z.infer<typeof customerQuerySchema>;
