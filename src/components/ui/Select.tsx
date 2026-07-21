import React, { useState, useRef, useEffect } from "react";
import { IconChevronDown as ChevronDown } from '@tabler/icons-react';

interface SelectProps {
  label?: string;
  options: { value: any; label: string }[];
  value?: any;
  onChange?: (e: { target: { value: any; name?: string } }) => void;
  className?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
}

export function Select({ label, options, value, onChange, className = "", id, name, disabled }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => String(opt.value) === String(value)) || options[0];

  const handleSelect = (val: any) => {
    if (disabled) return;
    if (onChange) {
      onChange({ target: { value: val, name } });
    }
    setIsOpen(false);
  };

  return (
    <div className="w-full font-sans" ref={containerRef}>
      {label && (
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          id={id}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`w-full text-left bg-slate-50 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all rounded-xl px-3 py-1.5 pr-8 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none shadow-sm flex items-center justify-between h-8 ${className}`}
        >
          <span className="truncate">{selectedOption?.label || ""}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </button>

        {isOpen && !disabled && (
          <div className="absolute left-0 mt-1 w-full min-w-[160px] bg-white border border-slate-150 shadow-xl rounded-xl py-1.5 z-50 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-100">
            {options.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full text-left px-3.5 py-1.5 text-xs font-semibold transition-colors flex items-center justify-between ${
                    isSelected
                      ? "bg-indigo-500 text-white font-bold"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <span className="text-[10px] font-bold">✓</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
