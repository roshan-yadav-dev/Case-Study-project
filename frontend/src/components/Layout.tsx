import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  LogOut,
  Building2,
  Shield,
  Menu,
  X,
  Search,
  Plus,
  Activity,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { RoleBadge } from "./RoleBadge";
import { CommandPalette } from "./CommandPalette";

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Global hotkey Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navGroups = [
    {
      title: "WORKSPACE",
      items: [
        { path: "/dashboard", label: "Operations Dashboard", icon: LayoutDashboard, badge: null },
      ],
    },
    {
      title: "COMMERCE & CRM",
      items: [
        { path: "/customers", label: "Customer Master & CRM", icon: Users, badge: null },
      ],
    },
    {
      title: "INVENTORY & FULFILLMENT",
      items: [
        { path: "/products", label: "Products & Stock Ledger", icon: Package, badge: "Low stock alert" },
        { path: "/challans", label: "Delivery Challans", icon: FileText, badge: null },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col">
      {/* Top Application Header Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-xs">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          {/* Brand & Organization Switcher */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 shadow-2xs md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="w-4 h-4" />
            </button>

            <Link to="/dashboard" className="flex items-center gap-2.5 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white font-bold text-xs shadow-xs group-hover:bg-blue-600 transition">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold tracking-tight text-slate-900">MINI ERP + CRM</span>
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 border border-emerald-200">
                    <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                    PROD
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 leading-none">Operations & Logistics Hub</p>
              </div>
            </Link>
          </div>

          {/* Center Search & Command Palette Trigger */}
          <div className="flex-1 max-w-md hidden md:block">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="w-full flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs text-slate-500 hover:border-slate-300 hover:bg-slate-100 transition shadow-2xs cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <span>Search SKU, Customer or Challan...</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-white text-slate-600 border border-slate-200 shadow-2xs">
                  ⌘K
                </kbd>
              </div>
            </button>
          </div>

          {/* Right Action Toolbar & User Dropdown */}
          <div className="flex items-center gap-3">
            {user?.role !== "ACCOUNTS" && (
              <Link
                to="/challans"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ New Challan</span>
              </Link>
            )}

            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
              <Activity className="w-3 h-3 text-emerald-600" />
              <span>API Healthy</span>
            </div>

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 shadow-2xs">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-900 text-white font-semibold text-[11px]">
                  {user?.name.charAt(0) ?? "U"}
                </div>
                <div className="text-left text-xs hidden md:block">
                  <p className="font-semibold leading-tight text-slate-900">{user?.name}</p>
                </div>
                {user && <RoleBadge role={user.role} />}
              </div>

              <button
                onClick={handleLogout}
                title="Sign out of workspace"
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="mx-auto flex flex-1 w-full max-w-7xl px-4 sm:px-6">
        {/* Desktop Sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white py-6 pr-4 md:flex">
          <nav className="space-y-6 flex-1">
            {navGroups.map((group, groupIdx) => (
              <div key={groupIdx} className="space-y-1.5">
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {group.title}
                </p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition ${
                        isActive
                          ? "bg-slate-900 text-white font-semibold shadow-xs"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-500"}`} />
                        <span>{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Sidebar Footer Capabilities Box */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 text-xs text-slate-600 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-slate-700" />
                Access Privileges
              </span>
              <span className="text-[10px] text-slate-400 font-mono">{user?.role}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600">
              {user?.role === "ADMIN" && "Full administrative control over master databases, stock locks & delivery logs."}
              {user?.role === "SALES" && "Authorized to issue delivery challans, update customer profiles & log lead activity."}
              {user?.role === "WAREHOUSE" && "Inbound replenishment authority, stock level locks & inventory movements audit."}
              {user?.role === "ACCOUNTS" && "Read-only access for financial auditing, challan ledgers & report generation."}
            </p>
          </div>
        </aside>

        {/* Main Content Viewport */}
        <main className="flex-1 py-6 md:pl-6 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Mobile Navigation Sidebar Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 transform border-r border-slate-200 bg-white p-5 shadow-2xl transition duration-200 ease-in-out md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-slate-900" />
            <div>
              <p className="text-xs font-bold text-slate-900">MINI ERP + CRM WORKSPACE</p>
              <p className="text-[10px] text-slate-500">Enterprise Operations</p>
            </div>
          </div>
          <button
            type="button"
            className="p-1 rounded-md text-slate-400 hover:text-slate-700"
            onClick={() => setMobileOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="mt-4 space-y-4">
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {group.title}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition ${
                      isActive
                        ? "bg-slate-900 text-white font-semibold"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* Global Command Palette Modal */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </div>
  );
};
