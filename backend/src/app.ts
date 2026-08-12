import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import prisma from "./config/prisma";
import authRoutes from "./routes/auth.routes";
import challanRoutes from "./routes/challan.routes";
import customerRoutes from "./routes/customer.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import inventoryRoutes from "./routes/inventory.routes";
import productRoutes from "./routes/product.routes";

dotenv.config();

export const app = express();

app.use(helmet());

// Production CORS Configuration
const corsOrigin = process.env.CORS_ORIGIN;
const allowedOrigins = corsOrigin
    ? corsOrigin.split(",").map((origin) => origin.trim())
    : ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"];

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (such as mobile apps, curl, server-to-server, or test suites)
            if (
                !origin ||
                process.env.NODE_ENV === "test" ||
                process.env.NODE_ENV !== "production" ||
                allowedOrigins.includes(origin) ||
                allowedOrigins.includes("*") ||
                origin.startsWith("http://localhost:") ||
                origin.startsWith("http://127.0.0.1:")
            ) {
                return callback(null, true);
            }

            // Disallow origins not included in whitelist
            return callback(null, false);
        },
        credentials: true,
    })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== "test") {
    app.use(morgan("dev"));
}

// Lightweight health check endpoint for Render monitoring
app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
});

// API health endpoint
app.get("/api/health", (_req, res) => {
    res.status(200).json({
        status: "ok",
        success: true,
        message: "Mini ERP CRM API is running",
        timestamp: new Date().toISOString(),
    });
});

// Optional Database Connectivity Health Check
app.get("/health/db", async (_req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.status(200).json({ status: "ok", database: "connected" });
    } catch (_err) {
        res.status(503).json({ status: "error", database: "disconnected" });
    }
});

// Authentication and RBAC routes
app.use("/api/auth", authRoutes);

// Customer CRM routes
app.use("/api/customers", customerRoutes);

// Product Catalog routes
app.use("/api/products", productRoutes);

// Inventory & Stock Movement routes
app.use("/api/inventory", inventoryRoutes);

// Sales Challan & Stock OUT routes
app.use("/api/challans", challanRoutes);

// Dashboard & Reporting APIs
app.use("/api/dashboard", dashboardRoutes);

// JSON 404 Handler for undefined API routes
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found",
    });
});

// Production-safe Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || "Internal server error";

    if (process.env.NODE_ENV !== "test") {
        console.error(`[Express Error ${statusCode}] ${message}`, err);
    }

    res.status(statusCode).json({
        success: false,
        message,
        ...(err.details ? { details: err.details } : {}),
        ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
    });
});