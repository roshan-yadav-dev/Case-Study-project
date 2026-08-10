import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Lock, Mail, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { loginRequest } from "../services/authApi";

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
            const message = err.response?.data?.message || "Invalid email or password";
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
        <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
            {/* Background Ambient Glows */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

            <div className="w-full max-w-md space-y-6 z-10">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="inline-flex p-3 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 mb-2">
                        <Building2 className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Mini ERP + CRM</h1>
                    <p className="text-xs text-slate-400">Enterprise Operations & Resource Planning Portal</p>
                </div>

                {/* Main Card */}
                <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                        <h2 className="text-sm font-semibold text-slate-200">Sign in to your account</h2>
                        <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                            <ShieldCheck className="w-3 h-3" />
                            <span>JWT Protected</span>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800/60 text-red-200 text-xs flex items-start gap-2.5">
                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4 text-left">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-300">Email Address</label>
                            <div className="relative">
                                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="user@example.com"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-300">Password</label>
                            <div className="relative">
                                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-50 cursor-pointer"
                        >
                            <span>{isSubmitting ? "Signing in..." : "Authenticate"}</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </form>

                    {/* Preset Role Login Shortcuts */}
                    <div className="space-y-3 pt-2 border-t border-slate-800">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block text-left">
                            Quick Demo Role Logins
                        </span>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <button
                                type="button"
                                onClick={() => handleQuickLogin("admin@example.com")}
                                className="p-2 rounded-lg bg-purple-950/40 border border-purple-800/40 hover:bg-purple-900/60 text-purple-200 text-left transition-all cursor-pointer"
                            >
                                <span className="font-semibold block">ADMIN</span>
                                <span className="text-[10px] text-purple-400 block truncate">admin@example.com</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuickLogin("sales@example.com")}
                                className="p-2 rounded-lg bg-blue-950/40 border border-blue-800/40 hover:bg-blue-900/60 text-blue-200 text-left transition-all cursor-pointer"
                            >
                                <span className="font-semibold block">SALES</span>
                                <span className="text-[10px] text-blue-400 block truncate">sales@example.com</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuickLogin("warehouse@example.com")}
                                className="p-2 rounded-lg bg-amber-950/40 border border-amber-800/40 hover:bg-amber-900/60 text-amber-200 text-left transition-all cursor-pointer"
                            >
                                <span className="font-semibold block">WAREHOUSE</span>
                                <span className="text-[10px] text-amber-400 block truncate">warehouse@example.com</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuickLogin("accounts@example.com")}
                                className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/40 hover:bg-emerald-900/60 text-emerald-200 text-left transition-all cursor-pointer"
                            >
                                <span className="font-semibold block">ACCOUNTS</span>
                                <span className="text-[10px] text-emerald-400 block truncate">accounts@example.com</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
