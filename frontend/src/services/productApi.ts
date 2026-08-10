import api from "./client";

export const getProducts = async (params?: Record<string, unknown>) => {
    const response = await api.get("/products", { params });
    return response.data.data;
};

export const getProductById = async (id: string) => {
    const response = await api.get(`/products/${id}`);
    return response.data.data.product;
};

export const createProduct = async (payload: unknown) => {
    const response = await api.post("/products", payload);
    return response.data.data.product;
};

export const updateProduct = async (id: string, payload: unknown) => {
    const response = await api.patch(`/products/${id}`, payload);
    return response.data.data.product;
};
