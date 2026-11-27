import { compileModule } from "./code";
import { CLEAN_WINDOW_S, LabRuntime, hex, lognormal, seeded, type Rng } from "./runtime";
import type { Span, Trace } from "./telemetry";
import type { ChartSpec, CheckState, IncidentDef, ProductDef } from "./types";
import { ABR_TESTS, ABR_V376, ABR_V380, northlightFiles } from "./northlight-code";

export type Rendition = { id: "360p" | "540p" | "720p" | "1080p"; kbps: number; scale: number };
export const LADDER: Rendition[] = [
  { id: "360p", kbps: 800, scale: 0.22 },
  { id: "540p", kbps: 1600, scale: 0.36 },
  { id: "720p", kbps: 3000, scale: 0.6 },
  { id: "1080p", kbps: 6000, scale: 1 },
];
export const SEGMENT_S = 4;
const MAX_BUFFER_S = 30;

export type Scene = "coast" | "ice" | "market" | "glass" | "fields" | "foundry";

export type Title = {
  id: string;
  name: string;
  year: number;
  kind: string;
  length: string;
  scene: Scene;
  blurb: string;
  palette: [string, string, string];
};

export const TITLES: Title[] = [
  { id: "long-coast", name: "The Long Coast", year: 2026, kind: "Documentary", length: "1 h 32 min", scene: "coast", blurb: "A winter with the ferry crews who still run the outer routes of the Norwegian coast.", palette: ["#0f1d2b", "#c7d6dc", "#e0a458"] },
  { id: "ice-road", name: "Ice Road", year: 2025, kind: "Documentary", length: "58 min", scene: "ice", blurb: "Drivers on the frozen lakes of the Northwest Territories, through a seven-week season.", palette: ["#0b1220", "#9fb7d9", "#f2f5f8"] },
  { id: "night-market", name: "Night Market", year: 2026, kind: "Drama", length: "1 h 47 min", scene: "market", blurb: "Two sisters run their mother’s noodle stall in Taichung and disagree about selling it.", palette: ["#1a0f14", "#f0a35e", "#d9475b"] },
  { id: "glasswork", name: "Glasswork", year: 2024, kind: "Series, 6 episodes", length: "6 episodes", scene: "glass", blurb: "A Murano workshop takes on one commission too many.", palette: ["#0d1a1a", "#5fc4b8", "#e8f1ef"] },
  { id: "lowlands", name: "Lowlands", year: 2025, kind: "Drama", length: "1 h 39 min", scene: "fields", blurb: "A tulip grower’s son comes home for the spring that decides the farm.", palette: ["#14180f", "#a9c46c", "#e46a4b"] },
  { id: "foundry", name: "Salt and Iron", year: 2023, kind: "Documentary", length: "1 h 21 min", scene: "foundry", blurb: "The last bell foundry in the Midwest casts its final order.", palette: ["#140e0b", "#e2763a", "#f3d9b1"] },
];

export type Metro = "Chicago" | "Frankfurt" | "London";
export type Edge = { id: string; metro: Metro; city: string };
export const EDGES: Edge[] = [
  { id: "ord-1", metro: "Chicago", city: "Chicago" },
  { id: "ord-2", metro: "Chicago", city: "Chicago" },
  { id: "fra-1", metro: "Frankfurt", city: "Frankfurt" },
  { id: "fra-2", metro: "Frankfurt", city: "Frankfurt" },
  { id: "lhr-1", metro: "London", city: "London" },
];

export type NetworkProfile = { id: string; label: string; bps: number };
export const NETWORKS: NetworkProfile[] = [
  { id: "broadband", label: "Home broadband, 4.2 Mbps", bps: 4_200_000 },
  { id: "fiber", label: "Fiber, 25 Mbps", bps: 25_000_000 },
  { id: "mobile", label: "Mobile, 1.8 Mbps", bps: 1_800_000 },
];

