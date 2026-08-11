import React from "react";
import { X, Printer } from "lucide-react";
import type { Challan } from "../types";

interface PrintableChallanModalProps {
  challan: Challan;
  onClose: () => void;
}

export const PrintableChallanModal: React.FC<PrintableChallanModalProps> = ({ challan, onClose }) => {
  const subtotal = challan.items?.reduce(
    (acc, item) => acc + Number(item.unitPriceSnapshot) * item.quantity,
    0
  ) || 0;
  const gstRate = 0.18; // 18% standard GST
  const gstAmount = subtotal * gstRate;
  const grandTotal = subtotal + gstAmount;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto no-print">
      <div className="relative w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden text-slate-900 my-8">
        {/* Modal Action Header - Hidden during print */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 no-print">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900 text-sm">Official Delivery Challan & Dispatch Note</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-slate-200 text-slate-700">
              {challan.challanNumber}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-sm transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Official Copy</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Container */}
        <div className="p-8 space-y-6 printable-document bg-white text-slate-900 text-xs">
          {/* Company Header & Invoice Title */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-6 w-6 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                  ERP
                </div>
                <span className="text-base font-bold tracking-tight text-slate-900">ACME INDUSTRIAL ENTERPRISES</span>
              </div>
              <p className="text-[11px] text-slate-500">Plot 104, Industrial Automation Zone, Phase II</p>
              <p className="text-[11px] text-slate-500">Mumbai, Maharashtra 400093 • GSTIN: 27AAACA0000A1Z5</p>
              <p className="text-[11px] text-slate-500">Phone: +91 (022) 5550-1900 • Email: dispatch@acme-erp.com</p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-slate-100 text-slate-900 font-bold uppercase tracking-widest text-[11px] rounded mb-2 border border-slate-200">
                DELIVERY CHALLAN
              </span>
              <div className="font-mono text-sm font-bold text-slate-900">{challan.challanNumber}</div>
              <div className="text-[11px] text-slate-500 mt-1">
                Date: <span className="font-medium text-slate-800">{new Date(challan.createdAt).toLocaleDateString("en-IN")}</span>
              </div>
              <div className="text-[11px] text-slate-500">
                Status: <span className="font-semibold text-emerald-700 uppercase">{challan.status}</span>
              </div>
            </div>
          </div>

          {/* Customer & Shipping Info Grid */}
          <div className="grid grid-cols-2 gap-6 p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Billed & Consigned To</span>
              <p className="font-bold text-slate-900 text-sm">{challan.customer?.name}</p>
              <p className="font-medium text-slate-700">{challan.customer?.businessName}</p>
              <p className="text-slate-500 mt-1">{challan.customer?.address || "Registered Business Address"}</p>
              <p className="text-slate-500">Mobile: {challan.customer?.mobile}</p>
              {challan.customer?.gstNumber && (
                <p className="text-slate-700 font-mono mt-1">GSTIN: {challan.customer.gstNumber}</p>
              )}
            </div>
            <div className="border-l border-slate-200 pl-6">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Dispatch Details</span>
              <p className="text-slate-700">Dispatch Mode: <span className="font-medium text-slate-900">Surface Logistics / Road Transport</span></p>
              <p className="text-slate-700">Vehicle No: <span className="font-mono text-slate-900">MH-04-EK-9821</span></p>
              <p className="text-slate-700">Issued By: <span className="font-medium text-slate-900">{challan.creator?.name || "Operations Team"}</span></p>
              <p className="text-slate-700">Total Units: <span className="font-bold text-slate-900 font-mono">{challan.totalQuantity} Units</span></p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Product Description</th>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {challan.items?.map((item, index) => {
                  const lineTotal = Number(item.unitPriceSnapshot) * item.quantity;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono text-slate-400">{index + 1}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{item.productNameSnapshot}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{item.skuSnapshot}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">₹{Number(item.unitPriceSnapshot).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-900 font-mono">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Calculations Summary Grid */}
          <div className="flex justify-end pt-2">
            <div className="w-64 space-y-2 text-xs border border-slate-200 rounded-lg p-3 bg-slate-50">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono font-medium text-slate-900">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST (18% Estimated):</span>
                <span className="font-mono font-medium text-slate-900">₹{gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold text-slate-900">
                <span>Grand Total:</span>
                <span className="font-mono text-emerald-700">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Terms & Signatures Block */}
          <div className="pt-8 grid grid-cols-2 gap-8 border-t border-slate-200 text-[11px] text-slate-500">
            <div>
              <p className="font-semibold text-slate-800 mb-1">Declaration & Conditions:</p>
              <p className="leading-4 text-[10px]">
                1. Goods dispatched as per specified quantities and standard quality specs.<br />
                2. Subject to Mumbai Jurisdiction only. Received in good order.
              </p>
            </div>
            <div className="flex flex-col items-end justify-between min-h-[80px]">
              <span className="text-[10px] text-slate-400">For ACME INDUSTRIAL ENTERPRISES</span>
              <div className="border-t border-slate-300 w-48 text-center pt-1 text-[10px] font-medium text-slate-700">
                Authorized Signatory / Warehouse Supervisor
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
