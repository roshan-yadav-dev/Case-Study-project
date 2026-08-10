import React, { useEffect, useState } from "react";
import {
    Plus,
    Search,
    Filter,
    Phone,
    Mail,
    Calendar,
    MessageSquare,
    X,
    AlertCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { createCustomer, getCustomerById, getCustomers, updateCustomer, addCustomerFollowUp } from "../services/customerApi";
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

    const fetchCustomers = async () => {
        try {
            const params: any = {};
            if (search) params.search = search;
            if (statusFilter) params.status = statusFilter;
            if (typeFilter) params.customerType = typeFilter;

            const data = await getCustomers(params);
            setCustomers(data.customers || []);
        } catch (error) {
            console.error("Failed to fetch customers", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, [search, statusFilter, typeFilter]);

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
        } catch (err: any) {
            setModalError(err.response?.data?.message || "Failed to create customer");
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
        } catch (err: any) {
            setModalError(err.response?.data?.message || "Failed to update customer");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenDetail = async (c: Customer) => {
        try {
            const customer = await getCustomerById(c.id);
            setDetailCustomer(customer);
        } catch (_e) {
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
        } catch (err: any) {
            setModalError(err.response?.data?.message || "Failed to log follow-up");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 text-left">
            {/* Page Header & Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Customer CRM</h2>
                    <p className="text-xs text-slate-400">Manage client relationships, leads, and follow-up activities</p>
                </div>
                {canWrite && (
                    <button
                        onClick={handleOpenAdd}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Customer</span>
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
                        placeholder="Search by name, business, mobile, email..."
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
                        <option value="LEAD">LEAD</option>
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                    </select>
                </div>

                <div>
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                        <option value="">All Customer Types</option>
                        <option value="RETAIL">RETAIL</option>
                        <option value="WHOLESALE">WHOLESALE</option>
                        <option value="DISTRIBUTOR">DISTRIBUTOR</option>
                    </select>
                </div>
            </div>

            {/* Customer Cards Table */}
            {isLoading ? (
                <div className="p-12 text-center text-xs text-slate-400">Loading customer records...</div>
            ) : customers.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                            <tr>
                                <th className="p-3.5">Customer & Business</th>
                                <th className="p-3.5">Contact Details</th>
                                <th className="p-3.5">Type</th>
                                <th className="p-3.5 text-center">Status</th>
                                <th className="p-3.5">Next Follow-Up</th>
                                <th className="p-3.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                            {customers.map((c) => {
                                let statusStyle = "bg-slate-800 text-slate-300 border-slate-700";
                                if (c.status === "ACTIVE") statusStyle = "bg-emerald-950/60 text-emerald-300 border-emerald-800/60";
                                if (c.status === "LEAD") statusStyle = "bg-amber-950/60 text-amber-300 border-amber-800/60";
                                if (c.status === "INACTIVE") statusStyle = "bg-red-950/60 text-red-300 border-red-800/60";

                                return (
                                    <tr key={c.id} className="hover:bg-slate-800/40">
                                        <td className="p-3.5">
                                            <div className="font-bold text-white text-sm">{c.name}</div>
                                            <div className="text-[11px] text-indigo-400 font-medium">{c.businessName}</div>
                                        </td>
                                        <td className="p-3.5 space-y-0.5">
                                            <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                                                <Phone className="w-3 h-3 text-slate-500" />
                                                <span>{c.mobile}</span>
                                            </div>
                                            {c.email && (
                                                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                                    <Mail className="w-3 h-3 text-slate-500" />
                                                    <span>{c.email}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-3.5 font-medium text-slate-300">{c.customerType}</td>
                                        <td className="p-3.5 text-center">
                                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusStyle}`}>
                                                {c.status}
                                            </span>
                                        </td>
                                        <td className="p-3.5">
                                            {c.followUpDate ? (
                                                <div className="flex items-center gap-1.5 text-slate-200">
                                                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                                                    <span className="font-semibold">{c.followUpDate.split("T")[0]}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-500 text-[11px]">No follow-up set</span>
                                            )}
                                        </td>
                                        <td className="p-3.5 text-right space-x-2">
                                            <button
                                                onClick={() => handleOpenDetail(c)}
                                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold transition-all cursor-pointer"
                                            >
                                                Details & Log
                                            </button>
                                            {canWrite && (
                                                <button
                                                    onClick={() => handleOpenEdit(c)}
                                                    className="px-2.5 py-1 rounded-lg bg-indigo-950/50 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-800/50 text-[11px] font-semibold transition-all cursor-pointer"
                                                >
                                                    Edit
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
                <div className="p-12 text-center text-xs text-slate-400 bg-slate-900/80 rounded-2xl border border-slate-800">
                    No customer records matching search criteria.
                </div>
            )}

            {/* Add / Edit Customer Modal */}
            {(isAddModalOpen || editingCustomer) && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-white">
                                {isAddModalOpen ? "Add New Customer" : "Edit Customer Details"}
                            </h3>
                            <button
                                onClick={() => {
                                    setIsAddModalOpen(false);
                                    setEditingCustomer(null);
                                }}
                                className="text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {modalError && (
                            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-red-200 text-xs flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                                <span>{modalError}</span>
                            </div>
                        )}

                        <form onSubmit={isAddModalOpen ? handleCreateCustomer : handleUpdateCustomer} className="space-y-3 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-semibold text-slate-300 block mb-1">Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-slate-300 block mb-1">Business Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.businessName}
                                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-semibold text-slate-300 block mb-1">Mobile Number *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.mobile}
                                        onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-slate-300 block mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-semibold text-slate-300 block mb-1">Customer Type *</label>
                                    <select
                                        value={formData.customerType}
                                        onChange={(e) => setFormData({ ...formData, customerType: e.target.value as CustomerType })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                                    >
                                        <option value="RETAIL">RETAIL</option>
                                        <option value="WHOLESALE">WHOLESALE</option>
                                        <option value="DISTRIBUTOR">DISTRIBUTOR</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="font-semibold text-slate-300 block mb-1">Status *</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as CustomerStatus })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                                    >
                                        <option value="LEAD">LEAD</option>
                                        <option value="ACTIVE">ACTIVE</option>
                                        <option value="INACTIVE">INACTIVE</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="font-semibold text-slate-300 block mb-1">GST Number</label>
                                <input
                                    type="text"
                                    value={formData.gstNumber}
                                    onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                                    placeholder="27ABCDE1234F1ZH"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="font-semibold text-slate-300 block mb-1">Address</label>
                                <textarea
                                    rows={2}
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAddModalOpen(false);
                                        setEditingCustomer(null);
                                    }}
                                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30"
                                >
                                    {isSubmitting ? "Saving..." : "Save Customer"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Customer Detail & Follow-ups Timeline Modal */}
            {detailCustomer && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div>
                                <h3 className="text-base font-bold text-white">{detailCustomer.name}</h3>
                                <p className="text-xs text-indigo-400 font-medium">{detailCustomer.businessName}</p>
                            </div>
                            <button onClick={() => setDetailCustomer(null)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Customer Quick Summary Grid */}
                        <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60 text-xs">
                            <div>
                                <span className="text-slate-500 block">Mobile</span>
                                <span className="font-semibold text-slate-200">{detailCustomer.mobile}</span>
                            </div>
                            <div>
                                <span className="text-slate-500 block">Type</span>
                                <span className="font-semibold text-slate-200">{detailCustomer.customerType}</span>
                            </div>
                            <div>
                                <span className="text-slate-500 block">GSTIN</span>
                                <span className="font-semibold text-slate-200">{detailCustomer.gstNumber || "N/A"}</span>
                            </div>
                        </div>

                        {/* Follow-up Timeline & Add Form */}
                        <div className="space-y-4 text-xs">
                            <h4 className="font-semibold text-white flex items-center gap-2 border-b border-slate-800/80 pb-2">
                                <MessageSquare className="w-4 h-4 text-indigo-400" />
                                <span>Follow-up History & Log</span>
                            </h4>

                            {canWrite && (
                                <form onSubmit={handleAddFollowUp} className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                                    <span className="font-semibold text-slate-300 block">Log New Follow-up</span>
                                    {modalError && (
                                        <div className="p-2 rounded bg-red-950/60 border border-red-800/60 text-red-200 text-xs">
                                            {modalError}
                                        </div>
                                    )}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="text-[11px] font-medium text-slate-400 block mb-1">Follow-up Date *</label>
                                            <input
                                                type="date"
                                                required
                                                value={followUpDate}
                                                onChange={(e) => setFollowUpDate(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-[11px] font-medium text-slate-400 block mb-1">Notes / Remarks *</label>
                                            <input
                                                type="text"
                                                required
                                                value={followUpNotes}
                                                onChange={(e) => setFollowUpNotes(e.target.value)}
                                                placeholder="Discussed pricing, sent quotation..."
                                                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-600/30"
                                        >
                                            {isSubmitting ? "Logging..." : "Log Follow-Up"}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Timeline List */}
                            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                                {detailCustomer.followUps && detailCustomer.followUps.length > 0 ? (
                                    detailCustomer.followUps.map((f) => (
                                        <div key={f.id} className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 space-y-1">
                                            <div className="flex items-center justify-between text-[11px]">
                                                <span className="font-semibold text-amber-400">Scheduled: {f.followUpDate.split("T")[0]}</span>
                                                <span className="text-slate-500">{new Date(f.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-slate-300">{f.notes}</p>
                                            {f.creator && <div className="text-[10px] text-slate-500">Logged by: {f.creator.name}</div>}
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-slate-500 bg-slate-950/30 rounded-xl border border-slate-800/40">
                                        No follow-up entries logged yet for this customer.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end pt-2 border-t border-slate-800">
                            <button onClick={() => setDetailCustomer(null)} className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
