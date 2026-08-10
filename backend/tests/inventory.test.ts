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

describe("PHASE 5: Inventory Management Test Suite", () => {
    let adminToken: string;
    let salesToken: string;
    let warehouseToken: string;
    let accountsToken: string;
    let testProductId: string;
    let initialStock: number = 4;

    before(async () => {
        adminToken = await loginUser("admin@example.com");
        salesToken = await loginUser("sales@example.com");
        warehouseToken = await loginUser("warehouse@example.com");
        accountsToken = await loginUser("accounts@example.com");

        // Create a test product
        const prod = await prisma.product.create({
            data: {
                name: "Router AX3000 Test",
                sku: "PROD-AX3K-TEST",
                category: "Networking",
                unitPrice: 5999.0,
                currentStock: 4,
                minimumStock: 15,
                warehouseLocation: "WH-A1",
            },
        });
        testProductId = prod.id;
    });

    describe("1. Inventory Overview (GET /api/inventory & /api/inventory/low-stock)", () => {
        test("All roles can list inventory -> 200", async () => {
            for (const token of [adminToken, salesToken, warehouseToken, accountsToken]) {
                const res = await request("GET", "/api/inventory", undefined, {
                    Authorization: `Bearer ${token}`,
                });
                assert.strictEqual(res.status, 200);
                assert.ok(Array.isArray(res.body.data.inventory));
            }
        });

        test("Low-stock inventory endpoint -> 200", async () => {
            const res = await request("GET", "/api/inventory/low-stock", undefined, {
                Authorization: `Bearer ${salesToken}`,
            });

            assert.strictEqual(res.status, 200);
            assert.ok(res.body.data.inventory.length >= 1);
            for (const item of res.body.data.inventory) {
                assert.strictEqual(item.lowStock, true);
            }
        });
    });

    describe("2. Stock IN Operation (POST /api/inventory/:productId/stock-in)", () => {
        test("Unauthenticated request -> 401", async () => {
            const res = await request("POST", `/api/inventory/${testProductId}/stock-in`, {
                quantity: 10,
                reason: "PO-UNAUTH",
            });
            assert.strictEqual(res.status, 401);
        });

        test("SALES & ACCOUNTS roles blocked from stock-in -> 403", async () => {
            const salesRes = await request(
                "POST",
                `/api/inventory/${testProductId}/stock-in`,
                { quantity: 10, reason: "PO-SALES" },
                { Authorization: `Bearer ${salesToken}` }
            );
            assert.strictEqual(salesRes.status, 403);

            const accRes = await request(
                "POST",
                `/api/inventory/${testProductId}/stock-in`,
                { quantity: 10, reason: "PO-ACC" },
                { Authorization: `Bearer ${accountsToken}` }
            );
            assert.strictEqual(accRes.status, 403);
        });

        test("Invalid quantity (<= 0) rejected -> 400 Bad Request", async () => {
            const res = await request(
                "POST",
                `/api/inventory/${testProductId}/stock-in`,
                { quantity: -5, reason: "Invalid Negative Quantity" },
                { Authorization: `Bearer ${warehouseToken}` }
            );

            assert.strictEqual(res.status, 400);
        });

        test("Missing reason rejected -> 400 Bad Request", async () => {
            const res = await request(
                "POST",
                `/api/inventory/${testProductId}/stock-in`,
                { quantity: 10, reason: "" },
                { Authorization: `Bearer ${warehouseToken}` }
            );

            assert.strictEqual(res.status, 400);
        });

        test("Non-existent product ID -> 404 Not Found", async () => {
            const res = await request(
                "POST",
                "/api/inventory/00000000-0000-0000-0000-000000000000/stock-in",
                { quantity: 10, reason: "PO-TEST-404" },
                { Authorization: `Bearer ${warehouseToken}` }
            );

            assert.strictEqual(res.status, 404);
            assert.strictEqual(res.body.message, "Product not found");
        });

        test("WAREHOUSE performs Stock IN 10 units -> 201 Created & Atomically updates stock (4 -> 14)", async () => {
            const res = await request(
                "POST",
                `/api/inventory/${testProductId}/stock-in`,
                {
                    quantity: 10,
                    reason: "Purchase order PO-TEST-001",
                },
                { Authorization: `Bearer ${warehouseToken}` }
            );

            assert.strictEqual(res.status, 201);
            assert.strictEqual(res.body.success, true);
            assert.strictEqual(res.body.data.product.currentStock, 14); // 4 + 10 = 14
            assert.strictEqual(res.body.data.product.lowStock, true); // 14 <= 15
            assert.strictEqual(res.body.data.movement.movementType, "IN");
            assert.strictEqual(res.body.data.movement.quantity, 10);
            assert.strictEqual(res.body.data.movement.reason, "Purchase order PO-TEST-001");
            assert.ok(res.body.data.movement.creator);
            assert.strictEqual(res.body.data.movement.creator.email, "warehouse@example.com");
            assert.strictEqual(
                res.body.data.movement.creator.passwordHash,
                undefined,
                "passwordHash must be omitted"
            );
        });
    });

    describe("3. Stock Movement History (GET /api/inventory/:productId/movements)", () => {
        test("All roles can fetch movement history -> 200 OK", async () => {
            const res = await request("GET", `/api/inventory/${testProductId}/movements`, undefined, {
                Authorization: `Bearer ${salesToken}`,
            });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.ok(Array.isArray(res.body.data.movements));
            assert.ok(res.body.data.movements.length >= 1);

            const latestMovement = res.body.data.movements[0];
            assert.strictEqual(latestMovement.movementType, "IN");
            assert.strictEqual(latestMovement.quantity, 10);
            assert.strictEqual(latestMovement.reason, "Purchase order PO-TEST-001");
            assert.strictEqual(latestMovement.creator.email, "warehouse@example.com");
        });
    });

    after(async () => {
        if (testProductId) {
            await prisma.stockMovement.deleteMany({ where: { productId: testProductId } });
            await prisma.product.delete({ where: { id: testProductId } });
        }
        await prisma.$disconnect();
    });
});
