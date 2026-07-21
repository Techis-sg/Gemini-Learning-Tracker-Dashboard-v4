import React, { useState } from "react";
import { Task, Subject } from "@/types";
import { IconChevronLeft as ChevronLeft, IconChevronRight as ChevronRight, IconCalendar as CalendarIcon, IconClock as Clock, IconEdit as Edit2, IconTrash as Trash, IconPlus as Plus, IconFileText as FileText, IconCircle2 as CheckCircle2 } from '@tabler/icons-react';
import { Tooltip } from "@components/ui";

interface CalendarViewProps {
  tasks: Task[];
  subjects: Subject[];
  selectedDate: string;
  onDayClick: (dateStr: string) => void;
  onOpenTimeTracker: (task: Task) => void;
  onOpenEditTask: (task: Task) => void;
  onOpenAddTask: (dateStr: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
}

export default function CalendarView({
  tasks,
  subjects,
  selectedDate,
  onDayClick,
  onOpenTimeTracker,
  onOpenEditTask,
  onOpenAddTask,
  onUpdateTask,
  onDeleteTask,
}: CalendarViewProps) {
  // We'll set the initial calendar month to July 2026
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(6); // July is index 6

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const getDayTasks = (day: number) => {
    const formattedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return tasks.filter((t) => t.date === formattedDate);
  };

  const getDayLoggedMinutes = (day: number) => {
    const dayTasks = getDayTasks(day);
    return dayTasks.reduce((sum, t) => sum + t.timeSpentMinutes, 0);
  };

  const getSubjectName = (subjectId?: string) => {
    if (!subjectId) return "";
    const sub = subjects.find((s) => s.id === subjectId);
    return sub ? sub.name : "";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High": return "bg-rose-50 text-rose-600 border border-rose-100";
      case "Medium": return "bg-amber-50 text-amber-600 border border-amber-100";
      default: return "bg-slate-50 text-slate-500 border border-slate-100";
    }
  };

  const renderCells = () => {
    const cells = [];

    // Fill preceding empty cells
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(<div key={`empty-${i}`} className="bg-slate-50/50 border border-slate-100/30 min-h-[95px] p-2 rounded-xl opacity-30"></div>);
    }

    // Fill days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const isSelected = selectedDate === dateStr;
      
      // Determine if it is today dynamically
      const today = new Date();
      const isToday = currentYear === today.getFullYear() && currentMonth === today.getMonth() && day === today.getDate();

      // Determine if Sunday (revision day!)
      const dayOfWeek = new Date(currentYear, currentMonth, day).getDay();
      const isSunday = dayOfWeek === 0;

      const dayTasks = getDayTasks(day);
      const totalMinutes = getDayLoggedMinutes(day);

