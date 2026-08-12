import { ChallanStatus, Prisma, StockMovementType } from "../../generated/prisma";
import prisma from "../config/prisma";
import { CreateChallanDto, ChallanQueryDto, UpdateChallanDto } from "../validators/challan.validator";

export class NotFoundError extends Error {
    public statusCode: number = 404;
    constructor(message: string = "Resource not found") {
        super(message);
        this.name = "NotFoundError";
    }
}

export class BadRequestError extends Error {
    public statusCode: number = 400;
    constructor(message: string = "Bad request") {
        super(message);
        this.name = "BadRequestError";
    }
}

export class ConflictError extends Error {
    public statusCode: number = 409;
    constructor(message: string = "Conflict") {
        super(message);
        this.name = "ConflictError";
    }
}

export class InsufficientStockError extends Error {
    public statusCode: number = 400;
    public details: Array<{
        productId: string;
        productName: string;
        availableStock: number;
        requestedQuantity: number;
    }>;

    constructor(
        message: string = "Insufficient stock",
        details: Array<{
            productId: string;
            productName: string;
            availableStock: number;
            requestedQuantity: number;
        }> = []
    ) {
        super(message);
        this.name = "InsufficientStockError";
        this.details = details;
    }
}

export class ChallanService {
    /**
     * Helper to generate unique human-readable challan number (e.g. SC-2026-000001).
     */
    private static async generateChallanNumber(): Promise<string> {
        const year = new Date().getFullYear();
        const count = await prisma.challan.count();
        let sequence = count + 1;

        while (true) {
            const challanNumber = `SC-${year}-${String(sequence).padStart(6, "0")}`;
            const existing = await prisma.challan.findUnique({ where: { challanNumber } });
            if (!existing) {
                return challanNumber;
            }
            sequence++;
        }
    }

    /**
     * Format Challan model output for consistent API responses.
     */
    static formatChallan(challan: any) {
        return {
            id: challan.id,
            challanNumber: challan.challanNumber,
            status: challan.status,
            totalQuantity: challan.totalQuantity,
            createdAt: challan.createdAt,
            updatedAt: challan.updatedAt,
            confirmedAt: challan.confirmedAt,
            cancelledAt: challan.cancelledAt,
            customer: challan.customer
                ? {
                      id: challan.customer.id,
                      name: challan.customer.name,
                      businessName: challan.customer.businessName,
                      mobile: challan.customer.mobile,
                      email: challan.customer.email,
                  }
                : undefined,
            items: challan.items
                ? challan.items.map((item: any) => ({
                      id: item.id,
                      productId: item.productId,
                      productNameSnapshot: item.productNameSnapshot,
                      skuSnapshot: item.skuSnapshot,
                      unitPriceSnapshot:
                          typeof item.unitPriceSnapshot === "object"
                              ? item.unitPriceSnapshot.toString()
                              : String(item.unitPriceSnapshot),
                      quantity: item.quantity,
                      createdAt: item.createdAt,
                  }))
                : undefined,
            creator: challan.creator
                ? {
                      id: challan.creator.id,
                      name: challan.creator.name,
                      email: challan.creator.email,
                      role: challan.creator.role,
                  }
                : undefined,
        };
    }

    /**
     * Create a new DRAFT Sales Challan with product snapshot data.
     */
    static async createChallan(dto: CreateChallanDto, createdById: string) {
        // Validate customer
        const customer = await prisma.customer.findUnique({ where: { id: dto.customerId } });
        if (!customer) {
            throw new NotFoundError("Customer not found");
        }
        if (customer.status === "INACTIVE") {
            throw new BadRequestError("Cannot create challan for inactive customer");
        }

        // Validate products
        const productIds = dto.items.map((i) => i.productId);
        const products = await prisma.product.findMany({
            where: { id: { in: productIds } },
        });

        if (products.length !== productIds.length) {
            throw new NotFoundError("One or more products were not found");
        }

        const productMap = new Map(products.map((p) => [p.id, p]));
        const totalQuantity = dto.items.reduce((sum, item) => sum + item.quantity, 0);

        const challanNumber = await this.generateChallanNumber();

        const challan = await prisma.challan.create({
            data: {
                challanNumber,
                customerId: dto.customerId,
                totalQuantity,
                status: ChallanStatus.DRAFT,
                createdBy: createdById,
                items: {
                    create: dto.items.map((item) => {
                        const product = productMap.get(item.productId)!;
                        return {
                            productId: item.productId,
                            productNameSnapshot: product.name,
                            skuSnapshot: product.sku,
                            unitPriceSnapshot: product.unitPrice,
                            quantity: item.quantity,
                        };
                    }),
                },
            },
            include: {
                customer: { select: { id: true, name: true, businessName: true, mobile: true, email: true } },
                items: true,
                creator: { select: { id: true, name: true, email: true, role: true } },
            },
        });

        return this.formatChallan(challan);
    }

