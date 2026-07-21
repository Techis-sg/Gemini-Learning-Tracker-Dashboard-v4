import React from "react";
import { IconSparkles as Sparkles, IconSun as Sun, IconMoon as Moon } from "@tabler/icons-react";
import { useTheme } from "./ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer shrink-0"
      title="Toggle Theme Vibe"
    >
      {theme === "light" ? (
        <Moon className="w-4 h-4 text-slate-500" />
      ) : theme === "dark" ? (
        <Sun className="w-4 h-4 text-amber-500" />
      ) : (
        <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
      )}
    </button>
  );
}

export default ThemeToggle;
