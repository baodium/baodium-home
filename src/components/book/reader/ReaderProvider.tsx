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

type ReaderContextValue = {
  prefs: ReaderPrefs;
  setPrefs: (patch: Partial<ReaderPrefs>) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
};

const ReaderContext = createContext<ReaderContextValue | null>(null);

export function ReaderProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefsState] = useState<ReaderPrefs>(() =>
    typeof window !== "undefined" ? loadReaderPrefs() : defaultReaderPrefs,
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const setPrefs = useCallback((patch: Partial<ReaderPrefs>) => {
    setPrefsState((current) => {
      const next = { ...current, ...patch };
      saveReaderPrefs(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ prefs, setPrefs, sidebarOpen, setSidebarOpen }),
    [prefs, setPrefs, sidebarOpen],
  );

  return <ReaderContext.Provider value={value}>{children}</ReaderContext.Provider>;
}

export function useReader() {
  const ctx = useContext(ReaderContext);
  if (!ctx) throw new Error("useReader must be used within ReaderProvider");
  return ctx;
}
