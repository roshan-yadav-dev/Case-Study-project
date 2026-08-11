import React, { useEffect, useState } from "react";
import {
  Plus,
  Search,
  AlertCircle,
  Eye,
  X,
  ShoppingCart,
  Trash2,
  Printer,
  FileCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { createChallan, getChallanById, getChallans, confirmChallan, cancelChallan } from "../services/challanApi";
import { getCustomers } from "../services/customerApi";
import { getProducts } from "../services/productApi";
import { StatusPill } from "../components/ui/StatusPill";
import { PrintableChallanModal } from "../components/PrintableChallanModal";
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

  // Detail Modal & Printable View
  const [detailChallan, setDetailChallan] = useState<Challan | null>(null);
  const [printableChallan, setPrintableChallan] = useState<Challan | null>(null);

  // UI Feedback State
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchChallans = async () => {
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;

      const data = await getChallans(params);
      setChallans(data.challans || []);
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
      const [custData, prodData] = await Promise.all([
        getCustomers({ limit: 100 }),
        getProducts({ limit: 100 }),
      ]);
      setCustomers(custData.customers || []);
      setProducts(prodData.products || []);
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

  const calculateCreateTotal = () => {
    return lineItems.reduce((sum, item) => {
      const prod = products.find((p) => p.id === item.productId);
      if (!prod) return sum;
      return sum + Number(prod.unitPrice) * item.quantity;
    }, 0);
  };

  const handleCreateChallan = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!selectedCustomerId) {
      setModalError("Please select a customer account.");
      return;
    }

    const validItems = lineItems.filter((i) => i.productId && i.quantity > 0);
    if (validItems.length === 0) {
      setModalError("Please add at least one valid product row.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerId: selectedCustomerId,
        items: validItems,
      };

      await createChallan(payload);
      setIsCreateModalOpen(false);
      fetchChallans();
    } catch (err: any) {
      setModalError(err.response?.data?.message || "Failed to create sales challan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDetail = async (id: string) => {
    try {
      const challan = await getChallanById(id);
      setDetailChallan(challan);
    } catch (error) {
      console.error("Failed to load challan detail", error);
    }
  };

  const handleConfirmChallan = async (id: string) => {
    setModalError(null);
    setIsSubmitting(true);
    try {
      const result = await confirmChallan(id);
      if (detailChallan && detailChallan.id === id) {
        setDetailChallan(result);
      }
      fetchChallans();
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
      const result = await cancelChallan(id);
      if (detailChallan && detailChallan.id === id) {
        setDetailChallan(result);
      }
      fetchChallans();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to cancel challan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Delivery Challans & Order Fulfillment</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage dispatch notes, historical line item price snapshots, and atomic inventory stock-out deductions.
          </p>
        </div>
        {canCreateOrConfirm && (
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Sales Challan</span>
          </button>
        )}
      </div>

      {/* Toolbar Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white border border-slate-200 p-3 rounded-xl shadow-2xs">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Challan number (SC-2026-XXXXXX) or customer..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-400 outline-none font-mono"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs text-slate-800 focus:bg-white focus:border-slate-400 outline-none"
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
        <div className="p-12 text-center text-xs text-slate-400">Loading delivery challans...</div>
      ) : challans.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Challan Number</th>
                <th className="py-3 px-4">Customer Account</th>
                <th className="py-3 px-4 text-center">Items & Units</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {challans.map((ch) => {
                let statusVariant: any = "warning";
                if (ch.status === "CONFIRMED") statusVariant = "success";
                if (ch.status === "CANCELLED") statusVariant = "danger";

                return (
                  <tr key={ch.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold font-mono text-slate-900 text-xs">{ch.challanNumber}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{ch.customer?.name || "Customer"}</div>
                      <div className="text-[11px] text-slate-500">{ch.customer?.businessName}</div>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                      {ch.totalQuantity} units ({ch.items?.length || 0} SKUs)
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusPill label={ch.status} variant={statusVariant} />
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(ch.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => setPrintableChallan(ch)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold border border-slate-200 transition cursor-pointer"
                        title="Print Official Challan"
                      >
                        <Printer className="w-3 h-3 text-slate-500" />
                        <span>Print Copy</span>
                      </button>
                      <button
                        onClick={() => handleOpenDetail(ch.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-slate-800 text-[11px] font-semibold border border-slate-200 transition cursor-pointer"
                      >
                        <Eye className="w-3 h-3 text-slate-500" />
                        <span>Detail</span>
                      </button>

                      {canCreateOrConfirm && ch.status === "DRAFT" && (
                        <>
                          <button
                            onClick={() => handleConfirmChallan(ch.id)}
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-semibold border border-emerald-200 transition cursor-pointer"
                          >
                            <FileCheck className="w-3 h-3 text-emerald-600" />
                            <span>Confirm Stock-OUT</span>
                          </button>
                          <button
                            onClick={() => handleCancelChallan(ch.id)}
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-800 text-[11px] font-semibold border border-rose-200 transition cursor-pointer"
                          >
                            <span>Cancel</span>
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
          No delivery challans found matching filters.
        </div>
      )}

      {/* Create Sales Challan Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-slate-700" />
                <span>Issue New Sales Delivery Challan</span>
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateChallan} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Customer Account *</label>
                <select
                  required
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-slate-900 focus:border-slate-400 outline-none"
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
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-slate-700">Line Item Snapshots & Quantities *</label>
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Product Row</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {lineItems.map((item, index) => {
                    const selectedProd = products.find((p) => p.id === item.productId);

                    return (
                      <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200">
                        <select
                          required
                          value={item.productId}
                          onChange={(e) => handleLineItemChange(index, "productId", e.target.value)}
                          className="flex-1 rounded border border-slate-200 bg-white p-2 text-slate-900 outline-none"
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
                            className="w-full rounded border border-slate-200 bg-white p-2 text-slate-900 text-center font-mono font-bold outline-none"
                          />
                        </div>

                        <div className="w-28 text-right font-mono font-bold text-slate-900">
                          {selectedProd ? (
                            `₹${(Number(selectedProd.unitPrice) * item.quantity).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                          ) : (
                            <span className="text-slate-400 text-[10px]">₹0.00</span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(index)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Total Value Summary */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-100 border border-slate-200">
                  <span className="font-semibold text-slate-700">Estimated Total Order Value:</span>
                  <span className="text-base font-bold font-mono text-slate-900">
                    ₹{calculateCreateTotal().toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-xs"
                >
                  {isSubmitting ? "Creating..." : "Save DRAFT Challan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Challan Detail Modal */}
      {detailChallan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold font-mono text-slate-900">{detailChallan.challanNumber}</h3>
                <p className="text-xs text-slate-500">Created by {detailChallan.creator?.name || "Operations User"}</p>
              </div>
              <button onClick={() => setDetailChallan(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Customer Header */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-slate-900">{detailChallan.customer?.name}</div>
                <div className="text-slate-700 font-medium">{detailChallan.customer?.businessName}</div>
                <div className="text-[11px] text-slate-500 font-mono">{detailChallan.customer?.mobile}</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Status</span>
                <StatusPill label={detailChallan.status} variant={detailChallan.status === "CONFIRMED" ? "success" : "warning"} />
              </div>
            </div>

            {/* Historical Line Items Table */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-slate-800 block">Product Snapshots (Historical Invoice Record)</span>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {detailChallan.items?.map((item) => {
                      const lineTotal = Number(item.unitPriceSnapshot) * item.quantity;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-medium text-slate-900">{item.productNameSnapshot}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">{item.skuSnapshot}</td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            ₹{Number(item.unitPriceSnapshot).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-900 font-mono">{item.quantity}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            ₹{lineTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200 text-xs">
              <button
                onClick={() => {
                  setPrintableChallan(detailChallan);
                  setDetailChallan(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white font-semibold shadow-2xs hover:bg-slate-800 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Official Challan</span>
              </button>
              <div className="flex items-center gap-2">
                {canCreateOrConfirm && detailChallan.status === "DRAFT" && (
                  <button
                    onClick={() => handleConfirmChallan(detailChallan.id)}
                    disabled={isSubmitting}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-2xs"
                  >
                    Confirm & Stock OUT
                  </button>
                )}
                <button onClick={() => setDetailChallan(null)} className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-semibold">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Challan Document Modal */}
      {printableChallan && (
        <PrintableChallanModal
          challan={printableChallan}
          onClose={() => setPrintableChallan(null)}
        />
      )}
    </div>
  );
};