    /**
     * List paginated sales challans with search and filtering.
     */
    static async getChallans(query: ChallanQueryDto) {
        const page = query.page || 1;
        const limit = query.limit || 10;
        const skip = (page - 1) * limit;

        const where: Prisma.ChallanWhereInput = {};

        if (query.status) {
            where.status = query.status as ChallanStatus;
        }

        if (query.customerId) {
            where.customerId = query.customerId;
        }

        if (query.search) {
            const searchTerm = query.search;
            where.OR = [
                { challanNumber: { contains: searchTerm, mode: "insensitive" } },
                { customer: { name: { contains: searchTerm, mode: "insensitive" } } },
                { customer: { businessName: { contains: searchTerm, mode: "insensitive" } } },
            ];
        }

        const [total, challans] = await Promise.all([
            prisma.challan.count({ where }),
            prisma.challan.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    customer: { select: { id: true, name: true, businessName: true, mobile: true, email: true } },
                    creator: { select: { id: true, name: true, email: true, role: true } },
                    items: true,
                },
            }),
        ]);

        const totalPages = Math.ceil(total / limit) || 1;

        return {
            challans: challans.map((c) => this.formatChallan(c)),
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        };
    }

    /**
     * Get single challan detail by ID.
     */
    static async getChallanById(id: string) {
        const challan = await prisma.challan.findUnique({
            where: { id },
            include: {
                customer: { select: { id: true, name: true, businessName: true, mobile: true, email: true } },
                items: true,
                creator: { select: { id: true, name: true, email: true, role: true } },
            },
        });

        if (!challan) {
            throw new NotFoundError("Challan not found");
        }

        return this.formatChallan(challan);
    }

    /**
     * Update an unconfirmed DRAFT challan.
     */
    static async updateDraftChallan(id: string, dto: UpdateChallanDto) {
        const existing = await prisma.challan.findUnique({
            where: { id },
            include: { items: true },
        });

        if (!existing) {
            throw new NotFoundError("Challan not found");
        }

        if (existing.status === ChallanStatus.CONFIRMED) {
            throw new ConflictError("Confirmed challans cannot be modified");
        }

        if (existing.status === ChallanStatus.CANCELLED) {
            throw new ConflictError("Cancelled challans cannot be modified");
        }

        let customerId = existing.customerId;
        if (dto.customerId && dto.customerId !== existing.customerId) {
            const customer = await prisma.customer.findUnique({ where: { id: dto.customerId } });
            if (!customer) {
                throw new NotFoundError("Customer not found");
            }
            if (customer.status === "INACTIVE") {
                throw new BadRequestError("Cannot assign challan to inactive customer");
            }
            customerId = dto.customerId;
        }

        let totalQuantity = existing.totalQuantity;

        if (dto.items) {
            const productIds = dto.items.map((i) => i.productId);
            const products = await prisma.product.findMany({
                where: { id: { in: productIds } },
            });

            if (products.length !== productIds.length) {
                throw new NotFoundError("One or more products were not found");
            }

            const productMap = new Map(products.map((p) => [p.id, p]));
            totalQuantity = dto.items.reduce((sum, item) => sum + item.quantity, 0);

            // Execute item update transaction
            await prisma.$transaction([
                prisma.challanItem.deleteMany({ where: { challanId: id } }),
                prisma.challan.update({
                    where: { id },
                    data: {
                        customerId,
                        totalQuantity,
                        items: {
                            create: dto.items.map((item) => {
                                const product = productMap.get(item.productId)!;
                                return {
                                    productId: item.productId,
                                    productNameSnapshot: product.name,
                                    skuSnapshot: product.sku,
                                    unitPriceSnapshot: product.unitPrice,
                                    quantity: item.quantity,
                                };
                            }),
                        },
                    },
                }),
            ]);
        } else if (dto.customerId) {
            await prisma.challan.update({
                where: { id },
                data: { customerId },
            });
        }

        const updated = await prisma.challan.findUnique({
            where: { id },
            include: {
                customer: { select: { id: true, name: true, businessName: true, mobile: true, email: true } },
                items: true,
                creator: { select: { id: true, name: true, email: true, role: true } },
            },
        });

        return this.formatChallan(updated);
    }

    /**
     * Atomically confirm DRAFT challan and execute Stock OUT inventory reduction.
     */
    static async confirmChallan(id: string, authenticatedUserId: string) {
        const result = await prisma.$transaction(
            async (tx) => {
            const challan = await tx.challan.findUnique({
                where: { id },
                include: {
                    items: true,
                    customer: true,
                },
            });

            if (!challan) {
                throw new NotFoundError("Challan not found");
            }

            if (challan.status === ChallanStatus.CONFIRMED) {
                throw new ConflictError("Challan is already confirmed");
            }

            if (challan.status === ChallanStatus.CANCELLED) {
                throw new ConflictError("Cancelled challans cannot be confirmed");
            }

            if (challan.customer.status === "INACTIVE") {
                throw new BadRequestError("Cannot confirm challan for inactive customer");
            }

            const productIds = challan.items.map((i) => i.productId);
            const products = await tx.product.findMany({
                where: { id: { in: productIds } },
            });

            const productMap = new Map(products.map((p) => [p.id, p]));
            const insufficientItems: Array<{
                productId: string;
                productName: string;
                availableStock: number;
                requestedQuantity: number;
            }> = [];

            for (const item of challan.items) {
                const product = productMap.get(item.productId);
                const available = product ? product.currentStock : 0;
                if (!product || available < item.quantity) {
                    insufficientItems.push({
                        productId: item.productId,
                        productName: item.productNameSnapshot,
                        availableStock: available,
                        requestedQuantity: item.quantity,
                    });
                }
            }

            if (insufficientItems.length > 0) {
                throw new InsufficientStockError("Insufficient stock", insufficientItems);
            }

            // Deduct stock and record StockMovement OUT for each item
            for (const item of challan.items) {
                const currentProd = await tx.product.findUnique({
                    where: { id: item.productId },
                    select: { currentStock: true },
                });

                if (!currentProd || currentProd.currentStock < item.quantity) {
                    throw new InsufficientStockError("Insufficient stock", [
                        {
                            productId: item.productId,
                            productName: item.productNameSnapshot,
                            availableStock: currentProd ? currentProd.currentStock : 0,
                            requestedQuantity: item.quantity,
                        },
                    ]);
                }

                await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        currentStock: {
                            decrement: item.quantity,
                        },
                    },
                });

                await tx.stockMovement.create({
                    data: {
                        productId: item.productId,
                        quantity: item.quantity,
                        movementType: StockMovementType.OUT,
                        reason: `Sales Challan ${challan.challanNumber}`,
                        createdBy: authenticatedUserId,
                    },
                });
            }

            // Mark challan as CONFIRMED
            const confirmedChallan = await tx.challan.update({
                where: { id },
                data: {
                    status: ChallanStatus.CONFIRMED,
                    confirmedAt: new Date(),
                },
                include: {
                    customer: { select: { id: true, name: true, businessName: true, mobile: true, email: true } },
                    items: true,
                    creator: { select: { id: true, name: true, email: true, role: true } },
                },
            });

            return confirmedChallan;
        }, { maxWait: 10000, timeout: 30000 });

        return this.formatChallan(result);
    }

    /**
     * Cancel DRAFT challan (stock remains unchanged).
     */
    static async cancelChallan(id: string) {
        const challan = await prisma.challan.findUnique({ where: { id } });

        if (!challan) {
            throw new NotFoundError("Challan not found");
        }

        if (challan.status === ChallanStatus.CONFIRMED) {
            throw new ConflictError("Confirmed challans cannot be cancelled");
        }

        if (challan.status === ChallanStatus.CANCELLED) {
            throw new ConflictError("Challan is already cancelled");
        }

        const cancelledChallan = await prisma.challan.update({
            where: { id },
            data: {
                status: ChallanStatus.CANCELLED,
                cancelledAt: new Date(),
            },
            include: {
                customer: { select: { id: true, name: true, businessName: true, mobile: true, email: true } },
                items: true,
                creator: { select: { id: true, name: true, email: true, role: true } },
            },
        });

        return this.formatChallan(cancelledChallan);
    }
}
