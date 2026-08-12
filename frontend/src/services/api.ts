import axios from "axios";

const rawApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const cleanApiUrl = rawApiUrl.trim().replace(/\/+$/, "");
const baseURL = cleanApiUrl.endsWith("/api") ? cleanApiUrl : `${cleanApiUrl}/api`;

const api = axios.create({
    baseURL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Attach JWT token to requests if available
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

// Handle 401 responses automatically
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            const isAuthLoginRequest = error.config?.url?.includes("/auth/login");
            if (!isAuthLoginRequest) {
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