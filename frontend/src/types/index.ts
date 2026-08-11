export type UserRole = "ADMIN" | "SALES" | "WAREHOUSE" | "ACCOUNTS";

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
}

export type CustomerType = "RETAIL" | "WHOLESALE" | "DISTRIBUTOR";
export type CustomerStatus = "LEAD" | "ACTIVE" | "INACTIVE";

export interface CustomerFollowUp {
    id: string;
    customerId: string;
    followUpDate: string;
    notes: string;
    createdAt: string;
    creator?: {
        id: string;
        name: string;
        email: string;
    };
}

export interface Customer {
    id: string;
    name: string;
    mobile: string;
    email?: string | null;
    businessName: string;
    gstNumber?: string | null;
    customerType: CustomerType;
    address?: string | null;
    status: CustomerStatus;
    followUpDate?: string | null;
    notes?: string | null;
    createdAt: string;
    updatedAt: string;
    followUps?: CustomerFollowUp[];
}

export interface Product {
    id: string;
    name: string;
    sku: string;
    category: string;
    unitPrice: string | number;
    currentStock: number;
    minimumStock: number;
    warehouseLocation: string;
    lowStock?: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface StockMovement {
    id: string;
    productId: string;
    quantity: number;
    movementType: "IN" | "OUT";
    reason: string;
    createdBy: string;
    createdAt: string;
    product?: {
        name: string;
        sku: string;
    };
    creator?: {
        name: string;
        email: string;
    };
}

export type ChallanStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";

export interface ChallanItem {
    id: string;
    challanId: string;
    productId: string;
    productNameSnapshot: string;
    skuSnapshot: string;
    unitPriceSnapshot: string | number;
    quantity: number;
    createdAt: string;
}

export interface Challan {
    id: string;
    challanNumber: string;
    customerId: string;
    status: ChallanStatus;
    totalQuantity: number;
    createdBy: string;
    confirmedAt?: string | null;
    cancelledAt?: string | null;
    createdAt: string;
    updatedAt: string;
    customer?: {
        id: string;
        name: string;
        businessName: string;
        mobile: string;
        email?: string | null;
        address?: string | null;
        gstNumber?: string | null;
    };
    creator?: {
        id: string;
        name: string;
        email: string;
        role: UserRole;
    };
    items?: ChallanItem[];
}

export interface DashboardSummary {
    customers: {
        total: number;
        active: number;
        leads: number;
        inactive: number;
    };
    products: {
        total: number;
        lowStock: number;
    };
    challans: {
        total: number;
        draft: number;
        confirmed: number;
        cancelled: number;
    };
    inventory: {
        totalUnits: number;
    };
}

export interface SalesSummary {
    confirmedChallans: number;
    totalUnitsSold: number;
    confirmedSalesValue: string;
    daily: Array<{
        date: string;
        challans: number;
        unitsSold: number;
        confirmedSalesValue: string;
    }>;
}

export interface LowStockProduct {
    productId: string;
    name: string;
    sku: string;
    category: string;
    currentStock: number;
    minimumStock: number;
    warehouseLocation: string;
    shortage: number;
}

export interface ActivityItem {
    type: string;
    message: string;
    entityId: string;
    actor?: {
        id: string;
        name: string;
    };
    timestamp: string;
}
