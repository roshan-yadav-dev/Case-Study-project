import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import authRoutes from "./routes/auth.routes";
import challanRoutes from "./routes/challan.routes";
import customerRoutes from "./routes/customer.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import inventoryRoutes from "./routes/inventory.routes";
import productRoutes from "./routes/product.routes";

dotenv.config();

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== "test") {
    app.use(morgan("dev"));
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
    res.status(200).json({
        success: true,
        message: "Mini ERP CRM API is running",
        timestamp: new Date().toISOString(),
    });
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