type Abr = { chooseRendition: (ladder: Rendition[], throughput: number, buffer: number) => Rendition };
type EdgeModel = { ttfb: (rng: Rng) => number; capBps?: number };

export type SegmentEvent = {
  index: number;
  rendition: Rendition;
  ms: number;
  ttfb: number;
  edge: string;
  stalledDuring: boolean;
};

export class PlaybackSession {
  buffer = 0;
  position = 0;
  estimateBps = 0;
  started = false;
  stalled = false;
  paused = false;
  stallMs = 0;
  stalls = 0;
  startupMs = 0;
  watchedMs = 0;
  cleanMs = 0;
  nextIndex = 0;
  renditions: Rendition[] = [];
  segments: SegmentEvent[] = [];
  private downloading?: { index: number; rendition: Rendition; total: number; elapsed: number; ttfb: number; edge: string };

  constructor(
    private readonly abr: Abr["chooseRendition"],
    private readonly unit: "bps" | "kbps",
    private readonly throughputBps: () => number,
    private readonly edge: () => { id: string; model: EdgeModel },
    private readonly rng: Rng,
    private readonly onSegment?: (event: SegmentEvent) => void,
    private readonly onStall?: () => void,
  ) {}

  togglePause() {
    this.paused = !this.paused;
  }

  renditionAt(position = this.position) {
    return this.renditions[Math.floor(position / SEGMENT_S)] ?? this.renditions[this.renditions.length - 1] ?? LADDER[0];
  }

  private choose() {
    const measured = this.unit === "bps" ? this.estimateBps : this.estimateBps / 1000;
    try {
      const pick = this.abr(LADDER, measured, this.buffer);
      return LADDER.find((rendition) => rendition.id === pick?.id) ?? LADDER[0];
    } catch {
      return LADDER[0];
    }
  }

  step(ms: number) {
    if (!this.downloading && this.buffer < MAX_BUFFER_S) {
      const rendition = this.choose();
      const { id, model } = this.edge();
      const ttfb = model.ttfb(this.rng);
      const bps = Math.min(this.throughputBps() * (0.9 + this.rng() * 0.2), model.capBps ?? Infinity);
      const total = ttfb + ((rendition.kbps * 1000 * SEGMENT_S) / bps) * 1000;
      this.downloading = { index: this.nextIndex, rendition, total, elapsed: 0, ttfb, edge: id };
    }
    let stalledDuring = false;
    if (!this.started) {
      this.startupMs += ms;
    } else if (this.stalled) {
      this.stallMs += ms;
      stalledDuring = true;
    } else if (!this.paused) {
      const use = Math.min(ms / 1000, this.buffer);
      this.position += use;
      this.buffer -= use;
      this.watchedMs += use * 1000;
      this.cleanMs += use * 1000;
      if (this.buffer <= 0.0001) {
        this.stalled = true;
        this.stalls += 1;
        this.cleanMs = 0;
        this.onStall?.();
      }
    }
    if (this.downloading) {
      this.downloading.elapsed += ms;
      if (this.downloading.elapsed >= this.downloading.total) {
        const done = this.downloading;
        this.downloading = undefined;
        this.renditions[done.index] = done.rendition;
        this.buffer += SEGMENT_S;
        this.nextIndex += 1;
        const sample = (done.rendition.kbps * 1000 * SEGMENT_S) / (done.total / 1000);
        this.estimateBps = this.estimateBps ? this.estimateBps * 0.6 + sample * 0.4 : sample;
        const event = { index: done.index, rendition: done.rendition, ms: Math.round(done.total), ttfb: Math.round(done.ttfb), edge: done.edge, stalledDuring };
        this.segments.push(event);
        this.onSegment?.(event);
        if (!this.started && this.buffer >= SEGMENT_S) this.started = true;
        if (this.stalled && this.buffer >= SEGMENT_S) this.stalled = false;
      }
    }
  }

  downloadProgress() {
    return this.downloading ? Math.min(1, this.downloading.elapsed / this.downloading.total) : 0;
  }
}

