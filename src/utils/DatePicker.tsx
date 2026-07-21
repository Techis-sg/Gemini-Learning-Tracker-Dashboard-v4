import React, { useState, useRef, useEffect } from "react";
import { IconChevronLeft as ChevronLeft, IconChevronRight as ChevronRight, IconCalendar as CalendarIcon } from '@tabler/icons-react';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  label?: string;
}

export default function DatePicker({ value, onChange, label }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value or default to today
  const initialDate = value ? new Date(value) : new Date();
  const [year, setYear] = useState(isNaN(initialDate.getTime()) ? new Date().getFullYear() : initialDate.getFullYear());
  const [month, setMonth] = useState(isNaN(initialDate.getTime()) ? new Date().getMonth() : initialDate.getMonth()); // 0-indexed

  // Update calendar view if the value changes from the outside
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setYear(d.getFullYear());
        setMonth(d.getMonth());
      }
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Year choices: 2020 to 2032
  const years = Array.from({ length: 13 }, (_, i) => 2020 + i);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((prev) => prev - 1);
    } else {
      setMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((prev) => prev + 1);
    } else {
      setMonth((prev) => prev + 1);
    }
  };

  const handleDaySelect = (day: number) => {
    const formattedDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    onChange(formattedDate);
    setIsOpen(false);
  };

  // Format date for trigger button display
  const getDisplayDate = () => {
    if (!value) return "Select study date";
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const renderDays = () => {
    const cells = [];
    
    // Empty cells for alignment
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
    }

    // Days numbers
    for (let day = 1; day <= daysInMonth; day++) {
      const currentFormatted = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const isSelected = value === currentFormatted;
      
      cells.push(
        <button
          key={day}
          type="button"
          onClick={() => handleDaySelect(day)}
          className={`w-8 h-8 text-[11px] font-bold rounded-lg flex items-center justify-center transition-all cursor-pointer ${
            isSelected
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          {day}
        </button>
      );
    }

    return cells;
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
          {label}
        </label>
      )}
      
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-2.5 border border-slate-200 bg-white hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all rounded-xl shadow-sm font-semibold text-slate-700 text-xs focus:outline-none flex items-center justify-between cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-slate-400" />
          {getDisplayDate()}
        </span>
        <span className="text-[10px] text-slate-400">▼</span>
      </button>

      {/* Modern Popover */}
      {isOpen && (
        <div className="absolute left-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl p-4 w-72 z-[100] animate-in fade-in slide-in-from-top-1 duration-150">
          
          {/* Popover Header Controls */}
          <div className="flex items-center justify-between gap-1 mb-3">
            {/* Year selector dropdown */}
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="p-1 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none cursor-pointer"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            {/* Month selector dropdown */}
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="p-1 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none cursor-pointer"
            >
              {monthNames.map((name, index) => (
                <option key={name} value={index}>{name}</option>
              ))}
            </select>

            {/* Month nav buttons */}
            <div className="flex gap-1 shrink-0">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-600 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-600 transition-all cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-[9px] uppercase font-mono tracking-wider text-slate-400 mb-1">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day, idx) => (
              <div key={day} className={`py-1 rounded ${idx === 0 ? "text-rose-500" : "text-slate-400"}`}>
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days grid */}
          <div className="grid grid-cols-7 gap-1">
            {renderDays()}
          </div>
        </div>
      )}
    </div>
  );
}
