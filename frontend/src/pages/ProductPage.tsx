import React, { useEffect, useState } from "react";
import {
    Plus,
    Search,
    Filter,
    Boxes,
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    X,
    AlertCircle,
    History,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import type { Product, StockMovement } from "../types";

export const ProductPage: React.FC = () => {
    const { user } = useAuth();
    const canWrite = user?.role === "ADMIN" || user?.role === "WAREHOUSE";

    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filter & Search
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [lowStockFilter, setLowStockFilter] = useState(false);

    // Modals
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [stockInProduct, setStockInProduct] = useState<Product | null>(null);
    const [movementAuditProduct, setMovementAuditProduct] = useState<Product | null>(null);
    const [movements, setMovements] = useState<StockMovement[]>([]);

    // Form States
    const [formData, setFormData] = useState({
        name: "",
        sku: "",
        category: "",
        unitPrice: "",
        currentStock: 0,
        minimumStock: 5,
        warehouseLocation: "",
    });

    const [stockInQuantity, setStockInQuantity] = useState(1);
    const [stockInReason, setStockInReason] = useState("");
    const [modalError, setModalError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchProducts = async () => {
        try {
            const params: any = {};
            if (search) params.search = search;
            if (categoryFilter) params.category = categoryFilter;
            if (lowStockFilter) params.lowStock = "true";

            const response = await api.get("/products", { params });
            if (response.data.success) {
                setProducts(response.data.data.products);
            }
        } catch (error) {
            console.error("Failed to fetch products", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, [search, categoryFilter, lowStockFilter]);

    const handleOpenAdd = () => {
        setFormData({
            name: "",
            sku: "",
            category: "General",
            unitPrice: "",
            currentStock: 0,
            minimumStock: 5,
            warehouseLocation: "Main Warehouse",
        });
        setModalError(null);
        setIsAddModalOpen(true);
    };

    const handleCreateProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        setModalError(null);
        setIsSubmitting(true);

        try {
            const payload = {
                ...formData,
                unitPrice: parseFloat(formData.unitPrice),
                currentStock: Number(formData.currentStock),
                minimumStock: Number(formData.minimumStock),
            };

            const response = await api.post("/products", payload);
            if (response.data.success) {
                setIsAddModalOpen(false);
                fetchProducts();
            }
        } catch (err: any) {
            setModalError(err.response?.data?.message || "Failed to create product");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenEdit = (p: Product) => {
        setEditingProduct(p);
        setFormData({
            name: p.name,
            sku: p.sku,
            category: p.category,
            unitPrice: p.unitPrice.toString(),
            currentStock: p.currentStock,
            minimumStock: p.minimumStock,
            warehouseLocation: p.warehouseLocation,
        });
        setModalError(null);
    };

    const handleUpdateProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProduct) return;
        setModalError(null);
        setIsSubmitting(true);

        try {
            const payload = {
                name: formData.name,
                sku: formData.sku,
                category: formData.category,
                unitPrice: parseFloat(formData.unitPrice),
                minimumStock: Number(formData.minimumStock),
                warehouseLocation: formData.warehouseLocation,
            };

            const response = await api.patch(`/products/${editingProduct.id}`, payload);
            if (response.data.success) {
                setEditingProduct(null);
                fetchProducts();
            }
        } catch (err: any) {
            setModalError(err.response?.data?.message || "Failed to update product");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenStockIn = (p: Product) => {
        setStockInProduct(p);
        setStockInQuantity(1);
        setStockInReason("");
        setModalError(null);
    };

    const handlePerformStockIn = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stockInProduct) return;
        setModalError(null);
        setIsSubmitting(true);

        try {
            const response = await api.post(`/inventory/${stockInProduct.id}/stock-in`, {
                quantity: Number(stockInQuantity),
                reason: stockInReason,
            });

            if (response.data.success) {
                setStockInProduct(null);
                fetchProducts();
            }
        } catch (err: any) {
            setModalError(err.response?.data?.message || "Failed to perform Stock IN");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenAudit = async (p: Product) => {
        setMovementAuditProduct(p);
        setMovements([]);
        try {
            const response = await api.get(`/inventory/${p.id}/movements`);
            if (response.data.success) {
                setMovements(response.data.data.movements);
            }
        } catch (error) {
            console.error("Failed to fetch movements", error);
        }
    };

    return (
        <div className="space-y-6 text-left">
            {/* Header & Add Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Product Catalog & Inventory</h2>
                    <p className="text-xs text-slate-400">Manage SKUs, unit prices, minimum thresholds, and stock movements</p>
                </div>
                {canWrite && (
                    <button
                        onClick={handleOpenAdd}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add New Product</span>
                    </button>
                )}
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl shadow-lg">
                <div className="relative">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search SKU, product name, or category..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-500 shrink-0" />
                    <input
                        type="text"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        placeholder="Filter by Category"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                </div>

                <div className="flex items-center gap-2 px-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <input
                        type="checkbox"
                        id="lowStockCheck"
                        checked={lowStockFilter}
                        onChange={(e) => setLowStockFilter(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded bg-slate-900 border-slate-700"
                    />
                    <label htmlFor="lowStockCheck" className="text-xs font-semibold text-amber-400 cursor-pointer flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Show Low Stock Only</span>
                    </label>
                </div>
            </div>

            {/* Product Table */}
            {isLoading ? (
                <div className="p-12 text-center text-xs text-slate-400">Loading catalog records...</div>
            ) : products.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                            <tr>
                                <th className="p-3.5">SKU & Product Name</th>
                                <th className="p-3.5">Category</th>
                                <th className="p-3.5">Location</th>
                                <th className="p-3.5 text-right">Unit Price</th>
                                <th className="p-3.5 text-center">Current Stock</th>
                                <th className="p-3.5 text-center">Min Threshold</th>
                                <th className="p-3.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                            {products.map((p) => {
                                const isLow = p.currentStock <= p.minimumStock;

                                return (
                                    <tr key={p.id} className="hover:bg-slate-800/40">
                                        <td className="p-3.5">
                                            <div className="font-bold text-white text-sm">{p.name}</div>
                                            <div className="text-[11px] text-indigo-400 font-mono font-semibold">{p.sku}</div>
                                        </td>
                                        <td className="p-3.5 text-slate-300 font-medium">{p.category}</td>
                                        <td className="p-3.5 text-slate-400">{p.warehouseLocation}</td>
                                        <td className="p-3.5 text-right font-semibold text-emerald-400">₹{p.unitPrice}</td>
                                        <td className="p-3.5 text-center">
                                            <span
                                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-xs ${
                                                    isLow
                                                        ? "bg-amber-950/60 text-amber-300 border border-amber-800/60 animate-pulse"
                                                        : "bg-slate-800 text-slate-200"
                                                }`}
                                            >
                                                {isLow && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                                                {p.currentStock}
                                            </span>
                                        </td>
                                        <td className="p-3.5 text-center text-slate-400">{p.minimumStock}</td>
                                        <td className="p-3.5 text-right space-x-2">
                                            <button
                                                onClick={() => handleOpenAudit(p)}
                                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-semibold transition-all cursor-pointer"
                                                title="View Stock Movements Audit"
                                            >
                                                Movements
                                            </button>
                                            {canWrite && (
                                                <>
                                                    <button
                                                        onClick={() => handleOpenStockIn(p)}
                                                        className="px-2.5 py-1 rounded-lg bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/50 text-[11px] font-semibold transition-all cursor-pointer"
                                                    >
                                                        + Stock IN
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenEdit(p)}
                                                        className="px-2.5 py-1 rounded-lg bg-indigo-950/50 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-800/50 text-[11px] font-semibold transition-all cursor-pointer"
                                                    >
                                                        Edit
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
                    No product records matching search filters.
                </div>
            )}

            {/* Add / Edit Product Modal */}
            {(isAddModalOpen || editingProduct) && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-white">
                                {isAddModalOpen ? "Add New Product" : "Edit Product Catalog Item"}
                            </h3>
                            <button onClick={() => { setIsAddModalOpen(false); setEditingProduct(null); }} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {modalError && (
                            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-red-200 text-xs flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                                <span>{modalError}</span>
                            </div>
                        )}

                        <form onSubmit={isAddModalOpen ? handleCreateProduct : handleUpdateProduct} className="space-y-3 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-semibold text-slate-300 block mb-1">SKU *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.sku}
                                        onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                                        placeholder="PROD-NET-01"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-slate-300 block mb-1">Product Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Gigabit Ethernet Switch"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-semibold text-slate-300 block mb-1">Category *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        placeholder="Networking"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-slate-300 block mb-1">Unit Price (₹) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={formData.unitPrice}
                                        onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                                        placeholder="12500.00"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-semibold text-slate-300 block mb-1">
                                        Initial Stock {editingProduct && "(Protected from Direct Edit)"}
                                    </label>
                                    <input
                                        type="number"
                                        disabled={!!editingProduct}
                                        value={formData.currentStock}
                                        onChange={(e) => setFormData({ ...formData, currentStock: Number(e.target.value) })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 disabled:opacity-50"
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-slate-300 block mb-1">Minimum Stock Threshold *</label>
                                    <input
                                        type="number"
                                        required
                                        value={formData.minimumStock}
                                        onChange={(e) => setFormData({ ...formData, minimumStock: Number(e.target.value) })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="font-semibold text-slate-300 block mb-1">Warehouse Location *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.warehouseLocation}
                                    onChange={(e) => setFormData({ ...formData, warehouseLocation: e.target.value })}
                                    placeholder="Aisle A, Shelf 2"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => { setIsAddModalOpen(false); setEditingProduct(null); }}
                                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30"
                                >
                                    {isSubmitting ? "Saving..." : "Save Product"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Stock IN Modal */}
            {stockInProduct && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Boxes className="w-5 h-5 text-emerald-400" />
                                <span>Stock IN Replenishment</span>
                            </h3>
                            <button onClick={() => setStockInProduct(null)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                            <div className="font-semibold text-white">{stockInProduct.name}</div>
                            <div className="text-[11px] text-indigo-400 font-mono">{stockInProduct.sku}</div>
                            <div className="mt-2 text-slate-300">
                                Current Stock: <span className="font-bold text-emerald-400">{stockInProduct.currentStock} units</span>
                            </div>
                        </div>

                        {modalError && (
                            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-red-200 text-xs flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                                <span>{modalError}</span>
                            </div>
                        )}

                        <form onSubmit={handlePerformStockIn} className="space-y-3 text-xs">
                            <div>
                                <label className="font-semibold text-slate-300 block mb-1">Units to Add *</label>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    value={stockInQuantity}
                                    onChange={(e) => setStockInQuantity(Number(e.target.value))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-bold text-base focus:outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="font-semibold text-slate-300 block mb-1">Reason / Reference PO *</label>
                                <input
                                    type="text"
                                    required
                                    value={stockInReason}
                                    onChange={(e) => setStockInReason(e.target.value)}
                                    placeholder="Supplier shipment PO-9012"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setStockInProduct(null)}
                                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-600/30"
                                >
                                    {isSubmitting ? "Processing..." : "Confirm Stock IN"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Stock Movement Audit Log Modal */}
            {movementAuditProduct && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <History className="w-5 h-5 text-indigo-400" />
                                <span>Stock Movement Audit Log</span>
                            </h3>
                            <button onClick={() => setMovementAuditProduct(null)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="text-xs">
                            <span className="font-semibold text-white">{movementAuditProduct.name}</span>
                            <span className="text-indigo-400 font-mono ml-2">({movementAuditProduct.sku})</span>
                        </div>

                        <div className="max-h-64 overflow-y-auto space-y-2 text-xs pr-1">
                            {movements.length > 0 ? (
                                movements.map((m) => {
                                    const isStockIn = m.movementType === "IN";

                                    return (
                                        <div key={m.id} className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/60 flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                                            isStockIn
                                                                ? "bg-indigo-950/60 text-indigo-300 border border-indigo-800/50"
                                                                : "bg-amber-950/60 text-amber-300 border border-amber-800/50"
                                                        }`}
                                                    >
                                                        {isStockIn ? <ArrowDownRight className="w-3 h-3 text-indigo-400" /> : <ArrowUpRight className="w-3 h-3 text-amber-400" />}
                                                        {m.movementType} {m.quantity} UNITS
                                                    </span>
                                                </div>
                                                <p className="text-slate-300 font-medium">{m.reason}</p>
                                                {m.creator && <div className="text-[10px] text-slate-500">By: {m.creator.name} ({m.creator.email})</div>}
                                            </div>
                                            <div className="text-right text-[10px] text-slate-500 font-mono">
                                                {new Date(m.createdAt).toLocaleString()}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="p-6 text-center text-slate-500 bg-slate-950/30 rounded-xl border border-slate-800/40">
                                    No stock movements recorded for this product yet.
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-2 border-t border-slate-800">
                            <button onClick={() => setMovementAuditProduct(null)} className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs">
                                Close Audit Log
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