const RUNS =
  "Northlight runs in this page. The player code in the editor picks the rendition for every segment, in your player and in the simulated viewers’ players. The CDN and the viewers’ connections are simulated with measured speeds, and the charts, logs, and traces come from those sessions.";

export const NORTHLIGHT_INCIDENTS: IncidentDef[] = [
  {
    id: "stalls",
    product: "northlight",
    title: "Films stall on ordinary connections",
    kind: "Programming",
    skills: ["JavaScript", "Units", "Adaptive bitrate"],
    summary: "Since player 3.8.0, viewers on home broadband see the spinner every few seconds.",
    lead:
      "Northlight streams documentaries and drama. Web player 3.8.0 shipped at 10:33, and since then rebuffering has climbed from almost none to about 7 percent of watch time. Viewers on fast fiber see nothing wrong.",
    ticket: {
      from: "Grace Liu",
      role: "Viewer, help center",
      at: "10:39",
      body: "The Long Coast keeps freezing with the spinning circle every few seconds. My internet is fine, I can run a speed test at 4 Mbps while it’s stuck. It started this morning.",
    },
    objective:
      "Find out why the player stalls on connections that should be fast enough, fix the player code, and ship it. The incident closes when rebuffering stays under 1 percent and a film plays for 20 seconds on 4.2 Mbps without a stall.",
    steps: [
      "Play The Long Coast on the home broadband connection. Open Playback stats from the gear menu and compare the rendition with the measured throughput.",
      "Switch the connection to fiber and back. Note which viewers stall and which do not.",
      "Read player/src/abr.js, player.js, and the 3.8.0 release note. Check what unit each number is in.",
      "Fix chooseRendition, run the tests, and deploy. Reload the player to pick up the new build.",
    ],
    checks: [
      { id: "ratio", label: `Rebuffering stays under 1 percent of watch time for ${CLEAN_WINDOW_S} seconds` },
      { id: "mine", label: "A film plays for 20 seconds on home broadband (4.2 Mbps) without a stall, on the new player" },
    ],
    review: {
      cause:
        "Player 3.8.0 changed throughput reporting from kilobits to bits per second to match the CDN logs, and chooseRendition kept comparing that number with bitrates in kbps. Every measurement looked a thousand times larger, so every viewer got 1080p. At 6 Mbps per segment, anyone below about 6 Mbps downloaded each 4-second segment in more than 4 seconds, and the buffer ran dry.",
      fix:
        "Convert before comparing: a rendition fits when its kbps times 1000 is at most 80 percent of the measured bits per second. A fiber viewer still gets 1080p; home broadband gets 720p and keeps a growing buffer.",
      practice:
        "Put the unit in every name (throughputBps, bitrateKbps) and convert at the boundary where a unit changes. Test the decision at realistic values from both sides of each threshold. Watch rebuffering by connection speed, because a fleet average can hide a group of viewers who are failing completely.",
    },
    runs: RUNS,
    files: northlightFiles("stalls"),
    editable: { path: "player/src/abr.js", exports: ["chooseRendition"], testPath: "player/src/abr.test.js" },
  },
  {
    id: "frankfurt",
    product: "northlight",
    title: "Frankfurt viewers stall on fiber",
    kind: "Observability",
    skills: ["Grouping by label", "Time to first byte", "CDN steering"],
    summary: "Half the viewers in Frankfurt see low quality and stalls, and the CDN health checks are green.",
    lead:
      "Since 10:32 rebuffering in Frankfurt has been around 13 percent while Chicago and London stay under half a percent. The CDN dashboard shows every edge healthy, and nothing was deployed this morning.",
    ticket: {
      from: "Jonas Weber",
      role: "Viewer, help center",
      at: "10:43",
      body: "I have 100 Mbit fiber in Frankfurt and Night Market looks like a video from 2008, and it still stops to load. My neighbour says hers is fine.",
    },
    objective:
      "Find what the Frankfurt viewers who stall have in common and move them off it. The incident closes when Frankfurt rebuffering holds under 1 percent and a film plays for 20 seconds from Frankfurt without a stall.",
    steps: [
      "Play a film from Frankfurt on fiber. Open Playback stats and read the rendition, throughput, and edge.",
      "In Overview, compare rebuffering and time to first byte by edge. Then filter the logs to the cdn service.",
      "Open a slow session in Traces and compare each segment’s download time with its 4 seconds of video.",
      "Drain the bad edge in Releases and config, then play again from Frankfurt.",
    ],
    checks: [
      { id: "ratio", label: `Frankfurt rebuffering stays under 1 percent for ${CLEAN_WINDOW_S} seconds` },
      { id: "mine", label: "A film plays for 20 seconds from Frankfurt without a stall, after your change" },
    ],
    review: {
      cause:
        "Edge fra-2 ran out of worker capacity at 10:32 and began queuing requests. Each segment waited close to three seconds before its first byte, and transfers were capped near 1.8 Mbps. The CDN health check opens a TCP connection and never fetches a segment, so it stayed green the whole time.",
      fix:
        "Draining fra-2 sent its share of Frankfurt to fra-1, which had headroom. Sessions that start after the change get full quality; the CDN’s own team still owns fixing fra-2 before it takes traffic again.",
      practice:
        "Group player metrics by edge, region, and network before you trust an aggregate. A health check proves an edge is reachable; only real user monitoring shows whether it serves video fast enough. Draining is a mitigation, so record it and restore the edge on purpose once it is fixed.",
    },
    runs: RUNS,
    files: northlightFiles("frankfurt"),
  },
];

