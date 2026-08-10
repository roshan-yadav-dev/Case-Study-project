import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    Users,
    Package,
    FileText,
    LogOut,
    Building2,
    Shield,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { RoleBadge } from "./RoleBadge";

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    const navItems = [
        { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { path: "/customers", label: "Customer CRM", icon: Users },
        { path: "/products", label: "Products & Stock", icon: Package },
        { path: "/challans", label: "Sales Challans", icon: FileText },
    ];

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
            {/* Header */}
            <header className="h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-40">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold bg-gradient-to-r from-white via-slate-200 to-indigo-200 bg-clip-text text-transparent leading-none">
                            Mini ERP + CRM
                        </h1>
                        <span className="text-xs text-slate-400 font-medium">Operations Portal</span>
                    </div>
                </div>

                {/* User Info & Actions */}
                {user && (
                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-3 bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-lg">
                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 font-semibold text-sm">
                                {user.name.charAt(0)}
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="text-xs font-semibold text-slate-200">{user.name}</span>
                                <span className="text-[10px] text-slate-400">{user.email}</span>
                            </div>
                            <RoleBadge role={user.role} />
                        </div>

                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 hover:bg-red-900/60 hover:text-red-100 transition-all text-xs font-semibold"
                            title="Sign out"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Logout</span>
                        </button>
                    </div>
                )}
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <aside className="w-64 bg-slate-950/50 border-r border-slate-800/80 flex flex-col justify-between p-4 hidden md:flex">
                    <nav className="space-y-1.5">
                        <div className="px-3 py-2 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                            Modules
                        </div>
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.path;

                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                                        isActive
                                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-semibold"
                                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                                    }`}
                                >
                                    <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* RBAC Info Card */}
                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 text-left">
                        <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold mb-1">
                            <Shield className="w-3.5 h-3.5" />
                            <span>Active Permissions</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                            {user?.role === "ADMIN" && "Full administrative control across all CRM & Inventory modules."}
                            {user?.role === "SALES" && "Manage customer leads, create & confirm sales challans."}
                            {user?.role === "WAREHOUSE" && "Stock IN replenishments & inventory management access."}
                            {user?.role === "ACCOUNTS" && "Read-only access for financial auditing & reporting."}
                        </p>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-900/40">
                    <div className="max-w-7xl mx-auto space-y-6">{children}</div>
                </main>
            </div>
        </div>
    );
};
