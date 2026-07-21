import React, { useState, useEffect } from "react";
import { IconSparkles as Sparkles, IconLayersOff as Layers, IconBook as BookOpen, IconCalendar as CalendarIcon, IconPlus as Plus, IconTrash as Trash, IconBorderHorizontal as SlidersHorizontal, IconFlame as Flame, IconLogout as LogOut, IconList as List, IconHistory as History, IconSettings as Settings, IconSun as Sun, IconMoon as Moon, IconUpload as Upload } from '@tabler/icons-react';
import { Dashboard, Task } from "@/types";
import { Select, Tooltip } from "@components/ui";
import { apiFetch, toast } from "@utils/index";
import { APP_CONFIG } from "@config/app.config";
import ThemeToggle from "@components/theme/ThemeToggle";

interface SidebarLayoutProps {
  user: any;
  activeDashboardId: string;
  activeTab: string;
  dashboards: Dashboard[];
  tasks: Task[];
  onLogout: () => void;
  onDeleteDashboard: (id: string) => void;
  onTabClick: (tab: string) => void;
  onSelectDashboard: (id: string) => void;
  onOpenAIImporter: () => void;
  onOpenNewStudyTrack: () => void;
  showAddDash: boolean;
  appSettings?: any;
  onSettingsUpdate?: (updatedSettings: any) => void;
}

