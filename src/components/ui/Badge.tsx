import React from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "warning" | "error" | "info" | "default";
}

export function Badge({
  variant = "default",
  children,
  className = "",
  ...props
}: BadgeProps) {
  const baseStyle =
    "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border select-none";

  const variants = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-100",
    warning: "bg-amber-50 text-amber-800 border-amber-200/50",
    error: "bg-rose-50 text-rose-700 border-rose-100",
    info: "bg-indigo-50 text-indigo-700 border-indigo-100",
    default: "bg-slate-50 text-slate-600 border-slate-200",
  };

  return (
    <span className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
}

export default Badge;
