import React, { useEffect, useState } from "react";
import {
    Users,
    Package,
    AlertTriangle,
    FileText,
    TrendingUp,
    Boxes,
    Clock,
    Calendar,
    RefreshCw,
    CheckCircle2,
    XCircle,
    UserPlus,
    MessageSquare,
} from "lucide-react";
import api from "../services/api";
import type { ActivityItem, DashboardSummary, LowStockProduct, SalesSummary } from "../types";

export const DashboardPage: React.FC = () => {
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null);
    const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Sales Summary Filter State
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    const fetchDashboardData = async (showRefresh = false) => {
        if (showRefresh) setIsRefreshing(true);
        try {
            const summaryRes = await api.get("/dashboard/summary");
            if (summaryRes.data.success) setSummary(summaryRes.data.data);

            const salesParams: any = {};
            if (fromDate) salesParams.from = fromDate;
            if (toDate) salesParams.to = toDate;
            const salesRes = await api.get("/dashboard/sales-summary", { params: salesParams });
            if (salesRes.data.success) setSalesSummary(salesRes.data.data);

            const lowStockRes = await api.get("/dashboard/low-stock?limit=5");
            if (lowStockRes.data.success) setLowStock(lowStockRes.data.data.products);

            const activityRes = await api.get("/dashboard/recent-activity?limit=8");
            if (activityRes.data.success) setActivities(activityRes.data.data.activities);
        } catch (error) {
            console.error("Failed to load dashboard data", error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [fromDate, toDate]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex items-center gap-3 text-indigo-400 font-medium">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Loading operational metrics from PostgreSQL...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 text-left">
            {/* Page Title & Refresh Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Operational Dashboard</h2>
                    <p className="text-xs text-slate-400">Real-time enterprise resource indicators & sales analytics</p>
                </div>
                <button
                    onClick={() => fetchDashboardData(true)}
                    disabled={isRefreshing}
                    className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-indigo-400" : ""}`} />
                    <span>{isRefreshing ? "Updating..." : "Refresh Data"}</span>
                </button>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Customers Card */}
                <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 relative overflow-hidden shadow-xl">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Customers</span>
                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <span className="text-2xl font-bold text-white">{summary?.customers.total || 0}</span>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
                        <span className="text-emerald-400 font-semibold">{summary?.customers.active} Active</span>
                        <span>•</span>
                        <span className="text-amber-400 font-semibold">{summary?.customers.leads} Leads</span>
                        <span>•</span>
                        <span>{summary?.customers.inactive} Inactive</span>
                    </div>
                </div>

                {/* Products & Inventory Units Card */}
                <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 relative overflow-hidden shadow-xl">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Catalog & Stock</span>
                        <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            <Package className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-3">
                        <span className="text-2xl font-bold text-white">{summary?.products.total || 0}</span>
                        <span className="text-xs text-slate-400 font-medium">SKUs</span>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
                        <Boxes className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-slate-200 font-semibold">{summary?.inventory.totalUnits} Units in Stock</span>
                    </div>
                </div>

                {/* Low Stock Alert Card */}
                <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 relative overflow-hidden shadow-xl">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Restock Alerts</span>
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <span className={`text-2xl font-bold ${summary?.products.lowStock ? "text-amber-400" : "text-emerald-400"}`}>
                            {summary?.products.lowStock || 0}
                        </span>
                    </div>
                    <div className="mt-3 text-[11px] text-slate-400">
                        {summary?.products.lowStock ? (
                            <span className="text-amber-400 font-medium">Require immediate warehouse replenishment</span>
                        ) : (
                            <span className="text-emerald-400 font-medium">All items above safety threshold</span>
                        )}
                    </div>
                </div>

                {/* Sales Challans Card */}
                <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 relative overflow-hidden shadow-xl">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sales Challans</span>
                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            <FileText className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <span className="text-2xl font-bold text-white">{summary?.challans.total || 0}</span>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
                        <span className="text-emerald-400 font-semibold">{summary?.challans.confirmed} Confirmed</span>
                        <span>•</span>
                        <span className="text-indigo-400 font-semibold">{summary?.challans.draft} Draft</span>
                        <span>•</span>
                        <span className="text-rose-400 font-semibold">{summary?.challans.cancelled} Cancelled</span>
                    </div>
                </div>
            </div>

            {/* Sales Summary & Activity Feed Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sales Summary Section (2 cols) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-indigo-400" />
                                <h3 className="text-base font-semibold text-white">Confirmed Sales Summary</h3>
                            </div>

                            {/* Date Filter Inputs */}
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1">
                                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                    <input
                                        type="date"
                                        value={fromDate}
                                        onChange={(e) => setFromDate(e.target.value)}
                                        className="bg-transparent text-xs text-slate-200 focus:outline-none"
                                        placeholder="From"
                                    />
                                </div>
                                <span className="text-xs text-slate-500">to</span>
                                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1">
                                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                    <input
                                        type="date"
                                        value={toDate}
                                        onChange={(e) => setToDate(e.target.value)}
                                        className="bg-transparent text-xs text-slate-200 focus:outline-none"
                                        placeholder="To"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Summary Metrics */}
                        <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800/60">
                            <div>
                                <span className="text-[11px] font-semibold text-slate-400 uppercase">Confirmed Orders</span>
                                <div className="text-lg font-bold text-white mt-1">{salesSummary?.confirmedChallans || 0}</div>
                            </div>
                            <div>
                                <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Units Sold</span>
                                <div className="text-lg font-bold text-indigo-400 mt-1">{salesSummary?.totalUnitsSold || 0}</div>
                            </div>
                            <div>
                                <span className="text-[11px] font-semibold text-slate-400 uppercase">Gross Sales Value</span>
                                <div className="text-lg font-bold text-emerald-400 mt-1">₹{salesSummary?.confirmedSalesValue || "0.00"}</div>
                            </div>
                        </div>

                        {/* Daily Sales Table */}
                        <div className="space-y-2">
                            <span className="text-xs font-semibold text-slate-400 block">Daily Breakdown</span>
                            {salesSummary?.daily && salesSummary.daily.length > 0 ? (
                                <div className="overflow-x-auto rounded-xl border border-slate-800">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                                            <tr>
                                                <th className="p-2.5">Date</th>
                                                <th className="p-2.5 text-center">Challans</th>
                                                <th className="p-2.5 text-center">Units Sold</th>
                                                <th className="p-2.5 text-right">Confirmed Value</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                                            {salesSummary.daily.map((row) => (
                                                <tr key={row.date} className="hover:bg-slate-800/40">
                                                    <td className="p-2.5 font-medium text-slate-200">{row.date}</td>
                                                    <td className="p-2.5 text-center">{row.challans}</td>
                                                    <td className="p-2.5 text-center font-semibold text-indigo-400">{row.unitsSold}</td>
                                                    <td className="p-2.5 text-right font-semibold text-emerald-400">₹{row.confirmedSalesValue}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-6 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/40">
                                    No confirmed sales recorded in selected date range.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Low Stock Attention List */}
                    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-amber-400" />
                                <h3 className="text-base font-semibold text-white">Low-Stock Restock Queue</h3>
                            </div>
                            <span className="text-xs text-slate-400 font-medium">Sorted by highest shortage</span>
                        </div>

                        {lowStock.length > 0 ? (
                            <div className="overflow-x-auto rounded-xl border border-slate-800">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                                        <tr>
                                            <th className="p-2.5">Product SKU / Name</th>
                                            <th className="p-2.5">Location</th>
                                            <th className="p-2.5 text-center">Stock</th>
                                            <th className="p-2.5 text-center">Min Stock</th>
                                            <th className="p-2.5 text-center">Shortage</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                                        {lowStock.map((p) => (
                                            <tr key={p.productId} className="hover:bg-slate-800/40">
                                                <td className="p-2.5">
                                                    <div className="font-semibold text-white">{p.name}</div>
                                                    <div className="text-[10px] text-slate-400">{p.sku} • {p.category}</div>
                                                </td>
                                                <td className="p-2.5 text-slate-400">{p.warehouseLocation}</td>
                                                <td className="p-2.5 text-center font-bold text-amber-400">{p.currentStock}</td>
                                                <td className="p-2.5 text-center text-slate-400">{p.minimumStock}</td>
                                                <td className="p-2.5 text-center">
                                                    <span className="px-2 py-0.5 rounded-full bg-red-950/60 border border-red-800/60 text-red-300 font-bold text-[10px]">
                                                        -{p.shortage} units
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-6 text-center text-xs text-emerald-400 bg-slate-950/40 rounded-xl border border-slate-800/40 font-medium">
                                ✓ All inventory items are currently above minimum stock levels.
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Activity Feed (1 col) */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 h-fit">
                    <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
                        <Clock className="w-5 h-5 text-indigo-400" />
                        <h3 className="text-base font-semibold text-white">Recent Activity</h3>
                    </div>

                    <div className="space-y-3">
                        {activities.length > 0 ? (
                            activities.map((act, index) => {
                                let badgeColor = "bg-slate-800 text-slate-300 border-slate-700";
                                let Icon = Clock;

                                if (act.type === "CHALLAN_CONFIRMED") {
                                    badgeColor = "bg-emerald-950/60 text-emerald-300 border-emerald-800/50";
                                    Icon = CheckCircle2;
                                } else if (act.type === "CHALLAN_CANCELLED") {
                                    badgeColor = "bg-red-950/60 text-red-300 border-red-800/50";
                                    Icon = XCircle;
                                } else if (act.type === "STOCK_IN") {
                                    badgeColor = "bg-indigo-950/60 text-indigo-300 border-indigo-800/50";
                                    Icon = Boxes;
                                } else if (act.type === "CUSTOMER_CREATED") {
                                    badgeColor = "bg-blue-950/60 text-blue-300 border-blue-800/50";
                                    Icon = UserPlus;
                                } else if (act.type === "FOLLOWUP_ADDED") {
                                    badgeColor = "bg-amber-950/60 text-amber-300 border-amber-800/50";
                                    Icon = MessageSquare;
                                }

                                return (
                                    <div key={index} className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/60 space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                                                <Icon className="w-3 h-3" />
                                                {act.type}
                                            </span>
                                            <span className="text-[10px] text-slate-500 font-medium">
                                                {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-200 font-medium">{act.message}</p>
                                        {act.actor && (
                                            <div className="text-[10px] text-slate-400">By: {act.actor.name}</div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="p-6 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/40">
                                No recent activity recorded.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
