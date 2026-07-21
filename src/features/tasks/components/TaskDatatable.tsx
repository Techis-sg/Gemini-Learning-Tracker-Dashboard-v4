import React, { useState, useEffect } from "react";
import { Task, Subject } from "@/types";
import { getPriorityColor, getCategoryBg, getStatusColor, Modal } from "@utils/index";
import { Select } from "@components/ui";
import { PAGINATION_CONFIG } from "@config/app.config";
import {
  IconSearch as Search,
  IconPlus as Plus,
  IconGrid3x3 as Grid,
  IconList as List,
  IconCalendar as Calendar,
  IconTrendingDown as TrendingDown,
  IconTrendingUp as TrendingUp,
} from '@tabler/icons-react';

import TasksListView from "./TasksListView";
import TasksGridView from "./TasksGridView";
import TasksTimelineView from "./TasksTimelineView";

interface TaskDatatableProps {
  tasks: Task[];
  subjects: Subject[];
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenTimeTracker: (task: Task) => void;
  onOpenEditTask: (task: Task) => void;
  onOpenAddTaskModal: () => void;
}

type ViewMode = "list" | "grid" | "timeline";

export default function TaskDatatable({
  tasks,
  subjects,
  onUpdateTask,
  onDeleteTask,
  onOpenTimeTracker,
  onOpenEditTask,
  onOpenAddTaskModal,
}: TaskDatatableProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("today");
  const [sortBy, setSortBy] = useState<"date" | "priority" | "time">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeViewTask, setActiveViewTask] = useState<Task | null>(null);

  const itemsPerPage = PAGINATION_CONFIG.DEFAULT_PAGE_SIZE;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, priorityFilter, statusFilter, timeFilter, sortBy, sortOrder, viewMode]);

  const getPriorityWeight = (p: string) => {
    switch (p) {
      case "High": return 3;
      case "Medium": return 2;
      case "Low": return 1;
      default: return 0;
    }
  };

  // 1. Filtering Logic
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.notes.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      categoryFilter === "all" || t.category === categoryFilter;

    const matchesPriority =
      priorityFilter === "all" || t.priority === priorityFilter;

    const matchesStatus =
      statusFilter === "all" || t.status === statusFilter;

    const todayDateObj = new Date();
    const todayY = todayDateObj.getFullYear();
    const todayM = String(todayDateObj.getMonth() + 1).padStart(2, "0");
    const todayD = String(todayDateObj.getDate()).padStart(2, "0");
    const todayStr = `${todayY}-${todayM}-${todayD}`;

    const matchesTime = (() => {
      if (timeFilter === "today") return t.date === todayStr;
      if (timeFilter === "upcoming") return t.date > todayStr;
      if (timeFilter === "past") return t.date < todayStr;
      return true;
    })();

    return matchesSearch && matchesCategory && matchesPriority && matchesStatus && matchesTime;
  });

  // 2. Sorting Logic
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    let comparison = 0;
    if (sortBy === "date") {
      comparison = a.date.localeCompare(b.date);
    } else if (sortBy === "priority") {
      comparison = getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
    } else if (sortBy === "time") {
      comparison = b.timeSpentMinutes - a.timeSpentMinutes;
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  const getSubjectName = (subjectId?: string) => {
    if (!subjectId) return "";
    const sub = subjects.find((s) => s.id === subjectId);
    return sub ? sub.name : "";
  };

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  return (
    <div className="bg-white border border-slate-100 p-6 shadow-sm rounded-3xl">
      {/* Header and Controls */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center mb-5 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-md sm:text-lg font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
            📋 Task Workspace
          </h3>
          <p className="text-slate-400 text-[10px] font-mono mt-0.5">
            Search, sort, filter, and modify individual syllabus daily targets.
          </p>
        </div>

        {/* View Mode buttons and Add button */}
        <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
          <div className="flex border border-slate-200 bg-slate-50 rounded-xl overflow-hidden shadow-sm">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 font-bold font-mono text-[10px] sm:text-xs uppercase flex items-center gap-1 transition-colors ${
                viewMode === "list" ? "bg-indigo-600 text-white animate-pulse-subtle" : "bg-white text-slate-600 hover:text-slate-900"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1.5 font-bold font-mono text-[10px] sm:text-xs uppercase flex items-center gap-1 transition-colors ${
                viewMode === "grid" ? "bg-indigo-600 text-white animate-pulse-subtle" : "bg-white text-slate-600 hover:text-slate-900"
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              Grid
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`px-3 py-1.5 font-bold font-mono text-[10px] sm:text-xs uppercase flex items-center gap-1 transition-colors ${
                viewMode === "timeline" ? "bg-indigo-600 text-white animate-pulse-subtle" : "bg-white text-slate-600 hover:text-slate-900"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Timeline
            </button>
          </div>

          <button
            onClick={onOpenAddTaskModal}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add New Task
          </button>
        </div>
      </div>

      {/* Filter Toolbar - Modern Compact styling */}
      <div className="bg-slate-50/50 border border-slate-100 p-3 mb-6 rounded-xl shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
        {/* Search Bar */}
        <div className="lg:col-span-2 relative">
          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1 font-mono tracking-wider">
            Search targets:
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, subtopics..."
              className="w-full p-1.5 pl-8 border border-slate-200 bg-white hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all rounded-lg shadow-sm text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        {/* Category filter */}
        <div>
          <Select
            label="Track Category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={[
              { value: "all", label: "All Tracks" },
              { value: "Block 1 - GATE", label: "Block 1 - Core Theory" },
              { value: "Block 2 - Placements", label: "Block 2 - Projects / Applied" },
              { value: "DSA", label: "DSA Daily" },
              { value: "General", label: "General" },
            ]}
          />
        </div>

        {/* Priority Filter */}
        <div>
          <Select
            label="Priority Level"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            options={[
              { value: "all", label: "All Priorities" },
              { value: "High", label: "🔴 High" },
              { value: "Medium", label: "🟡 Medium" },
              { value: "Low", label: "⚪ Low" },
            ]}
          />
        </div>

        {/* Status Filter */}
        <div>
          <Select
            label="Task Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: "all", label: "All Statuses" },
              { value: "Not Started", label: "Not Started" },
              { value: "In Progress", label: "In Progress" },
              { value: "Completed", label: "Completed" },
            ]}
          />
        </div>

        {/* Date Timeline Filter */}
        <div>
          <Select
            label="Date Timeline"
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            options={[
              { value: "today", label: "📅 Today's" },
              { value: "upcoming", label: "📈 Upcoming" },
              { value: "past", label: "⏰ Past" },
              { value: "all", label: "🌍 All Days" },
            ]}
          />
        </div>

        {/* Sort Controls */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
            Sort Syllabus:
          </label>
          <div className="flex gap-1.5 items-center">
            <div className="flex-1">
              <Select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                options={[
                  { value: "date", label: "📅 Date" },
                  { value: "priority", label: "🔥 Priority" },
                  { value: "time", label: "⏱️ Time" },
                ]}
              />
            </div>
            <button
              onClick={toggleSortOrder}
              className="p-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center font-bold shadow-sm rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/10 cursor-pointer h-8 mt-0.5 shrink-0"
              title={sortOrder === "asc" ? "Sort Ascending" : "Sort Descending"}
            >
              {sortOrder === "asc" ? (
                <TrendingUp className="w-3.5 h-3.5 text-slate-600" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-slate-600" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Render sub views based on viewMode state */}
      {viewMode === "list" && (
        <TasksListView
          tasks={sortedTasks}
          subjects={subjects}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
          onOpenTimeTracker={onOpenTimeTracker}
          onOpenEditTask={onOpenEditTask}
          onViewDetails={setActiveViewTask}
        />
      )}

      {viewMode === "grid" && (
        <TasksGridView
          tasks={sortedTasks}
          subjects={subjects}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onOpenTimeTracker={onOpenTimeTracker}
          onOpenEditTask={onOpenEditTask}
          onDeleteTask={onDeleteTask}
        />
      )}

      {viewMode === "timeline" && (
        <TasksTimelineView
          tasks={sortedTasks}
          subjects={subjects}
        />
      )}

      {/* View Task Details Modal */}
      <Modal
        isOpen={activeViewTask !== null}
        onClose={() => setActiveViewTask(null)}
        maxWidthClass="max-w-lg"
      >
        {activeViewTask && (
          <div className="font-sans">
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-[10px] px-2.5 py-1 font-bold uppercase rounded-lg border border-slate-100/20 shadow-sm ${getCategoryBg(activeViewTask.category)}`}>
                {activeViewTask.category}
              </span>
              <span className={`text-[10px] px-2.5 py-1 font-bold uppercase rounded-lg border border-slate-100/20 shadow-sm ${getPriorityColor(activeViewTask.priority)}`}>
                {activeViewTask.priority}
              </span>
              <span className={`text-[10px] px-2.5 py-1 font-bold uppercase rounded-lg border border-slate-100/20 shadow-sm ${getStatusColor(activeViewTask.status)}`}>
                {activeViewTask.status}
              </span>
            </div>

            <h3 className="text-xl font-extrabold text-slate-800 mb-2 leading-snug">
              {activeViewTask.title}
            </h3>

            {activeViewTask.subjectId && (
              <p className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100/50 px-2.5 py-1 rounded-xl w-max mb-4 flex items-center gap-1.5 font-sans">
                📚 Subject: {getSubjectName(activeViewTask.subjectId)}
              </p>
            )}

            <div className="space-y-4">
              {/* Date & Time Spent Info */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100 font-mono text-xs">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Syllabus Date</span>
                  <span className="font-bold text-slate-700">{activeViewTask.date}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Total Logged Time</span>
                  <span className="font-bold text-slate-700">⏱️ {activeViewTask.timeSpentMinutes} mins</span>
                </div>
              </div>

              {/* Subtopics / Description */}
              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Description / Subtopics</span>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 font-mono text-xs text-slate-600 leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap">
                  {activeViewTask.description || <span className="italic text-slate-400 font-sans text-xs">No subtopic details provided.</span>}
                </div>
              </div>

              {/* Notes */}
              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Personal Notes</span>
                <div className="bg-amber-50/40 border border-amber-100 rounded-2xl p-4 font-mono text-xs text-slate-700 leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap">
                  {activeViewTask.notes || <span className="italic text-slate-400 font-sans text-xs">No notes written.</span>}
                </div>
              </div>

              {/* Attachments */}
              {activeViewTask.attachments && activeViewTask.attachments.length > 0 && (
                <div>
                  <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Attachments</span>
                  <div className="flex flex-wrap gap-2">
                    {activeViewTask.attachments.map((a) => (
                      <span key={a.id} className="text-xs bg-slate-100 border border-slate-200 px-3 py-1 font-mono rounded-xl flex items-center gap-1.5 shadow-sm text-slate-600">
                        📎 {a.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Logged study sessions (Ordered descending) */}
              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Logged Study Sessions (Descending)</span>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {!activeViewTask.timeLogs || activeViewTask.timeLogs.length === 0 ? (
                    <p className="text-slate-400 text-xs italic font-sans">No study sessions logged for this syllabus target.</p>
                  ) : (
                    [...activeViewTask.timeLogs]
                      .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))
                      .map((log) => {
                        const formattedDate = new Date(log.loggedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        });
                        return (
                          <div key={log.id} className="p-3 bg-indigo-50/20 border border-indigo-100/30 rounded-2xl text-xs flex justify-between items-start gap-3">
                            <div className="space-y-1">
                              <span className="font-bold text-slate-700 font-mono block text-[11px]">{formattedDate}</span>
                              {log.note ? (
                                <p className="text-slate-500 leading-normal font-sans">{log.note}</p>
                              ) : (
                                <p className="text-slate-400 italic font-sans">No notes logged.</p>
                              )}
                            </div>
                            <span className="font-mono font-bold text-indigo-700 bg-indigo-100/60 px-2.5 py-1 rounded-xl text-[10px] shrink-0">
                              ⏱️ {log.minutes}m
                            </span>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 mt-4 border-t border-slate-100">
              <button
                onClick={() => setActiveViewTask(null)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
