import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Lock, Mail, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { loginRequest } from "../services/authApi";
import { RoleBadge } from "../components/RoleBadge";

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { accessToken, user } = await loginRequest(email, password);
      login(accessToken, user);
      navigate("/dashboard");
    } catch (err: any) {
      const message = err.response?.data?.message || "Invalid credentials. Please verify email & password.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword("Password@123");
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans text-slate-900">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-2xl space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white font-bold text-sm shadow-md">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Mini ERP + CRM</h1>
              <p className="text-xs text-slate-500 font-medium">Operations & Logistics Management Portal</p>
            </div>
          </div>

          <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs text-slate-600 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Enterprise Single Sign-On</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Sign in with your role credentials to manage customers, stock ledgers, and delivery challans.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Work Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-xs text-slate-900 shadow-2xs outline-none focus:border-slate-400 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-xs text-slate-900 shadow-2xs outline-none focus:border-slate-400 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
            >
              <span>{isSubmitting ? "Authenticating Session..." : "Sign In to Workspace"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Quick Login Presets Grid */}
        <div className="border-t border-slate-200 pt-4 space-y-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Quick Role Access Presets
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <button
              type="button"
              onClick={() => handleQuickLogin("admin@example.com")}
              className="flex flex-col justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-100 hover:border-slate-300 transition text-left cursor-pointer space-y-1.5"
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-slate-900 text-xs">ADMIN</span>
                <RoleBadge role="ADMIN" />
              </div>
              <span className="text-[11px] font-mono text-slate-500 truncate block w-full">admin@example.com</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin("sales@example.com")}
              className="flex flex-col justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-100 hover:border-slate-300 transition text-left cursor-pointer space-y-1.5"
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-slate-900 text-xs">SALES</span>
                <RoleBadge role="SALES" />
              </div>
              <span className="text-[11px] font-mono text-slate-500 truncate block w-full">sales@example.com</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin("warehouse@example.com")}
              className="flex flex-col justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-100 hover:border-slate-300 transition text-left cursor-pointer space-y-1.5"
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-slate-900 text-xs">WAREHOUSE</span>
                <RoleBadge role="WAREHOUSE" />
              </div>
              <span className="text-[11px] font-mono text-slate-500 truncate block w-full">warehouse@example.com</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin("accounts@example.com")}
              className="flex flex-col justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-100 hover:border-slate-300 transition text-left cursor-pointer space-y-1.5"
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-slate-900 text-xs">ACCOUNTS</span>
                <RoleBadge role="ACCOUNTS" />
              </div>
              <span className="text-[11px] font-mono text-slate-500 truncate block w-full">accounts@example.com</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
