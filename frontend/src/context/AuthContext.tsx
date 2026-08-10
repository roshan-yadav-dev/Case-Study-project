import React, { createContext, useContext, useEffect, useState } from "react";
import { fetchCurrentUser } from "../services/authApi";
import type { User } from "../types";

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
    hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_PERMISSIONS: Record<string, string[]> = {
    ADMIN: [
        "customer:create",
        "customer:update",
        "product:create",
        "product:update",
        "stock:create",
        "challan:create",
        "challan:confirm",
    ],
    SALES: [
        "customer:create",
        "customer:update",
        "challan:create",
        "challan:confirm",
    ],
    WAREHOUSE: ["product:create", "product:update", "stock:create"],
    ACCOUNTS: [],
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(() => {
        const savedUser = localStorage.getItem("user");
        return savedUser ? JSON.parse(savedUser) : null;
    });
    const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        const checkAuth = async () => {
            const storedToken = localStorage.getItem("token");
            if (storedToken) {
                try {
                    const currentUser = await fetchCurrentUser();
                    setUser(currentUser);
                    localStorage.setItem("user", JSON.stringify(currentUser));
                } catch (_error) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    setUser(null);
                    setToken(null);
                }
            }
            setIsLoading(false);
        };
        checkAuth();
    }, []);

    const login = (newToken: string, newUser: User) => {
        localStorage.setItem("token", newToken);
        localStorage.setItem("user", JSON.stringify(newUser));
        setToken(newToken);
        setUser(newUser);
    };

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setToken(null);
        setUser(null);
    };

    const hasPermission = (permission: string) => {
        if (!user) return false;
        const permissions = ROLE_PERMISSIONS[user.role] ?? [];
        return permissions.includes(permission);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isAuthenticated: !!token && !!user,
                isLoading,
                login,
                logout,
                hasPermission,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