      cells.push(
        <button
          key={day}
          type="button"
          onClick={() => onDayClick(dateStr)}
          className={`border min-h-[100px] p-2 flex flex-col justify-between text-left transition-all duration-150 relative rounded-2xl group cursor-pointer ${
            isToday
              ? "bg-indigo-600 text-white font-extrabold shadow-md shadow-indigo-500/25 border-indigo-600 z-10 scale-105"
              : isSelected
              ? "bg-indigo-50 border-indigo-300 text-indigo-950 font-bold"
              : isSunday
              ? "bg-rose-50/50 border-rose-100 hover:bg-rose-100/50 text-slate-800"
              : "bg-white border-slate-100 hover:bg-slate-50/80 text-slate-800 hover:border-slate-200"
          }`}
        >
          <div className="flex justify-between items-center w-full">
            <span className={`text-[11px] font-mono font-bold ${
              isToday 
                ? "bg-white text-indigo-700 px-1.5 py-0.5 rounded-md" 
                : "text-slate-700"
            }`}>
              {day}
            </span>
            {isToday && (
              <span className="text-[8px] font-extrabold bg-white text-indigo-700 px-1 py-0.5 rounded tracking-wider">
                TODAY
              </span>
            )}
            {isSunday && !isToday && (
              <span className="text-[8px] font-bold bg-rose-100/80 text-rose-700 px-1.5 py-0.5 rounded tracking-wider border border-rose-200/50">
                REV
              </span>
            )}
          </div>

          {/* Tasks and Time overview inside day cell */}
          <div className="space-y-1 w-full mt-1.5 flex-1 flex flex-col justify-end">
            {dayTasks.length > 0 && (
              <div className="flex flex-col gap-0.5 max-h-[42px] overflow-hidden">
                {dayTasks.slice(0, 2).map((t) => (
                  <div
                    key={t.id}
                    className={`text-[8px] truncate font-bold px-1 py-0.5 rounded-md leading-none line-clamp-1 border ${
                      isToday
                        ? "bg-indigo-700/60 text-white border-indigo-500/30"
                        : t.status === "Completed"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-100/60"
                        : "bg-slate-50 text-slate-600 border-slate-100"
                    }`}
                    title={t.title}
                  >
                    {t.status === "Completed" ? "✓ " : ""}
                    {t.title}
                  </div>
                ))}
                {dayTasks.length > 2 && (
                  <div className={`text-[7px] font-mono font-bold ${isToday ? "text-indigo-200" : "text-slate-400"}`}>
                    +{dayTasks.length - 2} more
                  </div>
                )}
              </div>
            )}

            {totalMinutes > 0 && (
              <div className={`text-[8px] font-mono font-bold px-1 py-0.5 rounded mt-0.5 inline-block w-max ${
                isToday 
                  ? "bg-indigo-500 text-white" 
                  : "bg-indigo-50 text-indigo-700 border border-indigo-100/50"
              }`}>
                ⏱️ {totalMinutes}m
              </div>
            )}
          </div>
        </button>
      );
    }

    return cells;
  };

  const selectedDateTasks = tasks.filter((t) => t.date === selectedDate);
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "Completed").length;

  return (
    <div className="bg-white border border-slate-100 p-5 md:p-6 shadow-sm rounded-3xl">
      <div className="flex flex-col xl:flex-row gap-6">
        
        {/* Left column: Calendar Grid */}
        <div className="flex-1 space-y-5">
          {/* Calendar Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                <CalendarIcon className="w-5 h-5 text-indigo-500" />
                Study Master Calendar
              </h3>
              <p className="text-slate-400 text-[11px] font-medium mt-0.5">
                Navigate months and click on days to view detailed scheduled targets in the side panel.
              </p>
            </div>

            {/* Month selector controls */}
            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between bg-slate-50 border border-slate-200/60 p-1.5 rounded-xl shadow-sm">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-white active:scale-95 text-slate-600 hover:text-slate-900 rounded-lg transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-extrabold text-slate-700 text-xs px-2 font-mono uppercase tracking-wider">
                {monthNames[currentMonth]} {currentYear}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-white active:scale-95 text-slate-600 hover:text-slate-900 rounded-lg transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Stats Banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="bg-rose-50/50 border border-rose-100/60 p-2 rounded-xl text-center font-mono text-[9px] font-bold text-rose-700 flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              Sundays = Revision
            </div>
            <div className="bg-indigo-50/50 border border-indigo-100/60 p-2 rounded-xl text-center font-mono text-[9px] font-bold text-indigo-700 flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
              Highlighted = Today
            </div>
            <div className="bg-slate-50 border border-slate-200/40 p-2 rounded-xl text-center font-mono text-[9px] font-bold text-slate-500 flex items-center justify-center gap-1">
              <span>⏱️</span>
              Minutes Logged
            </div>
            <div className="bg-emerald-50 border border-emerald-100/60 p-2 rounded-xl text-center font-mono text-[9px] font-bold text-emerald-700 flex items-center justify-center gap-1">
              <span>🎯</span>
              Syllabus Done: {completedTasks}/{totalTasks} ({totalTasks > 0 ? Math.round((completedTasks/totalTasks)*100) : 0}%)
            </div>
          </div>

          {/* Week Day Labels */}
          <div className="grid grid-cols-7 gap-2 text-center font-bold text-[9px] uppercase font-mono tracking-wider text-slate-400">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, idx) => (
              <div
                key={day}
                className={`py-1 rounded-lg ${
                  idx === 0 ? "text-rose-500 bg-rose-50/30 font-extrabold" : "text-slate-500 bg-slate-50/50"
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-2">
            {renderCells()}
          </div>
        </div>

        {/* Right column: Side column loaded with tasks on selected date */}
        <div className="w-full xl:w-80 shrink-0 bg-slate-50/40 border border-slate-100 rounded-2xl p-4 md:p-5 flex flex-col gap-4 shadow-sm self-start min-h-[400px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm uppercase tracking-wide flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4 text-indigo-500" />
                Selected Date
              </h4>
              <p className="text-indigo-600 font-bold text-[11px] font-mono mt-0.5">
                {selectedDate}
              </p>
            </div>
            
            <button
              onClick={() => onOpenAddTask(selectedDate)}
              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              Add Target
            </button>
          </div>

          {/* Task List container */}
          <div className="flex-1 space-y-3 max-h-[450px] overflow-y-auto">
            {selectedDateTasks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-white border border-slate-100 rounded-2xl">
                <FileText className="w-8 h-8 text-slate-300 mb-2" />
                <span className="font-bold text-xs text-slate-600 block">No Targets Scheduled</span>
                <span className="text-[10px] text-slate-400 mt-0.5 max-w-[160px] inline-block">
                  Click 'Add Target' to plan topics for this day.
                </span>
              </div>
            ) : (
              selectedDateTasks.map((task) => {
                const isCompleted = task.status === "Completed";
                
                const handleToggle = () => {
                  const nextStatus = isCompleted ? "Not Started" : "Completed";
                  const nextCol = nextStatus === "Completed" ? "completed" : "today";
                  onUpdateTask(task.id, { status: nextStatus, boardColumnId: nextCol });
                };

                return (
                  <div
                    key={task.id}
                    className="bg-white border border-slate-100 p-3 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col gap-2.5 relative group"
                  >
                    {/* Top Row: checkbox + title */}
                    <div className="flex gap-2 items-start">
                      <button
                        onClick={handleToggle}
                        className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center cursor-pointer active:scale-90 transition-all ${
                          isCompleted
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "bg-white border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {isCompleted && <span className="text-[10px] font-bold">✓</span>}
                      </button>
                      
                      <div className="flex-1 leading-none">
                        <span className={`text-[11px] font-bold text-slate-800 leading-snug block ${isCompleted ? "line-through text-slate-400" : ""}`}>
                          {task.title}
                        </span>
                        {task.subjectId && (
                          <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50/50 px-1.5 py-0.5 rounded-md mt-1 inline-block">
                            📚 {getSubjectName(task.subjectId)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Metadata tags */}
                    <div className="flex flex-wrap gap-1 items-center">
                      <span className={`text-[8px] px-1.5 py-0.5 rounded-md font-bold uppercase ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded-md font-bold uppercase bg-slate-100 text-slate-600`}>
                        {task.category}
                      </span>
                      {task.timeSpentMinutes > 0 && (
                        <span className="text-[8px] font-mono font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-md border border-indigo-100/30">
                          ⏱️ {task.timeSpentMinutes}m
                        </span>
                      )}
                    </div>

                    {/* Actions Row */}
                    <div className="flex items-center justify-between border-t border-slate-50 pt-2 mt-1">
                      <Tooltip content="Log active study sessions" position="top">
                        <button
                          onClick={() => onOpenTimeTracker(task)}
                          className="text-[9px] text-indigo-600 hover:text-indigo-800 font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-50/60 hover:bg-indigo-100/60 transition-all cursor-pointer"
                        >
                          ⏱️ Log Session
                        </button>
                      </Tooltip>

                      <div className="flex items-center gap-1">
                        <Tooltip content="Edit Task" position="top">
                          <button
                            onClick={() => onOpenEditTask(task)}
                            className="p-1 hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-all cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3 text-slate-400 group-hover:text-amber-600" />
                          </button>
                        </Tooltip>
                        <Tooltip content="Delete Target" position="top">
                          <button
                            onClick={() => onDeleteTask(task.id)}
                            className="p-1 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-all cursor-pointer"
                          >
                            <Trash className="w-3 h-3 text-slate-400 group-hover:text-rose-500" />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
