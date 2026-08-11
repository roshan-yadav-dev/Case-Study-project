import React from "react";

export type StatusVariant = "neutral" | "success" | "warning" | "danger" | "info" | "purple";

interface StatusPillProps {
  label: string;
  variant?: StatusVariant;
  showDot?: boolean;
  className?: string;
}

const VARIANT_STYLES: Record<StatusVariant, { container: string; dot: string }> = {
  neutral: {
    container: "bg-slate-100 text-slate-700 border-slate-200",
    dot: "bg-slate-500",
  },
  success: {
    container: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
    dot: "bg-emerald-500 animate-pulse",
  },
  warning: {
    container: "bg-amber-50 text-amber-800 border-amber-200/80",
    dot: "bg-amber-500",
  },
  danger: {
    container: "bg-rose-50 text-rose-800 border-rose-200/80",
    dot: "bg-rose-500",
  },
  info: {
    container: "bg-sky-50 text-sky-800 border-sky-200/80",
    dot: "bg-sky-500",
  },
  purple: {
    container: "bg-indigo-50 text-indigo-800 border-indigo-200/80",
    dot: "bg-indigo-500",
  },
};

export const StatusPill: React.FC<StatusPillProps> = ({
  label,
  variant = "neutral",
  showDot = true,
  className = "",
}) => {
  const style = VARIANT_STYLES[variant] || VARIANT_STYLES.neutral;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium tracking-tight border ${style.container} ${className}`}
    >
      {showDot && <span className={`h-1.5 w-1.5 rounded-full ${style.dot} shrink-0`} />}
      <span className="uppercase tracking-wider font-semibold text-[10px]">{label}</span>
    </span>
  );
};
