import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { IconLoader2 as Loader2, IconSparkles as Sparkles, IconPlus as Plus, IconBorderHorizontal as SlidersHorizontal } from '@tabler/icons-react';
import { motion, AnimatePresence } from "motion/react";
import {
  Flame,
  CheckCircle2,
  TrendingUp,
  Clock as ClockIcon,
  Sparkles as SparklesIcon,
  Calendar as CalendarIcon,
  ChevronRight,
  Target
} from "lucide-react";
import { Dashboard, Subject, Task } from "@/types";
import { apiFetch, toast } from "@utils/index";

// Components & layouts
import SidebarLayout from "@layouts/SidebarLayout";
import { PageLayout, PageContent } from "@layouts/PageLayout";
import { SyllabusErrorView } from "@/errors";

// Feature modules
import { OverviewStats } from "@features/insights";
import { SubjectDatatable } from "@features/subjects";
import { KanbanBoard } from "@features/kanban";
import { ProfileSettings } from "@features/settings";
import { HistoryLogs } from "@features/history";
import { UploadsPage } from "@features/uploads";
import { CalendarView } from "@features/calendar";
import {
  AIImporter,
  LogTime,
  AddTask,
  EditTask,
  DeleteTask,
  TaskDatatable,
  useTasks,
} from "@features/tasks";
import { AIChatDrawer } from "./AIChatDrawer";
import { Onboarding } from "./Onboarding";

interface PortalAppProps {
  user: any;
  onLogout: () => void;
  onUserUpdate: (updatedUser: any) => void;
  appSettings: any;
  onSettingsUpdate: (updatedSettings: any) => void;
}

const STUDY_QUOTES = [
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Do not wait for opportunity. Create it.", author: "George Bernard Shaw" },
  { text: "Quality is not an act, it is a habit.", author: "Aristotle" },
  { text: "Your talent determines what you can do. Your motivation determines how much you are willing to do.", author: "Lou Holtz" },
  { text: "The only limit to our realization of tomorrow will be our doubts of today.", author: "Franklin D. Roosevelt" },
  { text: "The path to success is to take massive, determined action.", author: "Tony Robbins" },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "Grit is passion and perseverance for very long-term goals.", author: "Angela Duckworth" },
  { text: "Concentrate all your thoughts upon the work at hand. The sun's rays do not burn until brought to a focus.", author: "Alexander Graham Bell" },
];

