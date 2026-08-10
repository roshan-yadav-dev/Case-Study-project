import { z } from "zod";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const dashboardSalesQuerySchema = z
    .object({
        from: z
            .string()
            .optional()
            .refine((val) => !val || (dateRegex.test(val) && !isNaN(Date.parse(val))), {
                message: "from date must be a valid YYYY-MM-DD date format",
            }),
        to: z
            .string()
            .optional()
            .refine((val) => !val || (dateRegex.test(val) && !isNaN(Date.parse(val))), {
                message: "to date must be a valid YYYY-MM-DD date format",
            }),
    })
    .refine(
        (data) => {
            if (data.from && data.to) {
                const fromDate = new Date(data.from);
                const toDate = new Date(data.to);
                return fromDate <= toDate;
            }
            return true;
        },
        {
            message: "from date must not be after to date",
            path: ["from"],
        }
    );

export type DashboardSalesQueryDto = z.infer<typeof dashboardSalesQuerySchema>;

export const dashboardLowStockQuerySchema = z.object({
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

export type DashboardLowStockQueryDto = z.infer<typeof dashboardLowStockQuerySchema>;

export const dashboardActivityQuerySchema = z.object({
    limit: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 10))
        .refine((val) => !isNaN(val) && val >= 1, { message: "Limit must be a positive integer" })
        .transform((val) => Math.min(val, 50)),
});

export type DashboardActivityQueryDto = z.infer<typeof dashboardActivityQuerySchema>;
