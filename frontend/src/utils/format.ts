export const formatCurrency = (value: number | string | null | undefined): string => {
  const amount = typeof value === "string" ? parseFloat(value) : value;
  if (typeof amount !== "number" || Number.isNaN(amount)) {
    return "₹0.00";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatNumber = (value: number | string | null | undefined): string => {
  const amount = typeof value === "string" ? parseFloat(value) : value;
  if (typeof amount !== "number" || Number.isNaN(amount)) {
    return "0";
  }

  return new Intl.NumberFormat("en-IN").format(amount);
};

export const formatDate = (value: string | Date | null | undefined): string => {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatDateTime = (value: string | Date | null | undefined): string => {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};
