import React from "react";

interface BreadcrumbItem {
  label: string;
  active?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <div className="w-full max-w-[1750px] mb-3 flex items-center text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider px-4 gap-2 select-none">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span className="text-slate-300 font-normal">/</span>}
          <span className={item.active ? "text-indigo-600" : ""}>{item.label}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

export default Breadcrumbs;
