import React, { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Boxes,
  AlertTriangle,
  X,
  AlertCircle,
  History,
  Download,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { createProduct, getProducts, updateProduct } from "../services/productApi";
import { getProductMovements, stockInProduct as performStockIn } from "../services/inventoryApi";
import { StatusPill } from "../components/ui/StatusPill";
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

  const [stockInQuantity, setStockInQuantity] = useState("1");
  const [stockInReason, setStockInReason] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasWordOrInvalidChar = (val: string): boolean => {
    if (!val) return false;
    return /[a-zA-Z]/.test(val) || (val.trim() !== "" && !/^\d+$/.test(val.trim()));
  };

  const fetchProducts = async () => {
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (categoryFilter) params.category = categoryFilter;
      if (lowStockFilter) params.lowStock = "true";

      const data = await getProducts(params);
      setProducts(data.products || []);
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

      await createProduct(payload);
      setIsAddModalOpen(false);
      fetchProducts();
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

      await updateProduct(editingProduct.id, payload);
      setEditingProduct(null);
      fetchProducts();
    } catch (err: any) {
      setModalError(err.response?.data?.message || "Failed to update product");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenStockIn = (p: Product) => {
    setStockInProduct(p);
    setStockInQuantity("1");
    setStockInReason("");
    setModalError(null);
  };

  const handlePerformStockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockInProduct) return;
    setModalError(null);

    if (hasWordOrInvalidChar(stockInQuantity)) {
      setModalError(`Invalid quantity "${stockInQuantity}". Words or letters are not allowed. Please enter numbers only.`);
      return;
    }

    const qty = parseInt(stockInQuantity.trim(), 10);
    if (isNaN(qty) || qty <= 0) {
      setModalError("Please enter a valid quantity greater than 0.");
      return;
    }

    setIsSubmitting(true);
    try {
      await performStockIn(stockInProduct.id, {
        quantity: qty,
        reason: stockInReason,
      });

      setStockInProduct(null);
      fetchProducts();
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
      const data = await getProductMovements(p.id);
      setMovements(data.movements || []);
    } catch (error) {
      console.error("Failed to fetch movements", error);
    }
  };

  const exportToCSV = () => {
    if (products.length === 0) return;
    const headers = ["SKU", "Product Name", "Category", "Location", "Unit Price", "Current Stock", "Min Stock"];
    const rows = products.map((p) => [
      `"${p.sku}"`,
      `"${p.name}"`,
      `"${p.category}"`,
      `"${p.warehouseLocation}"`,
      p.unitPrice,
      p.currentStock,
      p.minimumStock,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inventory_ledger_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Products & Stock Ledger</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage SKUs, warehouse bin locations, stock minimum thresholds, and inventory movement logs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
          {canWrite && (
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Product SKU</span>
            </button>
          )}
        </div>
      </div>

      {/* Toolbar Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white border border-slate-200 p-3 rounded-xl shadow-2xs">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by SKU code, product name, or category..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-400 outline-none"
          />
        </div>

        <div>
          <input
            type="text"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            placeholder="Filter by Category"
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs text-slate-900 focus:bg-white focus:border-slate-400 outline-none"
          />
        </div>

        <label className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-100/50 transition">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span className="font-medium">Low stock only</span>
          </div>
          <input
            type="checkbox"
            checked={lowStockFilter}
            onChange={(e) => setLowStockFilter(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
          />
        </label>
      </div>

      {/* Product Table */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading catalog records...</div>
      ) : products.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">SKU & Product Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Warehouse Location</th>
                <th className="py-3 px-4 text-right">Unit Price</th>
                <th className="py-3 px-4 text-center">Current Stock</th>
                <th className="py-3 px-4 text-center">Min Threshold</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {products.map((p) => {
                const isLow = p.currentStock <= p.minimumStock;

                return (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{p.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{p.sku}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{p.category}</td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{p.warehouseLocation}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      ₹{Number(p.unitPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {isLow ? (
                        <StatusPill label={`${p.currentStock} Units`} variant="danger" />
                      ) : (
                        <span className="font-bold text-slate-800">{p.currentStock}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-500">{p.minimumStock}</td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenAudit(p)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold border border-slate-200 transition cursor-pointer"
                        title="View Audit Log"
                      >
                        <History className="w-3 h-3 text-slate-500" />
                        <span>Audit</span>
                      </button>
                      {canWrite && (
                        <>
                          <button
                            onClick={() => handleOpenStockIn(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-semibold border border-emerald-200 transition cursor-pointer"
                          >
                            <Boxes className="w-3 h-3 text-emerald-600" />
                            <span>+ Stock IN</span>
                          </button>
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-slate-800 text-[11px] font-semibold border border-slate-200 transition cursor-pointer"
                          >
                            <span>Edit</span>
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
        <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
          No product records match search filters.
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {(isAddModalOpen || editingProduct) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {isAddModalOpen ? "Add New Catalog Product SKU" : "Edit Inventory Product"}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingProduct(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={isAddModalOpen ? handleCreateProduct : handleUpdateProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">SKU Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                    placeholder="PROD-NET-01"
                    className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-slate-900 font-mono focus:border-slate-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Gigabit Ethernet Switch 24-Port"
                    className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-slate-900 focus:border-slate-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <input
                    type="text"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Networking Equipment"
                    className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-slate-900 focus:border-slate-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                    placeholder="12500.00"
                    className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-slate-900 font-mono focus:border-slate-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Initial Stock {editingProduct && "(Locked)"}
                  </label>
                  <input
                    type="number"
                    disabled={!!editingProduct}
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-slate-900 font-mono disabled:opacity-50 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min Threshold *</label>
                  <input
                    type="number"
                    required
                    value={formData.minimumStock}
                    onChange={(e) => setFormData({ ...formData, minimumStock: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-slate-900 font-mono focus:border-slate-400 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Warehouse Bin Location *</label>
                <input
                  type="text"
                  required
                  value={formData.warehouseLocation}
                  onChange={(e) => setFormData({ ...formData, warehouseLocation: e.target.value })}
                  placeholder="Aisle B, Shelf 3, Bin 12"
                  className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-slate-900 font-mono focus:border-slate-400 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingProduct(null);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-xs"
                >
                  {isSubmitting ? "Saving..." : "Save Product SKU"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock IN Replenishment Modal */}
      {stockInProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-emerald-600" />
                <span>Stock IN Inbound Replenishment</span>
              </h3>
              <button onClick={() => setStockInProduct(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="font-bold text-slate-900">{stockInProduct.name}</div>
              <div className="text-[11px] font-mono text-slate-500">SKU: {stockInProduct.sku}</div>
              <div className="text-[11px] text-slate-700">
                Current Stock: <strong className="font-mono text-emerald-700">{stockInProduct.currentStock} units</strong>
              </div>
            </div>

            {modalError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handlePerformStockIn} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Units to Add (Numbers Only) *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={stockInQuantity}
                  onChange={(e) => setStockInQuantity(e.target.value)}
                  placeholder="e.g. 10"
                  className={`w-full rounded-lg border p-2.5 text-sm font-mono font-bold outline-none transition ${
                    hasWordOrInvalidChar(stockInQuantity)
                      ? "border-rose-500 bg-white text-rose-900 focus:ring-2 focus:ring-rose-300"
                      : "border-slate-200 bg-white text-slate-900 focus:border-slate-400"
                  }`}
                />
                {hasWordOrInvalidChar(stockInQuantity) && (
                  <p className="mt-1 text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Words or letters detected! Please enter numbers only.</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Supplier PO / Reason *</label>
                <input
                  type="text"
                  required
                  value={stockInReason}
                  onChange={(e) => setStockInReason(e.target.value)}
                  placeholder="Supplier Shipment PO-9012"
                  className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-slate-400 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStockInProduct(null)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-xs"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-slate-700" />
                <span>Stock Movement Audit Log</span>
              </h3>
              <button onClick={() => setMovementAuditProduct(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-900">{movementAuditProduct.name}</span>
              <span className="text-slate-500 font-mono ml-2">({movementAuditProduct.sku})</span>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2 text-xs pr-1">
              {movements.length > 0 ? (
                movements.map((m) => {
                  const isStockIn = m.movementType === "IN";

                  return (
                    <div key={m.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <StatusPill
                            label={`${m.movementType} ${m.quantity} UNITS`}
                            variant={isStockIn ? "purple" : "warning"}
                          />
                        </div>
                        <p className="text-slate-800 font-medium">{m.reason}</p>
                        {m.creator && <div className="text-[10px] text-slate-400">Actor: {m.creator.name} ({m.creator.email})</div>}
                      </div>
                      <div className="text-right text-[10px] text-slate-500 font-mono">
                        {new Date(m.createdAt).toLocaleString()}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-lg border border-slate-200">
                  No stock movements recorded for this product yet.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button onClick={() => setMovementAuditProduct(null)} className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-semibold text-xs">
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
