import api from "./client";

export const getDashboardSummary = async () => {
    const response = await api.get("/dashboard/summary");
    return response.data.data;
};

export const getDashboardSalesSummary = async (params?: Record<string, unknown>) => {
    const response = await api.get("/dashboard/sales-summary", { params });
    return response.data.data;
};

export const getDashboardLowStock = async (params?: Record<string, unknown>) => {
    const response = await api.get("/dashboard/low-stock", { params });
    return response.data.data;
};

export const getDashboardRecentActivity = async (params?: Record<string, unknown>) => {
    const response = await api.get("/dashboard/recent-activity", { params });
    return response.data.data;
};
