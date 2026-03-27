import { createContext, useContext, useEffect, useState } from "react";

export type DashboardTheme =
  | "blue-steel"
  | "ocean-dark"
  | "forest-green"
  | "sunset-orange"
  | "purple-haze";

export type ViewMode = "compact" | "comfortable" | "wide";

type ThemeContextValue = {
  currentTheme: DashboardTheme;
  setTheme: (theme: DashboardTheme) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<DashboardTheme>(() => {
    const stored = localStorage.getItem("dashboard_theme");
    return (stored as DashboardTheme) ?? "blue-steel";
  });

  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    const stored = localStorage.getItem("dashboard_view_mode");
    return (stored as ViewMode) ?? "comfortable";
  });

  const setTheme = (theme: DashboardTheme) => {
    localStorage.setItem("dashboard_theme", theme);
    setCurrentTheme(theme);
  };

  const setViewMode = (mode: ViewMode) => {
    localStorage.setItem("dashboard_view_mode", mode);
    setViewModeState(mode);
  };

  // Keep body data-theme in sync for non-dashboard pages
  useEffect(() => {
    const el = document.getElementById("app-root");
    if (el) {
      if (currentTheme === "blue-steel") {
        el.removeAttribute("data-theme");
      } else {
        el.setAttribute("data-theme", currentTheme);
      }
    }
  }, [currentTheme]);

  return (
    <ThemeContext.Provider
      value={{ currentTheme, setTheme, viewMode, setViewMode }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