export function SidebarLayout({
  user,
  activeDashboardId,
  activeTab,
  dashboards,
  tasks,
  onLogout,
  onDeleteDashboard,
  onTabClick,
  onSelectDashboard,
  onOpenAIImporter,
  onOpenNewStudyTrack,
  showAddDash,
  appSettings,
  onSettingsUpdate,
}: SidebarLayoutProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleOutsideClick = () => setDropdownOpen(false);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [dropdownOpen]);

  // Dynamic streak calculation:
  // Consecutive days with study logged or tasks completed, up to (and including) today or yesterday.
  const calculateStreak = () => {
    if (!tasks || tasks.length === 0) return 0;

    // Get a set of all unique date strings (YYYY-MM-DD format) where study occurred
    const studyDates = new Set<string>();

    tasks.forEach((t) => {
      // 1. If task is Completed, count as studied on its designated date
      if (t.status === "Completed" && t.date) {
        studyDates.add(t.date);
      }
      // 2. If task has timeLogs, check dates of those logs
      if (t.timeLogs) {
        t.timeLogs.forEach((log) => {
          if (log.minutes > 0 && log.loggedAt) {
            const dStr = log.loggedAt.split("T")[0];
            studyDates.add(dStr);
          }
        });
      }
    });

    if (studyDates.size === 0) return 0;

    const formatDateKey = (dateObj: Date) => {
      const y = dateObj.getFullYear();
      const m = String(dateObj.getMonth() + 1).padStart(2, "0");
      const d = String(dateObj.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    };

    const today = new Date();
    const todayKey = formatDateKey(today);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = formatDateKey(yesterday);

    const studiedToday = studyDates.has(todayKey);
    const studiedYesterday = studyDates.has(yesterdayKey);

    if (!studiedToday && !studiedYesterday) {
      return 0;
    }

    // Determine our starting check point (either today if studied today, or yesterday)
    const checkDate = new Date(studiedToday ? today.getTime() : yesterday.getTime());
    let streakCount = 0;

    while (true) {
      const key = formatDateKey(checkDate);
      if (studyDates.has(key)) {
        streakCount++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streakCount;
  };

  const currentStreak = calculateStreak();
  return (
    <aside className="w-full md:w-64 bg-[#FCFDFE] border-b md:border-b-0 md:border-r border-slate-100 flex flex-col shrink-0 justify-between">
      {/* Top Section: Window dots + Header logo */}
      <div>
        {/* macOS circles */}
        <div className="flex gap-1.5 p-4 border-b border-slate-50 bg-slate-50/20">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400/80"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80"></span>
        </div>

        {/* Study Buddy Brand Header */}
        <div className="px-5 py-4 border-b border-slate-100/50 flex items-center gap-2.5 bg-gradient-to-r from-indigo-50/10 to-transparent">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20 shrink-0">
            <Flame className="w-4 h-4 fill-white" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-800 tracking-tight font-sans">
              Study Buddy
            </h2>
            <p className="text-[9px] text-slate-400 font-mono tracking-wider font-bold uppercase leading-none mt-0.5">
              Personal Tracker
            </p>
          </div>
        </div>

        {/* User Profile Card */}
        <div className="p-4 border-b border-slate-100/80 bg-slate-50/40 flex items-center justify-between gap-2.5 relative">
          <div className="flex items-center gap-2 overflow-hidden">
            <img
              src={user.avatarUrl}
              alt={user.name}
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-full border border-slate-200 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => onTabClick("tasks")}
              title="Go to Tasks"
            />
            <div 
              className="overflow-hidden cursor-pointer hover:text-indigo-600 transition-colors select-none"
              onClick={(e) => {
                e.stopPropagation();
                setDropdownOpen(!dropdownOpen);
              }}
            >
              <h4 className="text-xs font-bold text-slate-800 truncate leading-tight hover:text-indigo-600">
                {user.name}
              </h4>
              <span className="text-[10px] text-indigo-600 font-semibold block truncate uppercase">
                {user.name}
              </span>
            </div>
          </div>

          <ThemeToggle />

          <Tooltip content="Logout" position="bottom">
            <button
              onClick={onLogout}
              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </Tooltip>

          {/* Settings & Logout Dropdown */}
          {dropdownOpen && (
            <div 
              className="absolute top-14 left-4 z-50 w-44 bg-white border border-slate-200/80 rounded-xl shadow-lg p-1.5 animate-in fade-in slide-in-from-top-2"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  onTabClick("settings");
                  setDropdownOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg text-left cursor-pointer transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                Settings Menu
              </button>
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  setDropdownOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg text-left cursor-pointer transition-colors border-t border-slate-50 mt-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </button>
            </div>
          )}
        </div>


        {/* Workspace / Active Track Switcher Widget */}
        {dashboards.filter((d) => d.id !== "default").length > 0 && (
          <div className="p-4 border-b border-slate-100 bg-slate-50/40 space-y-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wide text-slate-500 block">
              Active Study Plan:
            </span>
            <Select
              value={activeDashboardId}
              onChange={(e) => onSelectDashboard(e.target.value)}
              options={dashboards.map((dash) => ({
                value: dash.id,
                label: `📂 ${dash.name} ${dash.isDefault ? "(Default)" : ""}`,
              }))}
            />
          </div>
        )}

        {/* Sidebar Navigation Tabs */}
        {dashboards.filter((d) => d.id !== "default").length > 0 && (
          <nav className="p-4 space-y-2 animate-in fade-in duration-200">
            {[
              { id: "dashboard", label: "Dashboard", icon: SlidersHorizontal, color: "bg-indigo-50 text-indigo-700 border-indigo-100/50" },
              { id: "tasks", label: "Tasks", icon: List, color: "bg-emerald-50 text-emerald-700 border-emerald-100/50" },
              { id: "subjects", label: "Subjects", icon: BookOpen, color: "bg-sky-50 text-sky-700 border-sky-100/50" },
              { id: "kanban", label: "Kanban Board", icon: SlidersHorizontal, color: "bg-purple-50 text-purple-700 border-purple-100/50" },
              { id: "calendar", label: "Calendar", icon: CalendarIcon, color: "bg-amber-50 text-amber-700 border-amber-100/50" },
              { id: "overview", label: "Insights", icon: Layers, color: "bg-indigo-50 text-indigo-700 border-indigo-100/50" },
              { id: "uploads", label: "Uploads", icon: Upload, color: "bg-pink-50 text-pink-700 border-pink-100/50" },
              { id: "history", label: "History", icon: History, color: "bg-blue-50 text-blue-700 border-blue-100/50" },
              { id: "settings", label: "Settings", icon: Settings, color: "bg-teal-50 text-teal-700 border-teal-100/50" },
            ].filter((tInfo) => tInfo.id === "settings" || !(appSettings?.hiddenMenus || []).includes(tInfo.id))
            .map((tInfo) => {
              const IconComponent = tInfo.icon;
              const isActive = activeTab === tInfo.id;
              return (
                <button
                  key={tInfo.id}
                  onClick={() => onTabClick(tInfo.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 font-bold text-xs uppercase tracking-wider transition-all text-left border rounded-xl cursor-pointer ${
                    isActive
                      ? `${tInfo.color} shadow-sm`
                      : "bg-transparent border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <IconComponent className="w-4 h-4 shrink-0" />
                  <span>{tInfo.label}</span>
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {/* Bottom Sidebar Footer Actions */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/30 space-y-3">
        {/* Study Streak Badge */}
        {dashboards.filter((d) => d.id !== "default").length > 0 && (
          <div className="bg-amber-50 text-amber-800 border border-amber-200/50 p-2.5 text-center rounded-xl font-mono text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5" title="Consecutive days studying or completing targets">
            <span>🔥 {currentStreak} DAY STUDY STREAK!</span>
          </div>
        )}

        {/* AI Importer Button */}
        <button
          onClick={onOpenAIImporter}
          className="w-full px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-sm rounded-xl transition-all cursor-pointer animate-pulse"
        >
          <Sparkles className="w-3.5 h-3.5 fill-white" />
          Import AI Planner
        </button>
      </div>
    </aside>
  );
}

export default SidebarLayout;
