import api from "./client";

export const stockInProduct = async (productId: string, payload: unknown) => {
    const response = await api.post(`/inventory/${productId}/stock-in`, payload);
    return response.data.data;
};

export const getProductMovements = async (productId: string, params?: Record<string, unknown>) => {
    const response = await api.get(`/inventory/${productId}/movements`, { params });
    return response.data.data;
};

export const getLowStockInventory = async (params?: Record<string, unknown>) => {
    const response = await api.get("/inventory/low-stock", { params });
    return response.data.data;
};

export const getInventory = async (params?: Record<string, unknown>) => {
    const response = await api.get("/inventory", { params });
    return response.data.data;
};
