import React, { useEffect, useState } from "react";
import {
    Plus,
    Search,
    Filter,
    AlertCircle,
    Eye,
    X,
    ShoppingCart,
    Trash2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import type { Challan, Customer, Product } from "../types";

export const ChallanPage: React.FC = () => {
    const { user } = useAuth();
    const canCreateOrConfirm = user?.role === "ADMIN" || user?.role === "SALES";

    const [challans, setChallans] = useState<Challan[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [statusFilter, setStatusFilter] = useState("");
    const [search, setSearch] = useState("");

    // Create Modal Data
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState("");
    const [lineItems, setLineItems] = useState<Array<{ productId: string; quantity: number }>>([
        { productId: "", quantity: 1 },
    ]);

    // Detail Modal
    const [detailChallan, setDetailChallan] = useState<Challan | null>(null);

    // UI Feedback State
    const [modalError, setModalError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchChallans = async () => {
        try {
            const params: any = {};
            if (statusFilter) params.status = statusFilter;
            if (search) params.search = search;

            const response = await api.get("/challans", { params });
            if (response.data.success) {
                setChallans(response.data.data.challans);
            }
        } catch (error) {
            console.error("Failed to fetch challans", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchChallans();
    }, [statusFilter, search]);

    const handleOpenCreateModal = async () => {
        setModalError(null);
        setSelectedCustomerId("");
        setLineItems([{ productId: "", quantity: 1 }]);

        try {
            const [custRes, prodRes] = await Promise.all([
                api.get("/customers?limit=100"),
                api.get("/products?limit=100"),
            ]);
            if (custRes.data.success) setCustomers(custRes.data.data.customers);
            if (prodRes.data.success) setProducts(prodRes.data.data.products);
            setIsCreateModalOpen(true);
        } catch (error) {
            console.error("Failed to load options for challan creation", error);
        }
    };

    const handleAddLineItem = () => {
        setLineItems([...lineItems, { productId: "", quantity: 1 }]);
    };

    const handleRemoveLineItem = (index: number) => {
        if (lineItems.length === 1) return;
        setLineItems(lineItems.filter((_, i) => i !== index));
    };

    const handleLineItemChange = (index: number, field: "productId" | "quantity", value: any) => {
        const updated = [...lineItems];
        if (field === "quantity") {
            updated[index].quantity = Math.max(1, Number(value));
        } else {
            updated[index].productId = value;
        }
        setLineItems(updated);
    };

    const handleCreateChallan = async (e: React.FormEvent) => {
        e.preventDefault();
        setModalError(null);

        if (!selectedCustomerId) {
            setModalError("Please select a customer");
            return;
        }

        const validItems = lineItems.filter((i) => i.productId && i.quantity > 0);
        if (validItems.length === 0) {
            setModalError("Please add at least one valid product item");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                customerId: selectedCustomerId,
                items: validItems,
            };

            const response = await api.post("/challans", payload);
            if (response.data.success) {
                setIsCreateModalOpen(false);
                fetchChallans();
            }
        } catch (err: any) {
            setModalError(err.response?.data?.message || "Failed to create sales challan");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenDetail = async (id: string) => {
        try {
            const response = await api.get(`/challans/${id}`);
            if (response.data.success) {
                setDetailChallan(response.data.data.challan);
            }
        } catch (error) {
            console.error("Failed to load challan detail", error);
        }
    };

    const handleConfirmChallan = async (id: string) => {
        setModalError(null);
        setIsSubmitting(true);
        try {
            const response = await api.post(`/challans/${id}/confirm`);
            if (response.data.success) {
                if (detailChallan && detailChallan.id === id) {
                    setDetailChallan(response.data.data.challan);
                }
                fetchChallans();
            }
        } catch (err: any) {
            const message = err.response?.data?.message || "Challan confirmation failed";
            alert(`Confirmation Error: ${message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelChallan = async (id: string) => {
        if (!window.confirm("Are you sure you want to cancel this DRAFT sales challan?")) return;
        setIsSubmitting(true);
        try {
            const response = await api.post(`/challans/${id}/cancel`);
            if (response.data.success) {
                if (detailChallan && detailChallan.id === id) {
                    setDetailChallan(response.data.data.challan);
                }
                fetchChallans();
            }
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to cancel challan");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 text-left">
            {/* Page Title & Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Sales Challans</h2>
                    <p className="text-xs text-slate-400">Manage dispatch notes, line item snapshots, and atomic inventory stock-out</p>
                </div>
                {canCreateOrConfirm && (
                    <button
                        onClick={handleOpenCreateModal}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Create Sales Challan</span>
                    </button>
                )}
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl shadow-lg">
                <div className="relative col-span-2">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by Challan number (SC-2026-XXXXXX)..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-500 shrink-0" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                        <option value="">All Statuses</option>
                        <option value="DRAFT">DRAFT</option>
                        <option value="CONFIRMED">CONFIRMED</option>
                        <option value="CANCELLED">CANCELLED</option>
                    </select>
                </div>
            </div>

            {/* Challans Table */}
            {isLoading ? (
                <div className="p-12 text-center text-xs text-slate-400">Loading sales challans...</div>
            ) : challans.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                            <tr>
                                <th className="p-3.5">Challan Number</th>
                                <th className="p-3.5">Customer</th>
                                <th className="p-3.5 text-center">Items & Units</th>
                                <th className="p-3.5 text-center">Status</th>
                                <th className="p-3.5">Created Date</th>
                                <th className="p-3.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                            {challans.map((ch) => {
                                let statusStyle = "bg-indigo-950/60 text-indigo-300 border-indigo-800/60";
                                if (ch.status === "CONFIRMED") statusStyle = "bg-emerald-950/60 text-emerald-300 border-emerald-800/60";
                                if (ch.status === "CANCELLED") statusStyle = "bg-red-950/60 text-red-300 border-red-800/60";

                                return (
                                    <tr key={ch.id} className="hover:bg-slate-800/40">
                                        <td className="p-3.5 font-bold font-mono text-white text-sm">{ch.challanNumber}</td>
                                        <td className="p-3.5">
                                            <div className="font-semibold text-slate-200">{ch.customer?.name || "Customer"}</div>
                                            <div className="text-[11px] text-slate-400">{ch.customer?.businessName}</div>
                                        </td>
                                        <td className="p-3.5 text-center font-semibold text-indigo-400">
                                            {ch.totalQuantity} units ({ch.items?.length || 0} SKUs)
                                        </td>
                                        <td className="p-3.5 text-center">
                                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusStyle}`}>
                                                {ch.status}
                                            </span>
                                        </td>
                                        <td className="p-3.5 text-slate-400 font-mono">
                                            {new Date(ch.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="p-3.5 text-right space-x-2">
                                            <button
                                                onClick={() => handleOpenDetail(ch.id)}
                                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold transition-all cursor-pointer inline-flex items-center gap-1"
                                            >
                                                <Eye className="w-3 h-3 text-slate-400" />
                                                <span>View Detail</span>
                                            </button>

                                            {canCreateOrConfirm && ch.status === "DRAFT" && (
                                                <>
                                                    <button
                                                        onClick={() => handleConfirmChallan(ch.id)}
                                                        disabled={isSubmitting}
                                                        className="px-2.5 py-1 rounded-lg bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/50 text-[11px] font-semibold transition-all cursor-pointer"
                                                    >
                                                        Confirm & Stock OUT
                                                    </button>
                                                    <button
                                                        onClick={() => handleCancelChallan(ch.id)}
                                                        disabled={isSubmitting}
                                                        className="px-2.5 py-1 rounded-lg bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-800/50 text-[11px] font-semibold transition-all cursor-pointer"
                                                    >
                                                        Cancel
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="p-12 text-center text-xs text-slate-400 bg-slate-900/80 rounded-2xl border border-slate-800">
                    No sales challans recorded matching filter.
                </div>
            )}

            {/* Create Sales Challan Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5 text-indigo-400" />
                                <span>Create DRAFT Sales Challan</span>
                            </h3>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {modalError && (
                            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-red-200 text-xs flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                                <span>{modalError}</span>
                            </div>
                        )}

                        <form onSubmit={handleCreateChallan} className="space-y-4 text-xs">
                            <div>
                                <label className="font-semibold text-slate-300 block mb-1">Select Customer *</label>
                                <select
                                    required
                                    value={selectedCustomerId}
                                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="">-- Choose Customer --</option>
                                    {customers.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} ({c.businessName}) • {c.mobile}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Dynamic Line Items */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="font-semibold text-slate-300">Line Items & Quantities *</label>
                                    <button
                                        type="button"
                                        onClick={handleAddLineItem}
                                        className="text-xs text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                                    >
                                        <Plus className="w-3 h-3" />
                                        <span>Add Product Row</span>
                                    </button>
                                </div>

                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                    {lineItems.map((item, index) => {
                                        const selectedProd = products.find((p) => p.id === item.productId);

                                        return (
                                            <div key={index} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                                                <select
                                                    required
                                                    value={item.productId}
                                                    onChange={(e) => handleLineItemChange(index, "productId", e.target.value)}
                                                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none"
                                                >
                                                    <option value="">-- Select Product --</option>
                                                    {products.map((p) => (
                                                        <option key={p.id} value={p.id}>
                                                            {p.name} ({p.sku}) — Stock: {p.currentStock} — ₹{p.unitPrice}
                                                        </option>
                                                    ))}
                                                </select>

                                                <div className="w-24">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        required
                                                        value={item.quantity}
                                                        onChange={(e) => handleLineItemChange(index, "quantity", e.target.value)}
                                                        placeholder="Qty"
                                                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-100 text-center font-bold focus:outline-none"
                                                    />
                                                </div>

                                                {selectedProd && (
                                                    <div className="text-[11px] text-right font-semibold text-emerald-400 w-24">
                                                        ₹{(Number(selectedProd.unitPrice) * item.quantity).toFixed(2)}
                                                    </div>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveLineItem(index)}
                                                    className="text-slate-500 hover:text-red-400 p-1"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30"
                                >
                                    {isSubmitting ? "Creating..." : "Save DRAFT Challan"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Challan Detail & Snapshots Modal */}
            {detailChallan && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div>
                                <h3 className="text-base font-bold text-white font-mono">{detailChallan.challanNumber}</h3>
                                <p className="text-xs text-slate-400">Created by {detailChallan.creator?.name || "User"}</p>
                            </div>
                            <button onClick={() => setDetailChallan(null)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Customer Header */}
                        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60 flex items-center justify-between text-xs">
                            <div>
                                <div className="font-bold text-white text-sm">{detailChallan.customer?.name}</div>
                                <div className="text-indigo-400 font-medium">{detailChallan.customer?.businessName}</div>
                                <div className="text-[11px] text-slate-400">{detailChallan.customer?.mobile}</div>
                            </div>
                            <div className="text-right">
                                <span className="text-[11px] text-slate-500 block uppercase font-semibold">Status</span>
                                <span className="font-bold text-sm text-indigo-400">{detailChallan.status}</span>
                            </div>
                        </div>

                        {/* Historical Line Items Table */}
                        <div className="space-y-2 text-xs">
                            <span className="font-semibold text-slate-300 block">Product Snapshots (Historical Invoice Record)</span>
                            <div className="overflow-x-auto rounded-xl border border-slate-800">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                                        <tr>
                                            <th className="p-2.5">Product Snapshot Name</th>
                                            <th className="p-2.5">SKU</th>
                                            <th className="p-2.5 text-right">Unit Price</th>
                                            <th className="p-2.5 text-center">Quantity</th>
                                            <th className="p-2.5 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                                        {detailChallan.items?.map((item) => {
                                            const lineTotal = Number(item.unitPriceSnapshot) * item.quantity;

                                            return (
                                                <tr key={item.id} className="hover:bg-slate-800/40">
                                                    <td className="p-2.5 font-medium text-white">{item.productNameSnapshot}</td>
                                                    <td className="p-2.5 text-indigo-400 font-mono text-[11px]">{item.skuSnapshot}</td>
                                                    <td className="p-2.5 text-right font-mono">₹{item.unitPriceSnapshot}</td>
                                                    <td className="p-2.5 text-center font-bold text-slate-200">{item.quantity}</td>
                                                    <td className="p-2.5 text-right font-semibold text-emerald-400">₹{lineTotal.toFixed(2)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                            <div className="text-slate-400">
                                Created: <span className="font-mono text-slate-200">{new Date(detailChallan.createdAt).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {canCreateOrConfirm && detailChallan.status === "DRAFT" && (
                                    <button
                                        onClick={() => handleConfirmChallan(detailChallan.id)}
                                        disabled={isSubmitting}
                                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-600/30"
                                    >
                                        Confirm & Stock OUT
                                    </button>
                                )}
                                <button onClick={() => setDetailChallan(null)} className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-300 font-semibold">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
