import api from "./client";

export const getChallans = async (params?: Record<string, unknown>) => {
    const response = await api.get("/challans", { params });
    return response.data.data;
};

export const getChallanById = async (id: string) => {
    const response = await api.get(`/challans/${id}`);
    return response.data.data.challan;
};

export const createChallan = async (payload: unknown) => {
    const response = await api.post("/challans", payload);
    return response.data.data.challan;
};

export const confirmChallan = async (id: string) => {
    const response = await api.post(`/challans/${id}/confirm`);
    return response.data.data.challan;
};

export const cancelChallan = async (id: string) => {
    const response = await api.post(`/challans/${id}/cancel`);
    return response.data.data.challan;
};
