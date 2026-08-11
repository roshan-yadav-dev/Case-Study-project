import React from "react";
import type { UserRole } from "../types";

interface RoleBadgeProps {
  role: UserRole;
  className?: string;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, className = "" }) => {
  let style = "bg-slate-100 text-slate-700 border-slate-200/80";
  let dotColor = "bg-slate-500";

  switch (role) {
    case "ADMIN":
      style = "bg-slate-900 text-slate-100 border-slate-800";
      dotColor = "bg-emerald-400";
      break;
    case "SALES":
      style = "bg-blue-50 text-blue-800 border-blue-200/80";
      dotColor = "bg-blue-500";
      break;
    case "WAREHOUSE":
      style = "bg-amber-50 text-amber-800 border-amber-200/80";
      dotColor = "bg-amber-500";
      break;
    case "ACCOUNTS":
      style = "bg-emerald-50 text-emerald-800 border-emerald-200/80";
      dotColor = "bg-emerald-500";
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider shrink-0 whitespace-nowrap border ${style} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      <span>{role}</span>
    </span>
  );
};
