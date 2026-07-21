import React from "react";
import { Breadcrumbs } from "@components/ui";
import { Dashboard } from "@/types";

interface PageLayoutProps {
  user: any;
  currentDashboard: Dashboard | undefined;
  children: React.ReactNode;
  breadcrumbs: { label: string; active?: boolean }[];
  showAddDash: boolean;
  newDashName: string;
  newDashDesc: string;
  newDashTarget: string;
  onChangeNewDashName: (v: string) => void;
  onChangeNewDashDesc: (v: string) => void;
  onChangeNewDashTarget: (v: string) => void;
  onCreateDashboard: (e: React.FormEvent) => void;
  onCloseNewDash: () => void;
}

export function PageLayout({
  user,
  currentDashboard,
  children,
  breadcrumbs,
  showAddDash,
  newDashName,
  newDashDesc,
  newDashTarget,
  onChangeNewDashName,
  onChangeNewDashDesc,
  onChangeNewDashTarget,
  onCreateDashboard,
  onCloseNewDash,
}: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F4F5F8] dark:bg-[#0f172a] cosmic:bg-[#021f18] text-slate-800 dark:text-slate-100 cosmic:text-emerald-200 font-sans py-4 px-2 sm:p-6 lg:p-8 flex flex-col items-center justify-center transition-colors">
      {/* Breadcrumb strip */}
      <Breadcrumbs items={breadcrumbs} />

      {/* Main Soft Window Frame Container */}
      <div className="w-full max-w-[1750px] bg-white dark:bg-[#1e293b] cosmic:bg-[#064e3b] border border-slate-100 dark:border-slate-800 cosmic:border-emerald-800 rounded-[24px] md:rounded-[32px] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col md:flex-row min-h-[85vh] transition-colors">
        {children}
      </div>
    </div>
  );
}

interface PageContentProps {
  user: any;
  currentDashboard: Dashboard | undefined;
  children: React.ReactNode;
  showAddDash: boolean;
  newDashName: string;
  newDashDesc: string;
  newDashTarget: string;
  onChangeNewDashName: (v: string) => void;
  onChangeNewDashDesc: (v: string) => void;
  onChangeNewDashTarget: (v: string) => void;
  onCreateDashboard: (e: React.FormEvent) => void;
  onCloseNewDash: () => void;
}

export function PageContent({
  user,
  currentDashboard,
  children,
  showAddDash,
  newDashName,
  newDashDesc,
  newDashTarget,
  onChangeNewDashName,
  onChangeNewDashDesc,
  onChangeNewDashTarget,
  onCreateDashboard,
  onCloseNewDash,
}: PageContentProps) {
  return (
    <main className="flex-1 bg-[#FAFAFC] dark:bg-[#0f172a] cosmic:bg-[#022c22] overflow-y-auto flex flex-col min-h-[85vh] transition-colors">
      <div className="p-5 md:p-8 flex flex-col gap-6 flex-1">
        {/* Top Greeting and Sub-Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full text-indigo-700 uppercase tracking-wider">
              Workspace Track Console
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight uppercase mt-1">
              Welcome back, {user?.name ? user.name.split(" ")[0] : "Scholar"}! 👋
            </h2>
          </div>

          {/* Date Highlight right in the dashboard header */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span id="header-today-date" className="px-3 py-1.5 bg-slate-50 border border-slate-200 font-bold text-xs rounded-xl shadow-sm text-slate-700">
              🗓️ {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} (Today)
            </span>
          </div>
        </div>

        {/* Create Empty Dashboard Form Overlay / Collapsible Panel */}
        {showAddDash && (
          <div className="bg-indigo-50/40 border border-indigo-100 p-5 rounded-3xl animate-in fade-in zoom-in-95 duration-150 shadow-sm">
            <h3 className="text-sm font-bold text-indigo-900 mb-3 uppercase tracking-wide flex items-center gap-1">
              <span>🆕 Create New Study Tracker Dashboard</span>
            </h3>
            <form onSubmit={onCreateDashboard} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-mono">Dashboard Name:</label>
                <input
                  type="text"
                  value={newDashName}
                  onChange={(e) => onChangeNewDashName(e.target.value)}
                  placeholder="e.g. UPSC CSE 2027 Schedule"
                  className="w-full p-2.5 border border-slate-200 bg-white hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-xs rounded-xl font-bold text-slate-800 shadow-sm focus:outline-none placeholder-slate-400"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-mono">Target Description:</label>
                <input
                  type="text"
                  value={newDashDesc}
                  onChange={(e) => onChangeNewDashDesc(e.target.value)}
                  placeholder="e.g. IAS Core modules"
                  className="w-full p-2.5 border border-slate-200 bg-white hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-xs rounded-xl font-bold text-slate-800 shadow-sm focus:outline-none placeholder-slate-400"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-mono">Rank/Marks Milestone:</label>
                <input
                  type="text"
                  value={newDashTarget}
                  onChange={(e) => onChangeNewDashTarget(e.target.value)}
                  placeholder="e.g. Target Rank < 50"
                  className="w-full p-2.5 border border-slate-200 bg-white hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-xs rounded-xl font-bold text-slate-800 shadow-sm focus:outline-none placeholder-slate-400"
                />
              </div>
              <div className="md:col-span-3 flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={onCloseNewDash}
                  className="px-4 py-1.5 border border-slate-200 font-bold text-xs bg-white rounded-xl hover:bg-slate-50 text-slate-600 transition-all shadow-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  Create Track
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Active Workspace / Tab Area */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </main>
  );
}
export default PageLayout;
