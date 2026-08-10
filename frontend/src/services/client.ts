import axios from "axios";
import type { AxiosError } from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api";

const api = axios.create({
    baseURL,
    timeout: 15000,
    headers: {
        "Content-Type": "application/json",
    },
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        if (error.response?.status === 401) {
            const url = error.config?.url ?? "";
            if (!url.includes("/auth/login")) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                if (window.location.pathname !== "/login") {
                    window.location.href = "/login";
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;
