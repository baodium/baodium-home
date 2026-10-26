"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  defaultReaderPrefs,
  loadReaderPrefs,
  saveReaderPrefs,
  type ReaderPrefs,
} from "@/lib/book/reader-styles";

export type PageFlipDirection = 1 | -1 | 0;

type ReaderContextValue = {
  prefs: ReaderPrefs;
  setPrefs: (patch: Partial<ReaderPrefs>) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  chromeVisible: boolean;
  setChromeVisible: (visible: boolean) => void;
  flipDirection: PageFlipDirection;
  setFlipDirection: (dir: PageFlipDirection) => void;
};

const ReaderContext = createContext<ReaderContextValue | null>(null);

export function ReaderProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefsState] = useState<ReaderPrefs>(() =>
    typeof window !== "undefined" ? loadReaderPrefs() : defaultReaderPrefs,
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [flipDirection, setFlipDirection] = useState<PageFlipDirection>(0);

  const setPrefs = useCallback((patch: Partial<ReaderPrefs>) => {
    setPrefsState((current) => {
      const next = { ...current, ...patch };
      saveReaderPrefs(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      prefs,
      setPrefs,
      sidebarOpen,
      setSidebarOpen,
      settingsOpen,
      setSettingsOpen,
      chromeVisible,
      setChromeVisible,
      flipDirection,
      setFlipDirection,
    }),
    [
      prefs,
      setPrefs,
      sidebarOpen,
      settingsOpen,
      chromeVisible,
      flipDirection,
    ],
  );

  return <ReaderContext.Provider value={value}>{children}</ReaderContext.Provider>;
}

export function useReader() {
  const ctx = useContext(ReaderContext);
  if (!ctx) throw new Error("useReader must be used within ReaderProvider");
  return ctx;
}
