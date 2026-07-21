import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { IconHistory as History, IconLogin as LogIn, IconLogout as LogOut, IconCircle as PlusCircle, IconSquare as CheckSquare, IconClock as Clock, IconSparkles as Sparkles, IconShieldCheck as ShieldCheck, IconSearch as Search, IconFilter as Filter, IconLoader2 as Loader2, IconCalendar as Calendar, IconLayersOff as Layers, IconActivity as Activity } from '@tabler/icons-react';
import { apiFetch } from "@utils/index";
import { HistoryLog, Task } from "@/types";
import { Tooltip, DataTable } from "@components/ui";
import { APP_CONFIG } from "@config/app.config";
import { ColumnDef } from "@tanstack/react-table";

interface HistoryLogsProps {
  user: any;
  tasks: Task[]; // To calculate logged times
}

function ActiveSessionStopwatch() {
  const [activeSessionNum, setActiveSessionNum] = useState("142");
  const [activeSessionTime, setActiveSessionTime] = useState("00:00:00");

  useEffect(() => {
    const startTimestampStr = localStorage.getItem("portal_session_start");
    const sessionNumStr = localStorage.getItem("portal_active_session_number") || "142";
    setActiveSessionNum(sessionNumStr);

    const startTime = startTimestampStr ? parseInt(startTimestampStr, 10) : Date.now();

    const interval = setInterval(() => {
      const elapsedMs = Date.now() - startTime;
      
      const hours = Math.floor(elapsedMs / 3600000);
      const minutes = Math.floor((elapsedMs % 3600000) / 60000);
      const seconds = Math.floor((elapsedMs % 60000) / 1000);

      const hrsStr = String(hours).padStart(2, "0");
      const minsStr = String(minutes).padStart(2, "0");
      const secsStr = String(seconds).padStart(2, "0");

      setActiveSessionTime(`${hrsStr}:${minsStr}:${secsStr}`);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gradient-to-r from-indigo-50/50 to-emerald-50/30 border-2 border-dashed border-indigo-100 p-4 rounded-2xl flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-1">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center animate-pulse shadow">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            REAL-TIME SECURE MONITOR
          </span>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
            Current Active Session #{activeSessionNum} - <span className="font-mono text-indigo-600">{activeSessionTime}</span> <span className="text-slate-400 font-mono text-[10px] lowercase italic font-medium">(running time)</span>
          </h3>
        </div>
      </div>

      <div className="hidden sm:block text-right">
        <span className="text-[9px] font-bold bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-mono uppercase tracking-widest">
          SECURED VIA Simulated OAuth
        </span>
      </div>
    </div>
  );
}

export function HistoryLogs({ user, tasks }: HistoryLogsProps) {
  const [logs, setLogs] = useState<HistoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "session" | "action">("all");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Use 5 items per page to enable clean active pagination

  // Load history logs and poll every 3 seconds for real-time activity history
  useEffect(() => {
    let active = true;

    async function loadLogs(isInitial = false) {
      try {
        const res = await apiFetch(APP_CONFIG.API_ENDPOINTS.HISTORY);
        if (!res.ok) return;
        const data = await res.json();
        let dbLogs = data.logs || [];
        
        if (dbLogs.length === 0 && isInitial) {
          // Seed beautiful, numbered and detailed login session logs
          const today = new Date();
          const formatOffsetDate = (daysAgo: number, hoursOffset: number) => {
            const d = new Date(today);
            d.setDate(d.getDate() - daysAgo);
            d.setHours(hoursOffset, 0, 0, 0);
            return d.toISOString();
          };

          const seedLogs: HistoryLog[] = [
            {
              id: "seed_log_1",
              type: "session",
              action: "login_session",
              sessionNumber: 141,
              description: "Session 141 logged",
              timestamp: formatOffsetDate(0, 9), // Today 9:00 AM
              durationMinutes: 150, // 2.5 hours
              loggedInTime: "09:00:00",
              loggedOutTime: "11:30:00",
            },
            {
              id: "seed_log_2",
              type: "action",
              subType: "user",
              action: "create_task",
              description: "Created syllabus task: Discrete Mathematics Permutations.",
              timestamp: formatOffsetDate(0, 9.5),
            },
            {
              id: "seed_log_3",
              type: "action",
              subType: "user",
              action: "log_time",
              description: "Logged 45 study minutes to: Discrete Mathematics.",
              timestamp: formatOffsetDate(0, 11),
            },
            {
              id: "seed_log_4",
              type: "session",
              action: "login_session",
              sessionNumber: 140,
              description: "Session 140 logged",
              timestamp: formatOffsetDate(1, 10), // Yesterday 10:00 AM
              durationMinutes: 240, // 4 hours
              loggedInTime: "10:00:00",
              loggedOutTime: "14:00:00",
            },
            {
              id: "seed_log_5",
              type: "action",
              subType: "user",
              action: "complete_task",
              description: "Completed syllabus task: DBMS Indexing & B-Trees.",
              timestamp: formatOffsetDate(1, 12),
            },
            {
              id: "seed_log_6",
              type: "action",
              subType: "user",
              action: "log_time",
              description: "Logged 120 study minutes to: Database Management System.",
              timestamp: formatOffsetDate(1, 14),
            },
            {
              id: "seed_log_7",
              type: "session",
              action: "login_session",
              sessionNumber: 139,
              description: "Session 139 logged",
              timestamp: formatOffsetDate(2, 8), // 2 days ago
              durationMinutes: 180, // 3 hours
              loggedInTime: "08:00:00",
              loggedOutTime: "11:00:00",
            },
            {
              id: "seed_log_8",
              type: "action",
              subType: "ai",
              action: "import_planner",
              description: "Imported study syllabus planner via Gemini AI analyzer.",
              timestamp: formatOffsetDate(2, 9),
            }
          ];

          // Save seeds sequentially in Firestore
          for (const log of seedLogs) {
            await apiFetch(APP_CONFIG.API_ENDPOINTS.HISTORY, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(log),
            });
          }

          dbLogs = seedLogs;
        }

        // Sort logs newest first defensively
        dbLogs.sort((a: HistoryLog, b: HistoryLog) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        if (active) {
          setLogs((prevLogs) => {
            const lengthMatch = prevLogs.length === dbLogs.length;
            const contentMatch = lengthMatch && prevLogs.every((l, idx) => 
              l.id === dbLogs[idx].id && 
              l.timestamp === dbLogs[idx].timestamp && 
              l.durationMinutes === dbLogs[idx].durationMinutes &&
              l.loggedInTime === dbLogs[idx].loggedInTime &&
              l.loggedOutTime === dbLogs[idx].loggedOutTime
            );
            if (contentMatch) {
              return prevLogs; // No-op to prevent state update and keep Tooltip open
            }
            return dbLogs;
          });
        }
      } catch (err) {
        console.error("Error loading activity logs:", err);
      } finally {
        if (active && isInitial) {
          setLoading(false);
        }
      }
    }

    // Initial load
    loadLogs(true);

    // Setup 3-second polling interval for instant real-time changes
    const pollInterval = setInterval(() => {
      loadLogs(false);
    }, 3000);

    return () => {
      active = false;
      clearInterval(pollInterval);
    };
  }, [user]);

  // Filter logs case-insensitively for SESSIONS and ACTIONS to display properly (memoized to prevent table/tooltip resets)
  const filteredLogs = React.useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        log.description?.toLowerCase().includes(search.toLowerCase()) ||
        log.action?.toLowerCase().includes(search.toLowerCase());
      
      const logType = log.type?.toLowerCase(); // "session" or "action"
      const filterType = typeFilter.toLowerCase(); // "all", "session", "action"
      
      const matchesType = filterType === "all" || logType === filterType;
      return matchesSearch && matchesType;
    });
  }, [logs, search, typeFilter]);

  // Pagination Logic (handled by DataTable, but we can keep currentPage in sync)
  // Reset page to 1 whenever filters or search query update
  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter]);

  const getActionIcon = (action: string) => {
    const act = action?.toLowerCase();
    switch (act) {
      case "login_session":
      case "login":
        return <LogIn className="w-3.5 h-3.5 text-emerald-600" />;
      case "logout":
        return <LogOut className="w-3.5 h-3.5 text-rose-600" />;
      case "create_task":
        return <PlusCircle className="w-3.5 h-3.5 text-sky-600" />;
      case "complete_task":
        return <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />;
      case "log_time":
        return <Clock className="w-3.5 h-3.5 text-amber-600" />;
      case "import_planner":
        return <Sparkles className="w-3.5 h-3.5 text-purple-600" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const getBadgeColor = (log: HistoryLog) => {
    const t = log.type?.toLowerCase();
    if (t === "session") {
      return "bg-emerald-50 text-emerald-700 border-emerald-100/50";
    }
    if (log.subType === "ai") {
      return "bg-purple-50 text-purple-700 border-purple-100/50";
    }
    return "bg-indigo-50 text-indigo-700 border-indigo-100/50";
  };

  // Compile active studying hours calculations (logged sessions duration) vs tasks logged times
  const totalSessionMinutes = logs
    .filter((l) => l.type?.toLowerCase() === "session" && l.durationMinutes)
    .reduce((sum, current) => sum + (current.durationMinutes || 0), 0);

  const totalLoggedTaskMinutes = tasks.reduce((sum, task) => sum + (task.timeSpentMinutes || 0), 0);

  const columns = React.useMemo<ColumnDef<HistoryLog>[]>(() => [
    {
      accessorKey: "type",
      header: "Type",
      size: 150,
      cell: ({ row }) => {
        const log = row.original;
        const isSession = log.type?.toLowerCase() === "session";
        const displayType = isSession ? "Session" : log.subType === "ai" ? "Action by AI" : "Action by User";
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 border text-[10px] font-mono font-bold uppercase tracking-wider rounded-lg ${getBadgeColor(log)}`}>
            {getActionIcon(log.action)}
            {displayType}
          </span>
        );
      },
    },
    {
      accessorKey: "description",
      header: "Activity Details",
      size: 300,
      cell: ({ row }) => {
        const log = row.original;
        const isSession = log.type?.toLowerCase() === "session";
        
        if (isSession) {
          const logIn = log.loggedInTime || "09:00:00";
          const logOut = log.loggedOutTime || "11:30:00";
          const hoverContent = `Logged In : ${logIn}\nLogOut : ${logOut}`;

          return (
            <div>
              <Tooltip content={hoverContent}>
                <div className="text-xs font-bold text-slate-800 cursor-help underline decoration-dotted decoration-indigo-400 hover:text-indigo-600 inline-block transition-colors">
                  Session {log.sessionNumber || 18} logged
                </div>
              </Tooltip>
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wide mt-0.5">
                Action ID: {log.id} • {log.action}
              </div>
            </div>
          );
        }

        // Action logs: No tooltip
        return (
          <div>
            <div className="text-xs font-bold text-slate-800">
              {log.description}
            </div>
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wide mt-0.5">
              Action ID: {log.id} • {log.action}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "durationMinutes",
      header: "Session Duration",
      size: 150,
      cell: ({ row }) => {
        const log = row.original;
        return log.durationMinutes ? (
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {log.durationMinutes} Minutes
          </div>
        ) : (
          <span className="text-[10px] font-mono text-slate-400">—</span>
        );
      },
    },
    {
      accessorKey: "timestamp",
      header: "Logged Date/Time",
      size: 150,
      cell: ({ row }) => {
        const log = row.original;
        return (
          <div>
            <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {new Date(log.timestamp).toLocaleDateString("en-US", {
                month: "short",
                day: "2-digit",
                year: "numeric"
              })}
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
              {new Date(log.timestamp).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false
              })}
            </div>
          </div>
        );
      },
    },
  ], []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-sans text-slate-800 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            Portal Activity History
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Read-only immutable tracking log of workspace actions, authentication sessions, and study hours.
          </p>
        </div>

        {/* Dynamic Study Hours Balance Header Card */}
        <div className="flex gap-4">
          <div className="bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-2xl flex items-center gap-3">
            <div className="bg-emerald-100/80 p-2 text-emerald-700 rounded-xl">
              <LogIn className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase tracking-wider leading-tight">
                Active Studying Hours
              </span>
              <span className="text-sm font-black text-slate-800">
                {(totalSessionMinutes / 60).toFixed(1)} Hrs
              </span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-2xl flex items-center gap-3">
            <div className="bg-indigo-100/80 p-2 text-indigo-700 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase tracking-wider leading-tight">
                Logged Task Time
              </span>
              <span className="text-sm font-black text-slate-800">
                {(totalLoggedTaskMinutes / 60).toFixed(1)} Hrs
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Live stopwatch running active session block */}
      <ActiveSessionStopwatch />

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search action logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs font-bold pl-10 pr-4 py-2 border border-slate-200 hover:border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto justify-end">
          <Filter className="w-4 h-4 text-slate-400" />
          <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/40">
            {(["all", "session", "action"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => {
                  if (filter === "all") {
                    setSearch(""); // Ensure Show All clears any search term as requested
                  }
                  setTypeFilter(filter);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  typeFilter === filter
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {filter === "all" ? "Show All" : filter + "s"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table view */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-slate-400 font-mono text-xs">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
          LOADING AUDIT TRAILS...
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center">
          <History className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-700">No activity logs found</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            Try adjusting your query filter or perform some operations on your tasks dashboard.
          </p>
        </div>
      ) : (
        <DataTable<HistoryLog>
          columns={columns}
          data={filteredLogs}
          pageSize={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          paginationType="numbers"
          paginationLabel="logs"
          containerClassName="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm"
          tableClassName="w-full border-collapse text-left"
          theadClassName="font-mono text-[10px]"
        />
      )}
    </div>
  );
}
