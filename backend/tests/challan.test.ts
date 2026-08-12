import assert from "node:assert";
import test, { after, before, describe } from "node:test";
import { app } from "../src/app";
import prisma from "../src/config/prisma";

async function request(
    method: string,
    path: string,
    body?: any,
    headers: Record<string, string> = {}
) {
    const server = app.listen(0);
    const address = server.address() as any;
    const url = `http://127.0.0.1:${address.port}${path}`;

    try {
        const response = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json",
                ...headers,
            },
            body: body ? JSON.stringify(body) : undefined,
        });

        const status = response.status;
        let data: any = {};
        try {
            data = await response.json();
        } catch (_e) {
            data = {};
        }

        return { status, body: data };
    } finally {
        server.close();
    }
}

async function loginUser(email: string) {
    const res = await request("POST", "/api/auth/login", {
        email,
        password: "Password@123",
    });
    return res.body.data.accessToken as string;
}

describe("PHASE 6: Sales Challan & Transactional Stock OUT Test Suite", () => {
    let adminToken: string;
    let salesToken: string;
    let warehouseToken: string;
    let accountsToken: string;

    let customerId: string;
    let productAId: string;
    let productBId: string;

    let draftChallanId: string;

    before(async () => {
        adminToken = await loginUser("admin@example.com");
        salesToken = await loginUser("sales@example.com");
        warehouseToken = await loginUser("warehouse@example.com");
        accountsToken = await loginUser("accounts@example.com");

        // Clean up leftover test products if present
        await prisma.product.deleteMany({
            where: { sku: { in: ["PROD-SRV-NODE", "PROD-SW-GB"] } },
        });

        // Create test customer
        const cust = await prisma.customer.create({
            data: {
                name: "Mega Corp",
                mobile: "9112233445",
                businessName: "Mega Corp Ltd",
                customerType: "DISTRIBUTOR",
                address: "Tech Park, Bengaluru",
                status: "ACTIVE",
            },
        });
        customerId = cust.id;

        // Create test product A (Stock = 10)
        const prodA = await prisma.product.create({
            data: {
                name: "High-End Server Node",
                sku: "PROD-SRV-NODE",
                category: "Infrastructure",
                unitPrice: 85000.0,
                currentStock: 10,
                minimumStock: 2,
                warehouseLocation: "WH-A1",
            },
        });
        productAId = prodA.id;

        // Create test product B (Stock = 5)
        const prodB = await prisma.product.create({
            data: {
                name: "Gigabit Ethernet Switch",
                sku: "PROD-SW-GB",
                category: "Networking",
                unitPrice: 12000.0,
                currentStock: 5,
                minimumStock: 2,
                warehouseLocation: "WH-A2",
            },
        });
        productBId = prodB.id;
    });

    describe("1. Challan Creation (POST /api/challans)", () => {
        test("Unauthenticated request -> 401", async () => {
            const res = await request("POST", "/api/challans", {
                customerId,
                items: [{ productId: productAId, quantity: 2 }],
            });
            assert.strictEqual(res.status, 401);
        });

        test("WAREHOUSE & ACCOUNTS roles blocked from creating -> 403", async () => {
            const whRes = await request(
                "POST",
                "/api/challans",
                { customerId, items: [{ productId: productAId, quantity: 2 }] },
                { Authorization: `Bearer ${warehouseToken}` }
            );
            assert.strictEqual(whRes.status, 403);

            const accRes = await request(
                "POST",
                "/api/challans",
                { customerId, items: [{ productId: productAId, quantity: 2 }] },
                { Authorization: `Bearer ${accountsToken}` }
            );
            assert.strictEqual(accRes.status, 403);
        });

        test("Empty items array rejected -> 400 Bad Request", async () => {
            const res = await request(
                "POST",
                "/api/challans",
                { customerId, items: [] },
                { Authorization: `Bearer ${salesToken}` }
            );
            assert.strictEqual(res.status, 400);
        });

        test("Duplicate product in items rejected -> 400 Bad Request", async () => {
            const res = await request(
                "POST",
                "/api/challans",
                {
                    customerId,
                    items: [
                        { productId: productAId, quantity: 2 },
                        { productId: productAId, quantity: 3 },
                    ],
                },
                { Authorization: `Bearer ${salesToken}` }
            );

            assert.strictEqual(res.status, 400);
            assert.strictEqual(
                res.body.message,
                "A product cannot appear more than once in the same challan"
            );
        });

        test("Non-existent customer ID -> 404 Not Found", async () => {
            const res = await request(
                "POST",
                "/api/challans",
                {
                    customerId: "00000000-0000-0000-0000-000000000000",
                    items: [{ productId: productAId, quantity: 2 }],
                },
                { Authorization: `Bearer ${salesToken}` }
            );

            assert.strictEqual(res.status, 404);
            assert.strictEqual(res.body.message, "Customer not found");
        });

        test("SALES creates DRAFT challan -> 201 Created & Stock UNCHANGED", async () => {
            const res = await request(
                "POST",
                "/api/challans",
                {
                    customerId,
                    items: [
                        { productId: productAId, quantity: 3 },
                        { productId: productBId, quantity: 2 },
                    ],
                },
                { Authorization: `Bearer ${salesToken}` }
            );

            assert.strictEqual(res.status, 201);
            assert.strictEqual(res.body.success, true);
            assert.ok(res.body.data.challan.challanNumber.startsWith("SC-"));
            assert.strictEqual(res.body.data.challan.status, "DRAFT");
            assert.strictEqual(res.body.data.challan.totalQuantity, 5); // 3 + 2 = 5
            assert.strictEqual(res.body.data.challan.items.length, 2);

            // Verify product snapshots
            const itemA = res.body.data.challan.items.find((i: any) => i.productId === productAId);
            assert.strictEqual(itemA.productNameSnapshot, "High-End Server Node");
            assert.strictEqual(itemA.skuSnapshot, "PROD-SRV-NODE");
            assert.strictEqual(itemA.unitPriceSnapshot, "85000");

            draftChallanId = res.body.data.challan.id;

            // Verify stock is STILL 10 and 5 (DRAFT DOES NOT REDUCE STOCK)
            const prodA = await prisma.product.findUnique({ where: { id: productAId } });
            const prodB = await prisma.product.findUnique({ where: { id: productBId } });
            assert.strictEqual(prodA?.currentStock, 10);
            assert.strictEqual(prodB?.currentStock, 5);

            // Verify NO stock movements exist for this draft
            const movements = await prisma.stockMovement.findMany({
                where: { reason: { contains: res.body.data.challan.challanNumber } },
            });
            assert.strictEqual(movements.length, 0);
        });
    });

    describe("2. Product Snapshot Integrity", () => {
        test("Catalog product update does NOT alter existing challan snapshot", async () => {
            // Update catalog product name and price
            await prisma.product.update({
                where: { id: productAId },
                data: {
                    name: "Updated Premium Node Name",
                    unitPrice: 99000.0,
                },
            });

            // Fetch original draft challan detail
            const res = await request("GET", `/api/challans/${draftChallanId}`, undefined, {
                Authorization: `Bearer ${salesToken}`,
            });

            assert.strictEqual(res.status, 200);
            const itemA = res.body.data.challan.items.find((i: any) => i.productId === productAId);

            // Snapshot must remain "High-End Server Node" and "85000"
            assert.strictEqual(itemA.productNameSnapshot, "High-End Server Node");
            assert.strictEqual(itemA.unitPriceSnapshot, "85000");

            // Revert product A catalog values for subsequent tests
            await prisma.product.update({
                where: { id: productAId },
                data: {
                    name: "High-End Server Node",
                    unitPrice: 85000.0,
                },
            });
        });
    });

    describe("3. List & Search Challans (GET /api/challans)", () => {
        test("All roles can list challans -> 200", async () => {
            for (const token of [adminToken, salesToken, warehouseToken, accountsToken]) {
                const res = await request("GET", "/api/challans", undefined, {
                    Authorization: `Bearer ${token}`,
                });
                assert.strictEqual(res.status, 200);
                assert.ok(Array.isArray(res.body.data.challans));
            }
        });

        test("Filter by status=DRAFT -> 200", async () => {
            const res = await request("GET", "/api/challans?status=DRAFT", undefined, {
                Authorization: `Bearer ${salesToken}`,
            });

            assert.strictEqual(res.status, 200);
            assert.ok(res.body.data.challans.length >= 1);
            for (const c of res.body.data.challans) {
                assert.strictEqual(c.status, "DRAFT");
            }
        });
    });

    describe("4. Transactional Insufficient Stock Rollback (POST /api/challans/:id/confirm)", () => {
        let insufficientChallanId: string;

        before(async () => {
            // Create a draft requesting 3 units of A (stock=10) and 10 units of B (stock=5)
            const res = await request(
                "POST",
                "/api/challans",
                {
                    customerId,
                    items: [
                        { productId: productAId, quantity: 3 },
                        { productId: productBId, quantity: 10 }, // Insufficient! Stock is 5
                    ],
                },
                { Authorization: `Bearer ${salesToken}` }
            );
            insufficientChallanId = res.body.data.challan.id;
        });

        test("Confirmation fails with 400 Bad Request & COMPLETE TRANSACTION ROLLBACK", async () => {
            const res = await request(
                "POST",
                `/api/challans/${insufficientChallanId}/confirm`,
                undefined,
                { Authorization: `Bearer ${salesToken}` }
            );

            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.body.success, false);
            assert.strictEqual(res.body.message, "Insufficient stock");
            assert.ok(Array.isArray(res.body.details));
            assert.strictEqual(res.body.details[0].productId, productBId);

            // VERIFY NO PARTIAL DEDUCTION OCCURRED (Product A stock remains 10, Product B stock remains 5)
            const prodA = await prisma.product.findUnique({ where: { id: productAId } });
            const prodB = await prisma.product.findUnique({ where: { id: productBId } });
            assert.strictEqual(prodA?.currentStock, 10, "Product A stock must NOT be deducted!");
            assert.strictEqual(prodB?.currentStock, 5, "Product B stock must NOT be modified!");

            // VERIFY Challan remains DRAFT
            const challan = await prisma.challan.findUnique({ where: { id: insufficientChallanId } });
            assert.strictEqual(challan?.status, "DRAFT");

            // VERIFY ZERO StockMovements created
            const movementsCount = await prisma.stockMovement.count({
                where: { reason: { contains: challan?.challanNumber } },
            });
            assert.strictEqual(movementsCount, 0, "No StockMovement records should exist!");
        });
    });

    describe("5. Successful Confirmation & Idempotency", () => {
        test("SALES confirms valid DRAFT -> 200 OK & Stock Deducted & OUT Movements Created", async () => {
            const res = await request(
                "POST",
                `/api/challans/${draftChallanId}/confirm`,
                undefined,
                { Authorization: `Bearer ${salesToken}` }
            );

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.strictEqual(res.body.data.challan.status, "CONFIRMED");
            assert.ok(res.body.data.challan.confirmedAt);

            // Verify stock deduction: A (10 - 3 = 7), B (5 - 2 = 3)
            const prodA = await prisma.product.findUnique({ where: { id: productAId } });
            const prodB = await prisma.product.findUnique({ where: { id: productBId } });
            assert.strictEqual(prodA?.currentStock, 7);
            assert.strictEqual(prodB?.currentStock, 3);

            // Verify StockMovement OUT entries
            const movements = await prisma.stockMovement.findMany({
                where: { reason: { contains: res.body.data.challan.challanNumber } },
                include: { creator: true },
            });
            assert.strictEqual(movements.length, 2);
            for (const m of movements) {
                assert.strictEqual(m.movementType, "OUT");
                assert.strictEqual(m.creator.email, "sales@example.com");
            }
        });

        test("Second confirmation attempt rejected -> 409 Conflict & Stock Unchanged", async () => {
            const res = await request(
                "POST",
                `/api/challans/${draftChallanId}/confirm`,
                undefined,
                { Authorization: `Bearer ${salesToken}` }
            );

            assert.strictEqual(res.status, 409);
            assert.strictEqual(res.body.message, "Challan is already confirmed");

            // Verify stock was NOT deducted again (remains 7 and 3)
            const prodA = await prisma.product.findUnique({ where: { id: productAId } });
            const prodB = await prisma.product.findUnique({ where: { id: productBId } });
            assert.strictEqual(prodA?.currentStock, 7);
            assert.strictEqual(prodB?.currentStock, 3);
        });

        test("Confirmed challan cannot be updated via PATCH -> 409 Conflict", async () => {
            const res = await request(
                "PATCH",
                `/api/challans/${draftChallanId}`,
                { customerId },
                { Authorization: `Bearer ${adminToken}` }
            );

            assert.strictEqual(res.status, 409);
            assert.strictEqual(res.body.message, "Confirmed challans cannot be modified");
        });
    });

    describe("6. Cancellation Lifecycle (POST /api/challans/:id/cancel)", () => {
        let cancelableDraftId: string;

        before(async () => {
            const res = await request(
                "POST",
                "/api/challans",
                {
                    customerId,
                    items: [{ productId: productAId, quantity: 1 }],
                },
                { Authorization: `Bearer ${salesToken}` }
            );
            cancelableDraftId = res.body.data.challan.id;
        });

        test("WAREHOUSE role blocked from cancellation -> 403", async () => {
            const res = await request(
                "POST",
                `/api/challans/${cancelableDraftId}/cancel`,
                undefined,
                { Authorization: `Bearer ${warehouseToken}` }
            );
            assert.strictEqual(res.status, 403);
        });

        test("ADMIN cancels DRAFT challan -> 200 OK & Stock Unchanged", async () => {
            const stockBeforeA = (await prisma.product.findUnique({ where: { id: productAId } }))?.currentStock;

            const res = await request(
                "POST",
                `/api/challans/${cancelableDraftId}/cancel`,
                undefined,
                { Authorization: `Bearer ${adminToken}` }
            );

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.data.challan.status, "CANCELLED");
            assert.ok(res.body.data.challan.cancelledAt);

            const stockAfterA = (await prisma.product.findUnique({ where: { id: productAId } }))?.currentStock;
            assert.strictEqual(stockAfterA, stockBeforeA, "Stock must remain unchanged on cancellation");
        });

        test("Confirmed challan cannot be cancelled -> 409 Conflict", async () => {
            const res = await request(
                "POST",
                `/api/challans/${draftChallanId}/cancel`,
                undefined,
                { Authorization: `Bearer ${adminToken}` }
            );

            assert.strictEqual(res.status, 409);
            assert.strictEqual(res.body.message, "Confirmed challans cannot be cancelled");
        });
    });

    after(async () => {
        // Clean up test database records
        await prisma.stockMovement.deleteMany({
            where: { OR: [{ productId: productAId }, { productId: productBId }] },
        });
        await prisma.challanItem.deleteMany({
            where: { OR: [{ productId: productAId }, { productId: productBId }] },
        });
        await prisma.challan.deleteMany({ where: { customerId } });
        await prisma.product.deleteMany({
            where: { id: { in: [productAId, productBId] } },
        });
        await prisma.customer.delete({ where: { id: customerId } });
    });
});
