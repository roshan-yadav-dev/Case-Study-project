import { Prisma } from "../../generated/prisma";
import prisma from "../config/prisma";
import { CreateProductDto, ProductQueryDto, UpdateProductDto } from "../validators/product.validator";

export class NotFoundError extends Error {
    public statusCode: number = 404;
    constructor(message: string = "Resource not found") {
        super(message);
        this.name = "NotFoundError";
    }
}

export class ConflictError extends Error {
    public statusCode: number = 409;
    constructor(message: string = "Conflict") {
        super(message);
        this.name = "ConflictError";
    }
}

export class ProductService {
    /**
     * Map Prisma product model to DTO including computed lowStock property.
     */
    static formatProduct(product: any) {
        return {
            id: product.id,
            name: product.name,
            sku: product.sku,
            category: product.category,
            unitPrice: typeof product.unitPrice === "object" ? product.unitPrice.toString() : String(product.unitPrice),
            currentStock: product.currentStock,
            minimumStock: product.minimumStock,
            warehouseLocation: product.warehouseLocation,
            lowStock: product.currentStock <= product.minimumStock,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt,
        };
    }

    /**
     * Create a new Product catalog item.
     */
    static async createProduct(dto: CreateProductDto) {
        // Check SKU uniqueness
        const existingSku = await prisma.product.findUnique({
            where: { sku: dto.sku },
        });

        if (existingSku) {
            throw new ConflictError("Product SKU already exists");
        }

        const product = await prisma.product.create({
            data: {
                name: dto.name,
                sku: dto.sku,
                category: dto.category,
                unitPrice: new Prisma.Decimal(dto.unitPrice),
                currentStock: dto.currentStock ?? 0,
                minimumStock: dto.minimumStock ?? 0,
                warehouseLocation: dto.warehouseLocation,
            },
        });

        return this.formatProduct(product);
    }

    /**
     * Fetch paginated list of products with search and low-stock filters.
     */
    static async getProducts(query: ProductQueryDto) {
        const page = query.page || 1;
        const limit = query.limit || 10;
        const skip = (page - 1) * limit;

        const where: Prisma.ProductWhereInput = {};

        if (query.category) {
            where.category = { equals: query.category, mode: "insensitive" };
        }

        if (query.warehouseLocation) {
            where.warehouseLocation = { equals: query.warehouseLocation, mode: "insensitive" };
        }

        if (query.search) {
            const searchTerm = query.search;
            where.OR = [
                { name: { contains: searchTerm, mode: "insensitive" } },
                { sku: { contains: searchTerm, mode: "insensitive" } },
                { category: { contains: searchTerm, mode: "insensitive" } },
                { warehouseLocation: { contains: searchTerm, mode: "insensitive" } },
            ];
        }

        if (query.lowStock === true) {
            const lowStockRows: { id: string }[] = await prisma.$queryRaw`SELECT id FROM "Product" WHERE "currentStock" <= "minimumStock"`;
            where.id = { in: lowStockRows.map((r) => r.id) };
        } else if (query.lowStock === false) {
            const normalStockRows: { id: string }[] = await prisma.$queryRaw`SELECT id FROM "Product" WHERE "currentStock" > "minimumStock"`;
            where.id = { in: normalStockRows.map((r) => r.id) };
        }

        const [total, products] = await Promise.all([
            prisma.product.count({ where }),
            prisma.product.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
            }),
        ]);

        const totalPages = Math.ceil(total / limit) || 1;

        return {
            products: products.map((p) => this.formatProduct(p)),
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        };
    }

    /**
     * Fetch single product detail by ID.
     */
    static async getProductById(id: string) {
        const product = await prisma.product.findUnique({
            where: { id },
        });

        if (!product) {
            throw new NotFoundError("Product not found");
        }

        return this.formatProduct(product);
    }

    /**
     * Update product details (excluding currentStock).
     */
    static async updateProduct(id: string, dto: UpdateProductDto) {
        const existing = await prisma.product.findUnique({ where: { id } });
        if (!existing) {
            throw new NotFoundError("Product not found");
        }

        if (dto.sku && dto.sku !== existing.sku) {
            const existingSku = await prisma.product.findUnique({
                where: { sku: dto.sku },
            });
            if (existingSku) {
                throw new ConflictError("Product SKU already exists");
            }
        }

        const updateData: Prisma.ProductUpdateInput = {};
        if (dto.name !== undefined) updateData.name = dto.name;
        if (dto.sku !== undefined) updateData.sku = dto.sku;
        if (dto.category !== undefined) updateData.category = dto.category;
        if (dto.unitPrice !== undefined) updateData.unitPrice = new Prisma.Decimal(dto.unitPrice);
        if (dto.minimumStock !== undefined) updateData.minimumStock = dto.minimumStock;
        if (dto.warehouseLocation !== undefined) updateData.warehouseLocation = dto.warehouseLocation;

        const updatedProduct = await prisma.product.update({
            where: { id },
            data: updateData,
        });

        return this.formatProduct(updatedProduct);
    }
}