export function PortalApp({ user, onLogout, onUserUpdate, appSettings, onSettingsUpdate }: PortalAppProps) {
  const { dashId, tab } = useParams<{ dashId: string; tab: string }>();
  const navigate = useNavigate();

  const activeDashboardId = dashId || "default";
  const activeTab = (tab || "dashboard") as "dashboard" | "overview" | "subjects" | "kanban" | "calendar" | "tasks" | "history" | "settings" | "uploads";

  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [subjects, setSubjects] = useState<Record<string, Subject[]>>({});
  const [tasks, setTasks] = useState<Record<string, Task[]>>({});

  const activeDashboard = dashboards.find(
    (d) => d.shortName === activeDashboardId || d.id === activeDashboardId
  );
  const activeDashboardIdReal = activeDashboard ? activeDashboard.id : activeDashboardId;

  // Loading & error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal toggles
  const [showAIImporter, setShowAIImporter] = useState(false);
  const [showAIChatDrawer, setShowAIChatDrawer] = useState(false);
  const [activeTimeTrackerTask, setActiveTimeTrackerTask] = useState<Task | null>(null);
  const [activeEditTask, setActiveEditTask] = useState<Task | null>(null);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [addTaskColumn, setAddTaskColumn] = useState<Task["boardColumnId"]>("today");
  const [addTaskInitialDate, setAddTaskInitialDate] = useState(new Date().toLocaleDateString("en-CA"));

  // Deletion confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "task" | "subject" | "dashboard";
    id: string;
    title: string;
  } | null>(null);

  // Add dashboard form state
  const [showAddDash, setShowAddDash] = useState(false);
  const [newDashName, setNewDashName] = useState("");
  const [newDashDesc, setNewDashDesc] = useState("");
  const [newDashTarget, setNewDashTarget] = useState("");

  // Calendar selected date
  const [calendarSelectedDate, setCalendarSelectedDate] = useState(new Date().toLocaleDateString("en-CA"));

  const handleOpenCalendarAddTask = (dateStr: string) => {
    setAddTaskInitialDate(dateStr);
    setAddTaskColumn("today");
    setShowAddTaskModal(true);
  };

  // Fetch data on mount & whenever user.id changes
  useEffect(() => {
    fetchDB();
  }, [user.id]);

  const fetchDB = async (selectDashId?: string, silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const response = await apiFetch("/api/dashboard");
      if (!response.ok) {
        throw new Error("Failed to load tracking data from full-stack server.");
      }
      const data = await response.json();
      setDashboards(data.dashboards || []);
      setSubjects(data.subjects || {});

      // Deduplicate tasks defensively
      const deduplicatedTasks: Record<string, Task[]> = {};
      if (data.tasks) {
        Object.keys(data.tasks).forEach((dId) => {
          const taskList = data.tasks[dId] || [];
          const seen = new Set<string>();
          deduplicatedTasks[dId] = taskList.filter((t: Task) => {
            if (seen.has(t.id)) return false;
            seen.add(t.id);
            return true;
          });
        });
      }
      setTasks(deduplicatedTasks);

      if (data.dashboards && data.dashboards.length > 0) {
        if (selectDashId) {
          const matched = data.dashboards.find((d: any) => d.id === selectDashId || d.shortName === selectDashId);
          const navId = matched ? (matched.shortName || matched.id) : selectDashId;
          navigate(`/${navId}/${activeTab}`);
        } else {
          const matched = data.dashboards.find((d: any) => d.id === activeDashboardId || d.shortName === activeDashboardId);
          if (!matched) {
            const firstDash = data.dashboards[0];
            const navId = firstDash.shortName || firstDash.id;
            navigate(`/${navId}/${activeTab}`);
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleCreateDashboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDashName) return;
    try {
      const response = await apiFetch("/api/dashboard", {
        method: "POST",
        body: JSON.stringify({
          name: newDashName,
          description: newDashDesc,
          target: newDashTarget,
        }),
      });
      if (!response.ok) throw new Error("Failed to create dashboard");
      const data = await response.json();

      setNewDashName("");
      setNewDashDesc("");
      setNewDashTarget("");
      setShowAddDash(false);

      await fetchDB(data.dashboard.id);
      toast.success(`Study Plan "${data.dashboard.name}" created successfully!`);
    } catch (err: any) {
      toast.error("Error: " + err.message);
    }
  };

  const handleDeleteDashboard = async (id: string) => {
    if (id === "default") {
      toast.error("Cannot delete the default Study Buddy tracking plan.");
      return;
    }
    const dash = dashboards.find((d) => d.id === id);
    if (dash) {
      setDeleteConfirm({
        type: "dashboard",
        id,
        title: dash.name,
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const task = (tasks[activeDashboardIdReal] || []).find((t) => t.id === taskId);
    if (task) {
      setDeleteConfirm({
        type: "task",
        id: taskId,
        title: task.title,
      });
    }
  };

  // Delegate inline task update operations to the tasks feature hook
  const { handleUpdateTask } = useTasks(
    activeDashboardIdReal,
    setTasks,
    fetchDB,
    addTaskColumn,
    activeTimeTrackerTask,
    setActiveTimeTrackerTask
  );

  const handleDeleteSubject = async (subjectId: string) => {
    const subj = (subjects[activeDashboardIdReal] || []).find((s) => s.id === subjectId);
    if (subj) {
      setDeleteConfirm({
        type: "subject",
        id: subjectId,
        title: subj.name,
      });
    }
  };

  const handleReorderTasks = async (draggedId: string, targetTaskId: string, targetColId: string) => {
    const currentList = tasks[activeDashboardIdReal] || [];
    const draggedTask = currentList.find(t => t.id === draggedId);
    if (!draggedTask) return;

    const statusMap: Record<string, Task["status"]> = {
      todo: "Not Started",
      in_progress: "In Progress",
      completed: "Completed",
    };

    const updatedDragged = {
      ...draggedTask,
      boardColumnId: targetColId as any,
      status: statusMap[targetColId],
    };

    const targetIndex = currentList.findIndex(t => t.id === targetTaskId);
    if (targetIndex === -1) return;

    const remaining = currentList.filter(t => t.id !== draggedId);
    const newIndex = remaining.findIndex(t => t.id === targetTaskId);
    const reordered = [...remaining];
    reordered.splice(newIndex, 0, updatedDragged);

    setTasks((prev) => ({
      ...prev,
      [activeDashboardIdReal]: reordered,
    }));

    try {
      await apiFetch(`/api/task/${draggedId}`, {
        method: "PUT",
        body: JSON.stringify({
          boardColumnId: targetColId,
          status: statusMap[targetColId],
        }),
      });

      const reorderedIds = reordered.map(t => t.id);
      const response = await apiFetch(`/api/tasks/reorder/${activeDashboardIdReal}`, {
        method: "PUT",
        body: JSON.stringify({ taskIds: reorderedIds }),
      });
      if (!response.ok) throw new Error("Failed to save reorder");
    } catch (err: any) {
      console.error("Reorder save failed:", err);
    }
  };

  const handleOpenEditTask = (task: Task) => {
    setActiveEditTask(task);
  };

  const handleTabClick = (newTab: string) => {
    navigate(`/${activeDashboardId}/${newTab}`);
  };

  const handleSelectDashboard = (id: string) => {
    const dash = dashboards.find((d) => d.id === id);
    const navId = dash ? (dash.shortName || dash.id) : id;
    navigate(`/${navId}/${activeTab}`);
  };

  const currentDashboard = activeDashboard;
  const currentSubjects = subjects[activeDashboardIdReal] || [];
  const currentTasks = tasks[activeDashboardIdReal] || [];

  const tabLabelsMap: Record<string, string> = {
    dashboard: "Dashboard",
    overview: "Insights",
    subjects: "Subjects",
    kanban: "Kanban Board",
    calendar: "Calendar",
    tasks: "Tasks",
    uploads: "Uploads",
    history: "History",
    settings: "Settings",
  };

  const breadcrumbs = [
    { label: "Track Console", active: false },
    { label: tabLabelsMap[activeTab] || activeTab, active: true },
  ];

  const hasCustomDashboards = dashboards.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafaf9] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <h3 className="text-lg font-bold uppercase tracking-wide text-slate-800">Loading study workspace...</h3>
        <p className="text-slate-400 text-xs font-mono mt-1">Fetching syllabus tracks & database configurations</p>
      </div>
    );
  }

  if (!hasCustomDashboards) {
    return (
      <Onboarding
        user={user}
        onLogout={onLogout}
        onImportSuccess={async (newDId) => {
          await fetchDB(newDId);
        }}
      />
    );
  }

  return (
    <PageLayout
      user={user}
      currentDashboard={currentDashboard}
      breadcrumbs={breadcrumbs}
      showAddDash={showAddDash}
      newDashName={newDashName}
      newDashDesc={newDashDesc}
      newDashTarget={newDashTarget}
      onChangeNewDashName={setNewDashName}
      onChangeNewDashDesc={setNewDashDesc}
      onChangeNewDashTarget={setNewDashTarget}
      onCreateDashboard={handleCreateDashboard}
      onCloseNewDash={() => setShowAddDash(false)}
    >
      <SidebarLayout
        user={user}
        activeDashboardId={activeDashboardId}
        activeTab={activeTab}
        dashboards={dashboards}
        tasks={currentTasks}
        onLogout={onLogout}
        onDeleteDashboard={handleDeleteDashboard}
        onTabClick={handleTabClick}
        onSelectDashboard={handleSelectDashboard}
        onOpenAIImporter={() => setShowAIImporter(true)}
        onOpenNewStudyTrack={() => setShowAddDash(!showAddDash)}
        showAddDash={showAddDash}
        appSettings={appSettings}
        onSettingsUpdate={onSettingsUpdate}
      />

      <PageContent
        user={user}
        currentDashboard={currentDashboard}
        showAddDash={showAddDash}
        newDashName={newDashName}
        newDashDesc={newDashDesc}
        newDashTarget={newDashTarget}
        onChangeNewDashName={setNewDashName}
        onChangeNewDashDesc={setNewDashDesc}
        onChangeNewDashTarget={setNewDashTarget}
        onCreateDashboard={handleCreateDashboard}
        onCloseNewDash={() => setShowAddDash(false)}
      >
        {loading ? (
          <div className="bg-white border border-slate-100 p-16 text-center shadow-sm flex flex-col items-center justify-center rounded-[24px]">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
            <h3 className="text-lg font-bold uppercase tracking-wide text-slate-800">Loading study workspace...</h3>
            <p className="text-slate-400 text-xs font-mono mt-1">Fetching syllabus tracks & database configurations</p>
          </div>
        ) : error ? (
          <SyllabusErrorView message={error} onRetry={() => fetchDB()} />
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Dashboard menu overview tab */}
            {activeTab === "dashboard" && dashboards.length === 0 && (
              <div className="bg-gradient-to-br from-indigo-50/50 to-slate-50/50 border border-indigo-100/60 p-12 text-center shadow-sm flex flex-col items-center justify-center rounded-[32px] max-w-2xl mx-auto my-12 animate-in fade-in zoom-in-95 duration-300">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-6 shadow-inner">
                  <SlidersHorizontal className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">No Study Dashboard Created Yet</h3>
                <p className="text-slate-500 text-xs font-mono max-w-md mt-2 leading-relaxed">
                  Welcome to Learn.Space! To unlock your interactive syllabus dashboards, Gantt timelines, active revision calendars, and AI-powered performance trackers, please import your syllabus tracker or AI study plan first.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setShowAIImporter(true)}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 fill-white animate-pulse" />
                    Import AI Planner Now
                  </button>
                </div>
              </div>
            )}

            {activeTab === "dashboard" && dashboards.length > 0 && (
              <div className="space-y-6">
                {/* Dashboard Stats Hero Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left Column: Plan Information / Self-Motivation */}
                  <div className="md:col-span-2 bg-white border border-slate-100 p-6 rounded-[24px] shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                        📂 SELF-MOTIVATION
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 font-semibold">
                        Created: {new Date(currentDashboard?.createdAt || "").toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
                        {currentDashboard?.name}
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3 border-t border-slate-50">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wide block">
                          🎯 Target Goal
                        </span>
                        <p className="text-sm font-black text-slate-800 mt-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 inline-block">
                          {currentDashboard?.target || "Achieve plan objectives"}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wide block mb-1">
                          💡 My Motivation Message
                        </span>
                        <p className="text-xs font-semibold italic text-indigo-700 leading-relaxed bg-indigo-50/40 p-3 rounded-xl border border-indigo-100/30">
                          "{currentDashboard?.description || "Stay focused, embrace the struggle, and remember why you started."}"
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Overall Completion Meter */}
                  <div className="bg-white border border-slate-100 p-6 rounded-[24px] shadow-sm flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                        🔥 TARGET METERS
                      </span>
                      <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-800 mt-4">
                        Overall Course Completed
                      </h3>
                    </div>

                    {/* Progress Circle Visual */}
                    <div className="flex items-center gap-4 py-3">
                      <div className="relative w-16 h-16 flex items-center justify-center">
                        <svg className="w-16 h-16 transform -rotate-90">
                          <circle cx="32" cy="32" r="28" stroke="#E2E8F0" strokeWidth="6" fill="transparent" />
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            stroke="#6366F1"
                            strokeWidth="6"
                            fill="transparent"
                            strokeDasharray={175}
                            strokeDashoffset={
                              175 - (175 * (currentTasks.length > 0 ? (currentTasks.filter(t => t.status === "Completed").length / currentTasks.length) * 100 : 0)) / 100
                            }
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute text-xs font-mono font-extrabold text-slate-800">
                          {currentTasks.length > 0
                            ? Math.round((currentTasks.filter(t => t.status === "Completed").length / currentTasks.length) * 100)
                            : 0}%
                        </span>
                      </div>

                      <div>
                        <p className="text-xs font-black text-slate-800">
                          {currentTasks.filter(t => t.status === "Completed").length} / {currentTasks.length} Completed Tasks
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {currentTasks.filter(t => t.status === "In Progress").length} Tasks currently in progress
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowAIChatDrawer(true)}
                      className="w-full mt-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 fill-white animate-pulse" />
                      Ask AI Copilot
                    </button>
                  </div>
                </div>

                {/* Dynamic Study Space Cards & Timetables */}
                {(() => {
                  // Today's date matching
                  const formatDateLocal = (d: Date) => {
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, "0");
                    const r = String(d.getDate()).padStart(2, "0");
                    return `${y}-${m}-${r}`;
                  };
                  const todayLocalStr = formatDateLocal(new Date());
                  const todayTasks = currentTasks.filter(t => t.date === todayLocalStr);

                  // Streak calculation
                  const studyStreak = (() => {
                    if (!currentTasks || currentTasks.length === 0) return 0;
                    const studyDates = new Set<string>();
                    currentTasks.forEach((t) => {
                      if (t.status === "Completed" && t.date) {
                        studyDates.add(t.date);
                      }
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

                    const today = new Date();
                    const todayKey = formatDateLocal(today);
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayKey = formatDateLocal(yesterday);

                    const studiedToday = studyDates.has(todayKey);
                    const studiedYesterday = studyDates.has(yesterdayKey);

                    if (!studiedToday && !studiedYesterday) {
                      return 0;
                    }

                    const checkDate = new Date(studiedToday ? today.getTime() : yesterday.getTime());
                    let streakCount = 0;
                    while (true) {
                      const key = formatDateLocal(checkDate);
                      if (studyDates.has(key)) {
                        streakCount++;
                        checkDate.setDate(checkDate.getDate() - 1);
                      } else {
                        break;
                      }
                    }
                    return streakCount;
                  })();

                  // Cumulative minutes spent
                  const totalMinutesSpent = currentTasks.reduce((acc, t) => {
                    const logSum = t.timeLogs ? t.timeLogs.reduce((sum, log) => sum + (Number(log.minutes) || 0), 0) : 0;
                    return acc + logSum;
                  }, 0);
                  const totalHoursSpent = Math.floor(totalMinutesSpent / 60);
                  const remainingMinutesSpent = totalMinutesSpent % 60;

                  // Average syllabus percentage coverage
                  const avgSyllabusCoverage = currentSubjects.length > 0
                    ? Math.round(currentSubjects.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / currentSubjects.length)
                    : 0;

                  // Top 5 upcoming not started tasks (starting from tomorrow)
                  const tomorrowDateObj = new Date();
                  tomorrowDateObj.setDate(tomorrowDateObj.getDate() + 1);
                  const tomorrowLocalStr = formatDateLocal(tomorrowDateObj);

                  const upcomingTasks = currentTasks
                    .filter(t => t.status === "Not Started" && t.date >= tomorrowLocalStr)
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .slice(0, 5);

                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Left Side: Today's Plan & Stats Bento */}
                      <div className="lg:col-span-2 space-y-6">
                        {/* Stats Bento Box Sub-Grid (Placed On Top) */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                          {/* Streak Card */}
                          <div className="bg-white border border-slate-100 p-5 rounded-[24px] shadow-sm flex flex-col justify-between relative overflow-hidden group">
                            <div className="absolute top-0 right-0 transform translate-x-3 -translate-y-3 opacity-10 text-orange-500 group-hover:scale-110 transition-transform duration-300">
                              <Flame className="w-14 h-14 fill-current" />
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                                🔥 Momentum
                              </span>
                              <h4 className="text-[11px] font-bold text-slate-400 mt-2">Study Streak</h4>
                            </div>
                            <div className="mt-4">
                              <span className="text-2xl font-black text-slate-800 tracking-tight">
                                {studyStreak} {studyStreak === 1 ? "Day" : "Days"}
                              </span>
                              <p className="text-[9px] text-slate-400 mt-0.5 leading-relaxed">
                                {studyStreak > 0 ? "Outstanding consistency!" : "Start a task today to begin!"}
                              </p>
                            </div>
                          </div>

                          {/* Syllabus Coverage Card */}
                          <div className="bg-white border border-slate-100 p-5 rounded-[24px] shadow-sm flex flex-col justify-between relative overflow-hidden group">
                            <div className="absolute top-0 right-0 transform translate-x-3 -translate-y-3 opacity-10 text-indigo-500 group-hover:scale-110 transition-transform duration-300">
                              <Target className="w-14 h-14" />
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                                📈 Progress
                              </span>
                              <h4 className="text-[11px] font-bold text-slate-400 mt-2">Syllabus Coverage</h4>
                            </div>
                            <div className="mt-4">
                              <span className="text-2xl font-black text-slate-800 tracking-tight">
                                {avgSyllabusCoverage}%
                              </span>
                              <p className="text-[9px] text-slate-400 mt-0.5 leading-relaxed">
                                Average module completion rate.
                              </p>
                            </div>
                          </div>

                          {/* Total Cumulative Work Time Log Card */}
                          <div className="bg-white border border-slate-100 p-5 rounded-[24px] shadow-sm flex flex-col justify-between relative overflow-hidden group">
                            <div className="absolute top-0 right-0 transform translate-x-3 -translate-y-3 opacity-10 text-emerald-500 group-hover:scale-110 transition-transform duration-300">
                              <ClockIcon className="w-14 h-14" />
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                ⌛ Time Invested
                              </span>
                              <h4 className="text-[11px] font-bold text-slate-400 mt-2">Total Study Time</h4>
                            </div>
                            <div className="mt-4">
                              <span className="text-2xl font-black text-slate-800 tracking-tight">
                                {totalHoursSpent}h {remainingMinutesSpent}m
                              </span>
                              <p className="text-[9px] text-slate-400 mt-0.5 leading-relaxed">
                                Cumulative duration of logged tasks.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Today's Study Plan Card */}
                        <div className="bg-white border border-slate-100 p-6 rounded-[24px] shadow-sm space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                              Today's Study Plan
                            </h3>
                            <span className="text-[10px] font-mono font-bold bg-indigo-50 border border-indigo-100/50 px-2.5 py-1 rounded-lg text-indigo-600 uppercase">
                              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                            </span>
                          </div>

                          <div className="space-y-3">
                            {todayTasks.length === 0 ? (
                              <div className="text-center py-8 border border-dashed border-slate-100 rounded-2xl bg-slate-50/10 space-y-2">
                                <p className="text-xs font-bold text-slate-700">No scheduled tasks for today!</p>
                                <p className="text-[10px] text-slate-400 font-medium max-w-sm mx-auto">
                                  Your calendar is clear. This is a great opportunity to catch up on pending items or explore modules to study ahead.
                                </p>
                              </div>
                            ) : (
                              todayTasks.map((task) => (
                                <div
                                  key={task.id}
                                  className={`p-4 border border-slate-100 rounded-2xl transition-all flex items-center justify-between gap-3 ${
                                    task.status === "Completed"
                                      ? "bg-slate-50/10 opacity-75"
                                      : "bg-white hover:bg-slate-50/25"
                                  }`}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <button
                                      onClick={() => {
                                        const nextStatus = task.status === "Completed" ? "Not Started" : "Completed";
                                        handleUpdateTask(task.id, { status: nextStatus });
                                        toast.success(nextStatus === "Completed" ? "Task completed! Great job!" : "Task set to Not Started.");
                                      }}
                                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                                        task.status === "Completed"
                                          ? "bg-emerald-500 border-emerald-500 text-white"
                                          : "border-slate-300 hover:border-indigo-500"
                                      }`}
                                    >
                                      {task.status === "Completed" && (
                                        <svg className="w-3.5 h-3.5 stroke-2 stroke-current" fill="none" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                    </button>
                                    <div className="min-w-0">
                                      <p className={`text-xs font-bold truncate ${
                                        task.status === "Completed" ? "line-through text-slate-400" : "text-slate-800"
                                      }`}>
                                        {task.title}
                                      </p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[9px] font-mono bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-md font-bold">
                                          {task.category}
                                        </span>
                                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md font-bold ${
                                          task.priority === "High"
                                            ? "bg-rose-50 text-rose-600"
                                            : task.priority === "Medium"
                                            ? "bg-amber-50 text-amber-600"
                                            : "bg-slate-100 text-slate-600"
                                        }`}>
                                          {task.priority} Priority
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    {task.status !== "Completed" && (
                                      <button
                                        onClick={() => handleOpenEditTask(task)}
                                        className="text-[10px] font-mono font-bold text-slate-400 hover:text-slate-600 px-2.5 py-1.5 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                                      >
                                        Edit
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Side: Inspiration (Motivation) Card FIRST, then Upcoming Schedule Card SECOND */}
                      <div className="space-y-6">
                        {/* Daily Study Inspiration Card (Motivation Card First) */}
                        {(() => {
                          const dailyQuote = STUDY_QUOTES[new Date().getDate() % STUDY_QUOTES.length];
                          return (
                            <div className="bg-gradient-to-br from-indigo-50/20 via-purple-50/10 to-white border border-slate-100 p-6 rounded-[24px] shadow-sm relative overflow-hidden group">
                              <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 text-slate-100 group-hover:text-indigo-100 transition-all opacity-30 pointer-events-none">
                                <SparklesIcon className="w-16 h-16 text-indigo-400" />
                              </div>
                              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50/60 px-2.5 py-1 rounded-md">
                                ✨ Daily Study Inspiration
                              </span>
                              <p className="text-xs font-bold text-slate-700 italic leading-relaxed mt-4">
                                "{dailyQuote.text}"
                              </p>
                              <p className="text-[10px] font-mono font-bold text-indigo-600 mt-2">
                                — {dailyQuote.author}
                              </p>
                            </div>
                          );
                        })()}

                        {/* Upcoming Schedule Card SECOND */}
                        <div className="bg-white border border-slate-100 p-6 rounded-[24px] shadow-sm space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                              <CalendarIcon className="w-4 h-4 text-indigo-500" />
                              Upcoming Schedule
                            </h3>
                            <button
                              onClick={() => handleTabClick("tasks")}
                              className="text-[10px] font-mono font-bold text-indigo-600 hover:text-indigo-700 uppercase cursor-pointer"
                            >
                              All Tasks
                            </button>
                          </div>

                          <div className="space-y-2.5">
                            {upcomingTasks.length === 0 ? (
                              <p className="text-xs font-mono text-slate-400 py-8 text-center">
                                No upcoming study tasks scheduled.
                              </p>
                            ) : (
                              upcomingTasks.map((task) => (
                                <div
                                  key={task.id}
                                  className="p-3 border border-slate-100 rounded-xl bg-slate-50/20 hover:bg-slate-50/40 transition-all flex items-center justify-between gap-2.5"
                                >
                                  <div className="overflow-hidden">
                                    <p className="text-xs font-bold text-slate-800 truncate" title={task.title}>
                                      {task.title}
                                    </p>
                                    <span className="text-[9px] font-mono text-slate-400 block mt-0.5">
                                      📅 {new Date(task.date).toLocaleDateString()} • {task.priority} Priority
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => {
                                      handleUpdateTask(task.id, { status: "Completed" });
                                      toast.success("Task completed! Excellent progress!");
                                    }}
                                    className="px-2.5 py-1 text-[9px] font-mono font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-all border border-emerald-100 cursor-pointer shrink-0"
                                  >
                                    Mark as Done
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {activeTab === "overview" && (
              <OverviewStats tasks={currentTasks} subjects={currentSubjects} />
            )}
            {activeTab === "subjects" && (
              <SubjectDatatable
                subjects={currentSubjects}
                activeDashboardId={activeDashboardIdReal}
                onSuccess={() => fetchDB(activeDashboardIdReal, true)}
              />
            )}
            {activeTab === "kanban" && (
              <KanbanBoard
                tasks={currentTasks}
                subjects={currentSubjects}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
                onOpenAddTask={(colId) => {
                  setAddTaskColumn(colId);
                  setShowAddTaskModal(true);
                }}
                onOpenEditTask={handleOpenEditTask}
                onOpenTimeTracker={setActiveTimeTrackerTask}
                onReorderTasks={handleReorderTasks}
              />
            )}
            {activeTab === "calendar" && (
              <CalendarView
                tasks={currentTasks}
                subjects={currentSubjects}
                selectedDate={calendarSelectedDate}
                onDayClick={setCalendarSelectedDate}
                onOpenTimeTracker={setActiveTimeTrackerTask}
                onOpenEditTask={handleOpenEditTask}
                onOpenAddTask={handleOpenCalendarAddTask}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
              />
            )}
            {activeTab === "tasks" && (
              <TaskDatatable
                tasks={currentTasks}
                subjects={currentSubjects}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
                onOpenTimeTracker={setActiveTimeTrackerTask}
                onOpenEditTask={handleOpenEditTask}
                onOpenAddTaskModal={() => {
                  setAddTaskColumn("today");
                  setShowAddTaskModal(true);
                }}
              />
            )}
            {activeTab === "history" && (
              <HistoryLogs user={user} tasks={currentTasks} />
            )}
            {activeTab === "uploads" && (
              <UploadsPage tasks={currentTasks} subjects={currentSubjects} />
            )}
            {activeTab === "settings" && (
              <ProfileSettings
                user={user}
                dashboards={dashboards}
                onDeleteDashboard={handleDeleteDashboard}
                onProfileUpdate={onUserUpdate}
                onSettingsUpdate={onSettingsUpdate}
              />
            )}
          </div>
        )}
      </PageContent>

      {/* --- OVERLAYS & MODALS --- */}
      <AnimatePresence>
        {showAIImporter && (
          <AIImporter
            onImportSuccess={async (newDId) => {
              setShowAIImporter(false);
              await fetchDB(newDId);
              toast.success("AI learning plan imported and compiled successfully!");
            }}
            onClose={() => {
              if (dashboards.filter((d) => d.id !== "default").length === 0) {
                toast.error("Please import your AI planner files first to start using Learn.Space portal features.");
                onLogout();
              } else {
                setShowAIImporter(false);
              }
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeTimeTrackerTask && (
          <LogTime
            task={activeTimeTrackerTask}
            onClose={() => {
              setActiveTimeTrackerTask(null);
              fetchDB(activeDashboardIdReal, true);
            }}
            onSuccess={() => fetchDB(activeDashboardIdReal, true)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddTaskModal && (
          <AddTask
            isOpen={showAddTaskModal}
            onClose={() => setShowAddTaskModal(false)}
            activeDashboardId={activeDashboardIdReal}
            boardColumnId={addTaskColumn}
            subjects={currentSubjects}
            initialDate={addTaskInitialDate}
            onSuccess={() => fetchDB(activeDashboardIdReal, true)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeEditTask && (
          <EditTask
            task={activeEditTask}
            onClose={() => setActiveEditTask(null)}
            onSuccess={() => fetchDB(activeDashboardIdReal, true)}
            subjects={currentSubjects}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirm && (
          <DeleteTask
            isOpen={!!deleteConfirm}
            onClose={() => setDeleteConfirm(null)}
            type={deleteConfirm.type}
            id={deleteConfirm.id}
            activeDashboardId={activeDashboardIdReal}
            title={deleteConfirm.title}
            onSuccess={() => {
              if (deleteConfirm.type === "dashboard") {
                fetchDB();
              } else {
                fetchDB(activeDashboardIdReal, true);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Floating Configurable Notch pinned to bottom */}
      {dashboards.filter((d) => d.id !== "default").length > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40">
          <button
            id="ai-chat-notch-btn"
            onClick={() => setShowAIChatDrawer(!showAIChatDrawer)}
            className="group flex items-center gap-2.5 px-5 py-2.5 bg-zinc-900/95 hover:bg-zinc-800 text-white rounded-xl border border-white/10 shadow-2xl shadow-black/60 backdrop-blur-xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] cursor-pointer"
            title="Chat with AI"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <Sparkles className="w-4 h-4 text-indigo-400 group-hover:rotate-12 transition-transform duration-300 shrink-0" />
            <span className="text-xs font-semibold tracking-wide text-zinc-100 whitespace-nowrap">
              Chat with AI
            </span>
          </button>
        </div>
      )}

      {/* AI Copilot Side Drawer Overlay */}
      <AnimatePresence>
        {showAIChatDrawer && (
          <AIChatDrawer
            isOpen={showAIChatDrawer}
            onClose={() => setShowAIChatDrawer(false)}
            activeDashboardId={activeDashboardIdReal}
            onRefreshData={async () => {
              await fetchDB(activeDashboardIdReal, true);
            }}
          />
        )}
      </AnimatePresence>
    </PageLayout>
  );
}

export default PortalApp;
