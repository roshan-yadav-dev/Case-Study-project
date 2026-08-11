import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Plus,
  ArrowRight,
  X,
  Boxes,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCreateChallan?: () => void;
  onOpenCreateCustomer?: () => void;
  onOpenCreateProduct?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onOpenCreateChallan,
  onOpenCreateCustomer,
  onOpenCreateProduct,
}) => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();
  const canWrite = user?.role === "ADMIN" || user?.role === "SALES" || user?.role === "WAREHOUSE";

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open triggered parent state
        }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const items = [
    {
      id: "nav-dashboard",
      title: "Go to Operations Dashboard",
      category: "Navigation",
      icon: LayoutDashboard,
      shortcut: "G D",
      action: () => {
        navigate("/dashboard");
        onClose();
      },
    },
    {
      id: "nav-customers",
      title: "Go to Customers Master",
      category: "Navigation",
      icon: Users,
      shortcut: "G C",
      action: () => {
        navigate("/customers");
        onClose();
      },
    },
    {
      id: "nav-products",
      title: "Go to Products & Inventory Ledger",
      category: "Navigation",
      icon: Package,
      shortcut: "G P",
      action: () => {
        navigate("/products");
        onClose();
      },
    },
    {
      id: "nav-challans",
      title: "Go to Delivery Challans (Dispatch Notes)",
      category: "Navigation",
      icon: FileText,
      shortcut: "G S",
      action: () => {
        navigate("/challans");
        onClose();
      },
    },
  ];

  if (canWrite) {
    items.push(
      {
        id: "action-challan",
        title: "Create New Sales Challan",
        category: "Quick Actions",
        icon: Plus,
        shortcut: "N C",
        action: () => {
          navigate("/challans");
          onClose();
          if (onOpenCreateChallan) onOpenCreateChallan();
        },
      },
      {
        id: "action-customer",
        title: "Add New Customer Record",
        category: "Quick Actions",
        icon: Users,
        shortcut: "N U",
        action: () => {
          navigate("/customers");
          onClose();
          if (onOpenCreateCustomer) onOpenCreateCustomer();
        },
      },
      {
        id: "action-product",
        title: "Add New Product SKU",
        category: "Quick Actions",
        icon: Boxes,
        shortcut: "N P",
        action: () => {
          navigate("/products");
          onClose();
          if (onOpenCreateProduct) onOpenCreateProduct();
        },
      }
    );
  }

  const filteredItems = items.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-900/40 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 border-b border-slate-200 bg-slate-50/50">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search workspace..."
            className="w-full bg-transparent px-3 py-3.5 text-sm text-slate-900 placeholder-slate-400 outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {filteredItems.length > 0 ? (
            <div className="space-y-1">
              {filteredItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={item.action}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-sm hover:bg-slate-100/80 transition group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 text-xs sm:text-sm">{item.title}</p>
                        <span className="text-[10px] text-slate-400 font-mono">{item.category}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-500 border border-slate-200">
                        {item.shortcut}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 transition opacity-0 group-hover:opacity-100" />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              No matching commands or navigation pages found.
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>Navigation: <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">↑↓</kbd></span>
            <span>Select: <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">↵</kbd></span>
          </div>
          <span>Close: <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">ESC</kbd></span>
        </div>
      </div>
    </div>
  );
};