export const NORTHLIGHT: ProductDef = {
  id: "northlight",
  name: "Northlight",
  domain: "northlight.tv",
  kind: "Film streaming",
  description: "Documentaries and drama, streamed in four renditions from a five-edge CDN.",
  incidents: NORTHLIGHT_INCIDENTS,
};

const SESSION_RATE = 1.4;
const METRO_SHARE: [Metro, number][] = [["Chicago", 0.55], ["Frankfurt", 0.27], ["London", 0.18]];

export class NorthlightRuntime extends LabRuntime {
  abr: Abr;
  playerVersion: string;
  private legacy: Abr;
  private cutover: number;
  private degradedAt: number;
  private nextSession?: number;
  readonly drained = new Set<string>();
  private changeAt?: number;
  private recent: { t: number; metro: Metro; watch: number; stall: number }[] = [];

  constructor(incident: IncidentDef) {
    super(incident, incident.id === "stalls" ? 380 : 29);
    const at = (h: number, m: number) => {
      const date = new Date(this.now);
      date.setHours(h, m, 0, 0);
      return date.getTime();
    };
    const day = 24 * 3600_000;
    this.legacy = compileModule<Abr>(ABR_V376, ["chooseRendition"]);
    if (incident.id === "stalls") {
      this.abr = compileModule<Abr>(ABR_V380, ["chooseRendition"]);
      this.addRelease({ service: "web-player", version: "3.7.5", t: at(14, 10) - 2 * day, author: "omar.h", note: "Subtitle positioning on ultrawide screens", state: "previous", source: ABR_V376, rollback: { allowed: false, reason: "Cannot play titles packaged with the new CMAF ladder since 09:00." } });
      this.addRelease({ service: "web-player", version: "3.7.6", t: at(11, 2) - day, author: "keiko.s", note: "Retry manifest fetch once on 503", state: "live", source: ABR_V376, rollback: { allowed: false, reason: "Cannot play titles packaged with the new CMAF ladder since 09:00." } });
      this.addRelease({ service: "web-player", version: "3.8.0", t: at(10, 33), author: "omar.h", note: "Report throughput in bits per second to match CDN logs", state: "live", source: ABR_V380 });
      this.cutover = at(10, 33);
      this.degradedAt = Infinity;
      this.code = {
        files: northlightFiles("stalls"),
        path: "player/src/abr.js",
        exportNames: ["chooseRendition"],
        testSource: ABR_TESTS,
        replay: {
          fn: "chooseRendition",
          inputs: () => {
            const rng = seeded(11);
            return Array.from({ length: 40 }, () => [LADDER.map(({ id, kbps }) => ({ id, kbps })), Math.round(lognormal(rng, 9_000_000, 0.7)), Math.round(rng() * 30)]);
          },
          judge: (outputs) => {
            const ok = outputs.filter((value) => typeof value === "object" && value !== null && "id" in value).length;
            return { ok: ok === outputs.length, summary: `${ok} of ${outputs.length} recent viewer decisions returned a rendition` };
          },
        },
      };
    } else {
      const fixed = ABR_V380.replace("rendition.kbps <= throughputBps * SAFETY", "rendition.kbps * 1000 <= throughputBps * SAFETY");
      this.abr = compileModule<Abr>(fixed, ["chooseRendition"]);
      this.addRelease({ service: "web-player", version: "3.8.1", t: at(16, 45) - day, author: "omar.h", note: "Compare throughput and bitrate in the same unit", state: "live", source: fixed, rollback: { allowed: false, reason: "The previous build stalls viewers below 6 Mbps." } });
      this.addRelease({ service: "cdn-config", version: "r88", t: at(8, 5), author: "cdn-team", note: "Add ord-2 to Chicago at 50 percent", state: "live" });
      this.cutover = 0;
      this.degradedAt = at(10, 32);
      this.code = undefined;
    }
    this.playerVersion = this.live("web-player")?.version ?? "3.8.0";
  }

