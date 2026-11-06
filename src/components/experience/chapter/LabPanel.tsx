"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import guide from "../../../../content/experience/ch01/lab-guide.json";
import { GoDeeperCard } from "@/components/experience/chapter/GoDeeperCard";

const SESSION_KEY = "baodium:lab:ch01:session";
const PROGRESS_KEY = "baodium:lab:ch01";
const START_LIMIT_MS = 4 * 60 * 1000;
const WARN_SECONDS = 5 * 60;

type Phase = "boot" | "idle" | "busy" | "starting" | "ready" | "error";

type Session = {
  id: string;
  url: string;
  expires_at: number;
  startedAt: number;
};

type Progress = {
  completed: number[];
  lastTask: number | null;
  manual: boolean;
};

type LabBody = {
  id?: string;
  url?: string;
  status?: string;
  expires_at?: number;
  reused?: boolean;
  detail?: string;
  error?: string;
};

const listeners = new Set<() => void>();

function emitStore() {
  listeners.forEach((listener) => listener());
}

function subscribeStore(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function serverSnapshot() {
  return null;
}

function readStored(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function useStoredString(key: string) {
  const getSnapshot = useCallback(() => readStored(key), [key]);
  return useSyncExternalStore(subscribeStore, getSnapshot, serverSnapshot);
}

function readJson<T>(key: string): T | null {
  const raw = readStored(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown | null) {
  try {
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
    emitStore();
  } catch {
    /* private browsing */
  }
}

const emptyProgress = (): Progress => ({ completed: [], lastTask: null, manual: false });

function parseProgress(raw: string | null): Progress {
  if (!raw) return emptyProgress();
  try {
    const stored = JSON.parse(raw) as Partial<Progress>;
    const completed = Array.isArray(stored.completed)
      ? stored.completed.filter((id) => guide.tasks.some((task) => task.id === id))
      : [];
    return {
      completed,
      lastTask: typeof stored.lastTask === "number" ? stored.lastTask : null,
      manual: stored.manual === true,
    };
  } catch {
    return emptyProgress();
  }
}

function saveProgress(next: Progress) {
  writeJson(PROGRESS_KEY, next);
}

export function useChapter1LabDone(enabled: boolean) {
  const raw = useStoredString(PROGRESS_KEY);
  if (!enabled) return false;
  const progress = parseProgress(raw);
  return progress.manual || progress.completed.length >= guide.tasks.length;
}

function runnerBase(url: string) {
  return url.replace(/\/$/, "");
}

function embedSrc(url: string) {
  const join = url.includes("?") ? "&" : "?";
  return `${url}${join}embed=1`;
}

function formatLeft(seconds: number) {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

async function readBody(response: Response): Promise<LabBody> {
  try {
    return (await response.json()) as LabBody;
  } catch {
    return {};
  }
}

function sessionFrom(body: LabBody, startedAt: number): Session | null {
  if (!body.id || !body.url || body.expires_at == null) return null;
  return { id: body.id, url: body.url, expires_at: body.expires_at, startedAt };
}

export function LabPanel({
  runnerUrl,
  labUrl,
  killercodaUrl,
}: {
  runnerUrl: string;
  labUrl: string;
  killercodaUrl: string;
}) {
  const progress = parseProgress(useStoredString(PROGRESS_KEY));
  const [phase, setPhase] = useState<Phase>(runnerUrl ? "boot" : "idle");
  const [session, setSession] = useState<Session | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const startedRef = useRef(false);

  const remember = useCallback((next: Session) => {
    writeJson(SESSION_KEY, next);
    setSession(next);
    setSecondsLeft(Math.max(0, Math.round(next.expires_at - Date.now() / 1000)));
  }, []);

  useEffect(() => {
    if (!runnerUrl) return;
    let cancel = false;
    const base = runnerBase(runnerUrl);
    const boot = async () => {
      const stored = readJson<Session>(SESSION_KEY);
      const fresh = Boolean(stored && stored.expires_at * 1000 > Date.now() && stored.id && stored.url);
      if (fresh && stored) {
        try {
          const response = await fetch(`${base}/api/labs/${stored.id}`);
          const body = await readBody(response);
          if (cancel || startedRef.current) return;
          if (response.ok && (body.status === "starting" || body.status === "ready")) {
            const next = sessionFrom(body, stored.startedAt || Date.now());
            if (!next) {
              setError("The lab runner sent an unexpected reply.");
              setPhase("error");
              return;
            }
            remember(next);
            if (body.status === "ready") {
              setError("");
              setPhase("ready");
              return;
            }
            if (Date.now() - next.startedAt > START_LIMIT_MS) {
              setError("The lab is still starting after 4 minutes.");
              setPhase("error");
              return;
            }
            setPhase("starting");
            return;
          }
        } catch {
          if (cancel || startedRef.current) return;
          setError("The lab runner did not answer.");
          setPhase("error");
          return;
        }
        if (startedRef.current) return;
        writeJson(SESSION_KEY, null);
      } else if (stored) {
        writeJson(SESSION_KEY, null);
      }
      try {
        const response = await fetch(`${base}/api/health`);
        const body = (await response.json()) as { free?: number };
        if (cancel || startedRef.current) return;
        if (!response.ok) throw new Error("health");
        setPhase(body.free === 0 ? "busy" : "idle");
      } catch {
        if (cancel || startedRef.current) return;
        setError("The lab runner did not answer.");
        setPhase("error");
      }
    };
    void boot();
    return () => {
      cancel = true;
    };
  }, [remember, runnerUrl]);

  useEffect(() => {
    if (!runnerUrl || phase !== "starting" || !session) return;
    const current = session;
    const timer = window.setInterval(() => {
      void (async () => {
        if (Date.now() - current.startedAt > START_LIMIT_MS) {
          setError("The lab is still starting after 4 minutes.");
          setPhase("error");
          return;
        }
        try {
          const response = await fetch(`${runnerBase(runnerUrl)}/api/labs/${current.id}`);
          const body = await readBody(response);
          if (!response.ok) {
            setError(body.detail || "The lab could not be checked.");
            setPhase("error");
            return;
          }
          const next = sessionFrom(body, current.startedAt);
          if (!next) {
            setError("The lab runner sent an unexpected reply.");
            setPhase("error");
            return;
          }
          if (next.expires_at !== current.expires_at || next.url !== current.url) remember(next);
          if (body.status === "ready") {
            setError("");
            setPhase("ready");
            return;
          }
          if (body.status === "failed") {
            setError(body.error || "The lab did not start.");
            setPhase("error");
            return;
          }
          if (body.status !== "starting") {
            writeJson(SESSION_KEY, null);
            setSession(null);
            setPhase("idle");
          }
        } catch {
          setError("The lab runner did not answer.");
          setPhase("error");
        }
      })();
    }, 2000);
    return () => window.clearInterval(timer);
  }, [phase, remember, runnerUrl, session]);

  useEffect(() => {
    if (phase !== "ready" || !session) return;
    const expiresAt = session.expires_at;
    const timer = window.setInterval(() => {
      const left = Math.round(expiresAt - Date.now() / 1000);
      setSecondsLeft(left);
      if (left <= 0) {
        writeJson(SESSION_KEY, null);
        setSession(null);
        setNotice("Your lab session ended. Your task progress is saved.");
        setPhase("idle");
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, session]);

  useEffect(() => {
    const watched = session?.url || (!runnerUrl ? labUrl : "");
    if (!watched) return;
    let origin = "";
    try {
      origin = new URL(watched).origin;
    } catch {
      return;
    }
    const onMessage = (event: MessageEvent) => {
      const data = event.data as {
        source?: string;
        type?: string;
        task?: number | string;
        completed?: number[] | boolean;
        lastTask?: number | string;
      } | null;
      if (!data || data.source !== "baodium-lab" || event.origin !== origin) return;
      const current = parseProgress(readStored(PROGRESS_KEY));
      const completed = new Set(current.completed);
      if (Array.isArray(data.completed)) {
        for (const id of data.completed) completed.add(Number(id));
      }
      if (data.type === "task-complete" && data.task != null) completed.add(Number(data.task));
      const lastTask =
        data.lastTask != null ? Number(data.lastTask) : data.task != null ? Number(data.task) : current.lastTask;
      saveProgress({
        ...current,
        completed: [...completed].filter((id) => Number.isFinite(id)),
        lastTask,
      });
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [labUrl, runnerUrl, session?.url]);

  const startLab = async () => {
    startedRef.current = true;
    setError("");
    setNotice("");
    setPhase("starting");
    if (session) {
      try {
        await fetch(`${runnerBase(runnerUrl)}/api/labs/${session.id}`, { method: "DELETE" });
      } catch {
        /* a new start still replaces the saved session */
      }
      writeJson(SESSION_KEY, null);
      setSession(null);
    }
    const startedAt = Date.now();
    try {
      const response = await fetch(`${runnerBase(runnerUrl)}/api/labs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chapter: 1 }),
      });
      const body = await readBody(response);
      if (response.status === 409) {
        setPhase("busy");
        return;
      }
      if (response.status === 404) {
        setError(body.detail || "No lab is installed for this chapter.");
        setPhase("error");
        return;
      }
      if (!response.ok) {
        setError(body.detail || "The lab could not be started.");
        setPhase("error");
        return;
      }
      const next = sessionFrom({ ...body, status: body.status || "starting" }, startedAt);
      if (!next) {
        setError("The lab runner sent an unexpected reply.");
        setPhase("error");
        return;
      }
      remember(next);
      if (body.status === "ready") setPhase("ready");
      else if (body.status === "failed") {
        setError(body.error || "The lab did not start.");
        setPhase("error");
      } else setPhase("starting");
    } catch {
      setError("The lab runner did not answer.");
      setPhase("error");
    }
  };

  const extendLab = async () => {
    if (!session) return;
    try {
      const response = await fetch(`${runnerBase(runnerUrl)}/api/labs/${session.id}/extend`, { method: "POST" });
      const body = await readBody(response);
      const next = sessionFrom(body, session.startedAt);
      if (!response.ok || !next) {
        setError(body.detail || "The lab could not be extended.");
        return;
      }
      remember(next);
      setError("");
    } catch {
      setError("The lab runner did not answer.");
    }
  };

  const endLab = async () => {
    if (session && runnerUrl) {
      try {
        await fetch(`${runnerBase(runnerUrl)}/api/labs/${session.id}`, { method: "DELETE" });
      } catch {
        /* the local session still ends */
      }
    }
    writeJson(SESSION_KEY, null);
    setSession(null);
    setNotice("");
    setError("");
    setPhase("idle");
  };

  const retryHealth = async () => {
    setError("");
    setPhase("boot");
    try {
      const response = await fetch(`${runnerBase(runnerUrl)}/api/health`);
      const body = (await response.json()) as { free?: number };
      if (!response.ok) throw new Error("health");
      setPhase(body.free === 0 ? "busy" : "idle");
    } catch {
      setError("The lab runner did not answer.");
      setPhase("error");
    }
  };

  const gotoTask = (task: number) => {
    if (!session || phase !== "ready") return;
    iframeRef.current?.contentWindow?.postMessage({ type: "goto-task", task }, new URL(session.url).origin);
    saveProgress({ ...progress, lastTask: task });
  };

  if (!runnerUrl && labUrl) {
    return (
      <StaticLab
        url={labUrl}
        progress={progress}
        iframeRef={iframeRef}
        onToggle={(manual) => saveProgress({ ...progress, manual })}
        onTask={(task) => {
          iframeRef.current?.contentWindow?.postMessage({ type: "goto-task", task }, new URL(labUrl).origin);
          saveProgress({ ...progress, lastTask: task });
        }}
      />
    );
  }

  if (!runnerUrl) return <GoDeeperCard url={killercodaUrl} />;

  const tasks = (
    <TaskList
      progress={progress}
      onTask={gotoTask}
      onToggle={(manual) => saveProgress({ ...progress, manual })}
    />
  );

  return (
    <section className="text-[#241c18]" aria-label="Live lab">
      {notice ? <p className="mb-3 rounded-lg bg-[#f6f1ea] px-3 py-2 text-sm">{notice}</p> : null}
      {phase === "boot" ? <p className="text-sm text-[#6f625a]">Checking lab availability…</p> : null}
      {phase === "idle" ? (
        <div className="rounded-xl border border-[#e6ddd2] bg-[#fffdf9] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#b4532a]">Live lab</p>
          <h2 className="mt-2 text-xl">Start your own Baodium</h2>
          <p className="mt-2 text-sm text-[#6f625a]">{guide.blurb}</p>
          {tasks}
          <button
            type="button"
            className="mt-4 rounded-lg bg-[#b4532a] px-3.5 py-2 text-sm font-semibold text-white"
            onClick={() => void startLab()}
          >
            Start lab
          </button>
        </div>
      ) : null}
      {phase === "busy" ? (
        <div className="rounded-xl border border-[#e6ddd2] bg-[#fffdf9] p-5">
          <h2 className="text-xl">All lab machines are busy right now</h2>
          <p className="mt-2 text-sm text-[#6f625a]">Try again in a few minutes, or use the other lab.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg bg-[#b4532a] px-3.5 py-2 text-sm font-semibold text-white"
              onClick={() => void retryHealth()}
            >
              Retry
            </button>
            <KillercodaLink url={killercodaUrl} />
          </div>
          {tasks}
        </div>
      ) : null}
      {phase === "starting" ? (
        <div className="rounded-xl border border-[#e6ddd2] bg-[#fffdf9] p-5">
          <h2 className="text-xl">Starting your lab</h2>
          <p className="mt-2 text-sm leading-relaxed">
            Starting your private Baodium (about 1-2 minutes): PostgreSQL, the store, Recommendation Service, shoppers…
          </p>
          {tasks}
        </div>
      ) : null}
      {phase === "error" ? (
        <div className="rounded-xl border border-[#e6ddd2] bg-[#fffdf9] p-5">
          <h2 className="text-xl">The lab did not start</h2>
          <p className="mt-2 text-sm text-[#6f625a]">{error || "Something went wrong starting the lab."}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg bg-[#b4532a] px-3.5 py-2 text-sm font-semibold text-white"
              onClick={() => void startLab()}
            >
              Retry
            </button>
            <KillercodaLink url={killercodaUrl} />
          </div>
          {tasks}
        </div>
      ) : null}
      {phase === "ready" && session ? (
        <div>
          {secondsLeft != null && secondsLeft <= WARN_SECONDS && secondsLeft > 0 ? (
            <p className="mb-2 flex flex-wrap items-center gap-3 rounded-lg bg-[#f6f1ea] px-3 py-2 text-sm">
              About {Math.max(1, Math.ceil(secondsLeft / 60))} minutes left.
              <button type="button" className="font-semibold text-[#b4532a]" onClick={() => void extendLab()}>
                Extend
              </button>
            </p>
          ) : null}
          <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="tabular-nums">{secondsLeft == null ? "" : `${formatLeft(secondsLeft)} left`}</span>
            <button
              type="button"
              className="rounded-full border border-[#e6ddd2] bg-white px-3 py-1"
              onClick={() => void extendLab()}
            >
              Extend 30 min
            </button>
            <a
              className="rounded-full border border-[#e6ddd2] bg-white px-3 py-1"
              href={session.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in new tab
            </a>
            <button
              type="button"
              className="rounded-full border border-[#e6ddd2] bg-white px-3 py-1"
              onClick={() => void endLab()}
            >
              End lab
            </button>
            {error ? <span className="text-[#6f625a]">{error}</span> : null}
          </div>
          {tasks}
          <iframe
            ref={iframeRef}
            src={embedSrc(session.url)}
            title="Chapter 1 live lab"
            allow="clipboard-write"
            style={{ width: "100%", height: "100vh", border: 0 }}
          />
        </div>
      ) : null}
    </section>
  );
}

function TaskList({
  progress,
  onTask,
  onToggle,
}: {
  progress: Progress;
  onTask: (task: number) => void;
  onToggle: (manual: boolean) => void;
}) {
  const done = new Set(progress.completed);
  return (
    <div className="mt-4">
      <ol className="space-y-1 text-sm">
        {guide.tasks.map((task) => (
          <li key={task.id}>
            <button type="button" className="text-left hover:underline" onClick={() => onTask(task.id)}>
              {done.has(task.id) ? (
                <span className="text-[#2f7d4f]">✓ </span>
              ) : (
                <span className="text-[#6f625a]">{task.id}. </span>
              )}
              {task.title}
            </button>
          </li>
        ))}
      </ol>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={progress.manual || done.size >= guide.tasks.length}
          onChange={(event) => onToggle(event.target.checked)}
        />
        I completed the live lab
      </label>
    </div>
  );
}

function KillercodaLink({ url }: { url: string }) {
  if (!url) return null;
  return (
    <a className="rounded-lg border border-[#e6ddd2] bg-white px-3.5 py-2 text-sm" href={url} target="_blank" rel="noopener noreferrer">
      Open the Killercoda lab
    </a>
  );
}

function StaticLab({
  url,
  progress,
  onToggle,
  onTask,
  iframeRef,
}: {
  url: string;
  progress: Progress;
  onToggle: (manual: boolean) => void;
  onTask: (task: number) => void;
  iframeRef: RefObject<HTMLIFrameElement | null>;
}) {
  return (
    <section className="text-[#241c18]" aria-label="Live lab">
      <div className="mb-2">
        <a className="text-sm underline" href={url} target="_blank" rel="noopener noreferrer">
          Open in new tab
        </a>
      </div>
      <TaskList progress={progress} onTask={onTask} onToggle={onToggle} />
      <iframe
        ref={iframeRef}
        src={embedSrc(url)}
        title="Chapter 1 live lab"
        allow="clipboard-write"
        style={{ width: "100%", height: "100vh", border: 0 }}
      />
    </section>
  );
}
