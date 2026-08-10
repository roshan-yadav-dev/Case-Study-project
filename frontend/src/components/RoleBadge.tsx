import React from "react";
import type { UserRole } from "../types";

interface RoleBadgeProps {
    role: UserRole;
    className?: string;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, className = "" }) => {
    let colorStyle = "bg-slate-700 text-slate-200 border-slate-600";

    switch (role) {
        case "ADMIN":
            colorStyle = "bg-purple-900/60 text-purple-200 border-purple-700/50";
            break;
        case "SALES":
            colorStyle = "bg-blue-900/60 text-blue-200 border-blue-700/50";
            break;
        case "WAREHOUSE":
            colorStyle = "bg-amber-900/60 text-amber-200 border-amber-700/50";
            break;
        case "ACCOUNTS":
            colorStyle = "bg-emerald-900/60 text-emerald-200 border-emerald-700/50";
            break;
    }

    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorStyle} ${className}`}
        >
            {role}
        </span>
    );
};
