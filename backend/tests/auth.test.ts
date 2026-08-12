import assert from "node:assert";
import test, { after, before, describe } from "node:test";
import jwt from "jsonwebtoken";
import prisma from "../src/config/prisma";
import { app } from "../src/app";

// Helper to make HTTP requests against local express app instance
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

describe("PHASE 3: Authentication & RBAC Test Suite", () => {
    let adminToken: string;
    let salesToken: string;
    let warehouseToken: string;
    let accountsToken: string;

    before(async () => {
        // Ensure db contains seed data
        const userCount = await prisma.user.count();
        assert.ok(userCount >= 4, "Seed users should be present in database");
    });

    describe("1. Login Functionality", () => {
        test("ADMIN Login Success", async () => {
            const res = await request("POST", "/api/auth/login", {
                email: "admin@example.com",
                password: "Password@123",
            });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.strictEqual(res.body.message, "Login successful");
            assert.ok(res.body.data.accessToken, "Should return accessToken");
            assert.strictEqual(res.body.data.user.email, "admin@example.com");
            assert.strictEqual(res.body.data.user.role, "ADMIN");
            assert.strictEqual(res.body.data.user.passwordHash, undefined, "Must NOT return passwordHash");

            adminToken = res.body.data.accessToken;
        });

        test("SALES Login Success", async () => {
            const res = await request("POST", "/api/auth/login", {
                email: "sales@example.com",
                password: "Password@123",
            });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.strictEqual(res.body.data.user.role, "SALES");
            salesToken = res.body.data.accessToken;
        });

        test("WAREHOUSE Login Success", async () => {
            const res = await request("POST", "/api/auth/login", {
                email: "warehouse@example.com",
                password: "Password@123",
            });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.strictEqual(res.body.data.user.role, "WAREHOUSE");
            warehouseToken = res.body.data.accessToken;
        });

        test("ACCOUNTS Login Success", async () => {
            const res = await request("POST", "/api/auth/login", {
                email: "accounts@example.com",
                password: "Password@123",
            });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.strictEqual(res.body.data.user.role, "ACCOUNTS");
            accountsToken = res.body.data.accessToken;
        });
    });

    describe("2. Validation & Negative Security Tests", () => {
        test("Reject missing email -> 400", async () => {
            const res = await request("POST", "/api/auth/login", {
                password: "Password@123",
            });

            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.body.success, false);
        });

        test("Reject missing password -> 400", async () => {
            const res = await request("POST", "/api/auth/login", {
                email: "sales@example.com",
            });

            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.body.success, false);
        });

        test("Reject invalid email format -> 400", async () => {
            const res = await request("POST", "/api/auth/login", {
                email: "invalid-email-format",
                password: "Password@123",
            });

            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.body.success, false);
        });

        test("Reject incorrect password -> 401 generic message", async () => {
            const res = await request("POST", "/api/auth/login", {
                email: "sales@example.com",
                password: "WrongPassword123!",
            });

            assert.strictEqual(res.status, 401);
            assert.strictEqual(res.body.success, false);
            assert.strictEqual(res.body.message, "Invalid email or password");
        });

        test("Reject non-existent email -> 401 identical generic message", async () => {
            const res = await request("POST", "/api/auth/login", {
                email: "nonexistent@example.com",
                password: "Password@123",
            });

            assert.strictEqual(res.status, 401);
            assert.strictEqual(res.body.success, false);
            assert.strictEqual(res.body.message, "Invalid email or password");
        });
    });

    describe("3. Authenticated User Endpoint (/api/auth/me)", () => {
        test("GET /me with valid token -> 200", async () => {
            const res = await request("GET", "/api/auth/me", undefined, {
                Authorization: `Bearer ${adminToken}`,
            });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.strictEqual(res.body.data.user.email, "admin@example.com");
            assert.strictEqual(res.body.data.user.role, "ADMIN");
            assert.strictEqual(res.body.data.user.passwordHash, undefined);
        });

        test("GET /me with missing token -> 401", async () => {
            const res = await request("GET", "/api/auth/me");

            assert.strictEqual(res.status, 401);
            assert.strictEqual(res.body.success, false);
            assert.strictEqual(res.body.message, "Authentication required");
        });

        test("GET /me with invalid token format -> 401", async () => {
            const res = await request("GET", "/api/auth/me", undefined, {
                Authorization: "Bearer invalid_malformed_token_string",
            });

            assert.strictEqual(res.status, 401);
            assert.strictEqual(res.body.success, false);
            assert.strictEqual(res.body.message, "Invalid or expired token");
        });

        test("GET /me with expired token -> 401", async () => {
            const expiredToken = jwt.sign(
                { sub: "dummy-user-id", role: "ADMIN" },
                process.env.JWT_SECRET || "change_this_to_a_long_random_secret",
                { expiresIn: "-1s" }
            );

            const res = await request("GET", "/api/auth/me", undefined, {
                Authorization: `Bearer ${expiredToken}`,
            });

            assert.strictEqual(res.status, 401);
            assert.strictEqual(res.body.success, false);
            assert.strictEqual(res.body.message, "Invalid or expired token");
        });
    });

    describe("4. Role-Based Access Control (RBAC)", () => {
        test("ADMIN route permission checks", async () => {
            const adminRes = await request("GET", "/api/auth/test/admin", undefined, {
                Authorization: `Bearer ${adminToken}`,
            });
            assert.strictEqual(adminRes.status, 200);
            assert.strictEqual(adminRes.body.success, true);

            const salesRes = await request("GET", "/api/auth/test/admin", undefined, {
                Authorization: `Bearer ${salesToken}`,
            });
            assert.strictEqual(salesRes.status, 403);
            assert.strictEqual(salesRes.body.message, "You do not have permission to access this resource");
        });

        test("SALES route permission checks", async () => {
            const salesRes = await request("GET", "/api/auth/test/sales", undefined, {
                Authorization: `Bearer ${salesToken}`,
            });
            assert.strictEqual(salesRes.status, 200);

            const adminRes = await request("GET", "/api/auth/test/sales", undefined, {
                Authorization: `Bearer ${adminToken}`,
            });
            assert.strictEqual(adminRes.status, 403);
        });

        test("WAREHOUSE route permission checks", async () => {
            const whRes = await request("GET", "/api/auth/test/warehouse", undefined, {
                Authorization: `Bearer ${warehouseToken}`,
            });
            assert.strictEqual(whRes.status, 200);

            const salesRes = await request("GET", "/api/auth/test/warehouse", undefined, {
                Authorization: `Bearer ${salesToken}`,
            });
            assert.strictEqual(salesRes.status, 403);
        });

        test("ACCOUNTS route permission checks", async () => {
            const accRes = await request("GET", "/api/auth/test/accounts", undefined, {
                Authorization: `Bearer ${accountsToken}`,
            });
            assert.strictEqual(accRes.status, 200);

            const whRes = await request("GET", "/api/auth/test/accounts", undefined, {
                Authorization: `Bearer ${warehouseToken}`,
            });
            assert.strictEqual(whRes.status, 403);
        });
    });

    describe("5. Inactive User Handling", () => {
        test("Inactive user cannot login or access protected routes", async () => {
            // Temporarily set a user to inactive
            const user = await prisma.user.update({
                where: { email: "sales@example.com" },
                data: { isActive: false },
            });

            try {
                // Login attempt while inactive -> 401
                const loginRes = await request("POST", "/api/auth/login", {
                    email: "sales@example.com",
                    password: "Password@123",
                });
                assert.strictEqual(loginRes.status, 401);
                assert.strictEqual(loginRes.body.message, "Invalid email or password");

                // Authenticated request with pre-existing token while inactive -> 401
                const meRes = await request("GET", "/api/auth/me", undefined, {
                    Authorization: `Bearer ${salesToken}`,
                });
                assert.strictEqual(meRes.status, 401);
                assert.strictEqual(meRes.body.message, "User account is inactive or invalid");
            } finally {
                // Re-enable user
                await prisma.user.update({
                    where: { id: user.id },
                    data: { isActive: true },
                });
            }
        });
    });

    after(async () => {
        // No-op connection pool retain for test runner
    });
});
