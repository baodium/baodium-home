import { compileModule } from "./code";
import { CLEAN_WINDOW_S, LabRuntime, hex, lognormal, seeded, type Rng } from "./runtime";
import { quantile, type Span, type Trace } from "./telemetry";
import type { ChartSpec, CheckState, IncidentDef, ProductDef, Release } from "./types";
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

export const LIVE_TITLE: Title = {
  id: "lofoten-live",
  name: "Lofoten crossing",
  year: 2026,
  kind: "Live",
  length: "Live",
  scene: "coast",
  blurb: "The overnight ferry from Bodø to Moskenes, from the bridge camera of MS Lofoten.",
  palette: ["#0c1622", "#b9cbd4", "#f0b44c"],
};

export type CacheKeyMode = "path" | "query" | "token" | "bypass";
export type RulePath = "/live/*" | "/vod/*" | "/*";
export type CacheRule = { path: RulePath; key: CacheKeyMode; ttl: number };
export const RULE_PATHS: RulePath[] = ["/live/*", "/vod/*", "/*"];
export const KEY_MODES: { id: CacheKeyMode; label: string }[] = [
  { id: "path", label: "Path only" },
  { id: "query", label: "Path and full query string" },
  { id: "token", label: "Path and token parameter" },
  { id: "bypass", label: "Do not cache" },
];
export const TTLS: { s: number; label: string }[] = [
  { s: 10, label: "10 seconds" },
  { s: 3600, label: "1 hour" },
  { s: 7 * 86400, label: "7 days" },
];
const RULES_R89: CacheRule[] = [
  { path: "/vod/*", key: "path", ttl: 7 * 86400 },
  { path: "/*", key: "path", ttl: 3600 },
];
const RULES_R90: CacheRule[] = [{ path: "/live/*", key: "bypass", ttl: 10 }, ...RULES_R89];
const RULES_R91: CacheRule[] = [{ path: "/*", key: "query", ttl: 10 }, ...RULES_R89];
export const SAMPLE_FILM_URL = "/vod/night-market/720p/seg_00041.m4s?sid=4be07a";
export const SAMPLE_LIVE_URLS = [
  "/live/lofoten/720p/seg_88213.m4s?token=v1.7f3a&sid=2c91d0",
  "/live/lofoten/720p/seg_88213.m4s?token=v1.e04b&sid=a81f3e",
];

export function rulesText(rules: CacheRule[]) {
  return rules
    .map((rule, index) => `${index + 1}. ${rule.path}  ${KEY_MODES.find((mode) => mode.id === rule.key)?.label}${rule.key === "bypass" ? "" : `, ${TTLS.find((ttl) => ttl.s === rule.ttl)?.label}`}`)
    .join("\n");
}

export function matchRule(rules: CacheRule[], path: string) {
  return rules.findIndex((rule) => rule.path === "/*" || path.startsWith(rule.path.slice(0, -1)));
}

export function cacheKey(rules: CacheRule[], url: string): { rule: number; key: string | null } {
  const [path, query = ""] = url.split("?");
  const rule = matchRule(rules, path);
  const mode = rules[rule]?.key ?? "bypass";
  if (mode === "bypass") return { rule, key: null };
  if (mode === "path") return { rule, key: path };
  if (mode === "query") return { rule, key: url };
  const token = new URLSearchParams(query).get("token");
  return { rule, key: token ? `${path}?token=${token}` : path };
}

export function liveSharing(rules: CacheRule[]) {
  const [a, b] = SAMPLE_LIVE_URLS.map((url) => cacheKey(rules, url));
  if (a.key === null) return "bypass" as const;
  return a.key === b.key ? ("shared" as const) : ("per-viewer" as const);
}

const pad5 = (n: number) => String(n).padStart(5, "0");
const segPath = (title: string, rendition: Rendition, index: number) => `/vod/${title}/${rendition.id}/seg_${pad5(index)}.m4s`;
const TITLE_WEIGHTS = [0.3, 0.22, 0.16, 0.13, 0.11, 0.08];
const ORIGIN_CAPACITY = 6;
const CACHE_CAPACITY = 12_000;