  protected codeService() {
    return "web-player";
  }

  protected install(mod: unknown) {
    this.abr = mod as Abr;
    this.playerVersion = this.live("web-player")?.version ?? this.playerVersion;
    this.changeAt = this.now;
  }

  edgeModel(edge: string, t = this.now): EdgeModel {
    if (edge === "fra-2" && t >= this.degradedAt) {
      return { ttfb: (rng) => lognormal(rng, 2800, 0.45), capBps: 1_800_000 };
    }
    return { ttfb: (rng) => lognormal(rng, 38, 0.3) };
  }

  edgesFor(metro: Metro) {
    const all = EDGES.filter((edge) => edge.metro === metro);
    const open = all.filter((edge) => !this.drained.has(edge.id));
    return open.length ? open : all;
  }

  pickEdge(metro: Metro, u: number) {
    const edges = this.edgesFor(metro);
    return edges[Math.min(edges.length - 1, Math.floor(u * edges.length))].id;
  }

  drain(edge: string, on: boolean) {
    const metro = EDGES.find((item) => item.id === edge)?.metro;
    if (!metro) return;
    const siblings = EDGES.filter((item) => item.metro === metro && item.id !== edge);
    if (on && siblings.every((item) => this.drained.has(item.id))) return;
    if (on) this.drained.add(edge);
    else this.drained.delete(edge);
    const version = `r${88 + this.releases.filter((release) => release.service === "cdn-config").length}`;
    this.addRelease({ service: "cdn-config", version, t: this.now, author: "you", note: on ? `Drain ${edge}; ${metro} goes to ${siblings.map((item) => item.id).join(", ")}` : `Restore ${edge} to ${metro}`, state: "live" });
    this.telemetry.log(this.now, "info", "cdn", on ? "edge drained" : "edge restored", { edge, metro, by: "you" }, { mine: true });
    this.changeAt = this.now;
    this.touch();
  }

