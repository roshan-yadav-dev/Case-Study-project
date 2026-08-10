import { ChallanStatus, CustomerStatus, StockMovementType } from "../../generated/prisma";
import prisma from "../config/prisma";
import {
    DashboardActivityQueryDto,
    DashboardLowStockQueryDto,
    DashboardSalesQueryDto,
} from "../validators/dashboard.validator";

export class DashboardService {
    /**
     * Get high-level KPI metrics across customers, products, inventory, and sales challans.
     */
    static async getSummary() {
        const [
            customerTotal,
            customerActive,
            customerLeads,
            customerInactive,
            productTotal,
            lowStockRows,
            challanTotal,
            challanDraft,
            challanConfirmed,
            challanCancelled,
            inventoryAggregate,
        ] = await Promise.all([
            prisma.customer.count(),
            prisma.customer.count({ where: { status: CustomerStatus.ACTIVE } }),
            prisma.customer.count({ where: { status: CustomerStatus.LEAD } }),
            prisma.customer.count({ where: { status: CustomerStatus.INACTIVE } }),
            prisma.product.count(),
            prisma.$queryRaw<Array<{ count: bigint }>>`
                SELECT COUNT(*)::bigint FROM "Product" WHERE "currentStock" <= "minimumStock"
            `,
            prisma.challan.count(),
            prisma.challan.count({ where: { status: ChallanStatus.DRAFT } }),
            prisma.challan.count({ where: { status: ChallanStatus.CONFIRMED } }),
            prisma.challan.count({ where: { status: ChallanStatus.CANCELLED } }),
            prisma.product.aggregate({
                _sum: {
                    currentStock: true,
                },
            }),
        ]);

        const lowStockCount =
            lowStockRows && lowStockRows.length > 0 ? Number(lowStockRows[0].count) : 0;
        const totalUnits = inventoryAggregate._sum.currentStock || 0;

        return {
            customers: {
                total: customerTotal,
                active: customerActive,
                leads: customerLeads,
                inactive: customerInactive,
            },
            products: {
                total: productTotal,
                lowStock: lowStockCount,
            },
            challans: {
                total: challanTotal,
                draft: challanDraft,
                confirmed: challanConfirmed,
                cancelled: challanCancelled,
            },
            inventory: {
                totalUnits,
            },
        };
    }

    /**
     * Get aggregated confirmed sales metrics and daily sales breakdown.
     */
    static async getSalesSummary(query: DashboardSalesQueryDto) {
        const where: any = {
            status: ChallanStatus.CONFIRMED,
        };

        if (query.from || query.to) {
            where.confirmedAt = {};
            if (query.from) {
                const fromDate = new Date(`${query.from}T00:00:00.000Z`);
                where.confirmedAt.gte = fromDate;
            }
            if (query.to) {
                const toDate = new Date(`${query.to}T23:59:59.999Z`);
                where.confirmedAt.lte = toDate;
            }
        }

        const confirmedChallans = await prisma.challan.findMany({
            where,
            include: {
                items: true,
            },
            orderBy: {
                confirmedAt: "asc",
            },
        });

        let totalUnitsSold = 0;
        let confirmedSalesValue = 0;
        const dailyMap = new Map<
            string,
            { date: string; challans: number; unitsSold: number; confirmedSalesValue: number }
        >();

        for (const challan of confirmedChallans) {
            const dateStr = challan.confirmedAt
                ? challan.confirmedAt.toISOString().split("T")[0]
                : challan.createdAt.toISOString().split("T")[0];

            let dayEntry = dailyMap.get(dateStr);
            if (!dayEntry) {
                dayEntry = {
                    date: dateStr,
                    challans: 0,
                    unitsSold: 0,
                    confirmedSalesValue: 0,
                };
                dailyMap.set(dateStr, dayEntry);
            }

            dayEntry.challans += 1;

            for (const item of challan.items) {
                totalUnitsSold += item.quantity;
                dayEntry.unitsSold += item.quantity;

                const itemValue = Number(item.unitPriceSnapshot) * item.quantity;
                confirmedSalesValue += itemValue;
                dayEntry.confirmedSalesValue += itemValue;
            }
        }

        const daily = Array.from(dailyMap.values()).map((d) => ({
            date: d.date,
            challans: d.challans,
            unitsSold: d.unitsSold,
            confirmedSalesValue: d.confirmedSalesValue.toFixed(2),
        }));

        return {
            confirmedChallans: confirmedChallans.length,
            totalUnitsSold,
            confirmedSalesValue: confirmedSalesValue.toFixed(2),
            daily,
        };
    }

