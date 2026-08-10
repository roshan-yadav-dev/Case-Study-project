import { Request, Response } from "express";
import { DashboardService } from "../services/dashboard.service";
import {
    dashboardActivityQuerySchema,
    dashboardLowStockQuerySchema,
    dashboardSalesQuerySchema,
} from "../validators/dashboard.validator";

export class DashboardController {
    /**
     * GET /api/dashboard/summary
     * High-level system KPIs.
     */
    static async getSummary(_req: Request, res: Response): Promise<void> {
        try {
            const summary = await DashboardService.getSummary();
            res.status(200).json({
                success: true,
                data: summary,
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: "Failed to retrieve dashboard summary",
            });
        }
    }

    /**
     * GET /api/dashboard/sales-summary
     * Aggregated confirmed sales summary with optional date filtering.
     */
    static async getSalesSummary(req: Request, res: Response): Promise<void> {
        try {
            const parseResult = dashboardSalesQuerySchema.safeParse(req.query);

            if (!parseResult.success) {
                const formattedErrors = parseResult.error.issues.map((i) => i.message).join(", ");
                res.status(400).json({
                    success: false,
                    message: formattedErrors || "Invalid sales summary query parameters",
                });
                return;
            }

            const salesSummary = await DashboardService.getSalesSummary(parseResult.data);

            res.status(200).json({
                success: true,
                data: salesSummary,
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: "Failed to retrieve sales summary",
            });
        }
    }

    /**
     * GET /api/dashboard/low-stock
     * Paginated low-stock items sorted by highest shortage.
     */
    static async getLowStock(req: Request, res: Response): Promise<void> {
        try {
            const parseResult = dashboardLowStockQuerySchema.safeParse(req.query);

            if (!parseResult.success) {
                const formattedErrors = parseResult.error.issues.map((i) => i.message).join(", ");
                res.status(400).json({
                    success: false,
                    message: formattedErrors || "Invalid low stock query parameters",
                });
                return;
            }

            const lowStockData = await DashboardService.getLowStockProducts(parseResult.data);

            res.status(200).json({
                success: true,
                data: lowStockData,
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: "Failed to retrieve low-stock dashboard data",
            });
        }
    }

    /**
     * GET /api/dashboard/recent-activity
     * Unified recent activity feed.
     */
    static async getRecentActivity(req: Request, res: Response): Promise<void> {
        try {
            const parseResult = dashboardActivityQuerySchema.safeParse(req.query);

            if (!parseResult.success) {
                const formattedErrors = parseResult.error.issues.map((i) => i.message).join(", ");
                res.status(400).json({
                    success: false,
                    message: formattedErrors || "Invalid activity query parameters",
                });
                return;
            }

            const activityData = await DashboardService.getRecentActivity(parseResult.data);

            res.status(200).json({
                success: true,
                data: activityData,
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: "Failed to retrieve recent activity feed",
            });
        }
    }
}
