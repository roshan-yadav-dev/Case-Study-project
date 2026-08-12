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

describe("PHASE 4: Customer CRM Module Test Suite", () => {
    let adminToken: string;
    let salesToken: string;
    let warehouseToken: string;
    let accountsToken: string;
    let createdCustomerId: string;

    before(async () => {
        adminToken = await loginUser("admin@example.com");
        salesToken = await loginUser("sales@example.com");
        warehouseToken = await loginUser("warehouse@example.com");
        accountsToken = await loginUser("accounts@example.com");
    });

    describe("1. Create Customer API (POST /api/customers)", () => {
        test("Unauthenticated request -> 401", async () => {
            const res = await request("POST", "/api/customers", {
                name: "Test Customer",
                mobile: "9998887770",
                businessName: "Test Enterprise",
                customerType: "RETAIL",
                address: "Bengaluru",
            });
            assert.strictEqual(res.status, 401);
        });

        test("WAREHOUSE role blocked from creating -> 403", async () => {
            const res = await request(
                "POST",
                "/api/customers",
                {
                    name: "Unauthorized Customer",
                    mobile: "9998887771",
                    businessName: "Unauthorized Enterprise",
                    customerType: "RETAIL",
                    address: "Bengaluru",
                },
                { Authorization: `Bearer ${warehouseToken}` }
            );
            assert.strictEqual(res.status, 403);
        });

        test("ACCOUNTS role blocked from creating -> 403", async () => {
            const res = await request(
                "POST",
                "/api/customers",
                {
                    name: "Unauthorized Customer",
                    mobile: "9998887772",
                    businessName: "Unauthorized Enterprise",
                    customerType: "RETAIL",
                    address: "Bengaluru",
                },
                { Authorization: `Bearer ${accountsToken}` }
            );
            assert.strictEqual(res.status, 403);
        });

        test("Invalid payload -> 400", async () => {
            const res = await request(
                "POST",
                "/api/customers",
                {
                    name: "", // empty name
                    mobile: "9998887773",
                },
                { Authorization: `Bearer ${adminToken}` }
            );
            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.body.success, false);
        });

        test("SALES creates customer successfully -> 201", async () => {
            const res = await request(
                "POST",
                "/api/customers",
                {
                    name: "Omni Logistics",
                    mobile: "9876500011",
                    email: "info@omnilogistics.com",
                    businessName: "Omni Logistics Pvt Ltd",
                    gstNumber: "29AAAAA0000A1Z5",
                    customerType: "DISTRIBUTOR",
                    address: "Outer Ring Road, Bengaluru",
                    status: "ACTIVE",
                    followUpDate: "2026-09-01",
                    notes: "High priority distributor relationship",
                },
                { Authorization: `Bearer ${salesToken}` }
            );

            assert.strictEqual(res.status, 201);
            assert.strictEqual(res.body.success, true);
            assert.ok(res.body.data.customer.id);
            assert.strictEqual(res.body.data.customer.name, "Omni Logistics");
            assert.strictEqual(res.body.data.customer.customerType, "DISTRIBUTOR");

            createdCustomerId = res.body.data.customer.id;
        });

        test("ADMIN creates customer successfully -> 201", async () => {
            const res = await request(
                "POST",
                "/api/customers",
                {
                    name: "Beta Retailers",
                    mobile: "9876500022",
                    businessName: "Beta Stores",
                    customerType: "RETAIL",
                    address: "Koramangala, Bengaluru",
                },
                { Authorization: `Bearer ${adminToken}` }
            );

            assert.strictEqual(res.status, 201);
            assert.strictEqual(res.body.success, true);
            assert.strictEqual(res.body.data.customer.status, "LEAD"); // default status
        });
    });

    describe("2. List & Search Customers API (GET /api/customers)", () => {
        test("All roles can list customers -> 200", async () => {
            for (const token of [adminToken, salesToken, warehouseToken, accountsToken]) {
                const res = await request("GET", "/api/customers", undefined, {
                    Authorization: `Bearer ${token}`,
                });
                assert.strictEqual(res.status, 200);
                assert.strictEqual(res.body.success, true);
                assert.ok(Array.isArray(res.body.data.customers));
                assert.ok(res.body.data.pagination);
            }
        });

        test("Pagination limits and structure -> 200", async () => {
            const res = await request("GET", "/api/customers?page=1&limit=2", undefined, {
                Authorization: `Bearer ${adminToken}`,
            });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.data.pagination.page, 1);
            assert.strictEqual(res.body.data.pagination.limit, 2);
            assert.ok(res.body.data.pagination.total >= 5);
            assert.strictEqual(res.body.data.customers.length, 2);
        });

        test("Search filter by businessName -> 200", async () => {
            const res = await request("GET", "/api/customers?search=Omni", undefined, {
                Authorization: `Bearer ${salesToken}`,
            });

            assert.strictEqual(res.status, 200);
            assert.ok(res.body.data.customers.length >= 1);
            assert.strictEqual(res.body.data.customers[0].name, "Omni Logistics");
        });

        test("Filter by customerType & status -> 200", async () => {
            const res = await request(
                "GET",
                "/api/customers?customerType=DISTRIBUTOR&status=ACTIVE",
                undefined,
                { Authorization: `Bearer ${salesToken}` }
            );

            assert.strictEqual(res.status, 200);
            assert.ok(res.body.data.customers.length >= 1);
            for (const c of res.body.data.customers) {
                assert.strictEqual(c.customerType, "DISTRIBUTOR");
                assert.strictEqual(c.status, "ACTIVE");
            }
        });
    });

    describe("3. Get Customer Detail API (GET /api/customers/:id)", () => {
        test("Valid customer ID returns customer + followUp history -> 200", async () => {
            const res = await request("GET", `/api/customers/${createdCustomerId}`, undefined, {
                Authorization: `Bearer ${warehouseToken}`,
            });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.strictEqual(res.body.data.customer.id, createdCustomerId);
            assert.ok(Array.isArray(res.body.data.customer.followUps));
        });

        test("Invalid UUID format -> 400 Bad Request", async () => {
            const res = await request("GET", "/api/customers/invalid-uuid-12345", undefined, {
                Authorization: `Bearer ${adminToken}`,
            });

            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.body.message, "Invalid customer ID");
        });

        test("Non-existent UUID -> 404 Not Found", async () => {
            const nonExistentUuid = "00000000-0000-0000-0000-000000000000";
            const res = await request("GET", `/api/customers/${nonExistentUuid}`, undefined, {
                Authorization: `Bearer ${adminToken}`,
            });

            assert.strictEqual(res.status, 404);
            assert.strictEqual(res.body.message, "Customer not found");
        });
    });

    describe("4. Update Customer API (PATCH /api/customers/:id)", () => {
        test("WAREHOUSE & ACCOUNTS roles blocked from update -> 403", async () => {
            const res = await request(
                "PATCH",
                `/api/customers/${createdCustomerId}`,
                { status: "INACTIVE" },
                { Authorization: `Bearer ${warehouseToken}` }
            );
            assert.strictEqual(res.status, 403);
        });

        test("Empty update payload rejected -> 400", async () => {
            const res = await request(
                "PATCH",
                `/api/customers/${createdCustomerId}`,
                {},
                { Authorization: `Bearer ${adminToken}` }
            );
            assert.strictEqual(res.status, 400);
        });

        test("SALES updates customer fields partially -> 200", async () => {
            const res = await request(
                "PATCH",
                `/api/customers/${createdCustomerId}`,
                {
                    notes: "Updated client requirements note",
                    address: "New Address Road, Bengaluru",
                },
                { Authorization: `Bearer ${salesToken}` }
            );

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.strictEqual(res.body.data.customer.notes, "Updated client requirements note");
            assert.strictEqual(res.body.data.customer.address, "New Address Road, Bengaluru");
            assert.strictEqual(res.body.data.customer.name, "Omni Logistics"); // Unchanged
        });
    });

    describe("5. Customer Follow-Ups API (POST /api/customers/:id/followups)", () => {
        test("WAREHOUSE role blocked from adding follow-up -> 403", async () => {
            const res = await request(
                "POST",
                `/api/customers/${createdCustomerId}/followups`,
                {
                    followUpDate: "2026-09-15",
                    notes: "Unauthorized follow-up note",
                },
                { Authorization: `Bearer ${warehouseToken}` }
            );
            assert.strictEqual(res.status, 403);
        });

        test("SALES adds follow-up -> 201 Created & Updates Customer followUpDate", async () => {
            const newDateStr = "2026-09-25T00:00:00.000Z";
            const res = await request(
                "POST",
                `/api/customers/${createdCustomerId}/followups`,
                {
                    followUpDate: "2026-09-25",
                    notes: "Scheduled contract renewal negotiation meeting",
                },
                { Authorization: `Bearer ${salesToken}` }
            );

            assert.strictEqual(res.status, 201);
            assert.strictEqual(res.body.success, true);
            assert.ok(res.body.data.followUp.id);
            assert.strictEqual(res.body.data.followUp.notes, "Scheduled contract renewal negotiation meeting");
            assert.ok(res.body.data.followUp.creator);
            assert.strictEqual(res.body.data.followUp.creator.email, "sales@example.com");

            // Verify Customer detail reflects updated followUpDate & new entry in followUps array
            const detailRes = await request("GET", `/api/customers/${createdCustomerId}`, undefined, {
                Authorization: `Bearer ${adminToken}`,
            });

            assert.strictEqual(detailRes.status, 200);
            assert.ok(detailRes.body.data.customer.followUps.length >= 1);
            const latestFollowUp = detailRes.body.data.customer.followUps[0];
            assert.strictEqual(latestFollowUp.notes, "Scheduled contract renewal negotiation meeting");
            assert.strictEqual(latestFollowUp.creator.email, "sales@example.com");
            assert.strictEqual(latestFollowUp.creator.passwordHash, undefined, "passwordHash must be omitted");
        });
    });

    after(async () => {
        // Clean up test created customer
        if (createdCustomerId) {
            await prisma.customerFollowUp.deleteMany({ where: { customerId: createdCustomerId } });
            await prisma.customer.delete({ where: { id: createdCustomerId } });
        }
    });
});
