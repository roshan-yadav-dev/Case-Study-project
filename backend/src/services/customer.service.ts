import { Prisma } from "../../generated/prisma";
import prisma from "../config/prisma";
import {
    AddFollowUpDto,
    CreateCustomerDto,
    CustomerQueryDto,
    UpdateCustomerDto,
} from "../validators/customer.validator";

export class NotFoundError extends Error {
    public statusCode: number = 404;
    constructor(message: string = "Resource not found") {
        super(message);
        this.name = "NotFoundError";
    }
}

export class CustomerService {
    /**
     * Create a new Customer record.
     */
    static async createCustomer(dto: CreateCustomerDto) {
        const customer = await prisma.customer.create({
            data: {
                name: dto.name,
                mobile: dto.mobile,
                email: dto.email,
                businessName: dto.businessName,
                gstNumber: dto.gstNumber,
                customerType: dto.customerType,
                address: dto.address,
                status: dto.status,
                followUpDate: dto.followUpDate,
                notes: dto.notes,
            },
        });

        return customer;
    }

    /**
     * Retrieve paginated list of customers with optional search and filters.
     */
    static async getCustomers(query: CustomerQueryDto) {
        const page = query.page || 1;
        const limit = query.limit || 10;
        const skip = (page - 1) * limit;

        const where: Prisma.CustomerWhereInput = {};

        if (query.status) {
            where.status = query.status;
        }

        if (query.customerType) {
            where.customerType = query.customerType;
        }

        if (query.search) {
            const searchTerm = query.search;
            where.OR = [
                { name: { contains: searchTerm, mode: "insensitive" } },
                { businessName: { contains: searchTerm, mode: "insensitive" } },
                { mobile: { contains: searchTerm, mode: "insensitive" } },
                { email: { contains: searchTerm, mode: "insensitive" } },
                { gstNumber: { contains: searchTerm, mode: "insensitive" } },
            ];
        }

        const [total, customers] = await Promise.all([
            prisma.customer.count({ where }),
            prisma.customer.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
            }),
        ]);

        const totalPages = Math.ceil(total / limit) || 1;

        return {
            customers,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        };
    }

    /**
     * Fetch customer detail with complete follow-up history.
     */
    static async getCustomerById(id: string) {
        const customer = await prisma.customer.findUnique({
            where: { id },
            include: {
                followUps: {
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
                },
            },
        });

        if (!customer) {
            throw new NotFoundError("Customer not found");
        }

        return customer;
    }

    /**
     * Update customer fields selectively.
     */
    static async updateCustomer(id: string, dto: UpdateCustomerDto) {
        // Verify customer existence
        await this.getCustomerById(id);

        const updatedCustomer = await prisma.customer.update({
            where: { id },
            data: dto,
        });

        return updatedCustomer;
    }

    /**
     * Record a new customer follow-up and update main customer followUpDate atomically.
     */
    static async addFollowUp(customerId: string, dto: AddFollowUpDto, createdById: string) {
        // Verify customer existence
        await this.getCustomerById(customerId);

        const followUp = await prisma.$transaction(async (tx) => {
            const newFollowUp = await tx.customerFollowUp.create({
                data: {
                    customerId,
                    followUpDate: dto.followUpDate,
                    notes: dto.notes,
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

            await tx.customer.update({
                where: { id: customerId },
                data: {
                    followUpDate: dto.followUpDate,
                },
            });

            return newFollowUp;
        });

        return followUp;
    }
}