  session(network: () => number, metro: () => Metro, onEvent: () => void) {
    const abr = this.abr;
    const unit = this.playerVersion.startsWith("3.7") ? "kbps" : "bps";
    const version = this.playerVersion;
    const traceId = hex(this.rng, 16);
    const root = hex(this.rng, 8);
    const startedAt = this.now;
    const edgeU = 0.75;
    const spans: Span[] = [];
    const trace: Trace = { id: traceId, t: startedAt, name: "play session", duration: 0, spans, attrs: { player: version, metro: metro() }, mine: true };
    this.telemetry.trace(trace);
    this.telemetry.log(this.now, "info", "player", "session start", { player: version, metro: metro(), network_bps: network() }, { mine: true, traceId });
    const session = new PlaybackSession(
      (ladder, value, buffer) => abr.chooseRendition(ladder, value, buffer),
      unit,
      network,
      () => {
        const id = this.pickEdge(metro(), edgeU);
        return { id, model: this.edgeModel(id) };
      },
      seeded(Math.floor(this.now) % 100000),
      (event) => {
        const start = this.now - startedAt - event.ms;
        spans.push({ id: hex(this.rng, 8), parentId: root, service: "cdn", name: `GET seg ${event.index} ${event.rendition.id}`, start: Math.max(0, start), duration: event.ms, error: event.ms > SEGMENT_S * 1000 ? "slower than playback" : undefined, attrs: { edge: event.edge, ttfb_ms: event.ttfb, rendition: event.rendition.id } });
        trace.duration = this.now - startedAt;
        spans[0].duration = trace.duration;
        trace.attrs.segments = spans.length - 1;
        if (event.ms > SEGMENT_S * 1000) trace.error = "rebuffer";
        this.telemetry.log(this.now, event.ms > SEGMENT_S * 1000 ? "warn" : "info", "cdn", "segment served", { edge: event.edge, rendition: event.rendition.id, ttfb_ms: event.ttfb, total_ms: event.ms }, { mine: true, traceId });
        onEvent();
      },
      () => {
        this.telemetry.log(this.now, "warn", "player", "rebuffer", { player: version, rendition: session.renditionAt().id, buffer_s: 0, estimate_bps: Math.round(session.estimateBps), metro: metro() }, { mine: true, traceId });
        trace.error = "rebuffer";
        onEvent();
      },
    );
    spans.push({ id: root, service: "player", name: "play session", start: 0, duration: 0 });
    return Object.assign(session, { version, startedAt, traceId });
  }

  simulate(from: number, to: number) {
    if (this.nextSession === undefined) this.nextSession = from;
    while (this.nextSession < to) {
      this.syntheticSession(this.nextSession);
      this.nextSession += (-Math.log(1 - this.rng()) / SESSION_RATE) * 1000;
    }
    this.recent = this.recent.filter((row) => row.t > to - 90_000);
    if (Math.floor(to / 10_000) !== Math.floor(from / 10_000) && this.incident.id === "frankfurt") {
      for (const edge of EDGES) {
        if (this.drained.has(edge.id)) continue;
        this.telemetry.log(to, "info", "cdn-health", "health check passed", { edge: edge.id, check: "tcp_connect", ms: Math.round(3 + this.rng() * 4) });
      }
    }
  }

