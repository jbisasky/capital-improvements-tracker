import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  type ThemePreference,
  type ResolvedTheme,
  getThemePreference,
  saveThemePreference,
  systemPrefersDark,
  applyResolvedTheme,
} from "@/services/theme";

interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps): ReactElement {
  const [preference, setPreferenceState] = useState<ThemePreference>(getThemePreference);
  // Only updated from the matchMedia "change" callback (an external system
  // event), never synchronously in an effect body.
  const [systemDark, setSystemDark] = useState<boolean>(systemPrefersDark);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (): void => { setSystemDark(media.matches); };
    media.addEventListener("change", handleChange);
    return () => { media.removeEventListener("change", handleChange); };
  }, []);

  const resolvedTheme = useMemo<ResolvedTheme>(
    () => (preference === "system" ? (systemDark ? "dark" : "light") : preference),
    [preference, systemDark],
  );

  // Sync the external DOM (`.dark` class) with the resolved theme — this is
  // not a setState call, so it doesn't trigger cascading renders.
  useEffect(() => {
    applyResolvedTheme(resolvedTheme);
  }, [resolvedTheme]);

  const setPreference = useCallback((next: ThemePreference): void => {
    saveThemePreference(next);
    setPreferenceState(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context == null) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
