import React, { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Search,
  Phone,
  Mail,
  Calendar,
  MessageSquare,
  X,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { createCustomer, getCustomerById, getCustomers, updateCustomer, addCustomerFollowUp } from "../services/customerApi";
import { StatusPill } from "../components/ui/StatusPill";
import type { Customer, CustomerStatus, CustomerType } from "../types";

export const CustomerPage: React.FC = () => {
  const { user } = useAuth();
  const canWrite = user?.role === "ADMIN" || user?.role === "SALES";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);

  // Form States
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    email: "",
    businessName: "",
    gstNumber: "",
    customerType: "RETAIL" as CustomerType,
    address: "",
    status: "LEAD" as CustomerStatus,
    notes: "",
  });

  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCustomers = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.customerType = typeFilter;

      const data = await getCustomers(params);
      setCustomers(data.customers || []);
    } catch {
      console.error("Failed to fetch customers");
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, typeFilter]);

  useEffect(() => {
    const load = async () => {
      await fetchCustomers();
    };
    void load();
  }, [fetchCustomers]);

  const handleOpenAdd = () => {
    setFormData({
      name: "",
      mobile: "",
      email: "",
      businessName: "",
      gstNumber: "",
      customerType: "RETAIL",
      address: "",
      status: "LEAD",
      notes: "",
    });
    setModalError(null);
    setIsAddModalOpen(true);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        email: formData.email ? formData.email : undefined,
        gstNumber: formData.gstNumber ? formData.gstNumber : undefined,
        address: formData.address ? formData.address : undefined,
        notes: formData.notes ? formData.notes : undefined,
      };

      await createCustomer(payload);
      setIsAddModalOpen(false);
      fetchCustomers();
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } };
      setModalError(apiError.response?.data?.message || "Failed to create customer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name,
      mobile: c.mobile,
      email: c.email || "",
      businessName: c.businessName,
      gstNumber: c.gstNumber || "",
      customerType: c.customerType,
      address: c.address || "",
      status: c.status,
      notes: c.notes || "",
    });
    setModalError(null);
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    setModalError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        mobile: formData.mobile,
        email: formData.email ? formData.email : undefined,
        businessName: formData.businessName,
        gstNumber: formData.gstNumber ? formData.gstNumber : undefined,
        customerType: formData.customerType,
        address: formData.address ? formData.address : undefined,
        status: formData.status,
        notes: formData.notes ? formData.notes : undefined,
      };

      await updateCustomer(editingCustomer.id, payload);
      setEditingCustomer(null);
      fetchCustomers();
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } };
      setModalError(apiError.response?.data?.message || "Failed to update customer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDetail = async (c: Customer) => {
    try {
      const customer = await getCustomerById(c.id);
      setDetailCustomer(customer);
    } catch {
      setDetailCustomer(c);
    }
    setFollowUpDate("");
    setFollowUpNotes("");
    setModalError(null);
  };

  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailCustomer) return;
    setModalError(null);
    setIsSubmitting(true);

    try {
      await addCustomerFollowUp(detailCustomer.id, {
        date: followUpDate,
        notes: followUpNotes,
      });

      const updatedDetail = await getCustomerById(detailCustomer.id);
      setDetailCustomer(updatedDetail);
      setFollowUpNotes("");
      setFollowUpDate("");
      fetchCustomers();
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } };
      setModalError(apiError.response?.data?.message || "Failed to log follow-up");
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setTypeFilter("");
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Customer Master & CRM</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage client profiles, commercial contact accounts, GST records, and lead follow-ups.
          </p>
        </div>
        {canWrite && (
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Customer</span>
          </button>
        )}
      </div>

      {/* Toolbar Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white border border-slate-200 p-3 rounded-xl shadow-2xs">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, business, mobile, email, or GSTIN..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-400 outline-none"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs text-slate-800 focus:bg-white focus:border-slate-400 outline-none"
          >
            <option value="">All Statuses</option>
            <option value="LEAD">LEAD</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs text-slate-800 focus:bg-white focus:border-slate-400 outline-none"
          >
            <option value="">All Customer Types</option>
            <option value="RETAIL">RETAIL</option>
            <option value="WHOLESALE">WHOLESALE</option>
            <option value="DISTRIBUTOR">DISTRIBUTOR</option>
          </select>

          {(search || statusFilter || typeFilter) && (
            <button
              onClick={clearFilters}
              className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 text-xs shrink-0"
              title="Clear filters"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Customer Master Table */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading customer records...</div>
      ) : customers.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Customer & Business Name</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">Category Type</th>
                <th className="py-3 px-4">GSTIN Number</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Next Follow-Up</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {customers.map((c) => {
                let statusVariant: any = "neutral";
                if (c.status === "ACTIVE") statusVariant = "success";
                if (c.status === "LEAD") statusVariant = "warning";
                if (c.status === "INACTIVE") statusVariant = "danger";

                return (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{c.name}</div>
                      <div className="text-[11px] text-slate-500 font-medium">{c.businessName}</div>
                    </td>
                    <td className="py-3 px-4 space-y-0.5 font-mono">
                      <div className="flex items-center gap-1.5 text-slate-800 text-[11px]">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{c.mobile}</span>
                      </div>
                      {c.email && (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{c.email}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-100 text-slate-700 border border-slate-200">
                        {c.customerType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      {c.gstNumber ? (
                        <span className="text-slate-800 font-semibold">{c.gstNumber}</span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Unregistered</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusPill label={c.status} variant={statusVariant} />
                    </td>
                    <td className="py-3 px-4">
                      {c.followUpDate ? (
                        <div className="flex items-center gap-1.5 text-slate-800 font-mono text-[11px]">
                          <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="font-semibold">{c.followUpDate.split("T")[0]}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[10px]">No follow-up</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenDetail(c)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold border border-slate-200 transition cursor-pointer"
                      >
                        <MessageSquare className="w-3 h-3 text-slate-500" />
                        <span>Timeline Log</span>
                      </button>
                      {canWrite && (
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-slate-800 text-[11px] font-semibold border border-slate-200 transition cursor-pointer"
                        >
                          <span>Edit</span>
                        </button>
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
          No customer records match search filters.
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      {(isAddModalOpen || editingCustomer) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {isAddModalOpen ? "Add New Commercial Customer" : "Edit Customer Profile"}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingCustomer(null);
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

            <form onSubmit={isAddModalOpen ? handleCreateCustomer : handleUpdateCustomer} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Rajesh Sharma"
                    className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-slate-900 focus:border-slate-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Business / Firm Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    placeholder="Sharma Logistics & Co."
                    className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-slate-900 focus:border-slate-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="+91 98200 12345"
                    className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-slate-900 font-mono focus:border-slate-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@sharma.com"
                    className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-slate-900 focus:border-slate-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Customer Type *</label>
                  <select
                    value={formData.customerType}
                    onChange={(e) => setFormData({ ...formData, customerType: e.target.value as CustomerType })}
                    className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-slate-900 focus:border-slate-400 outline-none"
                  >
                    <option value="RETAIL">RETAIL</option>
                    <option value="WHOLESALE">WHOLESALE</option>
                    <option value="DISTRIBUTOR">DISTRIBUTOR</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Account Status *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as CustomerStatus })}
                    className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-slate-900 focus:border-slate-400 outline-none"
                  >
                    <option value="LEAD">LEAD</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">GSTIN Number</label>
                <input
                  type="text"
                  value={formData.gstNumber}
                  onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                  placeholder="27ABCDE1234F1ZH"
                  className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-slate-900 font-mono focus:border-slate-400 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Billing & Shipping Address</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street, City, State, Pincode"
                  className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-slate-900 focus:border-slate-400 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingCustomer(null);
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
                  {isSubmitting ? "Saving..." : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Detail & Follow-ups Modal */}
      {detailCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">{detailCustomer.name}</h3>
                <p className="text-xs text-slate-500 font-medium">{detailCustomer.businessName}</p>
              </div>
              <button onClick={() => setDetailCustomer(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metadata Box */}
            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 uppercase font-bold text-[10px] block">Mobile</span>
                <span className="font-mono font-semibold text-slate-900">{detailCustomer.mobile}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-bold text-[10px] block">Type</span>
                <span className="font-mono font-semibold text-slate-900">{detailCustomer.customerType}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-bold text-[10px] block">GSTIN</span>
                <span className="font-mono font-semibold text-slate-900">{detailCustomer.gstNumber || "N/A"}</span>
              </div>
            </div>

            {/* Follow-up Log Form */}
            {canWrite && (
              <form onSubmit={handleAddFollowUp} className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                <span className="font-bold text-slate-800 text-xs block">Log Commercial Follow-Up</span>
                {modalError && (
                  <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                    {modalError}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Follow-up Date *</label>
                    <input
                      type="date"
                      required
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="w-full rounded border border-slate-200 bg-white p-2 text-xs text-slate-900 outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Follow-up Remarks *</label>
                    <input
                      type="text"
                      required
                      value={followUpNotes}
                      onChange={(e) => setFollowUpNotes(e.target.value)}
                      placeholder="Discussed bulk pricing tier, quoted 10 units..."
                      className="w-full rounded border border-slate-200 bg-white p-2 text-xs text-slate-900 outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-3.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs"
                  >
                    {isSubmitting ? "Logging..." : "Log Follow-Up"}
                  </button>
                </div>
              </form>
            )}

            {/* Timeline Stream */}
            <div className="space-y-2">
              <span className="font-bold text-slate-800 text-xs block">Follow-Up History</span>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {detailCustomer.followUps && detailCustomer.followUps.length > 0 ? (
                  detailCustomer.followUps.map((f) => (
                    <div key={f.id} className="p-3 rounded-lg bg-white border border-slate-200 space-y-1 text-xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono font-semibold text-amber-700">Scheduled: {f.followUpDate.split("T")[0]}</span>
                        <span className="text-slate-400 font-mono">{new Date(f.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-800 font-medium">{f.notes}</p>
                      {f.creator && <div className="text-[10px] text-slate-400">Logged by: {f.creator.name}</div>}
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                    No commercial follow-ups logged for this customer.
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button onClick={() => setDetailCustomer(null)} className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-semibold text-xs">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