  private syntheticSession(t: number) {
    const rng = this.rng;
    let u = rng();
    let metro: Metro = "Chicago";
    for (const [name, share] of METRO_SHARE) {
      if (u < share) {
        metro = name;
        break;
      }
      u -= share;
    }
    const bps = Math.max(600_000, lognormal(rng, metro === "Frankfurt" ? 30_000_000 : 9_000_000, metro === "Frankfurt" ? 0.5 : 0.7));
    const old = t < this.cutover;
    const abr = old ? this.legacy : this.abr;
    const edge = this.pickEdge(metro, rng());
    const model = this.edgeModel(edge, t);
    const session = new PlaybackSession(
      (ladder, value, buffer) => abr.chooseRendition(ladder, value, buffer),
      old ? "kbps" : "bps",
      () => bps,
      () => ({ id: edge, model }),
      rng,
    );
    for (let i = 0; i < 240 && session.watchedMs < 45_000; i++) session.step(250);
    const tel = this.telemetry;
    const watch = session.watchedMs + session.stallMs;
    tel.count(t, "play.watch_ms", watch);
    tel.count(t, "play.stall_ms", session.stallMs);
    tel.count(t, `play.watch_ms.${edge}`, watch);
    tel.count(t, `play.stall_ms.${edge}`, session.stallMs);
    tel.count(t, `play.watch_ms.${metro}`, watch);
    tel.count(t, `play.stall_ms.${metro}`, session.stallMs);
    tel.observe(t, "play.startup_ms", session.startupMs);
    for (const segment of session.segments) {
      tel.count(t, `seg.${segment.rendition.id}`);
      tel.count(t, "seg.total");
      tel.observe(t, `seg.ttfb.${edge}`, segment.ttfb);
    }
    this.recent.push({ t, metro, watch, stall: session.stallMs });
    const traceId = hex(rng, 16);
    const root = hex(rng, 8);
    let start = 0;
    const spans: Span[] = [{ id: root, service: "player", name: "play session", start: 0, duration: 0 }];
    for (const segment of session.segments.slice(0, 8)) {
      spans.push({ id: hex(rng, 8), parentId: root, service: "cdn", name: `GET seg ${segment.index} ${segment.rendition.id}`, start, duration: segment.ms, error: segment.ms > SEGMENT_S * 1000 ? "slower than playback" : undefined, attrs: { edge: segment.edge, ttfb_ms: segment.ttfb, rendition: segment.rendition.id } });
      start += segment.ms;
    }
    spans[0].duration = start;
    tel.trace({ id: traceId, t, name: "play session", duration: start, error: session.stalls ? "rebuffer" : undefined, spans, attrs: { player: old ? "3.7.6" : this.playerVersion, metro, edge, network_bps: Math.round(bps), stalls: session.stalls } });
    const first = session.segments[0];
    tel.log(t, "info", "player", "session start", { player: old ? "3.7.6" : this.playerVersion, metro, edge, startup_ms: Math.round(session.startupMs) }, { traceId });
    if (first && first.ttfb > 800) {
      tel.log(t + first.ms, "warn", "cdn", "slow first byte", { edge, ttfb_ms: first.ttfb, cache: "HIT", queue: "worker_wait" }, { traceId });
    }
    if (session.stalls) {
      tel.log(t + 8000, "warn", "player", "rebuffer", { player: old ? "3.7.6" : this.playerVersion, rendition: session.renditions[Math.min(session.renditions.length - 1, 3)]?.id ?? "360p", estimate_bps: Math.round(session.estimateBps), network_bps: Math.round(bps), metro, edge, stalls: session.stalls }, { traceId });
    }
  }

  ratio(metro?: Metro, windowS = CLEAN_WINDOW_S) {
    const rows = this.recent.filter((row) => row.t > this.now - windowS * 1000 && (!metro || row.metro === metro));
    const watch = rows.reduce((sum, row) => sum + row.watch, 0);
    const stall = rows.reduce((sum, row) => sum + row.stall, 0);
    return watch ? (stall / watch) * 100 : null;
  }

