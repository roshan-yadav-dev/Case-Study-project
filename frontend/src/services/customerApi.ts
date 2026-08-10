import api from "./client";

export const getCustomers = async (params?: Record<string, unknown>) => {
    const response = await api.get("/customers", { params });
    return response.data.data;
};

export const getCustomerById = async (id: string) => {
    const response = await api.get(`/customers/${id}`);
    return response.data.data.customer;
};

export const createCustomer = async (payload: unknown) => {
    const response = await api.post("/customers", payload);
    return response.data.data.customer;
};

export const updateCustomer = async (id: string, payload: unknown) => {
    const response = await api.patch(`/customers/${id}`, payload);
    return response.data.data.customer;
};

export const addCustomerFollowUp = async (id: string, payload: unknown) => {
    const response = await api.post(`/customers/${id}/followups`, payload);
    return response.data.data.followUp;
};
