"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Pause, Play, Plus, Settings } from "lucide-react";
import {
  EDGES,
  NETWORKS,
  TITLES,
  type Metro,
  type NorthlightRuntime,
  type Title,
} from "@/lib/products/northlight";
import { BrowserFrame } from "../BrowserFrame";
import { drawScene } from "./scenes";
import { Still } from "./Still";
import "./northlight.css";

type View = { name: "home" } | { name: "watch"; title: Title };

export function NorthlightApp({ runtime }: { runtime: NorthlightRuntime }) {
  const stalls = runtime.incident.id === "stalls";
  const featured = TITLES.find((title) => title.id === (stalls ? "long-coast" : "night-market"))!;
  const [view, setView] = useState<View>({ name: "home" });
  const [network, setNetwork] = useState(stalls ? "broadband" : "fiber");
  const [metro, setMetro] = useState<Metro>(stalls ? "Chicago" : "Frankfurt");
  const [playerKey, setPlayerKey] = useState(0);

  const tools = (
    <>
      <span className="pl-tools-label">Viewer</span>
      <label>
        <span>Connection</span>
        <select value={network} onChange={(event) => setNetwork(event.target.value)}>
          {NETWORKS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Location</span>
        <select value={metro} onChange={(event) => setMetro(event.target.value as Metro)}>
          {(["Chicago", "Frankfurt", "London"] as Metro[]).map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
    </>
  );

  return (
    <BrowserFrame
      dark
      domain="northlight.tv"
      path={view.name === "watch" ? `/watch/${view.title.id}` : "/"}
      onReload={() => setPlayerKey((value) => value + 1)}
      tools={tools}
    >
      <div className="nl-app">
        {view.name === "home" ? (
          <Home featured={featured} onPlay={(title) => setView({ name: "watch", title })} />
        ) : (
          <Watch
            playerKey={playerKey}
            runtime={runtime}
            title={view.title}
            network={network}
            metro={metro}
            onBack={() => setView({ name: "home" })}
            onReload={() => setPlayerKey((value) => value + 1)}
            onPick={(title) => setView({ name: "watch", title })}
          />
        )}
      </div>
    </BrowserFrame>
  );
}

function Home({ featured, onPlay }: { featured: Title; onPlay: (title: Title) => void }) {
  const rest = TITLES.filter((title) => title.id !== featured.id);
  return (
    <div className="nl-home">
      <header className="nl-nav">
        <span className="nl-wordmark">
          <span aria-hidden="true">✦</span> Northlight
        </span>
        <nav aria-label="Northlight">
          <button type="button" aria-current="page">Home</button>
          <button type="button">Films</button>
          <button type="button">Series</button>
          <button type="button">My list</button>
        </nav>
        <span className="nl-profile" aria-label="Profile">
          You
        </span>
      </header>
      <section className="nl-hero">
        <Still title={featured} t={22} className="nl-hero-still" />
        <div className="nl-hero-copy">
          <p className="nl-meta">
            {featured.kind} · {featured.year} · {featured.length}
          </p>
          <h2>{featured.name}</h2>
          <p>{featured.blurb}</p>
          <div className="nl-hero-actions">
            <button type="button" className="nl-play" onClick={() => onPlay(featured)}>
              <Play size={16} aria-hidden="true" fill="currentColor" /> Play
            </button>
            <button type="button" className="nl-secondary">
              <Plus size={16} aria-hidden="true" /> My list
            </button>
          </div>
        </div>
      </section>
      <section className="nl-row" aria-labelledby="nl-new">
        <h3 id="nl-new">New this week</h3>
        <ul>
          {rest.map((title) => (
            <li key={title.id}>
              <button type="button" onClick={() => onPlay(title)} aria-label={`Play ${title.name}`}>
                <Still title={title} t={14} className="nl-poster" />
                <span className="nl-poster-title">{title.name}</span>
              </button>
              <p>
                {title.kind} · {title.length}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");
const fmt = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
};

function Watch(props: {
  runtime: NorthlightRuntime;
  title: Title;
  network: string;
  metro: Metro;
  onBack: () => void;
  onReload: () => void;
  onPick: (title: Title) => void;
  playerKey: number;
}) {
  const { title, onPick, playerKey, ...rest } = props;
  const next = TITLES.filter((item) => item.id !== title.id).slice(0, 3);
  return (
    <div className="nl-watch">
      <Player key={`${title.id}-${playerKey}`} title={title} {...rest} />
      <section className="nl-details" aria-label={`About ${title.name}`}>
        <div>
          <p className="nl-meta">
            {title.kind} · {title.year} · {title.length}
          </p>
          <h2>{title.name}</h2>
          <p>{title.blurb}</p>
        </div>
        <div className="nl-up-next">
          <h3>Up next</h3>
          <ul>
            {next.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => onPick(item)} aria-label={`Play ${item.name}`}>
                  <Still title={item} t={14} className="nl-thumb" />
                  <span>
                    {item.name}
                    <small>
                      {item.kind} · {item.length}
                    </small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function Player({
  runtime,
  title,
  network,
  metro,
  onBack,
  onReload,
}: {
  runtime: NorthlightRuntime;
  title: Title;
  network: string;
  metro: Metro;
  onBack: () => void;
  onReload: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const netRef = useRef(network);
  const metroRef = useRef(metro);
  const [session, setSession] = useState<ReturnType<NorthlightRuntime["session"]> | null>(null);
  const [, setFrame] = useState(0);
  const [menu, setMenu] = useState(false);
  const [stats, setStats] = useState(false);

  useEffect(() => {
    netRef.current = network;
    metroRef.current = metro;
  }, [network, metro]);

  useEffect(() => {
    const created = runtime.session(
      () => NETWORKS.find((item) => item.id === netRef.current)!.bps,
      () => metroRef.current,
      () => undefined,
    );
    setSession(created);
    const canvas = canvasRef.current!;
    const off = document.createElement("canvas");
    let last = performance.now();
    let report = 0;
    let raf = 0;
    const loop = (now: number) => {
      let dt = Math.min(250, now - last);
      last = now;
      while (dt > 0) {
        const step = Math.min(50, dt);
        created.step(step);
        dt -= step;
      }
      const box = canvas.getBoundingClientRect();
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.min(1600, Math.round(box.width * ratio));
      const h = Math.round((w * 9) / 16);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const rendition = created.renditionAt();
      off.width = Math.max(32, Math.round(w * rendition.scale));
      off.height = Math.max(18, Math.round(h * rendition.scale));
      const octx = off.getContext("2d")!;
      drawScene(octx, title.scene, created.position + 3, off.width, off.height);
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(off, 0, 0, w, h);
      if (now - report > 200) {
        report = now;
        runtime.reportMine(created, netRef.current, metroRef.current);
        setFrame((value) => value + 1);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [runtime, title]);

  const waiting = !session || !session.started || session.stalled;
  const rendition = session?.renditionAt();
  const hours = title.length.match(/(\d+) h/);
  const minutes = title.length.match(/(\d+) min/);
  const length = (hours ? Number(hours[1]) * 3600 : 0) + (minutes ? Number(minutes[1]) * 60 : 0) || 52 * 60;
  const outdated = session && runtime.playerVersion !== session.version;
  const edge = session?.segments[session.segments.length - 1]?.edge;
  const profile = NETWORKS.find((item) => item.id === network)!;

  return (
    <div className="nl-player">
      <canvas ref={canvasRef} className="nl-video" aria-label={`${title.name} video`} role="img" />
      {outdated ? (
        <div className="nl-update" role="status">
          A new version of Northlight is available.
          <button type="button" onClick={onReload}>
            Reload
          </button>
        </div>
      ) : null}
      <div className="nl-player-top">
        <button type="button" onClick={onBack} aria-label="Back to browse">
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <p>{title.name}</p>
      </div>
      {waiting ? (
        <div className="nl-buffering" role="status" aria-label="Loading video">
          <span className="nl-spinner" aria-hidden="true" />
        </div>
      ) : null}
      {stats && session ? (
        <dl className="nl-stats" aria-label="Playback stats">
          <div>
            <dt>Player</dt>
            <dd>{session.version}</dd>
          </div>
          <div>
            <dt>Rendition</dt>
            <dd>
              {rendition?.id}, {rendition?.kbps.toLocaleString()} kbps
            </dd>
          </div>
          <div>
            <dt>Throughput</dt>
            <dd>{session.estimateBps ? `${(session.estimateBps / 1e6).toFixed(1)} Mbps measured` : "measuring"}</dd>
          </div>
          <div>
            <dt>Connection</dt>
            <dd>{profile.label}</dd>
          </div>
          <div>
            <dt>Buffer</dt>
            <dd>{session.buffer.toFixed(1)} s ahead</dd>
          </div>
          <div>
            <dt>Stalls</dt>
            <dd>
              {session.stalls} ({(session.stallMs / 1000).toFixed(1)} s waiting)
            </dd>
          </div>
          <div>
            <dt>Edge</dt>
            <dd>{edge ? `${edge}, ${EDGES.find((item) => item.id === edge)?.city}` : "connecting"}</dd>
          </div>
          <div>
            <dt>Last segment</dt>
            <dd>
              {session.segments.length
                ? `#${session.segments[session.segments.length - 1].index}, ${(session.segments[session.segments.length - 1].ms / 1000).toFixed(2)} s for 4 s of video`
                : "none yet"}
            </dd>
          </div>
        </dl>
      ) : null}
      <div className="nl-controls">
        <div className="nl-progress" aria-hidden="true">
          <span className="nl-buffered" style={{ width: `${(((session?.position ?? 0) + (session?.buffer ?? 0)) / length) * 100}%` }} />
          <span className="nl-played" style={{ width: `${((session?.position ?? 0) / length) * 100}%` }} />
        </div>
        <div className="nl-control-row">
          <button
            type="button"
            onClick={() => {
              session?.togglePause();
              setFrame((value) => value + 1);
            }}
            aria-label={session?.paused ? "Play" : "Pause"}
          >
            {session?.paused ? <Play size={18} fill="currentColor" aria-hidden="true" /> : <Pause size={18} fill="currentColor" aria-hidden="true" />}
          </button>
          <span className="nl-time">
            {fmt(session?.position ?? 0)} / {fmt(length)}
          </span>
          <span className="nl-quality">{rendition?.id === "1080p" ? "HD 1080p" : rendition?.id ?? ""}</span>
          <div className="nl-settings">
            <button type="button" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label="Settings">
              <Settings size={17} aria-hidden="true" />
            </button>
            {menu ? (
              <div className="nl-menu" role="menu">
                <p>
                  Quality <span>Auto ({rendition?.id})</span>
                </p>
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={stats}
                  onClick={() => {
                    setStats(!stats);
                    setMenu(false);
                  }}
                >
                  Playback stats <span>{stats ? "On" : "Off"}</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SteeringConfig({ runtime }: { runtime: NorthlightRuntime }) {
  const from = runtime.now - 2 * 60_000;
  return (
    <section className="pl-config" aria-labelledby="steering-title">
      <h3 id="steering-title">CDN steering</h3>
      <p>Each metro splits its viewers evenly across its open edges. Draining an edge moves its share to the others in the same metro.</p>
      <table className="pl-config-table">
        <thead>
          <tr>
            <th scope="col">Edge</th>
            <th scope="col">Share</th>
            <th scope="col">Health check</th>
            <th scope="col">RUM first byte p95</th>
            <th scope="col">
              <span className="sr-only">Action</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {EDGES.map((edge) => {
            const open = runtime.edgesFor(edge.metro);
            const share = runtime.drained.has(edge.id) ? 0 : Math.round(100 / open.length);
            const ttfb = runtime.telemetry.quantile(`seg.ttfb.${edge.id}`, from, runtime.now, 0.95);
            const drained = runtime.drained.has(edge.id);
            return (
              <tr key={edge.id} data-drained={drained || undefined}>
                <td>
                  <strong>{edge.id}</strong>
                  <small>{edge.metro}</small>
                </td>
                <td className="pl-num">{share}%</td>
                <td>{drained ? "Drained" : "Passing (TCP)"}</td>
                <td className="pl-num">{ttfb === null ? "no data" : `${Math.round(ttfb).toLocaleString()} ms`}</td>
                <td>
                  <button type="button" className="pl-ghost" onClick={() => runtime.drain(edge.id, !drained)}>
                    {drained ? "Restore" : "Drain"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