  charts(): ChartSpec[] {
    const tel = this.telemetry;
    const from = this.now - 20 * 60_000;
    const to = this.now;
    const fleet: ChartSpec = {
      id: "rebuffer",
      title: "Rebuffering ratio",
      unit: "%",
      help: "Time viewers spent looking at the spinner, as a share of the time they meant to be watching.",
      series: [{ label: "All viewers", points: tel.ratio("play.stall_ms", "play.watch_ms", from, to), tone: "primary" }],
      threshold: { value: 1, label: "Objective 1%" },
      domain: [0, 12],
    };
    if (this.incident.id === "stalls") {
      return [
        fleet,
        {
          id: "renditions",
          title: "Segments served by rendition",
          unit: "%",
          help: "Share of all segments downloaded at each quality. A healthy mix follows viewers’ connection speeds.",
          series: [
            { label: "1080p", points: tel.ratio("seg.1080p", "seg.total", from, to), tone: "accent" },
            { label: "720p", points: tel.ratio("seg.720p", "seg.total", from, to), tone: "primary" },
            { label: "540p", points: tel.ratio("seg.540p", "seg.total", from, to), tone: "muted" },
          ],
          domain: [0, 100],
        },
        {
          id: "startup",
          title: "Video start time",
          unit: "ms",
          help: "Time from pressing play to the first frame, at the 95th percentile.",
          series: [{ label: "p95", points: tel.series("play.startup_ms", from, to, "p95"), tone: "primary" }],
        },
      ];
    }
    return [
      {
        id: "by-edge",
        title: "Rebuffering by edge",
        unit: "%",
        help: "The same ratio split by the CDN edge that served the session.",
        series: [
          { label: "fra-2", points: tel.ratio("play.stall_ms.fra-2", "play.watch_ms.fra-2", from, to), tone: "bad" },
          { label: "fra-1", points: tel.ratio("play.stall_ms.fra-1", "play.watch_ms.fra-1", from, to), tone: "primary" },
          { label: "lhr-1", points: tel.ratio("play.stall_ms.lhr-1", "play.watch_ms.lhr-1", from, to), tone: "muted" },
          { label: "ord-1", points: tel.ratio("play.stall_ms.ord-1", "play.watch_ms.ord-1", from, to), tone: "accent" },
        ],
        threshold: { value: 1, label: "Objective 1%" },
        domain: [0, 30],
      },
      {
        id: "ttfb",
        title: "Time to first byte by edge",
        unit: "ms",
        help: "How long a player waits before a segment starts arriving, at the 95th percentile.",
        series: [
          { label: "fra-2", points: tel.series("seg.ttfb.fra-2", from, to, "p95"), tone: "bad" },
          { label: "fra-1", points: tel.series("seg.ttfb.fra-1", from, to, "p95"), tone: "primary" },
          { label: "lhr-1", points: tel.series("seg.ttfb.lhr-1", from, to, "p95"), tone: "muted" },
        ],
      },
      { ...fleet, series: [...fleet.series, { label: "Frankfurt", points: tel.ratio("play.stall_ms.Frankfurt", "play.watch_ms.Frankfurt", from, to), tone: "bad" }] },
    ];
  }

  mineClean = 0;
  mineQualified = false;

  reportMine(session: PlaybackSession & { version: string; startedAt: number }, network: string, metro: Metro) {
    const qualifies =
      this.incident.id === "stalls"
        ? network === "broadband" && session.version !== "3.8.0"
        : metro === "Frankfurt" && this.changeAt !== undefined && session.startedAt >= this.changeAt;
    this.mineQualified = qualifies;
    this.mineClean = qualifies ? Math.max(this.mineClean, session.cleanMs) : this.mineClean;
  }

  checks(): CheckState[] {
    const metro = this.incident.id === "frankfurt" ? "Frankfurt" : undefined;
    const ratio = this.ratio(metro);
    const settled = this.changeAt !== undefined && this.now - this.changeAt >= CLEAN_WINDOW_S * 1000;
    const seconds = Math.floor(this.mineClean / 1000);
    return [
      {
        id: "ratio",
        label: this.incident.checks[0].label,
        done: settled && ratio !== null && ratio < 1,
        detail:
          ratio === null
            ? "Waiting for sessions"
            : `${ratio.toFixed(1)} percent over the last ${CLEAN_WINDOW_S} seconds${this.changeAt !== undefined && !settled ? `, ${Math.ceil(CLEAN_WINDOW_S - (this.now - this.changeAt) / 1000)} s to go` : ""}`,
      },
      {
        id: "mine",
        label: this.incident.checks[1].label,
        done: seconds >= 20,
        detail: seconds >= 20 ? "Played cleanly" : seconds > 0 ? `${seconds} of 20 seconds without a stall` : "Not yet",
      },
    ];
  }
}