    /**
     * Get paginated products requiring inventory restock, sorted by shortage DESC.
     */
    static async getLowStockProducts(query: DashboardLowStockQueryDto) {
        const page = query.page || 1;
        const limit = query.limit || 10;
        const skip = (page - 1) * limit;

        const allLowStockProducts = await prisma.product.findMany({
            where: {
                currentStock: {
                    lte: prisma.product.fields.minimumStock,
                },
            },
            select: {
                id: true,
                name: true,
                sku: true,
                category: true,
                currentStock: true,
                minimumStock: true,
                warehouseLocation: true,
            },
        });

        // Compute shortage and sort by shortage DESC, name ASC
        const processed = allLowStockProducts
            .map((p) => ({
                productId: p.id,
                name: p.name,
                sku: p.sku,
                category: p.category,
                currentStock: p.currentStock,
                minimumStock: p.minimumStock,
                warehouseLocation: p.warehouseLocation,
                shortage: p.minimumStock - p.currentStock,
            }))
            .sort((a, b) => {
                if (b.shortage !== a.shortage) {
                    return b.shortage - a.shortage;
                }
                return a.name.localeCompare(b.name);
            });

        const total = processed.length;
        const paginatedProducts = processed.slice(skip, skip + limit);
        const totalPages = Math.ceil(total / limit) || 1;

        return {
            products: paginatedProducts,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        };
    }

    /**
     * Retrieve normalized recent activity stream from customer, inventory, and challan events.
     */
    static async getRecentActivity(query: DashboardActivityQueryDto) {
        const limit = query.limit || 10;

        const [customers, followUps, products, stockMovements, challans] = await Promise.all([
            prisma.customer.findMany({
                take: limit,
                orderBy: { createdAt: "desc" },
                select: { id: true, name: true, businessName: true, createdAt: true },
            }),
            prisma.customerFollowUp.findMany({
                take: limit,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    createdAt: true,
                    customer: { select: { name: true } },
                    creator: { select: { id: true, name: true } },
                },
            }),
            prisma.product.findMany({
                take: limit,
                orderBy: { createdAt: "desc" },
                select: { id: true, name: true, sku: true, createdAt: true },
            }),
            prisma.stockMovement.findMany({
                take: limit,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    quantity: true,
                    movementType: true,
                    createdAt: true,
                    product: { select: { sku: true } },
                    creator: { select: { id: true, name: true } },
                },
            }),
            prisma.challan.findMany({
                where: {
                    status: {
                        in: [ChallanStatus.CONFIRMED, ChallanStatus.CANCELLED],
                    },
                },
                take: limit,
                orderBy: { updatedAt: "desc" },
                select: {
                    id: true,
                    challanNumber: true,
                    status: true,
                    confirmedAt: true,
                    cancelledAt: true,
                    updatedAt: true,
                    creator: { select: { id: true, name: true } },
                },
            }),
        ]);

        const activities: Array<{
            type: string;
            message: string;
            entityId: string;
            actor?: { id: string; name: string };
            timestamp: Date;
        }> = [];

        for (const c of customers) {
            activities.push({
                type: "CUSTOMER_CREATED",
                message: `Customer ${c.name} (${c.businessName}) created`,
                entityId: c.id,
                timestamp: c.createdAt,
            });
        }

        for (const f of followUps) {
            activities.push({
                type: "FOLLOWUP_ADDED",
                message: `Follow-up logged for customer ${f.customer.name}`,
                entityId: f.id,
                actor: f.creator,
                timestamp: f.createdAt,
            });
        }

        for (const p of products) {
            activities.push({
                type: "PRODUCT_CREATED",
                message: `Product ${p.name} (${p.sku}) created`,
                entityId: p.id,
                timestamp: p.createdAt,
            });
        }

        for (const m of stockMovements) {
            const isStockIn = m.movementType === StockMovementType.IN;
            activities.push({
                type: isStockIn ? "STOCK_IN" : "STOCK_OUT",
                message: `${m.quantity} units ${isStockIn ? "added to" : "dispatched for"} ${m.product.sku}`,
                entityId: m.id,
                actor: m.creator,
                timestamp: m.createdAt,
            });
        }

        for (const ch of challans) {
            const isConfirmed = ch.status === ChallanStatus.CONFIRMED;
            const timestamp = isConfirmed
                ? ch.confirmedAt || ch.updatedAt
                : ch.cancelledAt || ch.updatedAt;

            activities.push({
                type: isConfirmed ? "CHALLAN_CONFIRMED" : "CHALLAN_CANCELLED",
                message: `Sales Challan ${ch.challanNumber} ${isConfirmed ? "confirmed" : "cancelled"}`,
                entityId: ch.id,
                actor: ch.creator,
                timestamp,
            });
        }

        // Sort unified stream by timestamp DESC and slice to global limit
        activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        const slicedActivities = activities.slice(0, limit).map((a) => ({
            type: a.type,
            message: a.message,
            entityId: a.entityId,
            actor: a.actor,
            timestamp: a.timestamp.toISOString(),
        }));

        return {
            activities: slicedActivities,
        };
    }
}
