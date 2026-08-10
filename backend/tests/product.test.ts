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

describe("PHASE 5: Product Management Test Suite", () => {
    let adminToken: string;
    let salesToken: string;
    let warehouseToken: string;
    let accountsToken: string;
    let createdProductId: string;

    before(async () => {
        adminToken = await loginUser("admin@example.com");
        salesToken = await loginUser("sales@example.com");
        warehouseToken = await loginUser("warehouse@example.com");
        accountsToken = await loginUser("accounts@example.com");
    });

    describe("1. Product Creation (POST /api/products)", () => {
        test("Unauthenticated request -> 401", async () => {
            const res = await request("POST", "/api/products", {
                name: "Unauth Product",
                sku: "PROD-UNAUTH-01",
                category: "Testing",
                unitPrice: 100,
                warehouseLocation: "WH-A1",
            });
            assert.strictEqual(res.status, 401);
        });

        test("SALES & ACCOUNTS roles blocked from creation -> 403", async () => {
            const salesRes = await request(
                "POST",
                "/api/products",
                {
                    name: "Sales Product",
                    sku: "PROD-SALES-01",
                    category: "Testing",
                    unitPrice: 100,
                    warehouseLocation: "WH-A1",
                },
                { Authorization: `Bearer ${salesToken}` }
            );
            assert.strictEqual(salesRes.status, 403);

            const accRes = await request(
                "POST",
                "/api/products",
                {
                    name: "Accounts Product",
                    sku: "PROD-ACC-01",
                    category: "Testing",
                    unitPrice: 100,
                    warehouseLocation: "WH-A1",
                },
                { Authorization: `Bearer ${accountsToken}` }
            );
            assert.strictEqual(accRes.status, 403);
        });

        test("WAREHOUSE creates product -> 201 Created & SKUs upper-cased", async () => {
            const res = await request(
                "POST",
                "/api/products",
                {
                    name: "Smart Switch 8-Port",
                    sku: "prod-sw-8p", // lowercase SKU
                    category: "Networking",
                    unitPrice: 4500.5,
                    currentStock: 5,
                    minimumStock: 10,
                    warehouseLocation: "WH-B2",
                },
                { Authorization: `Bearer ${warehouseToken}` }
            );

            assert.strictEqual(res.status, 201);
            assert.strictEqual(res.body.success, true);
            assert.strictEqual(res.body.data.product.sku, "PROD-SW-8P"); // Normalized uppercase
            assert.strictEqual(res.body.data.product.lowStock, true); // 5 <= 10
            createdProductId = res.body.data.product.id;
        });

        test("Duplicate SKU returns 409 Conflict", async () => {
            const res = await request(
                "POST",
                "/api/products",
                {
                    name: "Duplicate Switch",
                    sku: "PROD-SW-8P",
                    category: "Networking",
                    unitPrice: 4500.5,
                    warehouseLocation: "WH-B2",
                },
                { Authorization: `Bearer ${adminToken}` }
            );

            assert.strictEqual(res.status, 409);
            assert.strictEqual(res.body.success, false);
            assert.strictEqual(res.body.message, "Product SKU already exists");
        });

        test("Negative price rejected -> 400 Bad Request", async () => {
            const res = await request(
                "POST",
                "/api/products",
                {
                    name: "Negative Price Item",
                    sku: "PROD-NEG-01",
                    category: "Testing",
                    unitPrice: -50,
                    warehouseLocation: "WH-A1",
                },
                { Authorization: `Bearer ${adminToken}` }
            );

            assert.strictEqual(res.status, 400);
        });

        test("Negative stock rejected on creation -> 400 Bad Request", async () => {
            const res = await request(
                "POST",
                "/api/products",
                {
                    name: "Negative Stock Item",
                    sku: "PROD-NEGSTOCK-01",
                    category: "Testing",
                    unitPrice: 100,
                    currentStock: -10,
                    warehouseLocation: "WH-A1",
                },
                { Authorization: `Bearer ${adminToken}` }
            );

            assert.strictEqual(res.status, 400);
        });
    });

    describe("2. Product Search & List (GET /api/products)", () => {
        test("All roles can list products -> 200", async () => {
            for (const token of [adminToken, salesToken, warehouseToken, accountsToken]) {
                const res = await request("GET", "/api/products", undefined, {
                    Authorization: `Bearer ${token}`,
                });
                assert.strictEqual(res.status, 200);
                assert.ok(Array.isArray(res.body.data.products));
            }
        });

        test("Pagination works -> 200", async () => {
            const res = await request("GET", "/api/products?page=1&limit=2", undefined, {
                Authorization: `Bearer ${salesToken}`,
            });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.data.pagination.page, 1);
            assert.strictEqual(res.body.data.pagination.limit, 2);
            assert.strictEqual(res.body.data.products.length, 2);
        });

        test("Search by SKU -> 200", async () => {
            const res = await request("GET", "/api/products?search=PROD-SW-8P", undefined, {
                Authorization: `Bearer ${salesToken}`,
            });

            assert.strictEqual(res.status, 200);
            assert.ok(res.body.data.products.length >= 1);
            assert.strictEqual(res.body.data.products[0].sku, "PROD-SW-8P");
        });

        test("Filter by category & lowStock=true -> 200", async () => {
            const res = await request(
                "GET",
                "/api/products?category=Networking&lowStock=true",
                undefined,
                { Authorization: `Bearer ${salesToken}` }
            );

            assert.strictEqual(res.status, 200);
            assert.ok(res.body.data.products.length >= 1);
            for (const p of res.body.data.products) {
                assert.strictEqual(p.category, "Networking");
                assert.strictEqual(p.lowStock, true);
            }
        });
    });

    describe("3. Product Detail (GET /api/products/:id)", () => {
        test("Valid product returns detail + lowStock status -> 200", async () => {
            const res = await request("GET", `/api/products/${createdProductId}`, undefined, {
                Authorization: `Bearer ${accountsToken}`,
            });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.data.product.id, createdProductId);
            assert.strictEqual(res.body.data.product.lowStock, true);
        });

        test("Non-existent product -> 404 Not Found", async () => {
            const res = await request(
                "GET",
                "/api/products/00000000-0000-0000-0000-000000000000",
                undefined,
                { Authorization: `Bearer ${adminToken}` }
            );
            assert.strictEqual(res.status, 404);
            assert.strictEqual(res.body.message, "Product not found");
        });
    });

    describe("4. Product Update (PATCH /api/products/:id)", () => {
        test("Attempt to update currentStock via PATCH rejected -> 400 Bad Request", async () => {
            const res = await request(
                "PATCH",
                `/api/products/${createdProductId}`,
                { currentStock: 999 },
                { Authorization: `Bearer ${adminToken}` }
            );

            assert.strictEqual(res.status, 400);
            assert.strictEqual(
                res.body.message,
                "Stock updates must be performed via inventory stock-in operations"
            );
        });

        test("ADMIN updates product fields -> 200 OK", async () => {
            const res = await request(
                "PATCH",
                `/api/products/${createdProductId}`,
                {
                    unitPrice: 4800,
                    minimumStock: 4, // 5 stock > 4 minimumStock -> lowStock false
                },
                { Authorization: `Bearer ${adminToken}` }
            );

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.data.product.unitPrice, "4800");
            assert.strictEqual(res.body.data.product.minimumStock, 4);
            assert.strictEqual(res.body.data.product.lowStock, false); // 5 > 4
        });
    });

    after(async () => {
        if (createdProductId) {
            await prisma.stockMovement.deleteMany({ where: { productId: createdProductId } });
            await prisma.product.delete({ where: { id: createdProductId } });
        }
        await prisma.$disconnect();
    });
});
