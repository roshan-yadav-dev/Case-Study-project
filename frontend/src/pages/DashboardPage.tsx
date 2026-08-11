import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import {
  getDashboardSummary,
  getDashboardSalesSummary,
  getDashboardLowStock,
  getDashboardRecentActivity,
} from "../services/dashboardApi";
import { stockInProduct } from "../services/inventoryApi";
import { StatusPill } from "../components/ui/StatusPill";
import type { ActivityItem, DashboardSummary, LowStockProduct, SalesSummary } from "../types";

export const DashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sales Summary Date Filters
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Replenishment Modal state directly from dashboard
  const [replenishItem, setReplenishItem] = useState<LowStockProduct | null>(null);
  const [replenishQty, setReplenishQty] = useState(10);
  const [replenishReason, setReplenishReason] = useState("Dashboard Quick Replenishment");
  const [isSubmittingReplenish, setIsSubmittingReplenish] = useState(false);

  const fetchDashboardData = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    try {
      const summaryData = await getDashboardSummary();
      setSummary(summaryData);

      const salesParams: Record<string, string> = {};
      if (fromDate) salesParams.from = fromDate;
      if (toDate) salesParams.to = toDate;
      const salesData = await getDashboardSalesSummary(salesParams);
      setSalesSummary(salesData);

      const lowStockData = await getDashboardLowStock({ limit: 5 });
      setLowStock(lowStockData.products || []);

      const activityData = await getDashboardRecentActivity({ limit: 8 });
      setActivities(activityData.activities || []);
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

  const handleQuickReplenish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replenishItem) return;
    setIsSubmittingReplenish(true);
    try {
      await stockInProduct(replenishItem.productId, {
        quantity: Number(replenishQty),
        reason: replenishReason,
      });
      setReplenishItem(null);
      fetchDashboardData(true);
    } catch (err) {
      alert("Failed to replenish stock");
    } finally {
      setIsSubmittingReplenish(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-slate-500">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-700" />
        <span className="text-xs font-semibold uppercase tracking-wider">Syncing operations metrics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      {/* Page Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Executive Operations Overview</h1>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              LIVE DATA
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time business performance, inventory ledger status, and operational fulfillment logs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-slate-600" : "text-slate-500"}`} />
            <span>{isRefreshing ? "Refreshing..." : "Sync Metrics"}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric Card 1: Customers */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Accounts</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums font-mono">
              {summary?.customers.total || 0}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
              <span><strong className="text-slate-800">{summary?.customers.active || 0}</strong> Active</span>
              <span className="text-slate-300">•</span>
              <span><strong className="text-slate-800">{summary?.customers.leads || 0}</strong> Leads</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <Link to="/customers" className="text-blue-600 font-semibold hover:underline flex items-center gap-1">
              <span>Manage Customers</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Metric Card 2: Catalog Units */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Catalog SKUs</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums font-mono">
              {summary?.products.total || 0}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              <strong className="text-slate-800 tabular-nums font-mono">{summary?.inventory.totalUnits || 0}</strong> total units in stock
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <Link to="/products" className="text-blue-600 font-semibold hover:underline flex items-center gap-1">
              <span>View Stock Ledger</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Metric Card 3: Restock Alerts */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Restock Alerts</span>
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
              (summary?.products.lowStock || 0) > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums font-mono">
              {summary?.products.lowStock || 0}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {(summary?.products.lowStock || 0) > 0 ? (
                <span className="text-amber-700 font-medium">Action required: Stock below min threshold</span>
              ) : (
                <span className="text-emerald-700 font-medium">Stock levels within safe threshold</span>
              )}
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <Link to="/products?lowStock=true" className="text-blue-600 font-semibold hover:underline flex items-center gap-1">
              <span>Low Stock Queue</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Metric Card 4: Sales Challans */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Delivery Challans</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums font-mono">
              {summary?.challans.total || 0}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
              <span><strong className="text-slate-800 font-mono">{summary?.challans.confirmed || 0}</strong> Confirmed</span>
              <span className="text-slate-300">•</span>
              <span><strong className="text-slate-800 font-mono">{summary?.challans.draft || 0}</strong> Draft</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <Link to="/challans" className="text-blue-600 font-semibold hover:underline flex items-center gap-1">
              <span>Fulfillment Notes</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Operational Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Confirmed Sales Performance Section */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-slate-700" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Confirmed Revenue & Sales Ledger</h2>
                  <p className="text-[11px] text-slate-500">Summary of confirmed dispatch challans in period.</p>
                </div>
              </div>

              {/* Date Filter Inputs */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[10px] text-slate-400 uppercase font-mono">From</span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="bg-transparent text-xs text-slate-800 outline-none font-mono"
                  />
                </div>
                <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">To</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="bg-transparent text-xs text-slate-800 outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Metric Banner Grid */}
            <div className="grid grid-cols-3 gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 text-xs">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Confirmed Orders</p>
                <p className="mt-1 text-lg font-bold text-slate-900 font-mono tabular-nums">
                  {salesSummary?.confirmedChallans || 0}
                </p>
              </div>
              <div className="border-l border-slate-200 pl-3">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Units Fulfilled</p>
                <p className="mt-1 text-lg font-bold text-slate-900 font-mono tabular-nums">
                  {salesSummary?.totalUnitsSold || 0}
                </p>
              </div>
              <div className="border-l border-slate-200 pl-3">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Confirmed Revenue</p>
                <p className="mt-1 text-lg font-bold text-emerald-700 font-mono tabular-nums">
                  ₹{Number(salesSummary?.confirmedSalesValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Daily Breakdown Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Daily Sales Breakdown</span>
              </div>
              {salesSummary?.daily && salesSummary.daily.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3 text-center">Challans</th>
                        <th className="py-2.5 px-3 text-center">Units Sold</th>
                        <th className="py-2.5 px-3 text-right">Revenue Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {salesSummary.daily.map((row) => (
                        <tr key={row.date} className="hover:bg-slate-50/80 transition">
                          <td className="py-2 px-3 font-mono font-medium text-slate-800">{row.date}</td>
                          <td className="py-2 px-3 text-center font-mono text-slate-600">{row.challans}</td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-slate-900">{row.unitsSold}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            ₹{Number(row.confirmedSalesValue).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-400">
                  No confirmed sales recorded for the selected period.
                </div>
              )}
            </div>
          </section>

          {/* Low Stock Queue Table Section */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Low Stock Queue & Replenishment</h2>
                  <p className="text-[11px] text-slate-500">Products currently below warehouse minimum threshold.</p>
                </div>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Sorted by shortage severity</span>
            </div>

            {lowStock.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Product Name & SKU</th>
                      <th className="py-2.5 px-3">Location</th>
                      <th className="py-2.5 px-3 text-center">Current</th>
                      <th className="py-2.5 px-3 text-center">Min Threshold</th>
                      <th className="py-2.5 px-3 text-center">Shortage</th>
                      <th className="py-2.5 px-3 text-right">Replenish</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {lowStock.map((p) => (
                      <tr key={p.productId} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">{p.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{p.sku} • {p.category}</div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">{p.warehouseLocation}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-amber-700 font-mono">{p.currentStock}</td>
                        <td className="py-2.5 px-3 text-center text-slate-500 font-mono">{p.minimumStock}</td>
                        <td className="py-2.5 px-3 text-center">
                          <StatusPill label={`-${p.shortage} units`} variant="danger" />
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => {
                              setReplenishItem(p);
                              setReplenishQty(Math.max(10, p.shortage + 5));
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-semibold transition cursor-pointer"
                          >
                            <Boxes className="w-3 h-3 text-emerald-600" />
                            <span>+ Stock IN</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-500">
                All catalog inventory items are above minimum stock thresholds.
              </div>
            )}
          </section>
        </div>

        {/* Right Sidebar: Real-Time Audit Activity Timeline */}
        <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-700" />
              <div>
                <h2 className="text-sm font-bold text-slate-900">Activity Audit Stream</h2>
                <p className="text-[11px] text-slate-500">Real-time system events log.</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {activities.length > 0 ? (
              activities.map((act, index) => {
                let pillVariant: any = "neutral";

                if (act.type === "CHALLAN_CONFIRMED") {
                  pillVariant = "success";
                } else if (act.type === "CHALLAN_CANCELLED") {
                  pillVariant = "danger";
                } else if (act.type === "STOCK_IN") {
                  pillVariant = "purple";
                } else if (act.type === "CUSTOMER_CREATED") {
                  pillVariant = "info";
                } else if (act.type === "FOLLOWUP_ADDED") {
                  pillVariant = "warning";
                }

                return (
                  <div key={index} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <StatusPill label={act.type.replace(/_/g, " ")} variant={pillVariant} />
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-700 leading-relaxed font-medium">{act.message}</p>
                    {act.actor && (
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                        <span>By {act.actor.name}</span>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-400">
                No recent activity events recorded.
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Quick Replenishment Modal */}
      {replenishItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-emerald-600" />
                <span>Quick Stock Replenishment</span>
              </h3>
              <button onClick={() => setReplenishItem(null)} className="text-slate-400 hover:text-slate-600 text-xs">
                ✕
              </button>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="font-bold text-slate-900">{replenishItem.name}</div>
              <div className="text-[11px] font-mono text-slate-500">SKU: {replenishItem.sku} • Location: {replenishItem.warehouseLocation}</div>
              <div className="text-[11px] text-slate-700">
                Current: <strong className="font-mono text-amber-700">{replenishItem.currentStock}</strong> | Min Required: <strong className="font-mono">{replenishItem.minimumStock}</strong>
              </div>
            </div>

            <form onSubmit={handleQuickReplenish} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Units to Inbound *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={replenishQty}
                  onChange={(e) => setReplenishQty(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm font-mono font-bold text-slate-900 focus:border-slate-400 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason / PO Ref *</label>
                <input
                  type="text"
                  required
                  value={replenishReason}
                  onChange={(e) => setReplenishReason(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:border-slate-400 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setReplenishItem(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReplenish}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-xs"
                >
                  {isSubmittingReplenish ? "Processing..." : "Confirm Stock IN"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