type Abr = { chooseRendition: (ladder: Rendition[], throughput: number, buffer: number) => Rendition };
type EdgeModel = { ttfb: (rng: Rng) => number; capBps?: number };
export type CacheStatus = "HIT" | "MISS" | "BYPASS";
type Fetched = { ttfb: number; failed?: boolean; cache?: CacheStatus };

export type SegmentEvent = {
  index: number;
  rendition: Rendition;
  ms: number;
  ttfb: number;
  edge: string;
  stalledDuring: boolean;
  cache?: CacheStatus;
  failed?: boolean;
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
  error?: string;
  private failures = 0;
  private downloading?: { index: number; rendition: Rendition; total: number; elapsed: number; ttfb: number; edge: string; failed?: boolean; cache?: CacheStatus };

  constructor(
    private readonly abr: Abr["chooseRendition"],
    private readonly unit: "bps" | "kbps",
    private readonly throughputBps: () => number,
    private readonly edge: () => { id: string; model: EdgeModel },
    private readonly rng: Rng,
    private readonly onSegment?: (event: SegmentEvent) => void,
    private readonly onStall?: () => void,
    private readonly fetcher?: (index: number, rendition: Rendition) => Fetched,
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
    if (this.error) return;
    if (!this.downloading && this.buffer < MAX_BUFFER_S) {
      const rendition = this.choose();
      const { id, model } = this.edge();
      const fetched = this.fetcher?.(this.nextIndex, rendition);
      const ttfb = fetched ? fetched.ttfb : model.ttfb(this.rng);
      const bps = Math.min(this.throughputBps() * (0.9 + this.rng() * 0.2), model.capBps ?? Infinity);
      const total = fetched?.failed ? ttfb : ttfb + ((rendition.kbps * 1000 * SEGMENT_S) / bps) * 1000;
      this.downloading = { index: this.nextIndex, rendition, total, elapsed: 0, ttfb, edge: id, failed: fetched?.failed, cache: fetched?.cache };
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
        if (done.failed) {
          this.failures += 1;
          if (!this.started && this.failures >= 2) this.error = "NL-503";
          const event = { index: done.index, rendition: done.rendition, ms: Math.round(done.total), ttfb: Math.round(done.ttfb), edge: done.edge, stalledDuring, cache: done.cache, failed: true };
          this.segments.push(event);
          this.onSegment?.(event);
          return;
        }
        this.failures = 0;
        this.renditions[done.index] = done.rendition;
        this.buffer += SEGMENT_S;
        this.nextIndex += 1;
        const sample = (done.rendition.kbps * 1000 * SEGMENT_S) / (done.total / 1000);
        this.estimateBps = this.estimateBps ? this.estimateBps * 0.6 + sample * 0.4 : sample;
        const event = { index: done.index, rendition: done.rendition, ms: Math.round(done.total), ttfb: Math.round(done.ttfb), edge: done.edge, stalledDuring, cache: done.cache };
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
  {
    id: "cache-key",
    product: "northlight",
    title: "Films take seconds to start and some fail",
    kind: "Configuration",
    skills: ["CDN cache keys", "Rule order", "Origin capacity"],
    summary: "Since 10:30 the CDN sends almost every film request to origin, and about one play in ten ends on error NL-503.",
    lead:
      "Since 10:30, films take five seconds or more to start and about one play in ten fails with error NL-503. Origin is receiving three times the requests it can serve. The live stream of the Lofoten crossing plays normally, and no player build shipped today.",
    ticket: {
      from: "Amara Nwosu",
      role: "Viewer, help center",
      at: "10:41",
      body: "Every film takes ages to start this morning, and Night Market showed error NL-503 twice before it played. The live ferry stream works fine, so it isn’t my connection.",
    },
    objective:
      "Find out why the CDN stopped absorbing film traffic and correct its configuration without letting one viewer’s signed live response reach another viewer. The incident closes when films start within 2 seconds and origin is back under its capacity, live URLs keep a cache entry per viewer, and a film starts in your player in under 2 seconds.",
    steps: [
      "Play a film with Playback stats on and watch the cache status of each segment. Then play the live crossing and compare.",
      "In Overview, line up the cache hit ratio with requests to origin and find what changed at 10:30.",
      "Open Releases and config. Use Check a URL on a film segment from your player and on both live URLs, and see which rule each one matches.",
      "Change the cache rules so film segments share entries again, deploy them, and play a film.",
    ],
    checks: [
      { id: "start", label: `For ${CLEAN_WINDOW_S} seconds, films start within 2 seconds at p95 without failures, and origin stays under 6 requests per second` },
      { id: "live", label: "Live URLs signed for different viewers never share a cache entry" },
      { id: "mine", label: "A film starts in your player in under 2 seconds, after your change" },
    ],
    review: {
      cause:
        "cdn-config r91 was meant to cache signed live URLs for 10 seconds per viewer, replacing Tuesday’s rule that sent every live request to the packager. The rules editor adds a new rule at the top with the pattern /*, and it was saved that way. The CDN uses the first rule that matches, so every film request matched it too, and since player 3.8.2 every film URL carries a per-session sid parameter. With the full query string in the key, each request became its own cache entry. The hit ratio fell from about 97 percent to almost nothing, origin received every segment request, and it began queueing and returning 503.",
      fix:
        "Scope the rule to /live/*, or move it below the /vod/* rule. Either keeps a live entry per viewer and lets every viewer of a film share one entry per segment, kept for 7 days. The hit ratio comes back as the cache refills, and origin load falls with it. Keying /* on the token parameter, or rolling the player back to 3.8.1, also stops the session id from splitting film entries, but films still match the 10-second rule and keep expiring, so origin stays overloaded.",
      practice:
        "Review cache rules the way you review code, and test them against real URLs from each part of the product before they go live. Write down which query parameters a cache key should include, and keep tracking parameters such as session ids out of it. Alert on hit ratio and origin request rate as well as on errors, because origin overload shows up there first.",
    },
    runs: "Northlight runs in this page. Your player and the simulated viewers request every manifest and segment through the CDN rules shown in Releases and config, with a shared cache in front of an origin that serves about 6 requests per second. The charts, logs, and traces come from those requests.",
    files: northlightFiles("cache-key"),
  },
];

export const NORTHLIGHT: ProductDef = {
  id: "northlight",
  name: "Northlight",
  domain: "northlight.tv",
  kind: "Film streaming",
  description: "Documentaries, drama, and a live channel, streamed in four renditions from a five-edge CDN.",
  incidents: NORTHLIGHT_INCIDENTS,
};

const SESSION_RATE = 1.4;
const METRO_SHARE: [Metro, number][] = [["Chicago", 0.55], ["Frankfurt", 0.27], ["London", 0.18]];

function pickMetro(u: number): Metro {
  for (const [name, share] of METRO_SHARE) {
    if (u < share) return name;
    u -= share;
  }
  return "Chicago";
}

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
  rules: CacheRule[] = RULES_R91;
  lastFilmUrl?: string;
  private rulesAt = Infinity;
  private rulesByRelease = new Map<string, CacheRule[]>();
  private cache = new Map<string, number>();
  private originLog: number[] = [];
  private starts: { t: number; ms: number; failed: boolean; misses: number }[] = [];
  private leakAt = 0;

  constructor(incident: IncidentDef) {
    super(incident, incident.id === "stalls" ? 380 : incident.id === "cache-key" ? 91 : 29);
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
    } else if (incident.id === "cache-key") {
      const fixed = ABR_V380.replace("rendition.kbps <= throughputBps * SAFETY", "rendition.kbps * 1000 <= throughputBps * SAFETY");
      this.abr = compileModule<Abr>(fixed, ["chooseRendition"]);
      const blocked89 = { allowed: false, reason: "Serves one viewer’s signed live response to other viewers (INC-2291)." };
      const blocked90 = { allowed: false, reason: "Sends every live request to the packager, which fell over at 10:18 this morning with the Lofoten crossing live (INC-2304)." };
      const rules: [string, CacheRule[]][] = [];
      rules.push([this.addRelease({ service: "cdn-config", version: "r89", t: at(9, 40) - 4 * day, author: "cdn-team", note: "Cache live segments for an hour, like other paths", state: "live", source: rulesText(RULES_R89), rollback: blocked89 }).id, RULES_R89]);
      this.addRelease({ service: "web-player", version: "3.8.1", t: at(16, 45) - 4 * day, author: "omar.h", note: "Compare throughput and bitrate in the same unit", state: "live", source: fixed });
      rules.push([this.addRelease({ service: "cdn-config", version: "r90", t: at(11, 15) - 3 * day, author: "cdn-team", note: "Do not cache /live/* (INC-2291)", state: "live", source: rulesText(RULES_R90), rollback: blocked90 }).id, RULES_R90]);
      this.addRelease({ service: "web-player", version: "3.8.2", t: at(15, 20) - 2 * day, author: "ines.r", note: "Tag segment requests with a session id for playback analytics", state: "live", source: fixed });
      rules.push([this.addRelease({ service: "cdn-config", version: "r91", t: at(10, 30), author: "dana.k", note: "Cache signed live URLs per viewer for 10 seconds (INC-2304)", state: "live", source: rulesText(RULES_R91) }).id, RULES_R91]);
      this.rulesByRelease = new Map(rules);
      this.rulesAt = at(10, 30);
      this.cutover = 0;
      this.degradedAt = Infinity;
      this.code = undefined;
      const warm = seeded(911);
      for (const title of TITLES) {
        this.cache.set(`/vod/${title.id}/master.m3u8`, Infinity);
        for (const rendition of LADDER) {
          for (let index = 0; index < 400; index++) if (warm() > 0.03) this.cache.set(segPath(title.id, rendition, index), Infinity);
        }
      }
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

  protected onReleaseChange(release: Release) {
    if (this.incident.id !== "cache-key") return;
    if (release.service === "cdn-config") this.rules = this.rulesByRelease.get(release.id) ?? this.rules;
    if (release.service === "web-player") this.playerVersion = release.version;
    this.changeAt = this.now;
  }

  deployRules(rules: CacheRule[]) {
    const version = this.nextVersion("cdn-config");
    const copy = rules.map((rule) => ({ ...rule }));
    const label = (rule: CacheRule) => `${rule.path} ${KEY_MODES.find((mode) => mode.id === rule.key)?.label.toLowerCase()}`;
    const release = this.addRelease({ service: "cdn-config", version, t: this.now, author: "you", note: `Cache rules: ${copy.map(label).join("; ")}`, state: "live", source: rulesText(copy) });
    this.rulesByRelease.set(release.id, copy);
    this.rules = copy;
    this.changeAt = this.now;
    this.telemetry.log(this.now, "info", "cdn", "cache rules deployed", { version, rules: copy.map(label).join(", "), by: "you" }, { mine: true });
    this.touch();
  }

  originLoad(t = this.now) {
    while (this.originLog.length && this.originLog[0] <= t - 5000) this.originLog.shift();
    return this.originLog.length / 5 / ORIGIN_CAPACITY;
  }

  originPerSecond() {
    const recent = this.starts.filter((row) => row.t > this.now - CLEAN_WINDOW_S * 1000);
    return recent.reduce((sum, row) => sum + row.misses, 0) / CLEAN_WINDOW_S;
  }

  cdnFetch(t: number, url: string, rng: Rng) {
    const rules = t < this.rulesAt ? RULES_R90 : this.rules;
    const { rule, key } = cacheKey(rules, url);
    const live = url.startsWith("/live/");
    const edgeMs = () => lognormal(rng, 26, 0.3);
    if (!live) this.telemetry.count(t, "cdn.req");
    if (key !== null) {
      if (live && !key.includes("token=")) return { ms: edgeMs(), cache: "HIT" as CacheStatus, rule, key, leak: true };
      const expires = this.cache.get(key);
      if (expires !== undefined && expires > t) {
        this.cache.delete(key);
        this.cache.set(key, expires);
        if (!live) this.telemetry.count(t, "cdn.hit");
        return { ms: edgeMs(), cache: "HIT" as CacheStatus, rule, key };
      }
    }
    const cache: CacheStatus = key === null ? "BYPASS" : "MISS";
    const store = () => {
      if (key === null) return;
      this.cache.set(key, t + rules[rule].ttl * 1000);
      if (this.cache.size > CACHE_CAPACITY) this.cache.delete(this.cache.keys().next().value!);
    };
    if (live) {
      store();
      return { ms: lognormal(rng, 240, 0.3), cache, rule, key };
    }
    const load = this.originLoad(t);
    this.originLog.push(t);
    this.telemetry.count(t, "origin.req");
    const ttfb = load < 0.7 ? lognormal(rng, 150, 0.3) : lognormal(rng, 150 + 900 * (Math.min(load, 3.2) - 0.7), 0.35);
    if (rng() < (load <= 1.3 ? 0 : Math.min(0.25, (load - 1.3) * 0.15))) {
      this.telemetry.count(t, "origin.503");
      return { ms: ttfb, cache, rule, key, failed: true, load };
    }
    store();
    return { ms: ttfb + 26, cache, rule, key, load };
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

  session(network: () => number, metro: () => Metro, onEvent: () => void, title = "long-coast", live = false) {
    const abr = this.abr;
    const unit = this.playerVersion.startsWith("3.7") ? "kbps" : "bps";
    const version = this.playerVersion;
    const traceId = hex(this.rng, 16);
    const root = hex(this.rng, 8);
    const startedAt = this.now;
    const edgeU = 0.75;
    const spans: Span[] = [];
    const sid = hex(this.rng, 6);
    const trace: Trace = { id: traceId, t: startedAt, name: "play session", duration: 0, spans, attrs: { player: version, metro: metro(), title, sid }, mine: true };
    this.telemetry.trace(trace);
    this.telemetry.log(this.now, "info", "player", "session start", { player: version, title, sid, metro: metro(), network_bps: network() }, { mine: true, traceId });
    let fetcher: ((index: number, rendition: Rendition) => Fetched) | undefined;
    if (this.incident.id === "cache-key") {
      const token = `v1.${hex(this.rng, 4)}`;
      const query = live ? `?token=${token}&sid=${sid}` : version === "3.8.1" ? "" : `?sid=${sid}`;
      fetcher = (index, rendition) => {
        const segment = live ? `/live/lofoten/${rendition.id}/seg_${88200 + index}.m4s` : segPath(title, rendition, index);
        const paths = index === 0 && !live ? [`/vod/${title}/master.m3u8`, segment] : [segment];
        let ttfb = 0;
        let cache: CacheStatus = "HIT";
        for (const path of paths) {
          const result = this.cdnFetch(this.now, path + query, this.rng);
          ttfb += result.ms;
          if (result.cache !== "HIT") cache = result.cache;
          const fields = { url: path + query, cache: result.cache, rule: result.rule >= 0 ? result.rule + 1 : "none", key: result.key ?? "not cached", ms: Math.round(result.ms) };
          if (result.leak) {
            this.telemetry.log(this.now, "error", "cdn", "live response signed for another viewer", { ...fields, token_in_request: token, token_in_response: `v1.${hex(this.rng, 4)}` }, { mine: true, traceId });
          } else if (result.failed) {
            this.telemetry.log(this.now, "warn", "origin", "request rejected", { url: path + query, status: 503, reason: "queue full", in_flight: Math.round((result.load ?? 0) * ORIGIN_CAPACITY * 5) }, { mine: true, traceId });
            return { ttfb, failed: true, cache };
          } else {
            this.telemetry.log(this.now, "info", "cdn", result.cache === "HIT" ? "cache hit" : "cache miss", fields, { mine: true, traceId });
          }
        }
        if (!live) this.lastFilmUrl = segment + query;
        return { ttfb, cache };
      };
    }
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
        const slow = event.ms > SEGMENT_S * 1000;
        const attrs: NonNullable<Span["attrs"]> = { edge: event.edge, ttfb_ms: event.ttfb, rendition: event.rendition.id };
        if (event.cache) attrs.cache = event.cache;
        spans.push({ id: hex(this.rng, 8), parentId: root, service: "cdn", name: `GET seg ${event.index} ${event.rendition.id}`, start: Math.max(0, start), duration: event.ms, error: event.failed ? "503 from origin" : slow ? "slower than playback" : undefined, attrs });
        trace.duration = this.now - startedAt;
        spans[0].duration = trace.duration;
        trace.attrs.segments = spans.length - 1;
        if (slow) trace.error = "rebuffer";
        if (session.error) {
          trace.error = session.error;
          this.telemetry.log(this.now, "error", "player", "playback failed", { code: session.error, title, sid, attempts: 2 }, { mine: true, traceId });
        } else if (!event.failed && fetcher === undefined) {
          this.telemetry.log(this.now, slow ? "warn" : "info", "cdn", "segment served", { edge: event.edge, rendition: event.rendition.id, ttfb_ms: event.ttfb, total_ms: event.ms }, { mine: true, traceId });
        }
        onEvent();
      },
      () => {
        this.telemetry.log(this.now, "warn", "player", "rebuffer", { player: version, rendition: session.renditionAt().id, buffer_s: 0, estimate_bps: Math.round(session.estimateBps), metro: metro() }, { mine: true, traceId });
        trace.error = "rebuffer";
        onEvent();
      },
      fetcher,
    );
    spans.push({ id: root, service: "player", name: "play session", start: 0, duration: 0 });
    return Object.assign(session, { version, startedAt, traceId, live, sid });
  }

  simulate(from: number, to: number) {
    if (this.nextSession === undefined) this.nextSession = from;
    while (this.nextSession < to) {
      if (this.incident.id === "cache-key") this.cacheSession(this.nextSession);
      else this.syntheticSession(this.nextSession);
      this.nextSession += (-Math.log(1 - this.rng()) / SESSION_RATE) * 1000;
    }
    this.recent = this.recent.filter((row) => row.t > to - 90_000);
    this.starts = this.starts.filter((row) => row.t > to - 90_000);
    if (this.incident.id === "cache-key" && to >= this.rulesAt && to - this.leakAt >= 2500 && liveSharing(this.rules) === "shared") {
      this.leakAt = to;
      const key = cacheKey(this.rules, SAMPLE_LIVE_URLS[0]).key ?? "not cached";
      this.telemetry.log(to, "error", "cdn", "live response signed for another viewer", { channel: "lofoten", key, token_in_request: `v1.${hex(this.rng, 4)}`, token_in_response: `v1.${hex(this.rng, 4)}` });
    }
    if (Math.floor(to / 10_000) !== Math.floor(from / 10_000) && this.incident.id === "frankfurt") {
      for (const edge of EDGES) {
        if (this.drained.has(edge.id)) continue;
        this.telemetry.log(to, "info", "cdn-health", "health check passed", { edge: edge.id, check: "tcp_connect", ms: Math.round(3 + this.rng() * 4) });
      }
    }
  }

  private cacheSession(t: number) {
    const rng = this.rng;
    let pick = rng();
    let title = TITLES[0];
    for (let i = 0; i < TITLES.length; i++) {
      title = TITLES[i];
      if (pick < TITLE_WEIGHTS[i]) break;
      pick -= TITLE_WEIGHTS[i];
    }
    const metro = pickMetro(rng());
    const edge = this.pickEdge(metro, rng());
    const bps = Math.max(600_000, lognormal(rng, 9_000_000, 0.7));
    const rendition = [...LADDER].reverse().find((item) => item.kbps * 1000 <= bps * 0.8) ?? LADDER[0];
    const sid = hex(rng, 6);
    const version = this.playerVersion;
    const query = version === "3.8.1" ? "" : `?sid=${sid}`;
    const r = rng();
    const first = r < 0.85 ? 0 : r < 0.97 ? Math.floor(rng() * 240) : 400 + Math.floor(rng() * 1100);
    const traceId = hex(rng, 16);
    const root = hex(rng, 8);
    const spans: Span[] = [{ id: root, service: "player", name: "play session", start: 0, duration: 0 }];
    const tel = this.telemetry;
    let elapsed = 0;
    let misses = 0;
    const request = (path: string, name: string) => {
      for (let attempt = 1; attempt <= 2; attempt++) {
        const result = this.cdnFetch(t, path + query, rng);
        spans.push({ id: hex(rng, 8), parentId: root, service: "cdn", name, start: elapsed, duration: result.ms, error: result.failed ? "503 from origin" : undefined, attrs: { edge, cache: result.cache, rule: result.rule >= 0 ? result.rule + 1 : "none", key: result.key ?? "not cached", attempt } });
        elapsed += result.ms;
        if (result.cache !== "HIT") {
          misses += 1;
          tel.log(t + elapsed, result.failed ? "warn" : "info", result.failed ? "origin" : "cdn", result.failed ? "request rejected" : "cache miss", result.failed ? { url: path + query, status: 503, reason: "queue full", in_flight: Math.round((result.load ?? 0) * ORIGIN_CAPACITY * 5) } : { url: path + query, edge, rule: result.rule + 1, key: result.key ?? "not cached", origin_ms: Math.round(result.ms) }, { traceId });
        }
        if (!result.failed) return true;
      }
      return false;
    };
    const ok = request(`/vod/${title.id}/master.m3u8`, "GET master.m3u8") && request(segPath(title.id, LADDER[0], first), `GET seg ${first} 360p`);
    if (ok) {
      const transfer = ((LADDER[0].kbps * 1000 * SEGMENT_S) / bps) * 1000;
      spans[spans.length - 1].duration += transfer;
      elapsed += transfer;
      for (let index = first + 1; index < first + 12; index++) {
        const result = this.cdnFetch(t, segPath(title.id, rendition, index) + query, rng);
        if (result.cache !== "HIT") misses += 1;
      }
    }
    spans[0].duration = elapsed;
    tel.count(t, "play.starts");
    if (ok) tel.observe(t, "play.startup_ms", elapsed);
    else tel.count(t, "play.start_errors");
    this.starts.push({ t, ms: elapsed, failed: !ok, misses });
    tel.trace({ id: traceId, t, name: "play session", duration: elapsed, error: ok ? undefined : "NL-503", spans, attrs: { player: version, title: title.id, sid, metro, edge, startup_ms: Math.round(elapsed), cache_misses: misses } });
    tel.log(t, "info", "player", "session start", { player: version, title: title.id, sid, metro, edge }, { traceId });
    if (ok) tel.log(t + elapsed, elapsed > 2000 ? "warn" : "info", "player", "first frame", { title: title.id, sid, startup_ms: Math.round(elapsed), cache_misses: misses }, { traceId });
    else tel.log(t + elapsed, "error", "player", "playback failed", { code: "NL-503", title: title.id, sid, attempts: 2 }, { traceId });
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
    if (this.incident.id === "cache-key") {
      return [
        {
          id: "hit-ratio",
          title: "CDN cache hit ratio",
          unit: "%",
          help: "Share of film requests the CDN answered from its cache. Each miss is fetched from origin.",
          series: [{ label: "Film requests", points: tel.ratio("cdn.hit", "cdn.req", from, to), tone: "primary" }],
          domain: [0, 100],
        },
        {
          id: "origin",
          title: "Requests to origin",
          unit: "/s",
          help: "Film requests per second that missed the cache, and the share origin rejected with 503.",
          series: [
            { label: "To origin", points: tel.series("origin.req", from, to, "sum").map((point) => ({ t: point.t, v: point.v === null ? null : point.v / 15 })), tone: "primary" },
            { label: "Rejected", points: tel.series("origin.503", from, to, "sum").map((point) => ({ t: point.t, v: point.v === null ? null : point.v / 15 })), tone: "bad" },
          ],
          threshold: { value: ORIGIN_CAPACITY, label: `Origin capacity ${ORIGIN_CAPACITY}/s` },
        },
        {
          id: "startup",
          title: "Video start time",
          unit: "ms",
          help: "Time from pressing play to the first frame, at the 95th percentile. Plays that failed are counted below instead.",
          series: [{ label: "p95", points: tel.series("play.startup_ms", from, to, "p95"), tone: "primary" }],
          threshold: { value: 2000, label: "Objective p95 2 s" },
        },
        {
          id: "failed",
          title: "Plays that failed to start",
          unit: "%",
          help: "Plays that ended on error NL-503 because origin rejected the same request twice.",
          series: [{ label: "Failed", points: tel.ratio("play.start_errors", "play.starts", from, to), tone: "bad" }],
          domain: [0, 20],
        },
      ];
    }
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
  mineStart?: number;
  mineSlowStart?: number;

  reportMine(session: PlaybackSession & { version: string; startedAt: number; live?: boolean }, network: string, metro: Metro) {
    if (this.incident.id === "cache-key") {
      const qualifies = !session.live && this.changeAt !== undefined && session.startedAt >= this.changeAt;
      this.mineQualified = qualifies;
      if (qualifies && session.started) {
        if (session.startupMs < 2000) this.mineStart = Math.min(this.mineStart ?? Infinity, session.startupMs);
        else this.mineSlowStart = session.startupMs;
      }
      return;
    }
    const qualifies =
      this.incident.id === "stalls"
        ? network === "broadband" && session.version !== "3.8.0"
        : metro === "Frankfurt" && this.changeAt !== undefined && session.startedAt >= this.changeAt;
    this.mineQualified = qualifies;
    this.mineClean = qualifies ? Math.max(this.mineClean, session.cleanMs) : this.mineClean;
  }

  private cacheChecks(): CheckState[] {
    const recent = this.starts.filter((row) => row.t > this.now - CLEAN_WINDOW_S * 1000);
    const failed = recent.filter((row) => row.failed).length;
    const p95 = quantile(recent.filter((row) => !row.failed).map((row) => row.ms), 0.95);
    const origin = this.originPerSecond();
    const settled = this.changeAt !== undefined && this.now - this.changeAt >= CLEAN_WINDOW_S * 1000;
    const sharing = liveSharing(this.rules);
    const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;
    return [
      {
        id: "start",
        label: this.incident.checks[0].label,
        done: settled && p95 !== null && p95 < 2000 && failed === 0 && origin < ORIGIN_CAPACITY,
        detail:
          p95 === null
            ? "Waiting for plays"
            : `Start p95 ${seconds(p95)}${failed ? `, ${failed} failed` : ""}, origin ${origin.toFixed(1)}/s${this.changeAt !== undefined && !settled ? `, ${Math.ceil(CLEAN_WINDOW_S - (this.now - this.changeAt) / 1000)} s to go` : ""}`,
      },
      {
        id: "live",
        label: this.incident.checks[1].label,
        done: sharing !== "shared",
        detail: sharing === "shared" ? "Two viewers’ live URLs get the same cache key" : sharing === "bypass" ? "Live URLs are not cached" : "Each viewer’s token is part of the live cache key",
      },
      {
        id: "mine",
        label: this.incident.checks[2].label,
        done: this.mineStart !== undefined,
        detail:
          this.mineStart !== undefined
            ? `Started in ${seconds(this.mineStart)}`
            : this.mineSlowStart !== undefined
              ? `Started in ${seconds(this.mineSlowStart)}, needs under 2 s`
              : "Not yet",
      },
    ];
  }

  checks(): CheckState[] {
    if (this.incident.id === "cache-key") return this.cacheChecks();
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
