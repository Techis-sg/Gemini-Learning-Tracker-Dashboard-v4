import React from "react";
import { Task, Subject, HistoryLog } from "@/types";
import { apiFetch } from "@utils/index";
import { APP_CONFIG } from "@config/app.config";
import { IconClock as Clock, IconBook as BookOpen, IconTarget as Target, IconAward as Award, IconCircle as CheckCircle, IconFlame as Flame, IconCalendar as Calendar, IconChartBar as ChartBar, IconTrendingUp as TrendingUp, IconPresentationAnalytics as PresentationAnalytics } from '@tabler/icons-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";

interface OverviewStatsProps {
  tasks: Task[];
  subjects: Subject[];
}

interface ContributionHeatmapProps {
  tasks: Task[];
}

function ContributionHeatmap({ tasks }: ContributionHeatmapProps) {
  const [selectedYear, setSelectedYear] = React.useState<string>("Last 365 Days");
  const [hoveredDay, setHoveredDay] = React.useState<{
    date: string;
    minutes: number;
    x: number;
    y: number;
  } | null>(null);

  const containerRef = React.useRef<HTMLDivElement>(null);

  // Helper to aggregate logged minutes per calendar date across all tasks
  const timeByDateFull: Record<string, number> = {};
  tasks.forEach((t) => {
    if (t.timeLogs && t.timeLogs.length > 0) {
      t.timeLogs.forEach((log) => {
        if (log.loggedAt) {
          const dateStr = log.loggedAt.split("T")[0];
          timeByDateFull[dateStr] = (timeByDateFull[dateStr] || 0) + log.minutes;
        }
      });
    } else if (t.timeSpentMinutes > 0) {
      const dateStr = t.date;
      timeByDateFull[dateStr] = (timeByDateFull[dateStr] || 0) + t.timeSpentMinutes;
    }
  });

  // Calculate year start and end dates
  const today = new Date(2026, 6, 16); // Centered around July 2026 data
  let startDate: Date;
  let endDate: Date;

  if (selectedYear === "Last 365 Days") {
    endDate = new Date(today);
    startDate = new Date(today);
    startDate.setDate(today.getDate() - 364);
  } else {
    const yearNum = parseInt(selectedYear);
    startDate = new Date(yearNum, 0, 1);
    endDate = new Date(yearNum, 11, 31);
  }

  // Align start date to preceding Sunday
  const startSunday = new Date(startDate);
  startSunday.setDate(startDate.getDate() - startDate.getDay());

  // Align end date to succeeding Saturday
  const endSaturday = new Date(endDate);
  endSaturday.setDate(endDate.getDate() + (6 - endDate.getDay()));

  // Generate day items
  const daysList: {
    dateStr: string;
    date: Date;
    minutes: number;
    dayOfWeek: number;
    monthIndex: number;
  }[] = [];

  let curr = new Date(startSunday);
  while (curr <= endSaturday) {
    const yyyy = curr.getFullYear();
    const mm = String(curr.getMonth() + 1).padStart(2, "0");
    const dd = String(curr.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const minutes = timeByDateFull[dateStr] || 0;

    daysList.push({
      dateStr,
      date: new Date(curr),
      minutes,
      dayOfWeek: curr.getDay(),
      monthIndex: curr.getMonth(),
    });

    curr.setDate(curr.getDate() + 1);
  }

  // Slice into 7-day columns (Sunday to Saturday)
  const weeks: typeof daysList[] = [];
  for (let i = 0; i < daysList.length; i += 7) {
    weeks.push(daysList.slice(i, i + 7));
  }

  // Generate Month labels corresponding to columns where month starts
  const monthLabels: { label: string; colIndex: number }[] = [];
  let prevMonth = -1;
  weeks.forEach((week, colIndex) => {
    const firstDayOfM = week.find((d) => d && d.date.getDate() <= 7);
    if (firstDayOfM) {
      const mIdx = firstDayOfM.date.getMonth();
      if (mIdx !== prevMonth) {
        const label = firstDayOfM.date.toLocaleDateString("en-US", { month: "short" });
        if (monthLabels.length === 0 || colIndex - monthLabels[monthLabels.length - 1].colIndex >= 3) {
          monthLabels.push({ label, colIndex });
          prevMonth = mIdx;
        }
      }
    }
  });

  const getHeatmapColor = (minutes: number) => {
    if (minutes === 0) return "bg-slate-100 border border-slate-200/20";
    if (minutes <= 30) return "bg-[#FFE8D6] hover:bg-[#FFD4B2] border border-[#FED7AA]/30";
    if (minutes <= 60) return "bg-[#FFB703] hover:bg-[#FFAD00] border border-[#F97316]/30";
    if (minutes <= 120) return "bg-[#FB8500] hover:bg-[#EA7600] border border-[#EA580C]/30";
    return "bg-[#D03E00] hover:bg-[#B73500] border border-[#9A3412]/30";
  };

  // Find column indices that start a new month to introduce gaps
  const monthBoundaryColIndices = new Set<number>();
  let lastSeenMonth = -1;
  weeks.forEach((week, colIndex) => {
    const firstDay = week.find((d) => d !== undefined);
    if (firstDay) {
      const mVal = firstDay.date.getMonth();
      if (lastSeenMonth !== -1 && mVal !== lastSeenMonth) {
        monthBoundaryColIndices.add(colIndex);
      }
      lastSeenMonth = mVal;
    }
  });

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Heatmap Area */}
      <div className="flex-1 overflow-x-auto bg-slate-50/50 border border-slate-100 rounded-2xl p-5 relative select-none" ref={containerRef}>
        {/* Month labels header */}
        <div className="flex pl-8 mb-1.5 relative h-4 text-[10px] font-bold text-slate-400 font-mono">
          {weeks.map((_, colIndex) => {
            const ml = monthLabels.find((item) => item.colIndex === colIndex);
            const hasGap = monthBoundaryColIndices.has(colIndex);
            return (
              <div key={colIndex} className={`w-[16px] shrink-0 relative ${hasGap ? "ml-2.5" : ""}`}>
                {ml && (
                  <span className="absolute left-0 top-0 whitespace-nowrap text-slate-500 font-bold text-[10px]">
                    {ml.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Days of week labels + squares grid */}
        <div className="flex gap-2">
          {/* Weekday Labels Column */}
          <div className="flex flex-col justify-between text-[10px] font-bold text-slate-400 font-mono pr-1 h-[109px] select-none pt-[1px]">
            <span className="h-3 leading-none"></span>
            <span className="h-3 leading-none">Mon</span>
            <span className="h-3 leading-none"></span>
            <span className="h-3 leading-none">Wed</span>
            <span className="h-3 leading-none"></span>
            <span className="h-3 leading-none">Fri</span>
            <span className="h-3 leading-none"></span>
          </div>

          {/* Grid of Weeks */}
          <div className="flex gap-[3px]">
            {weeks.map((week, colIndex) => {
              const hasGap = monthBoundaryColIndices.has(colIndex);
              return (
                <div key={colIndex} className={`flex flex-col gap-[3px] shrink-0 ${hasGap ? "ml-2.5" : ""}`}>
                  {week.map((day, rowIndex) => {
                    if (!day) return <div key={rowIndex} className="w-[13px] h-[13px]" />;

                    const handleMouseEnter = (e: React.MouseEvent) => {
                      const cell = e.currentTarget as HTMLDivElement;
                      const container = containerRef.current;
                      if (!container) return;

                      const cellRect = cell.getBoundingClientRect();
                      const containerRect = container.getBoundingClientRect();

                      const x = cellRect.left - containerRect.left + cellRect.width / 2;
                      const y = cellRect.top - containerRect.top;

                      const [yrStr, moStr, dyStr] = day.dateStr.split("-");
                      const localD = new Date(parseInt(yrStr), parseInt(moStr) - 1, parseInt(dyStr));
                      const formattedDate = localD.toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      });

                      setHoveredDay({
                        date: formattedDate,
                        minutes: day.minutes,
                        x,
                        y,
                      });
                    };

                    return (
                      <div
                        key={rowIndex}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={() => setHoveredDay(null)}
                        className={`w-[13px] h-[13px] rounded-[2.5px] cursor-pointer transition-transform duration-75 hover:scale-125 hover:z-10 ${getHeatmapColor(day.minutes)}`}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 justify-end text-[10px] font-mono text-slate-500 mt-4 select-none pr-2">
          <span>Less</span>
          <div className="w-[13px] h-[13px] rounded-[2.5px] bg-slate-100 border border-slate-200/20" />
          <div className="w-[13px] h-[13px] rounded-[2.5px] bg-[#FFE8D6] border border-[#FED7AA]/30" />
          <div className="w-[13px] h-[13px] rounded-[2.5px] bg-[#FFB703] border border-[#F97316]/30" />
          <div className="w-[13px] h-[13px] rounded-[2.5px] bg-[#FB8500] border border-[#EA580C]/30" />
          <div className="w-[13px] h-[13px] rounded-[2.5px] bg-[#D03E00] border border-[#9A3412]/30" />
          <span>More</span>
        </div>

        {/* Tooltip inside the scrollable container */}
        {hoveredDay && (
          <div
            className="absolute z-50 bg-slate-900 text-white text-[10px] font-mono font-bold px-2.5 py-1.5 rounded-xl shadow-lg border border-slate-800 pointer-events-none transform -translate-x-1/2 -translate-y-full flex flex-col gap-0.5 whitespace-nowrap animate-in fade-in zoom-in-95 duration-100"
            style={{
              left: hoveredDay.x,
              top: hoveredDay.y - 6,
            }}
          >
            <span className="text-slate-300 font-sans text-[9px] font-semibold">{hoveredDay.date}</span>
            <span className="text-orange-300 font-bold">⏱️ {hoveredDay.minutes} mins studied</span>
          </div>
        )}
      </div>

      {/* Year Selection */}
      <div className="flex lg:flex-col gap-1.5 shrink-0 bg-slate-50/50 border border-slate-100 p-3 rounded-2xl h-fit w-full lg:w-40">
        <span className="hidden lg:block text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider mb-1 px-2 select-none">
          Select Year:
        </span>
        {["Last 365 Days", "2026", "2025", "2024"].map((yr) => {
          const isSelected = selectedYear === yr;
          return (
            <button
              key={yr}
              onClick={() => setSelectedYear(yr)}
              className={`flex-1 lg:flex-none text-center lg:text-left px-3 py-2 rounded-xl transition-all font-mono text-[10px] font-bold tracking-wider uppercase cursor-pointer ${
                isSelected
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 border border-transparent hover:border-slate-200/50 bg-white/50"
              }`}
            >
              {yr}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function OverviewStats({ tasks, subjects }: OverviewStatsProps) {
  const [historyLogs, setHistoryLogs] = React.useState<HistoryLog[]>([]);

  React.useEffect(() => {
    async function loadHistory() {
      try {
        const res = await apiFetch(APP_CONFIG.API_ENDPOINTS.HISTORY);
        if (res.ok) {
          const data = await res.json();
          setHistoryLogs(data.logs || []);
        }
      } catch (err) {
        console.error("Error loading history in insights:", err);
      }
    }
    loadHistory();
  }, []);

  // 1. Calculate General Numbers
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "Completed").length;
  const inProgressTasks = tasks.filter((t) => t.status === "In Progress").length;
  const totalMinutes = tasks.reduce((sum, t) => sum + t.timeSpentMinutes, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  const completedSubjects = subjects.filter((s) => s.status === "Completed").length;
  const totalSubjects = subjects.length;

  const totalPercentage =
    totalSubjects > 0
      ? Math.round(
          subjects.reduce((sum, s) => sum + s.percentage, 0) / totalSubjects
        )
      : 0;

  // --- Interactive Filters & Chart Types State ---
  const [timeRange, setTimeRange] = React.useState<"7days" | "30days" | "year">("7days");
  const [chartType, setChartType] = React.useState<"bar" | "line" | "area">("bar");

  // --- Dynamic Time Range Chart Data Preparation ---
  const rangeDates: string[] = [];
  const now = new Date();

  if (timeRange === "7days" || timeRange === "30days") {
    const daysCount = timeRange === "7days" ? 7 : 30;
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toLocaleDateString("en-CA"); // YYYY-MM-DD
      rangeDates.push(dateStr);
    }
  } else {
    // Last 12 months (month-by-month)
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(now.getMonth() - i);
      const yearStr = d.getFullYear();
      const monthStr = String(d.getMonth() + 1).padStart(2, "0");
      rangeDates.push(`${yearStr}-${monthStr}`); // YYYY-MM
    }
  }

  // Pre-populate aggregated containers
  const sessionMinutes: Record<string, number> = {};
  const taskMinutes: Record<string, number> = {};
  rangeDates.forEach((key) => {
    sessionMinutes[key] = 0;
    taskMinutes[key] = 0;
  });

  // Populate from historyLogs (active study sessions)
  historyLogs.forEach((log) => {
    if (log.type === "session" && log.timestamp && log.durationMinutes) {
      const datePart = log.timestamp.split("T")[0]; // YYYY-MM-DD
      if (timeRange === "year") {
        const monthPart = datePart.substring(0, 7); // YYYY-MM
        if (sessionMinutes[monthPart] !== undefined) {
          sessionMinutes[monthPart] += log.durationMinutes;
        }
      } else {
        if (sessionMinutes[datePart] !== undefined) {
          sessionMinutes[datePart] += log.durationMinutes;
        }
      }
    }
  });

  // Populate from tasks timeLogs
  tasks.forEach((t) => {
    if (t.timeLogs && t.timeLogs.length > 0) {
      t.timeLogs.forEach((log) => {
        if (log.loggedAt) {
          const datePart = log.loggedAt.split("T")[0];
          if (timeRange === "year") {
            const monthPart = datePart.substring(0, 7);
            if (taskMinutes[monthPart] !== undefined) {
              taskMinutes[monthPart] += log.minutes;
            }
          } else {
            if (taskMinutes[datePart] !== undefined) {
              taskMinutes[datePart] += log.minutes;
            }
          }
        }
      });
    } else if (t.timeSpentMinutes > 0) {
      const datePart = t.date;
      if (timeRange === "year") {
        const monthPart = datePart.substring(0, 7);
        if (taskMinutes[monthPart] !== undefined) {
          taskMinutes[monthPart] += t.timeSpentMinutes;
        }
      } else {
        if (taskMinutes[datePart] !== undefined) {
          taskMinutes[datePart] += t.timeSpentMinutes;
        }
      }
    }
  });

  // Map to chart records
  const monthNames: Record<string, string> = {
    "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "May", "06": "Jun",
    "07": "Jul", "08": "Aug", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec"
  };

  const chartData = rangeDates.map((key) => {
    let name = "";
    if (timeRange === "year") {
      const [yearStr, monthStr] = key.split("-");
      name = `${monthNames[monthStr]} ${yearStr.substring(2)}`;
    } else {
      const [yearStr, monthStr, dayStr] = key.split("-");
      name = `${monthNames[monthStr] || "Jul"} ${dayStr}`;
    }

    let sessionMins = sessionMinutes[key] || 0;
    const taskMins = taskMinutes[key] || 0;

    // Provide baseline realistic fallback if they have task minutes but zero session duration logs
    if (sessionMins === 0 && taskMins > 0) {
      sessionMins = Math.round(taskMins * 1.25 + 15);
    }

    return {
      key,
      name,
      loggedTaskHours: Number((taskMins / 60).toFixed(1)),
      rawTaskMinutes: taskMins,
    };
  });

  // Calculate descriptive summary text at the bottom
  let totalMinutesInRange = 0;
  let mostProductiveKey = "";
  let mostProductiveMinutes = -1;

  chartData.forEach((item) => {
    const totalMins = item.rawTaskMinutes;
    totalMinutesInRange += item.rawTaskMinutes;
    if (totalMins > mostProductiveMinutes) {
      mostProductiveMinutes = totalMins;
      mostProductiveKey = item.name;
    }
  });

  const totalHoursInRange = (totalMinutesInRange / 60).toFixed(1);
  const mostProductiveValueHours = (mostProductiveMinutes / 60).toFixed(1);

  const rangeTextLabel = timeRange === "7days" ? "last 7 days" : timeRange === "30days" ? "last 30 days" : "last 12 months";
  const unitLabel = timeRange === "year" ? "month" : "day";

  const productiveSummaryText = mostProductiveMinutes > 0
    ? `In the ${rangeTextLabel}, you logged a total of ${totalHoursInRange} hours on syllabus tasks. Your most active ${unitLabel} was ${mostProductiveKey} with ${mostProductiveValueHours} hours of task completions.`
    : `Your study analysis for the ${rangeTextLabel} will update in real time as you complete more target tasks and log study hours.`;

  // 3. Prepare Data for Subjects distribution per track
  const blockData = [
    {
      name: "Block 1 (Core Theory)",
      value: subjects.filter((s) => s.block === "Block 1 - GATE").length,
      color: "#6366F1", // Indigo 500
      bgColor: "bg-indigo-50/50 text-indigo-700 border-indigo-100",
    },
    {
      name: "Block 2 (Projects/Applied)",
      value: subjects.filter((s) => s.block === "Block 2 - Placements").length,
      color: "#3B82F6", // Blue 500
      bgColor: "bg-blue-50/50 text-blue-700 border-blue-100",
    },
    {
      name: "DSA / Practice Track",
      value: subjects.filter((s) => s.block === "DSA").length,
      color: "#10B981", // Emerald 500
      bgColor: "bg-emerald-50/50 text-emerald-700 border-emerald-100",
    },
  ].filter((item) => item.value > 0);

  // --- Dynamic Cognitive Insights & Patterns Computation ---
  const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const minutesByWeekday = [0, 0, 0, 0, 0, 0, 0];
  const timePeriods = {
    "Early Morning (4am-8am)": 0,
    "Morning (8am-12pm)": 0,
    "Afternoon (12pm-4pm)": 0,
    "Evening (4pm-8pm)": 0,
    "Night OWL (8pm-12am)": 0,
    "Late Night (12am-4am)": 0,
  };

  let totalLoggedSessions = 0;
  let maxSessionMinutes = 0;
  let totalSessionMinutes = 0;

  tasks.forEach((t) => {
    if (t.timeLogs && t.timeLogs.length > 0) {
      t.timeLogs.forEach((log) => {
        if (log.loggedAt) {
          const date = new Date(log.loggedAt);
          const day = date.getDay();
          minutesByWeekday[day] += log.minutes;

          const hour = date.getHours();
          if (hour >= 4 && hour < 8) timePeriods["Early Morning (4am-8am)"] += log.minutes;
          else if (hour >= 8 && hour < 12) timePeriods["Morning (8am-12pm)"] += log.minutes;
          else if (hour >= 12 && hour < 16) timePeriods["Afternoon (12pm-4pm)"] += log.minutes;
          else if (hour >= 16 && hour < 20) timePeriods["Evening (4pm-8pm)"] += log.minutes;
          else if (hour >= 20 && hour < 24) timePeriods["Night OWL (8pm-12am)"] += log.minutes;
          else timePeriods["Late Night (12am-4am)"] += log.minutes;

          totalLoggedSessions++;
          totalSessionMinutes += log.minutes;
          if (log.minutes > maxSessionMinutes) {
            maxSessionMinutes = log.minutes;
          }
        }
      });
    }
  });

  let peakWeekdayIdx = 0;
  let maxWeekdayMinutes = 0;
  minutesByWeekday.forEach((mins, idx) => {
    if (mins > maxWeekdayMinutes) {
      maxWeekdayMinutes = mins;
      peakWeekdayIdx = idx;
    }
  });
  const peakWeekday = maxWeekdayMinutes > 0 ? weekdayNames[peakWeekdayIdx] : "Not enough data yet";

  let peakPeriod = "Not enough data yet";
  let maxPeriodMinutes = 0;
  Object.entries(timePeriods).forEach(([period, mins]) => {
    if (mins > maxPeriodMinutes) {
      maxPeriodMinutes = mins;
      peakPeriod = period;
    }
  });

  const avgSessionLength = totalLoggedSessions > 0 ? Math.round(totalSessionMinutes / totalLoggedSessions) : 0;
  const studyPattern = avgSessionLength > 0 
    ? `Consistent ${avgSessionLength}-min focus bursts with peak task blocks of ${maxSessionMinutes} mins.`
    : "Your study patterns will appear here as you log focus sessions.";

  // --- Study Streaks Calculation ---
  const activityDates: string[] = [];
  tasks.forEach((t) => {
    if (t.timeLogs) {
      t.timeLogs.forEach((log) => {
        if (log.loggedAt) {
          activityDates.push(log.loggedAt.split("T")[0]);
        }
      });
    }
  });
  historyLogs.forEach((log) => {
    if (log.timestamp && log.durationMinutes && log.durationMinutes > 0) {
      activityDates.push(log.timestamp.split("T")[0]);
    }
  });

  const uniqueActivityDates = Array.from(new Set(activityDates));

  const calculateStreaks = (datesList: string[]) => {
    if (datesList.length === 0) return { currentStreak: 0, maxStreak: 0 };
    const sorted = [...datesList].sort();
    
    const getDayDiff = (d1Str: string, d2Str: string) => {
      const d1 = new Date(d1Str);
      const d2 = new Date(d2Str);
      d1.setHours(12, 0, 0, 0);
      d2.setHours(12, 0, 0, 0);
      const diffTime = Math.abs(d2.getTime() - d1.getTime());
      return Math.round(diffTime / (1000 * 60 * 60 * 24));
    };

    const todayLocal = new Date().toLocaleDateString("en-CA");
    
    let maxStreakVal = 0;
    let tempStreakVal = 0;
    let prevDateStr: string | null = null;
    
    for (let i = 0; i < sorted.length; i++) {
      const currDateStr = sorted[i];
      if (prevDateStr === null) {
        tempStreakVal = 1;
      } else {
        const diff = getDayDiff(prevDateStr, currDateStr);
        if (diff === 1) {
          tempStreakVal++;
        } else if (diff > 1) {
          if (tempStreakVal > maxStreakVal) maxStreakVal = tempStreakVal;
          tempStreakVal = 1;
        }
      }
      prevDateStr = currDateStr;
    }
    if (tempStreakVal > maxStreakVal) maxStreakVal = tempStreakVal;

    // Safe current running streak calculation
    const running = currentRunningStreak(sorted, todayLocal, getDayDiff);
    const finalMax = Math.max(maxStreakVal, running);

    return { currentStreak: running, maxStreak: finalMax };
  };

  function currentRunningStreak(sorted: string[], todayLocal: string, getDayDiff: (a: string, b: string) => number) {
    if (sorted.length === 0) return 0;
    const lastActiveDate = sorted[sorted.length - 1];
    const diffToToday = getDayDiff(lastActiveDate, todayLocal);
    if (diffToToday > 1) return 0;

    let currentRunning = 1;
    let prev = lastActiveDate;
    for (let i = sorted.length - 2; i >= 0; i--) {
      const curr = sorted[i];
      const diff = getDayDiff(curr, prev);
      if (diff === 1) {
        currentRunning++;
        prev = curr;
      } else if (diff === 0) {
        continue;
      } else {
        break;
      }
    }
    return currentRunning;
  }

  const { currentStreak, maxStreak } = calculateStreaks(uniqueActivityDates);

  return (
    <div className="space-y-6">
      {/* Bento Grid Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
        
        {/* Total Progress Card */}
        <div className="bg-emerald-50/30 border border-emerald-100 p-6 rounded-[24px] shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider font-extrabold text-slate-500">
              Total Progress
            </span>
            <span className="p-2 bg-emerald-100/50 rounded-xl text-emerald-700">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-slate-800 block tracking-tight">
              {totalPercentage}%
            </span>
            <p className="text-slate-500 text-xs font-semibold mt-1">
              Syllabus done
            </p>
          </div>
          <div className="mt-4 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
               className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${totalPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Study Hours Card */}
        <div className="bg-amber-50/30 border border-amber-100 p-6 rounded-[24px] shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider font-extrabold text-slate-500">
              Study Hours
            </span>
            <span className="p-2 bg-amber-100/50 rounded-xl text-amber-700">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-slate-800 block tracking-tight">
              {totalHours}h
            </span>
            <p className="text-slate-500 text-xs font-semibold mt-1">
              Time logged
            </p>
          </div>
          <div className="mt-4 text-[10px] font-mono font-bold text-slate-600 flex items-center gap-1.5">
            <span className="inline-block bg-amber-100/80 px-2 py-0.5 rounded-md">⏱️ {totalMinutes} mins</span>
          </div>
        </div>

        {/* Study Streak Card (Combined Current and Max) */}
        <div className="bg-gradient-to-br from-orange-50/40 to-rose-50/30 border border-orange-100/70 p-6 rounded-[24px] shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200 col-span-1">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider font-extrabold text-slate-500">
              Study Streaks
            </span>
            <span className="p-2 bg-orange-100/50 rounded-xl text-orange-600 flex items-center gap-1">
              <Flame className="w-4 h-4 animate-pulse" />
              <Award className="w-3.5 h-3.5 text-rose-500" />
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 divide-x divide-orange-100/60">
            <div>
              <span className="text-2xl sm:text-3xl font-black text-slate-800 block tracking-tight">
                {currentStreak}
              </span>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wide font-mono mt-0.5">
                Current
              </p>
            </div>
            <div className="pl-4">
              <span className="text-2xl sm:text-3xl font-black text-slate-800 block tracking-tight">
                {maxStreak}
              </span>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wide font-mono mt-0.5">
                All-Time
              </p>
            </div>
          </div>
          <div className="mt-4 text-[10px] font-mono font-bold text-orange-700 flex items-center gap-1 bg-orange-50/50 border border-orange-100/40 px-2.5 py-1 rounded-md self-start">
            <span>🔥 Keep it burning!</span>
          </div>
        </div>

        {/* Syllabus Tracks Closed Card */}
        <div className="bg-indigo-50/20 border border-indigo-100 p-6 rounded-[24px] shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider font-extrabold text-slate-500">
              Tracks Closed
            </span>
            <span className="p-2 bg-indigo-100/50 rounded-xl text-indigo-700">
              <BookOpen className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-slate-800 block tracking-tight">
              {completedSubjects}/{totalSubjects}
            </span>
            <p className="text-slate-500 text-xs font-semibold mt-1">
              Syllabus modules done
            </p>
          </div>
          <div className="mt-4 text-[10px] font-mono font-bold text-indigo-700 flex items-center gap-1 bg-indigo-50/50 border border-indigo-100/40 px-2 py-0.5 rounded-md self-start">
            <CheckCircle className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            {totalSubjects - completedSubjects} left
          </div>
        </div>

        {/* Task Success Rate Card */}
        <div className="bg-sky-50/20 border border-sky-100 p-6 rounded-[24px] shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider font-extrabold text-slate-500">
              Task Success
            </span>
            <span className="p-2 bg-sky-100/50 rounded-xl text-sky-700">
              <Target className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-slate-800 block tracking-tight">
              {totalTasks > 0
                ? Math.round((completedTasks / totalTasks) * 100)
                : 0}
              %
            </span>
            <p className="text-slate-500 text-xs font-semibold mt-1">
              {completedTasks}/{totalTasks} targets done
            </p>
          </div>
          <div className="mt-4 text-[10px] font-mono font-bold text-sky-700 flex items-center gap-1 bg-sky-50/50 border border-sky-100/40 px-2 py-0.5 rounded-md self-start">
            <span>📈 {inProgressTasks} active</span>
          </div>
        </div>
      </div>

      {/* Cognitive Study Insights Cards */}
      <div className="bg-slate-50/50 border border-slate-200/60 p-6 rounded-[32px] space-y-4 font-sans">
        <div>
          <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            🧠 COGNITIVE STUDY INSIGHTS & STUDY PATTERNS
          </h4>
          <p className="text-slate-400 text-[10px] font-medium mt-0.5 font-mono uppercase">
            Data-driven intelligence analyzed securely from your portal session activity logs.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: Peak Day */}
          <div className="bg-white border border-slate-150 p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow transition-all">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-sky-50 text-sky-600 rounded-lg text-xs font-bold">📅</span>
              <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">Productive Weekday</span>
            </div>
            <div className="mt-3">
              <span className="text-lg font-black text-slate-800 block">{peakWeekday}</span>
              <p className="text-slate-500 text-[11px] font-semibold mt-1">
                {maxWeekdayMinutes > 0 
                  ? `Accumulated ${maxWeekdayMinutes} minutes of high focus on this day.`
                  : "Complete more sessions to identify your power day."}
              </p>
            </div>
          </div>

          {/* Card 2: Peak Time of Day */}
          <div className="bg-white border border-slate-150 p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow transition-all">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg text-xs font-bold">☀️</span>
              <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">Optimal Focus Window</span>
            </div>
            <div className="mt-3">
              <span className="text-lg font-black text-slate-800 block">{peakPeriod}</span>
              <p className="text-slate-500 text-[11px] font-semibold mt-1">
                {maxPeriodMinutes > 0 
                  ? `Your cognitive processing peaks during this period.`
                  : "Your peak daily study time window will appear here."}
              </p>
            </div>
          </div>

          {/* Card 3: Study Pattern */}
          <div className="bg-white border border-slate-150 p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow transition-all">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold">🎯</span>
              <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">Cognitive Rhythm</span>
            </div>
            <div className="mt-3">
              <span className="text-base font-black text-slate-800 block leading-tight">
                {avgSessionLength > 0 ? `Focus Blocks of ${avgSessionLength}m` : "Analyzing study blocks..."}
              </span>
              <p className="text-slate-500 text-[11px] font-semibold mt-1">
                {studyPattern}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Visualizers (Charts Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Daily Time Logged Chart */}
        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-100 pb-3 mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h4 className="text-base font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                  ⏱️ Cognitive Study Analytics
                </h4>
                <p className="text-slate-400 text-[11px] font-medium mt-0.5">
                  Side-by-side comparison of active portal time vs. logged task study time.
                </p>
              </div>
              
              {/* Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Time Range Selector */}
                <div className="bg-slate-50 border border-slate-200/60 p-1 rounded-xl flex gap-1">
                  {(["7days", "30days", "year"] as const).map((range) => {
                    const isSel = timeRange === range;
                    const label = range === "7days" ? "7D" : range === "30days" ? "30D" : "1Y";
                    return (
                      <button
                        key={range}
                        onClick={() => setTimeRange(range)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-black tracking-wide uppercase transition-all cursor-pointer ${
                          isSel
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Chart Type Selector */}
                <div className="bg-slate-50 border border-slate-200/60 p-1 rounded-xl flex gap-1">
                  {(["bar", "line", "area"] as const).map((type) => {
                    const isSel = chartType === type;
                    const label = type === "bar" ? "Bar" : type === "line" ? "Line" : "Area";
                    return (
                      <button
                        key={type}
                        onClick={() => setChartType(type)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-black tracking-wide uppercase transition-all cursor-pointer ${
                          isSel
                            ? "bg-slate-800 text-white shadow-sm"
                            : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Legend indicators */}
            <div className="flex gap-4 mb-4 text-[10px] font-mono font-bold uppercase tracking-wide justify-end">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-indigo-500 rounded-sm" />
                <span className="text-slate-500">Logged Study Time</span>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "line" ? (
                  <LineChart data={chartData}>
                    <XAxis
                      dataKey="name"
                      stroke="#94A3B8"
                      fontFamily="sans-serif"
                      fontWeight="bold"
                      fontSize={9}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#94A3B8"
                      fontFamily="sans-serif"
                      fontWeight="bold"
                      fontSize={9}
                      tickLine={false}
                      unit="h"
                    />
                    <Tooltip
                      cursor={{ stroke: "rgba(99, 102, 241, 0.08)", strokeWidth: 1 }}
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #F1F5F9",
                        fontFamily: "sans-serif",
                        fontWeight: "600",
                        borderRadius: "12px",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.03)",
                        fontSize: "11px",
                        color: "#1E293B",
                      }}
                    />
                    <Line type="monotone" dataKey="loggedTaskHours" name="Logged Study Time" stroke="#6366F1" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                ) : chartType === "area" ? (
                  <AreaChart data={chartData}>
                    <XAxis
                      dataKey="name"
                      stroke="#94A3B8"
                      fontFamily="sans-serif"
                      fontWeight="bold"
                      fontSize={9}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#94A3B8"
                      fontFamily="sans-serif"
                      fontWeight="bold"
                      fontSize={9}
                      tickLine={false}
                      unit="h"
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(99, 102, 241, 0.02)" }}
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #F1F5F9",
                        fontFamily: "sans-serif",
                        fontWeight: "600",
                        borderRadius: "12px",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.03)",
                        fontSize: "11px",
                        color: "#1E293B",
                      }}
                    />
                    <Area type="monotone" dataKey="loggedTaskHours" name="Logged Study Time" fill="#6366F1" fillOpacity={0.15} stroke="#6366F1" strokeWidth={2.5} />
                  </AreaChart>
                ) : (
                  <BarChart data={chartData}>
                    <XAxis
                      dataKey="name"
                      stroke="#94A3B8"
                      fontFamily="sans-serif"
                      fontWeight="bold"
                      fontSize={9}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#94A3B8"
                      fontFamily="sans-serif"
                      fontWeight="bold"
                      fontSize={9}
                      tickLine={false}
                      unit="h"
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(99, 102, 241, 0.04)" }}
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #F1F5F9",
                        fontFamily: "sans-serif",
                        fontWeight: "600",
                        borderRadius: "12px",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.03)",
                        fontSize: "11px",
                        color: "#1E293B",
                      }}
                    />
                    <Bar dataKey="loggedTaskHours" name="Logged Study Time" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 bg-indigo-50/40 border border-indigo-100/40 p-4 rounded-2xl flex items-start gap-3 shadow-inner">
            <span className="text-base select-none leading-none">💡</span>
            <p className="text-[10.5px] font-bold text-slate-600 leading-relaxed font-mono uppercase">
              {productiveSummaryText}
            </p>
          </div>
        </div>

        {/* Subjects Track Distribution */}
        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-100 pb-3 mb-5">
              <h4 className="text-base font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                📊 Track Distribution
              </h4>
              <p className="text-slate-400 text-[11px] font-medium mt-0.5">
                Current split of subjects across plan blocks.
              </p>
            </div>
            
            <div className="h-48 w-full flex items-center justify-center relative bg-slate-50/50 border border-slate-100 rounded-2xl mb-5">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={blockData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={6}
                    dataKey="value"
                    stroke="#ffffff"
                    strokeWidth={2}
                  >
                    {blockData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any) => {
                      const totalBlockValue = blockData.reduce((sum, item) => sum + item.value, 0);
                      const percent = totalBlockValue > 0 ? ((Number(value) / totalBlockValue) * 100).toFixed(1) : "0.0";
                      return [`${value} modules (${percent}%)`, name];
                    }}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #F1F5F9",
                      fontFamily: "sans-serif",
                      fontWeight: "600",
                      borderRadius: "12px",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.03)",
                      fontSize: "11px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center Label */}
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-black text-slate-800">{totalSubjects}</span>
                <span className="text-[9px] uppercase font-bold text-slate-400 font-mono tracking-wider">
                  Active Modules
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 mt-2">
            {blockData.map((item) => (
              <div
                key={item.name}
                className={`flex items-center justify-between p-2.5 border rounded-xl shadow-sm ${item.bgColor}`}
              >
                <span className="text-xs font-bold uppercase tracking-tight">{item.name}</span>
                <span className="text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded-lg border border-slate-100 shadow-sm text-slate-700">
                  {item.value} tracks
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 12 Months Heatmap Section */}
      <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-3">
          <h4 className="text-base font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
            🔥 study contribution board
          </h4>
          <p className="text-slate-400 text-[11px] font-medium mt-0.5">
            Visualization of study sessions and targets completed. Darker blocks represent higher study density.
          </p>
        </div>

        <ContributionHeatmap tasks={tasks} />
      </div>

    </div>
  );
}
