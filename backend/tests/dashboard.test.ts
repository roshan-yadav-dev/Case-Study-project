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

describe("PHASE 7: Dashboard & Reporting API Test Suite", () => {
    let adminToken: string;
    let salesToken: string;
    let warehouseToken: string;
    let accountsToken: string;

    let customerId: string;
    let highStockProductId: string;
    let lowStockProductId: string;
    let challanId: string;

    before(async () => {
        adminToken = await loginUser("admin@example.com");
        salesToken = await loginUser("sales@example.com");
        warehouseToken = await loginUser("warehouse@example.com");
        accountsToken = await loginUser("accounts@example.com");

        // Seed test customer
        const cust = await prisma.customer.create({
            data: {
                name: "Dash Corp",
                mobile: "9887766554",
                businessName: "Dash Corp Ltd",
                customerType: "WHOLESALE",
                address: "Electronic City, Bengaluru",
                status: "ACTIVE",
            },
        });
        customerId = cust.id;

        // Seed Product 1 (High Stock: stock 50, min 10)
        const prod1 = await prisma.product.create({
            data: {
                name: "High Stock Router",
                sku: "DASH-PROD-HIGH",
                category: "Networking",
                unitPrice: 5000.0,
                currentStock: 50,
                minimumStock: 10,
                warehouseLocation: "WH-D1",
            },
        });
        highStockProductId = prod1.id;

        // Seed Product 2 (Low Stock: stock 3, min 15 -> shortage 12)
        const prod2 = await prisma.product.create({
            data: {
                name: "Low Stock Adapter",
                sku: "DASH-PROD-LOW",
                category: "Accessories",
                unitPrice: 1500.0,
                currentStock: 3,
                minimumStock: 15,
                warehouseLocation: "WH-D2",
            },
        });
        lowStockProductId = prod2.id;

        // Seed DRAFT Challan
        const challan = await prisma.challan.create({
            data: {
                challanNumber: "SC-2026-999901",
                customerId,
                createdBy: (await prisma.user.findFirstOrThrow({ where: { email: "sales@example.com" } })).id,
                status: "DRAFT",
                totalQuantity: 5,
                items: {
                    create: [
                        {
                            productId: highStockProductId,
                            productNameSnapshot: "High Stock Router",
                            skuSnapshot: "DASH-PROD-HIGH",
                            unitPriceSnapshot: 5000.0,
                            quantity: 5,
                        },
                    ],
                },
            },
        });
        challanId = challan.id;
    });

    describe("1. Dashboard Summary (GET /api/dashboard/summary)", () => {
        test("Unauthenticated request -> 401", async () => {
            const res = await request("GET", "/api/dashboard/summary");
            assert.strictEqual(res.status, 401);
        });

        test("ALL 4 roles can access summary -> 200 OK", async () => {
            for (const token of [adminToken, salesToken, warehouseToken, accountsToken]) {
                const res = await request("GET", "/api/dashboard/summary", undefined, {
                    Authorization: `Bearer ${token}`,
                });
                assert.strictEqual(res.status, 200);
                assert.strictEqual(res.body.success, true);
                assert.ok(typeof res.body.data.customers.total === "number");
                assert.ok(typeof res.body.data.products.total === "number");
                assert.ok(typeof res.body.data.challans.total === "number");
                assert.ok(typeof res.body.data.inventory.totalUnits === "number");
            }
        });

        test("Summary metrics accurately reflect database totals", async () => {
            const res = await request("GET", "/api/dashboard/summary", undefined, {
                Authorization: `Bearer ${adminToken}`,
            });

            assert.strictEqual(res.status, 200);
            const data = res.body.data;

            // Verify customer totals
            assert.ok(data.customers.total >= 1);
            assert.strictEqual(
                data.customers.total,
                data.customers.active + data.customers.leads + data.customers.inactive
            );

            // Verify low stock count is at least 1 (lowStockProductId)
            assert.ok(data.products.lowStock >= 1);

            // Verify draft challans count includes our test draft
            assert.ok(data.challans.draft >= 1);

            // Verify total inventory units
            assert.ok(data.inventory.totalUnits >= 53); // 50 + 3
        });
    });

    describe("2. Sales Summary (GET /api/dashboard/sales-summary)", () => {
        test("Invalid date format -> 400 Bad Request", async () => {
            const res = await request(
                "GET",
                "/api/dashboard/sales-summary?from=invalid-date",
                undefined,
                { Authorization: `Bearer ${salesToken}` }
            );

            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.body.success, false);
        });

        test("from > to date range rejected -> 400 Bad Request", async () => {
            const res = await request(
                "GET",
                "/api/dashboard/sales-summary?from=2026-08-20&to=2026-08-10",
                undefined,
                { Authorization: `Bearer ${salesToken}` }
            );

            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.body.message, "from date must not be after to date");
        });

        test("Sales summary excludes DRAFT challans", async () => {
            const res = await request("GET", "/api/dashboard/sales-summary", undefined, {
                Authorization: `Bearer ${salesToken}`,
            });

            assert.strictEqual(res.status, 200);
            assert.ok(typeof res.body.data.confirmedChallans === "number");
            assert.ok(typeof res.body.data.totalUnitsSold === "number");
            assert.ok(Array.isArray(res.body.data.daily));
        });
    });

    describe("3. Low-Stock Dashboard (GET /api/dashboard/low-stock)", () => {
        test("Returns low-stock products sorted by shortage DESC -> 200 OK", async () => {
            const res = await request("GET", "/api/dashboard/low-stock", undefined, {
                Authorization: `Bearer ${warehouseToken}`,
            });

            assert.strictEqual(res.status, 200);
            assert.ok(Array.isArray(res.body.data.products));

            // Verify every returned product satisfies currentStock <= minimumStock
            for (const p of res.body.data.products) {
                assert.ok(p.currentStock <= p.minimumStock);
                assert.strictEqual(p.shortage, p.minimumStock - p.currentStock);
            }

            // Verify test low-stock product is present
            const foundLow = res.body.data.products.find(
                (p: any) => p.productId === lowStockProductId
            );
            assert.ok(foundLow);
            assert.strictEqual(foundLow.shortage, 12);

            // Verify pagination structure
            assert.ok(res.body.data.pagination);
            assert.strictEqual(res.body.data.pagination.page, 1);
            assert.strictEqual(res.body.data.pagination.limit, 10);
        });

        test("Pagination page & limit controls work properly", async () => {
            const res = await request("GET", "/api/dashboard/low-stock?page=1&limit=1", undefined, {
                Authorization: `Bearer ${warehouseToken}`,
            });

            assert.strictEqual(res.status, 200);
            assert.ok(res.body.data.products.length <= 1);
            assert.strictEqual(res.body.data.pagination.limit, 1);
        });
    });

    describe("4. Recent Activity Stream (GET /api/dashboard/recent-activity)", () => {
        test("Returns normalized recent activities ordered by timestamp DESC -> 200 OK", async () => {
            const res = await request("GET", "/api/dashboard/recent-activity?limit=5", undefined, {
                Authorization: `Bearer ${accountsToken}`,
            });

            assert.strictEqual(res.status, 200);
            assert.ok(Array.isArray(res.body.data.activities));
            assert.ok(res.body.data.activities.length <= 5);

            // Verify chronological order (newest first)
            const activities = res.body.data.activities;
            for (let i = 0; i < activities.length - 1; i++) {
                const timeA = new Date(activities[i].timestamp).getTime();
                const timeB = new Date(activities[i + 1].timestamp).getTime();
                assert.ok(timeA >= timeB, "Activities must be ordered timestamp DESC");
            }
        });
    });

    describe("5. Cross-Module Real-time Database Consistency Test", () => {
        test("Confirming a Challan immediately updates dashboard sales, inventory, low-stock, and activity feed", async () => {
            // 1. Get initial summary metrics
            const initialSummary = (
                await request("GET", "/api/dashboard/summary", undefined, {
                    Authorization: `Bearer ${adminToken}`,
                })
            ).body.data;

            const initialSales = (
                await request("GET", "/api/dashboard/sales-summary", undefined, {
                    Authorization: `Bearer ${adminToken}`,
                })
            ).body.data;

            // 2. Confirm the test draft challan (quantity = 5 of highStockProductId)
            const confirmRes = await request(
                "POST",
                `/api/challans/${challanId}/confirm`,
                undefined,
                { Authorization: `Bearer ${salesToken}` }
            );
            assert.strictEqual(confirmRes.status, 200);

            // 3. Get updated summary & sales metrics
            const updatedSummary = (
                await request("GET", "/api/dashboard/summary", undefined, {
                    Authorization: `Bearer ${adminToken}`,
                })
            ).body.data;

            const updatedSales = (
                await request("GET", "/api/dashboard/sales-summary", undefined, {
                    Authorization: `Bearer ${adminToken}`,
                })
            ).body.data;

            // Assert confirmed challan count increased by 1
            assert.strictEqual(
                updatedSummary.challans.confirmed,
                initialSummary.challans.confirmed + 1
            );
            assert.strictEqual(
                updatedSummary.challans.draft,
                initialSummary.challans.draft - 1
            );

            // Assert total inventory units decreased by 5
            assert.strictEqual(
                updatedSummary.inventory.totalUnits,
                initialSummary.inventory.totalUnits - 5
            );

            // Assert confirmed sales units increased by 5
            assert.strictEqual(
                updatedSales.totalUnitsSold,
                initialSales.totalUnitsSold + 5
            );
            assert.strictEqual(
                updatedSales.confirmedChallans,
                initialSales.confirmedChallans + 1
            );

            // 4. Verify recent activity feed includes the confirmed challan event
            const activityRes = await request("GET", "/api/dashboard/recent-activity?limit=5", undefined, {
                Authorization: `Bearer ${adminToken}`,
            });
            assert.strictEqual(activityRes.status, 200);
            const foundEvent = activityRes.body.data.activities.find(
                (a: any) => a.type === "CHALLAN_CONFIRMED" && a.entityId === challanId
            );
            assert.ok(foundEvent, "Confirmed challan activity must be present in recent activity feed");
        });
    });

    after(async () => {
        // Clean up test records
        await prisma.stockMovement.deleteMany({
            where: { productId: highStockProductId },
        });
        await prisma.challanItem.deleteMany({
            where: { challanId },
        });
        await prisma.challan.deleteMany({
            where: { id: challanId },
        });
        await prisma.product.deleteMany({
            where: { id: { in: [highStockProductId, lowStockProductId] } },
        });
        await prisma.customer.delete({
            where: { id: customerId },
        });
        await prisma.$disconnect();
    });
});
