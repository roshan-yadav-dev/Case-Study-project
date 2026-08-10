import { StockMovementType } from "../../generated/prisma";
import prisma from "../config/prisma";
import { NotFoundError } from "./product.service";
import { InventoryQueryDto, MovementQueryDto, StockInDto } from "../validators/inventory.validator";

export class InventoryService {
    /**
     * Get paginated inventory list derived from products.
     */
    static async getInventory(query: InventoryQueryDto) {
        const page = query.page || 1;
        const limit = query.limit || 10;
        const skip = (page - 1) * limit;

        const [total, products] = await Promise.all([
            prisma.product.count(),
            prisma.product.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    name: true,
                    sku: true,
                    category: true,
                    currentStock: true,
                    minimumStock: true,
                    warehouseLocation: true,
                },
            }),
        ]);

        const inventory = products.map((p) => ({
            productId: p.id,
            name: p.name,
            sku: p.sku,
            category: p.category,
            currentStock: p.currentStock,
            minimumStock: p.minimumStock,
            lowStock: p.currentStock <= p.minimumStock,
            warehouseLocation: p.warehouseLocation,
        }));

        const totalPages = Math.ceil(total / limit) || 1;

        return {
            inventory,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        };
    }

    /**
     * Get paginated inventory list for products where currentStock <= minimumStock.
     */
    static async getLowStockInventory(query: InventoryQueryDto) {
        const page = query.page || 1;
        const limit = query.limit || 10;
        const skip = (page - 1) * limit;

        const lowStockRows: { id: string }[] = await prisma.$queryRaw`SELECT id FROM "Product" WHERE "currentStock" <= "minimumStock"`;
        const lowStockIds = lowStockRows.map((r) => r.id);

        const total = lowStockIds.length;

        const products = await prisma.product.findMany({
            where: { id: { in: lowStockIds } },
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
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

        const inventory = products.map((p) => ({
            productId: p.id,
            name: p.name,
            sku: p.sku,
            category: p.category,
            currentStock: p.currentStock,
            minimumStock: p.minimumStock,
            lowStock: true,
            warehouseLocation: p.warehouseLocation,
        }));

        const totalPages = Math.ceil(total / limit) || 1;

        return {
            inventory,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        };
    }

    /**
     * Perform an atomic Stock IN operation.
     */
    static async stockIn(productId: string, dto: StockInDto, createdById: string) {
        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product) {
            throw new NotFoundError("Product not found");
        }

        const result = await prisma.$transaction(async (tx) => {
            const movement = await tx.stockMovement.create({
                data: {
                    productId,
                    quantity: dto.quantity,
                    movementType: StockMovementType.IN,
                    reason: dto.reason,
                    createdBy: createdById,
                },
                include: {
                    creator: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                        },
                    },
                },
            });

            const updatedProduct = await tx.product.update({
                where: { id: productId },
                data: {
                    currentStock: {
                        increment: dto.quantity,
                    },
                },
            });

            return {
                product: {
                    id: updatedProduct.id,
                    sku: updatedProduct.sku,
                    currentStock: updatedProduct.currentStock,
                    minimumStock: updatedProduct.minimumStock,
                    lowStock: updatedProduct.currentStock <= updatedProduct.minimumStock,
                },
                movement: {
                    id: movement.id,
                    quantity: movement.quantity,
                    movementType: movement.movementType,
                    reason: movement.reason,
                    createdBy: movement.createdBy,
                    createdAt: movement.createdAt,
                    creator: movement.creator,
                },
            };
        });

        return result;
    }

    /**
     * Get paginated stock movement history for a specific product.
     */
    static async getMovements(productId: string, query: MovementQueryDto) {
        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product) {
            throw new NotFoundError("Product not found");
        }

        const page = query.page || 1;
        const limit = query.limit || 20;
        const skip = (page - 1) * limit;

        const where = { productId };

        const [total, movements] = await Promise.all([
            prisma.stockMovement.count({ where }),
            prisma.stockMovement.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    creator: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                        },
                    },
                },
            }),
        ]);

        const totalPages = Math.ceil(total / limit) || 1;

        return {
            movements,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        };
    }
}
