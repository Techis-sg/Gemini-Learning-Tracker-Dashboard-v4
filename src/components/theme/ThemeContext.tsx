import React, { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "@services/apiService";
import { APP_CONFIG } from "@config/app.config";
import { toast } from "@utils/index";

export type Theme = "light" | "dark" | "cosmic";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  initialTheme?: Theme;
  appSettings: any;
  onSettingsUpdate: (settings: any) => void;
}

export function ThemeProvider({
  children,
  initialTheme = "light",
  appSettings,
  onSettingsUpdate,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  // Keep in sync with appSettings from parent
  useEffect(() => {
    if (appSettings?.theme) {
      setThemeState(appSettings.theme as Theme);
    }
  }, [appSettings?.theme]);

  // Apply theme to document element
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark", "cosmic");
    root.classList.add(theme);
  }, [theme]);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    const updatedSettings = {
      ...(appSettings || {}),
      theme: newTheme,
    };

    try {
      const res = await apiFetch(APP_CONFIG.API_ENDPOINTS.SETTINGS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSettings),
      });
      if (res.ok) {
        onSettingsUpdate(updatedSettings);
      }
    } catch (err) {
      console.error("Error updating theme:", err);
    }
  };

  const toggleTheme = async () => {
    let nextTheme: Theme = "light";
    if (theme === "light") {
      nextTheme = "dark";
    } else if (theme === "dark") {
      nextTheme = "cosmic";
    } else {
      nextTheme = "light";
    }
    await setTheme(nextTheme);
    toast.success(`Theme switched to ${nextTheme === "cosmic" ? "Retro Terminal" : nextTheme}!`);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
