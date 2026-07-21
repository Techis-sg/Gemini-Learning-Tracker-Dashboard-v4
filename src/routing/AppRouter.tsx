import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { IconLoader2 as Loader2, IconAlertTriangle as AlertTriangle, IconClock as Clock } from '@tabler/icons-react';
import { Toaster } from "react-hot-toast";
import { toast, apiFetch, format24h } from "@utils/index";
import { AuthPage, OAuthCallback } from "@features/auth";
import { PortalApp } from "@features/dashboard/PortalApp";
import { APP_CONFIG } from "@config/app.config";
import { ROUTES } from "./route.config";
import { ThemeProvider } from "@components/theme/ThemeContext";

export function AppRouter() {
  const [user, setUser] = useState<any | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [appSettings, setAppSettings] = useState<any>(null);

  // Inactivity tracking states
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [showInactivityModal, setShowInactivityModal] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Intercept Google OAuth Callback route immediately to bypass session check / AuthPage redirect
  const isCallback = window.location.pathname === "/auth/callback" || window.location.pathname === "/auth/callback/";
  if (isCallback) {
    return (
      <>
        <OAuthCallback />
        <Toaster position="top-right" />
      </>
    );
  }

  // Load session from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.USER);
    const storedId = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.USER_ID);
    if (storedUser && storedId) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.USER);
        localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.USER_ID);
      }
    }
    setCheckingSession(false);

    const handleBlockedLogout = () => {
      localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.USER);
      localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.USER_ID);
      setUser(null);
      window.location.href = "/";
    };
    window.addEventListener("auth_blocked_logout", handleBlockedLogout);
    return () => {
      window.removeEventListener("auth_blocked_logout", handleBlockedLogout);
    };
  }, []);

  // Fetch settings on user state change
  useEffect(() => {
    if (!user) {
      setAppSettings(null);
      return;
    }

    async function loadSettings() {
      try {
        const res = await apiFetch(APP_CONFIG.API_ENDPOINTS.SETTINGS);
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            setAppSettings(data.settings);
          }
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
      }
    }
    loadSettings();

    // Set up portal session start timestamp and number if missing
    const activeSessionNum = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.ACTIVE_SESSION_NUMBER);
    if (!activeSessionNum) {
      localStorage.setItem(APP_CONFIG.STORAGE_KEYS.ACTIVE_SESSION_NUMBER, APP_CONFIG.DEFAULT_SESSION_NUMBER);
    } else {
      // Increment active session number upon a fresh log-in
      const prevNum = parseInt(activeSessionNum, 10);
      localStorage.setItem(APP_CONFIG.STORAGE_KEYS.ACTIVE_SESSION_NUMBER, String(prevNum + 1));
    }
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.SESSION_START, String(Date.now()));
  }, [user]);

  // Global inactivity monitors
  useEffect(() => {
    if (!user) return;

    const updateActivity = () => {
      setLastActivity(Date.now());
    };

    // Listen to user inputs
    window.addEventListener("mousemove", updateActivity);
    window.addEventListener("keydown", updateActivity);
    window.addEventListener("click", updateActivity);
    window.addEventListener("scroll", updateActivity);

    // Check inactivity status every 1 second
    timerIntervalRef.current = setInterval(() => {
      const inactiveMs = Date.now() - lastActivity;
      const inactiveSec = Math.floor(inactiveMs / 1000);

      // Inactivity warning thresholds from config
      if (inactiveSec >= APP_CONFIG.INACTIVITY_WARNING_SEC) {
        const remainingSec = Math.max(0, APP_CONFIG.SESSION_TIMEOUT_SEC - inactiveSec);
        setCountdown(remainingSec);
        setShowInactivityModal(true);

        // If inactive past threshold, trigger auto-logout
        if (inactiveSec >= APP_CONFIG.SESSION_TIMEOUT_SEC) {
          handleInactivityLogout();
        }
      } else {
        setShowInactivityModal(false);
      }
    }, 1000);

    return () => {
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("keydown", updateActivity);
      window.removeEventListener("click", updateActivity);
      window.removeEventListener("scroll", updateActivity);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [user, lastActivity]);

  const handleInactivityLogout = async () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setShowInactivityModal(false);

    // Save completed session record to history before logout
    if (user) {
      const sessionStartStr = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.SESSION_START);
      const activeSessionNum = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.ACTIVE_SESSION_NUMBER) || APP_CONFIG.DEFAULT_SESSION_NUMBER;
      if (sessionStartStr) {
        const startTime = parseInt(sessionStartStr, 10);
        const endTime = Date.now();
        const durationMs = endTime - startTime;
        const durationMinutes = Math.max(1, Math.round(durationMs / 60000));

        const loggedInTime = format24h(new Date(startTime));
        const loggedOutTime = format24h(new Date(endTime));

        await apiFetch(APP_CONFIG.API_ENDPOINTS.HISTORY, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "session",
            action: "login_session",
            sessionNumber: parseInt(activeSessionNum, 10),
            description: `Session ${activeSessionNum} logged`,
            timestamp: new Date(startTime).toISOString(),
            durationMinutes,
            loggedInTime,
            loggedOutTime,
          }),
        }).catch((err) => console.error("Error logging auto logout session:", err));
      }
    }

    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.USER);
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.USER_ID);
    setUser(null);
    toast.error("You have been logged out automatically due to 15 minutes of inactivity.");
    window.location.href = ROUTES.HOME;
  };

  const handleKeepSessionAlive = () => {
    setLastActivity(Date.now());
    setShowInactivityModal(false);
    toast.success("Active study session extended successfully!");
  };

  const handleManualLogout = async () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setShowInactivityModal(false);

    // Log the completed session to the database
    if (user) {
      const sessionStartStr = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.SESSION_START);
      const activeSessionNum = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.ACTIVE_SESSION_NUMBER) || APP_CONFIG.DEFAULT_SESSION_NUMBER;
      if (sessionStartStr) {
        const startTime = parseInt(sessionStartStr, 10);
        const endTime = Date.now();
        const durationMs = endTime - startTime;
        const durationMinutes = Math.max(1, Math.round(durationMs / 60000));

        const loggedInTime = format24h(new Date(startTime));
        const loggedOutTime = format24h(new Date(endTime));

        await apiFetch(APP_CONFIG.API_ENDPOINTS.HISTORY, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "session",
            action: "login_session",
            sessionNumber: parseInt(activeSessionNum, 10),
            description: `Session ${activeSessionNum} logged`,
            timestamp: new Date(startTime).toISOString(),
            durationMinutes,
            loggedInTime,
            loggedOutTime,
          }),
        }).catch((err) => console.error("Error logging completed session:", err));
      }
    }

    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.USER);
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.USER_ID);
    setUser(null);
    toast.success("Successfully logged out from your secure session.");
    window.location.href = ROUTES.HOME;
  };

  // Hex to RGB parser for transparent tailwind background overlays
  const hexToRgb = (hex: string): string => {
    if (!hex || !hex.startsWith("#")) return "99, 102, 241";
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? "99, 102, 241" : `${r}, ${g}, ${b}`;
  };

  // Computed visual properties
  const activeTheme = appSettings?.theme || "light";
  const activeFont = appSettings?.fontFamily || "Inter";
  const activeFontSize = appSettings?.fontSize || "16px";
  const activeAccent = appSettings?.accentColor || "#6366f1";
  const customCss = appSettings?.customCss || "";
  const accentRgb = hexToRgb(activeAccent);

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex flex-col items-center justify-center text-slate-400 font-mono text-xs">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
        LOADING SECURE STUDY SESSION...
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthPage onLoginSuccess={(u) => setUser(u)} />
        <Toaster position="top-right" />
      </>
    );
  }

  return (
    <BrowserRouter>
      <ThemeProvider
        appSettings={appSettings}
        onSettingsUpdate={(updatedSettings) => setAppSettings(updatedSettings)}
        initialTheme={appSettings?.theme || "light"}
      >
        {/* Dynamic style block injections based on user appearance preferences */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=JetBrains+Mono:wght@400;500;700&display=swap');
        
        body, button, input, textarea, select, span, p, h1, h2, h3, h4, h5, h6, th, td, a, .font-sans {
          font-family: "${activeFont === "Space Grotesk" ? "Space Grotesk" : activeFont === "Playfair Display" ? "Playfair Display" : activeFont === "JetBrains Mono" ? "JetBrains Mono" : "Inter"}", "Inter", sans-serif !important;
        }

        :root, html, body {
          font-size: ${activeFontSize} !important;
        }

        :root {
          --custom-accent: ${activeAccent};
          --custom-accent-hover: ${activeAccent}ee;
          --custom-accent-rgb: ${accentRgb};
        }

        /* Standardized accent color classes overrides */
        .bg-indigo-50 {
          background-color: rgba(${accentRgb}, 0.08) !important;
        }
        .bg-indigo-100 {
          background-color: rgba(${accentRgb}, 0.16) !important;
        }
        .bg-indigo-600 {
          background-color: ${activeAccent} !important;
        }
        .hover\\:bg-indigo-700:hover, .bg-indigo-600:hover {
          background-color: var(--custom-accent-hover) !important;
        }
        .text-indigo-600, .text-indigo-700 {
          color: ${activeAccent} !important;
        }
        .border-indigo-100 {
          border-color: rgba(${accentRgb}, 0.16) !important;
        }
        .border-indigo-600 {
          border-color: ${activeAccent} !important;
        }
        .focus\\:border-indigo-500:focus {
          border-color: ${activeAccent} !important;
        }
        .focus\\:ring-indigo-500\\/10:focus {
          --tw-ring-color: rgba(${accentRgb}, 0.12) !important;
        }
        .fill-indigo-100\\/40 {
          fill: rgba(${accentRgb}, 0.1) !important;
        }

        /* Theme adjustments: Cosmic Navy Theme */
        ${
          activeTheme === "dark"
            ? `
          body, html, .min-h-screen {
            background-color: #080c14 !important;
            color: #f1f5f9 !important;
          }
          .min-h-screen.bg-\\[\\#F4F5F8\\], .bg-\\[\\#F4F5F8\\], .bg-\\[\\#fafaf9\\], .bg-[#fafaf9] {
            background-color: #080c14 !important;
          }
          .to-white, .to-slate-50 {
            --tw-gradient-to: #1e293b !important;
            --tw-gradient-end: #1e293b !important;
          }
          aside.bg-\\[\\#FCFDFE\\], aside.bg-[#FCFDFE], .bg-\\[\\#FCFDFE\\] {
            background-color: #0f172a !important;
            border-color: #1e293b !important;
          }
          main.bg-\\[\\#FAFAFC\\], main.bg-[#FAFAFC], .bg-\\[\\#FAFAFC\\] {
            background-color: #0b0f19 !important;
          }
          .bg-white, .soft-card {
            background-color: #1e293b !important;
            color: #f8fafc !important;
            border-color: #2d3748 !important;
          }
          .text-slate-800, .text-slate-700, .text-slate-900, .text-slate-950,
          .text-gray-800, .text-gray-700, .text-gray-900, .text-gray-950,
          .text-zinc-800, .text-zinc-700, .text-zinc-900, .text-zinc-950,
          .text-neutral-800, .text-neutral-700, .text-neutral-900, .text-neutral-950,
          .text-black {
            color: #f1f5f9 !important;
          }
          .text-slate-500, .text-slate-600, .text-slate-400,
          .text-gray-500, .text-gray-600, .text-gray-400,
          .text-zinc-500, .text-zinc-600, .text-zinc-400,
          .text-neutral-500, .text-neutral-600, .text-neutral-400 {
            color: #94a3b8 !important;
          }
          .border-slate-100, .border-slate-50, .border-slate-200, .border-slate-300,
          .border-gray-100, .border-gray-50, .border-gray-200, .border-gray-300,
          .border-zinc-100, .border-zinc-50, .border-zinc-200, .border-zinc-300,
          .border-neutral-100, .border-neutral-50, .border-neutral-200, .border-neutral-300 {
            border-color: #2d3748 !important;
          }
          .bg-slate-50, .bg-slate-50\\/40, .bg-slate-50\\/20, .bg-slate-100, .bg-slate-50\\/55, .bg-slate-50\\/50, .bg-slate-100\\/80,
          .bg-gray-50, .bg-gray-50\\/40, .bg-gray-50\\/20, .bg-gray-100, .bg-gray-50\\/55, .bg-gray-50\\/50, .bg-gray-100\\/80,
          .bg-zinc-50, .bg-zinc-50\\/40, .bg-zinc-50\\/20, .bg-zinc-100, .bg-zinc-50\\/55, .bg-zinc-50\\/50, .bg-zinc-100\\/80,
          .bg-neutral-50, .bg-neutral-50\\/40, .bg-neutral-50\\/20, .bg-neutral-100, .bg-neutral-50\\/55, .bg-neutral-50\\/50, .bg-neutral-100\\/80 {
            background-color: #0f172a !important;
          }
          input, textarea, select, .bg-white input, .bg-white textarea, .bg-white select {
            background-color: #0f172a !important;
            color: #ffffff !important;
            border-color: #2d3748 !important;
          }
          input:focus, textarea:focus, select:focus {
            border-color: ${activeAccent} !important;
            background-color: #0f172a !important;
          }
          input::placeholder, textarea::placeholder {
            color: #64748b !important;
          }
          .divide-slate-100 > :not([hidden]) ~ :not([hidden]) {
            border-color: #2d3748 !important;
          }
          .bg-indigo-50\\/40 {
            background-color: rgba(${accentRgb}, 0.08) !important;
          }
          .hover\\:bg-slate-50:hover, .hover\\:bg-slate-100:hover, .hover\\:bg-slate-50\\/30:hover {
            background-color: rgba(255, 255, 255, 0.04) !important;
          }
          .hover\\:border-indigo-100:hover, .hover\\:border-slate-300:hover {
            border-color: rgba(${accentRgb}, 0.3) !important;
          }
          
          /* Navigation and Tab active colors fixes in Dark Mode */
          .bg-emerald-50 { background-color: rgba(16, 185, 129, 0.15) !important; }
          .text-emerald-700 { color: #34d399 !important; }
          
          .bg-sky-50 { background-color: rgba(14, 165, 233, 0.15) !important; }
          .text-sky-700 { color: #38bdf8 !important; }
          
          .bg-purple-50 { background-color: rgba(168, 85, 247, 0.15) !important; }
          .text-purple-700 { color: #c084fc !important; }
          
          .bg-amber-50 { background-color: rgba(245, 158, 11, 0.15) !important; }
          .text-amber-800, .text-amber-700 { color: #fbbf24 !important; }
          
          .bg-indigo-50 { background-color: rgba(${accentRgb}, 0.15) !important; }
          .text-indigo-700 { color: ${activeAccent} !important; }
          
          .bg-pink-50 { background-color: rgba(236, 72, 153, 0.15) !important; }
          .text-pink-700 { color: #f472b6 !important; }
          
          .bg-blue-50 { background-color: rgba(59, 130, 246, 0.15) !important; }
          .text-blue-700 { color: #60a5fa !important; }
          
          .bg-teal-50 { background-color: rgba(20, 184, 166, 0.15) !important; }
          .text-teal-700 { color: #2dd4bf !important; }
          
          .bg-rose-50 { background-color: rgba(239, 68, 68, 0.15) !important; }
          .text-rose-700 { color: #f87171 !important; }
          `
            : ""
        }

        /* Theme adjustments: Retro Terminal Mode */
        ${
          activeTheme === "cosmic"
            ? `
          body {
            background-color: #000000 !important;
            color: #22c55e !important;
            font-family: "JetBrains Mono", monospace !important;
          }
          .min-h-screen.bg-\\[\\#F4F5F8\\], .bg-\\[\\#fafaf9\\], .bg-[#fafaf9] {
            background-color: #000000 !important;
          }
          .to-white, .to-slate-50 {
            --tw-gradient-to: #0a0a0a !important;
            --tw-gradient-end: #0a0a0a !important;
          }
          aside.bg-\\[\\#FCFDFE\\], aside.bg-[#FCFDFE] {
            background-color: #050505 !important;
            border-color: #22c55e44 !important;
          }
          main.bg-\\[\\#FAFAFC\\], main.bg-[#FAFAFC] {
            background-color: #000000 !important;
          }
          .bg-white, .soft-card {
            background-color: #0a0a0a !important;
            color: #22c55e !important;
            border-color: #22c55e33 !important;
            box-shadow: none !important;
          }
          .text-slate-800, .text-slate-700, .text-slate-900, .text-slate-950, .text-slate-600, .text-slate-500, .text-slate-400,
          .text-gray-800, .text-gray-700, .text-gray-900, .text-gray-950, .text-gray-600, .text-gray-500, .text-gray-400,
          .text-zinc-800, .text-zinc-700, .text-zinc-900, .text-zinc-950, .text-zinc-600, .text-zinc-500, .text-zinc-400,
          .text-neutral-800, .text-neutral-700, .text-neutral-900, .text-neutral-950, .text-neutral-600, .text-neutral-500, .text-neutral-400,
          .text-black {
            color: #22c55e !important;
          }
          .border-slate-100, .border-slate-50, .border-slate-200, .border-slate-300,
          .border-gray-100, .border-gray-50, .border-gray-200, .border-gray-300,
          .border-zinc-100, .border-zinc-50, .border-zinc-200, .border-zinc-300,
          .border-neutral-100, .border-neutral-50, .border-neutral-200, .border-neutral-300 {
            border-color: #22c55e22 !important;
          }
          .bg-slate-50, .bg-slate-50\\/40, .bg-slate-50\\/20, .bg-slate-100, .bg-slate-50\\/55,
          .bg-gray-50, .bg-gray-50\\/40, .bg-gray-50\\/20, .bg-gray-100, .bg-gray-50\\/55,
          .bg-zinc-50, .bg-zinc-50\\/40, .bg-zinc-50\\/20, .bg-zinc-100, .bg-zinc-50\\/55,
          .bg-neutral-50, .bg-neutral-50\\/40, .bg-neutral-50\\/20, .bg-neutral-100, .bg-neutral-50\\/55 {
            background-color: #000000 !important;
            border-color: #22c55e22 !important;
          }
          input, textarea, select {
            background-color: #000000 !important;
            color: #22c55e !important;
            border-color: #22c55e88 !important;
            font-family: monospace !important;
          }
          .divide-slate-100 > :not([hidden]) ~ :not([hidden]) {
            border-color: #22c55e22 !important;
          }
          :root {
            --custom-accent: #22c55e !important;
            --custom-accent-hover: #166534 !important;
          }
          .bg-indigo-600 {
            background-color: #22c55e !important;
            color: #000000 !important;
          }
          .bg-indigo-50, .bg-indigo-100, .bg-indigo-50\\/40 {
            background-color: rgba(34, 197, 94, 0.1) !important;
          }
          .text-indigo-600, .text-indigo-700 {
            color: #22c55e !important;
          }
          
          /* Navigation and active states in Cosmic Theme */
          .bg-emerald-50, .bg-sky-50, .bg-purple-50, .bg-amber-50, .bg-indigo-50, .bg-pink-50, .bg-blue-50, .bg-teal-50, .bg-rose-50 {
            background-color: rgba(34, 197, 94, 0.15) !important;
            border-color: rgba(34, 197, 94, 0.3) !important;
          }
          .text-emerald-700, .text-sky-700, .text-purple-700, .text-amber-700, .text-indigo-700, .text-pink-700, .text-blue-700, .text-teal-700, .text-rose-700 {
            color: #22c55e !important;
          }
          `
            : ""
        }

        /* User-injected Custom CSS rules */
        ${customCss}
      `}</style>

      <Routes>
        <Route path={ROUTES.HOME} element={<Navigate to={ROUTES.DEFAULT} replace />} />
        <Route
          path={ROUTES.DASH_TAB}
          element={
            <PortalApp
              user={user}
              onLogout={handleManualLogout}
              onUserUpdate={(updatedUser) => {
                setUser(updatedUser);
                localStorage.setItem(APP_CONFIG.STORAGE_KEYS.USER, JSON.stringify(updatedUser));
              }}
              appSettings={appSettings}
              onSettingsUpdate={(updatedSettings) => {
                setAppSettings(updatedSettings);
              }}
            />
          }
        />
        <Route path="*" element={<Navigate to={ROUTES.DEFAULT} replace />} />
      </Routes>

      <Toaster position="top-right" />

      {/* Inactivity Warning Modal Overlay */}
      {showInactivityModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-16 h-16 bg-amber-50 border border-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto shadow-inner animate-bounce">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-extrabold text-slate-800 uppercase tracking-wide">
                Security Session Timeout
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed font-mono">
                You have been inactive for over 14 minutes. To protect your private progress tracker data, you will be automatically logged out soon.
              </p>
            </div>

            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center justify-center gap-2 text-rose-700">
              <Clock className="w-4 h-4 animate-spin text-rose-500" />
              <span className="text-sm font-black font-mono">
                Auto logging out in {countdown} seconds...
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleKeepSessionAlive}
                className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
              >
                Don't logout me
              </button>
              <button
                onClick={handleInactivityLogout}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Ok
              </button>
            </div>
          </div>
        </div>
      )}
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default AppRouter;
