import api from "./client";

export interface LoginResponse {
    accessToken: string;
    user: any;
}

export const loginRequest = async (email: string, password: string): Promise<LoginResponse> => {
    const response = await api.post("/auth/login", { email, password });
    return response.data.data;
};

export const fetchCurrentUser = async () => {
    const response = await api.get("/auth/me");
    return response.data.data.user;
};
