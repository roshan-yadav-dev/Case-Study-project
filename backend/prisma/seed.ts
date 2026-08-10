import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { Pool } from "pg";
import {
    CustomerStatus,
    CustomerType,
    PrismaClient,
    StockMovementType,
    UserRole,
} from "../generated/prisma";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("🌱 Starting database seeding...");

    // 1. Seed Users (One for each role)
    const defaultPassword = "Password@123";
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const adminUser = await prisma.user.upsert({
        where: { email: "admin@example.com" },
        update: {},
        create: {
            name: "Admin User",
            email: "admin@example.com",
            passwordHash,
            role: UserRole.ADMIN,
            isActive: true,
        },
    });

    const salesUser = await prisma.user.upsert({
        where: { email: "sales@example.com" },
        update: {},
        create: {
            name: "Sales Executive",
            email: "sales@example.com",
            passwordHash,
            role: UserRole.SALES,
            isActive: true,
        },
    });

    const warehouseUser = await prisma.user.upsert({
        where: { email: "warehouse@example.com" },
        update: {},
        create: {
            name: "Warehouse Manager",
            email: "warehouse@example.com",
            passwordHash,
            role: UserRole.WAREHOUSE,
            isActive: true,
        },
    });

    const accountsUser = await prisma.user.upsert({
        where: { email: "accounts@example.com" },
        update: {},
        create: {
            name: "Accounts Officer",
            email: "accounts@example.com",
            passwordHash,
            role: UserRole.ACCOUNTS,
            isActive: true,
        },
    });

    console.log("✅ Seeded Users (4 roles)");

    // 2. Seed Customers (Retail, Wholesale, Distributor)
    const retailCustomer = await prisma.customer.upsert({
        where: { id: "c1111111-1111-1111-1111-111111111111" },
        update: {},
        create: {
            id: "c1111111-1111-1111-1111-111111111111",
            name: "Rajesh Kumar",
            mobile: "9876543210",
            email: "rajesh@retailshop.com",
            businessName: "Kumar Retail Store",
            gstNumber: null,
            customerType: CustomerType.RETAIL,
            address: "12 MG Road, Bengaluru, Karnataka",
            status: CustomerStatus.ACTIVE,
            followUpDate: new Date("2026-08-15"),
            notes: "Regular retail buyer of peripherals.",
        },
    });

    const wholesaleCustomer = await prisma.customer.upsert({
        where: { id: "c2222222-2222-2222-2222-222222222222" },
        update: {},
        create: {
            id: "c2222222-2222-2222-2222-222222222222",
            name: "Anita Sharma",
            mobile: "9123456789",
            email: "anita@technosolutions.com",
            businessName: "TechnoSolutions Pvt Ltd",
            gstNumber: "29ABCDE1234F1ZH",
            customerType: CustomerType.WHOLESALE,
            address: "Sector 62, IT Park, Noida, UP",
            status: CustomerStatus.ACTIVE,
            followUpDate: new Date("2026-08-20"),
            notes: "Bulk buyer of networking hardware.",
        },
    });

    const distributorCustomer = await prisma.customer.upsert({
        where: { id: "c3333333-3333-3333-3333-333333333333" },
        update: {},
        create: {
            id: "c3333333-3333-3333-3333-333333333333",
            name: "Vikram Patel",
            mobile: "9988776655",
            email: "vikram@distrocorp.in",
            businessName: "Apex Electronics Distributors",
            gstNumber: "27AAACA9876B1Z5",
            customerType: CustomerType.DISTRIBUTOR,
            address: "GIDC Industrial Area, Ahmedabad, Gujarat",
            status: CustomerStatus.LEAD,
            followUpDate: new Date("2026-08-12"),
            notes: "Negotiating regional distribution agreement.",
        },
    });

    console.log("✅ Seeded Customers (Retail, Wholesale, Distributor)");

    // 3. Seed Customer Follow-Ups
    await prisma.customerFollowUp.createMany({
        data: [
            {
                customerId: distributorCustomer.id,
                followUpDate: new Date("2026-08-08"),
                notes: "Initial discovery call completed. Sent distributor pricing catalog.",
                createdBy: salesUser.id,
            },
            {
                customerId: distributorCustomer.id,
                followUpDate: new Date("2026-08-10"),
                notes: "Discussed volume discount slab. Awaiting purchase order.",
                createdBy: salesUser.id,
            },
        ],
        skipDuplicates: true,
    });

    console.log("✅ Seeded Customer Follow-Ups");

    // 4. Seed Products (including one below minimum stock alert threshold)
    const serverRack = await prisma.product.upsert({
        where: { sku: "PROD-SRV-42U" },
        update: {},
        create: {
            name: "Enterprise Server Rack 42U",
            sku: "PROD-SRV-42U",
            category: "Infrastructure",
            unitPrice: 150000.0,
            currentStock: 50,
            minimumStock: 10,
            warehouseLocation: "Aisle A, Rack 1",
        },
    });

    const lowStockRouter = await prisma.product.upsert({
        where: { sku: "PROD-RTR-AX6" },
        update: {},
        create: {
            name: "Industrial Wireless Router AX6000",
            sku: "PROD-RTR-AX6",
            category: "Networking",
            unitPrice: 18500.0,
            currentStock: 4, // Stock 4 < MinimumStock 15 (Triggers low stock alert!)
            minimumStock: 15,
            warehouseLocation: "Aisle B, Shelf 3",
        },
    });

    const scanner = await prisma.product.upsert({
        where: { sku: "PROD-SCN-2D" },
        update: {},
        create: {
            name: "Commercial Barcode Scanner 2D",
            sku: "PROD-SCN-2D",
            category: "Peripherals",
            unitPrice: 4200.0,
            currentStock: 120,
            minimumStock: 25,
            warehouseLocation: "Aisle C, Bin 12",
        },
    });

    console.log("✅ Seeded Products (3 items with stock levels)");

    // 5. Seed Stock Movements (Ensuring internal stock consistency)
    // Server Rack: net stock = 30 + 20 = 50
    // Router: net stock = 10 - 6 = 4
    // Scanner: net stock = 150 - 30 = 120
    const movementCount = await prisma.stockMovement.count();
    if (movementCount === 0) {
        await prisma.stockMovement.createMany({
            data: [
                // Server Rack movements
                {
                    productId: serverRack.id,
                    quantity: 30,
                    movementType: StockMovementType.IN,
                    reason: "Initial shipment procurement from vendor",
                    createdBy: warehouseUser.id,
                },
                {
                    productId: serverRack.id,
                    quantity: 20,
                    movementType: StockMovementType.IN,
                    reason: "Secondary restock shipment received",
                    createdBy: adminUser.id,
                },

                // Low Stock Router movements
                {
                    productId: lowStockRouter.id,
                    quantity: 10,
                    movementType: StockMovementType.IN,
                    reason: "Opening inventory batch",
                    createdBy: warehouseUser.id,
                },
                {
                    productId: lowStockRouter.id,
                    quantity: 6,
                    movementType: StockMovementType.OUT,
                    reason: "Manual dispatch for urgent client deployment",
                    createdBy: warehouseUser.id,
                },

                // Scanner movements
                {
                    productId: scanner.id,
                    quantity: 150,
                    movementType: StockMovementType.IN,
                    reason: "Bulk shipment from manufacturer",
                    createdBy: warehouseUser.id,
                },
                {
                    productId: scanner.id,
                    quantity: 30,
                    movementType: StockMovementType.OUT,
                    reason: "Fulfillment sample dispatch to distributor",
                    createdBy: salesUser.id,
                },
            ],
        });
        console.log("✅ Seeded Stock Movements (Consistent with stock balances)");
    } else {
        console.log("ℹ️ Stock Movements already exist, skipping createMany.");
    }

    console.log("🌱 Database seeding complete!");
}

main()
    .catch((e) => {
        console.error("❌ Seeding failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
