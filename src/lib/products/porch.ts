import { compileModule } from "./code";
import { CLEAN_WINDOW_S, LabRuntime, cleanCheck, hex, lognormal, seeded } from "./runtime";
import { quantile, type Span } from "./telemetry";
import type { ChartSpec, CheckState, IncidentDef, ProductDef, Release } from "./types";
import { PAGINATE_TESTS, PAGINATE_V31, PARTITION_V514, PARTITION_V520, porchFiles } from "./porch-code";

export type Neighbor = { id: string; name: string; street: string; tone: string };
export const NEIGHBORS: Record<string, Neighbor> = {
  theo: { id: "theo", name: "Theo Park", street: "Winchester Ave", tone: "#3b6e8f" },
  rosa: { id: "rosa", name: "Rosa Delgado", street: "Leland Ave", tone: "#b2563f" },
  ade: { id: "ade", name: "Ade Martins", street: "Wilson Ave", tone: "#5b7f3a" },
  june: { id: "june", name: "June Whitaker", street: "Hermitage Ave", tone: "#7a5a9a" },
  marcus: { id: "marcus", name: "Marcus Lee", street: "Paulina St", tone: "#2f7a6e" },
  ines: { id: "ines", name: "Ines Duarte", street: "Lincoln Ave", tone: "#b07a1f" },
  hal: { id: "hal", name: "Hal Brennan", street: "Leland Ave", tone: "#5a6470" },
  priya: { id: "priya", name: "Priya Raman", street: "Wolcott Ave", tone: "#a04a6c" },
  sam: { id: "sam", name: "Sam Okoye", street: "Montrose Ave", tone: "#3e6a4c" },
  nell: { id: "nell", name: "Nell Fischer", street: "Ravenswood Ave", tone: "#8a5a3c" },
  chamber: { id: "chamber", name: "Ravenswood Chamber of Commerce", street: "4740 N Lincoln Ave", tone: "#1f4d6b" },
  ward47: { id: "ward47", name: "47th Ward Office", street: "4544 N Lincoln Ave", tone: "#4a4f7a" },
  library: { id: "library", name: "Sulzer Regional Library", street: "4455 N Lincoln Ave", tone: "#6b5a2a" },
};

export const ACCOUNTS: Record<string, { followers: number; partition: number }> = {
  chamber: { followers: 48_210, partition: 3 },
  ward47: { followers: 21_400, partition: 1 },
  library: { followers: 12_900, partition: 5 },
  hal: { followers: 820, partition: 3 },
  theo: { followers: 640, partition: 3 },
  marcus: { followers: 1_340, partition: 3 },
  june: { followers: 910, partition: 6 },
  priya: { followers: 530, partition: 5 },
  rosa: { followers: 1_120, partition: 1 },
  ines: { followers: 2_300, partition: 2 },
  ade: { followers: 1_780, partition: 4 },
  sam: { followers: 460, partition: 0 },
  nell: { followers: 690, partition: 7 },
};
const OTHER_LARGE_NEIGHBORS = 183;
export const READ_THRESHOLDS = [0, 100_000, 25_000, 10_000, 1_000];
export const PARTITIONS = 8;
export const WRITES_PER_S = 6_000;
const IMPORT_EVERY_MS = 4_500;
export const IMPORT_TOTAL = 400;
export const CHAMBER_EVENTS = [
  "Lincoln Square holiday market, Saturdays 10 to 4 through December 20.",
  "Tree lighting at Giddings Plaza on Friday at 5:30, with hot cider from the Brew Shop.",
  "Small Business Saturday: thirty shops on Lincoln Ave open late.",
  "Ravenswood Art Walk, winter edition. Studios on Ravenswood Ave open noon to 6.",
  "Carolers on Lincoln Ave on Sunday afternoons in December.",
  "Gift wrapping for charity in the Sulzer Library lobby, weekends.",
  "Menorah lighting at Welles Park, December 14 at 4:30.",
  "Winter coat drive. Drop-off at the Chamber office, 4740 N Lincoln.",
];

export function largeAccounts(threshold: number) {
  if (!threshold) return 0;
  return Object.values(ACCOUNTS).filter((account) => account.followers > threshold).length + (threshold <= 1_000 ? OTHER_LARGE_NEIGHBORS : 0);
}

export type Post = {
  id: string;
  author: string;
  createdAt: string;
  body: string;
  topic?: "Lost and found" | "Free" | "Events" | "Safety" | "Recommendations";
  thanks: number;
  replies: number;
  photo?: "cat" | "couch" | "market";
};

const ts = (hms: string) => `2026-11-27T${hms}Z`;

export const POSTS: Post[] = [
  { id: "p_0431", author: "june", createdAt: ts("10:38:12"), body: "Does anyone on Hermitage have a snow blower I could borrow Saturday morning? Happy to return it with a full tank and a loaf of banana bread.", thanks: 4, replies: 6, topic: "Recommendations" },
  { id: "p_0429", author: "marcus", createdAt: ts("10:21:40"), body: "Free couch, grey, three seats, no tears. Smoke-free home. It’s on my porch on Paulina until Sunday evening. You carry it.", thanks: 11, replies: 3, topic: "Free", photo: "couch" },
  { id: "p_0427", author: "ines", createdAt: ts("10:02:05"), body: "The bakery on Lincoln opens Friday. We’re handing out cardamom buns to the first fifty neighbors who stop by before 9.", thanks: 37, replies: 12, topic: "Events" },
  { id: "p_0420", author: "hal", createdAt: ts("09:41:33"), body: "Leland is closed between Ravenswood and Hermitage tomorrow from 7 to 3 for the water main. Parking signs are already up.", thanks: 19, replies: 2, topic: "Safety" },
  { id: "p_0412", author: "ade", createdAt: ts("09:00:00"), body: "The Saturday farmers market moves indoors to the Wilson Ave gym from this week through March. Same vendors, same hours.", thanks: 26, replies: 4, topic: "Events", photo: "market" },
  { id: "p_0398", author: "rosa", createdAt: ts("09:00:00"), body: "Our cat Biscuit slipped out last night near Leland and Ravenswood. Orange tabby, white chest, very shy, no collar. Please check garages and sheds. We’re at 4612 N Leland.", thanks: 52, replies: 17, topic: "Lost and found", photo: "cat" },
  { id: "p_0391", author: "priya", createdAt: ts("08:47:10"), body: "Book swap shelf is back outside 1840 Wolcott. Took a Le Guin, left two Tana Frenchs.", thanks: 9, replies: 1, topic: "Free" },
  { id: "p_0385", author: "sam", createdAt: ts("08:30:00"), body: "Recommendation for a plumber who will come out for a small job? Kitchen tap has been dripping for a week.", thanks: 2, replies: 9, topic: "Recommendations" },
  { id: "p_0380", author: "nell", createdAt: ts("08:12:44"), body: "Thank you to whoever shoveled the corner by the bus stop on Montrose before 6. My knees noticed.", thanks: 31, replies: 2 },
  { id: "p_0377", author: "june", createdAt: ts("07:55:00"), body: "Ravenswood community garden is collecting bulbs for next spring. Drop-off box by the shed through December.", thanks: 8, replies: 0, topic: "Events" },
  { id: "p_0376", author: "theo", createdAt: ts("07:55:00"), body: "Lost: a navy mitten with a fox on it, toddler size, somewhere between Winchester and the Damen station.", thanks: 6, replies: 3, topic: "Lost and found" },
  { id: "p_0370", author: "hal", createdAt: ts("07:31:18"), body: "Alley pickup on our block moved to Thursdays for the holidays, per the ward office.", thanks: 5, replies: 1 },
  { id: "p_0366", author: "ines", createdAt: ts("07:02:51"), body: "We’re hiring a morning baker, four days a week. Experience helps, early mornings are required.", thanks: 3, replies: 2 },
  { id: "p_0361", author: "marcus", createdAt: ts("06:48:09"), body: "Heads up: the Montrose bridge path is icy under the overpass.", thanks: 14, replies: 0, topic: "Safety" },
];

export const PAGE_SIZE = 5;
export const ROSA_POST = "p_0398";

const RUNS =
  "Porch runs in this page. The feed and sign-in you use are the same code paths the simulated neighbors use, and the release controls change what every session receives. Auth, the feed API, and the database are simulated services, and the logs, traces, and charts come from the requests this page processed.";

export const PORCH_INCIDENTS: IncidentDef[] = [
  {
    id: "signin",
    product: "porch",
    title: "Some neighbors are sent back to sign-in",
    kind: "Release",
    skills: ["Canary releases", "Comparing versions", "Rollback"],
    summary: "About a quarter of sign-ins end on the sign-in page again since the auth canary started.",
    lead:
      "Porch is a neighborhood network for Ravenswood in Chicago. At 10:31 auth 2.14.0 started as a canary on 25 percent of sign-ins. Since then about a quarter of neighbors who sign in land back on the sign-in page with “Your session ended.”",
    ticket: {
      from: "Theo Park",
      role: "Neighbor, help form",
      at: "10:36",
      body: "I type my password, it thinks for a second, then I’m back on the sign-in screen saying my session ended. Tried four times. My wife can sign in fine on her phone.",
    },
    objective:
      "Find what separates the sign-ins that fail from the ones that work, and stop the failures. The incident closes when sign-in success holds above 99 percent and you can sign in to Porch and see the feed.",
    steps: [
      "Sign in to Porch in the support view. Your browser is in the same group as Theo’s, so you will see what he sees.",
      "In Overview, compare sign-in success by auth version. Then search the logs for 401.",
      "Read docs/session-tokens.md and the 2.14.0 release note. Work out why feed-api rejects these sessions.",
      "Choose a mitigation in Releases and config, then sign in again.",
    ],
    checks: [
      { id: "bounces", label: `No sign-in is sent back by a rejected session for ${CLEAN_WINDOW_S} seconds` },
      { id: "mine", label: "You sign in to Porch and your feed loads" },
    ],
    review: {
      cause:
        "Auth 2.14.0 rotated session signing to a new key, porch-2026-11, before that key was published. Sign-in itself succeeded, and feed-api rejected the very next request because it could not verify the signature. The web app treats a 401 as an expired session, so neighbors landed back on the sign-in page with no error worth reporting.",
      fix:
        "Rolling the canary back to 0 percent stops new sessions from being signed with the unpublished key. Publishing the key is the fix forward; feed-api picks it up on its next 30-second refresh, and then 2.14.0 can continue its rollout.",
      practice:
        "Compare a canary with the baseline on the same customer outcome, here sign-in through to the first page. Publish a new key and wait for every verifier’s cache to refresh before anything signs with it. A rollback is the right first move when the canary is the only thing that changed.",
    },
    runs: RUNS,
    files: porchFiles("signin"),
  },
  {
    id: "missing-posts",
    product: "porch",
    title: "Posts go missing from the feed",
    kind: "Programming",
    skills: ["JavaScript", "Cursor pagination", "Synthetic monitoring"],
    summary: "Some posts never appear when neighbors scroll, including one about a lost cat.",
    lead:
      "Rosa posted about her lost cat at 9:00 this morning. The post is on her profile, and neighbors who scroll the Porch feed never see it. The feed audit has reported missing posts on every run since feed-api 3.1 went out yesterday.",
    ticket: {
      from: "Rosa Delgado",
      role: "Neighbor, help form",
      at: "10:30",
      body: "I posted about Biscuit at 9 and nobody has replied, which never happens here. My neighbor Theo scrolled through his whole feed with me on the phone and it isn’t there. It shows up on my own page.",
    },
    objective:
      "Find why the feed skips posts and fix the pagination code. The incident closes when the feed audit finds no missing posts and Rosa’s post appears in Theo’s feed.",
    steps: [
      "In the support view you are Theo. Scroll the feed with Show more posts and look for Rosa’s post.",
      "Open Rosa’s profile from any of her posts and note when the missing post was created. Compare it with the post above it in the feed.",
      "Read feed-api/src/paginate.js and the feed audit logs.",
      "Fix feedPage, run the tests, deploy, and scroll Theo’s feed again.",
    ],
    checks: [
      { id: "audit", label: "The feed audit finds no missing or repeated posts on two runs in a row" },
      { id: "rosa", label: "Rosa’s post about Biscuit appears in Theo’s feed" },
    ],
    review: {
      cause:
        "Feed-api 3.1 paged with a cursor of the last post’s createdAt and asked for posts strictly older than it. Posts synced from the mobile app’s offline queue share a createdAt second, so when a page ended on the first of two posts from 09:00:00, the second one was older than nothing and newer than nothing. It never came back.",
      fix:
        "Make the cursor match the sort order: carry both createdAt and id, and continue with posts whose createdAt is older, or equal with a smaller id. Every post now has exactly one place in the sequence.",
      practice:
        "A cursor must be unique and follow the exact sort order, which usually means adding a tiebreaker column. Duplicates in real timestamps are normal. A synthetic monitor that pages through a known feed catches skipped rows that no error rate will show.",
    },
    runs: RUNS,
    files: porchFiles("missing-posts"),
    editable: { path: "feed-api/src/paginate.js", exports: ["feedPage"], testPath: "feed-api/src/paginate.test.js" },
  },
  {
    id: "slow-posts",
    product: "porch",
    title: "A gas leak warning never reached the neighbors",
    kind: "Capacity",
    skills: ["Queues and partitions", "Consumer lag", "Fan-out on write and read"],
    summary: "Some neighbors’ posts take twenty minutes to reach anyone’s feed, while others arrive in seconds.",
    lead:
      "Since about 10:20, some neighbors’ posts take many minutes to reach their followers’ feeds while others arrive within seconds. Nothing is failing: the API accepts every post and feed pages load quickly. The Ravenswood Chamber of Commerce started importing its holiday events calendar at 10:20.",
    ticket: {
      from: "Hal Brennan",
      role: "Neighbor, help form",
      at: "10:44",
      body: "I posted a gas leak warning for Leland and Hermitage at 10:41 and my neighbor June says it isn’t on her Porch. Peoples Gas is here now. Other people’s posts are showing up for her, just not mine.",
    },
    objective:
      "Find out why some posts sit undelivered, and get every new post into followers’ feeds within a minute without making feeds slow to load. The incident closes when no post waits more than a minute to be delivered, feed pages stay under 300 ms at p95, and a post you write as Theo reaches June’s feed within a minute.",
    steps: [
      "As Theo, write a post. Switch the support view to June and look for it, and for Hal’s gas warning.",
      "In Overview, compare the oldest waiting post on partition 3 with the other partitions. Filter the logs to fanout.",
      "Open the trace of a delivered post and find where the time went. Read docs/feed-fanout.md.",
      "Change the fanout settings in Releases and config, then post again as Theo and check June’s feed.",
    ],
    checks: [
      { id: "late", label: `No post waits more than a minute to reach feeds, for ${CLEAN_WINDOW_S} seconds` },
      { id: "reads", label: "Feed pages load in under 300 ms at p95" },
      { id: "mine", label: "A post you write as Theo reaches June’s feed within a minute" },
    ],
    review: {
      cause:
        "Feed-fanout 5.2.0 started choosing the partition from the author id, so each author’s posts are copied in order. At 10:20 the Chamber’s calendar import began posting an event every 4.5 seconds, each copied into 48,210 feeds, and every one of those jobs landed on partition 3. One consumer drains a partition at about 6,000 feed writes per second, so partition 3 fell further behind every minute. Neighbors whose posts also map to partition 3, Hal and Theo among them, waited behind millions of event writes while the API and feed reads stayed healthy.",
      fix:
        "Fanning out on read for accounts above 25,000 or 10,000 followers takes the Chamber out of the write path: its queued jobs are dropped and feed-api merges its posts in when a feed loads, for about 12 ms per account. Partition 3 drained in seconds and posts went back to arriving within seconds. Adding consumers did nothing, because a partition is read by one consumer at a time. Pausing the import only stopped the backlog from growing, and rolling fanout back to 5.1.4 spread new jobs but left the queued ones where they were.",
      practice:
        "Measure consumer lag per partition as the age of the oldest waiting item, because a total throughput graph hides one stuck partition. Serve very large accounts with fan-out on read, and send bulk imports through their own lower-priority queue. Before shipping a new partition key, check how real traffic spreads across it, including the largest senders.",
    },
    runs: "Porch runs in this page. Every post, including the ones you write, goes through the same fanout queue as the simulated neighbors’ posts, and the feeds you open show what each neighbor’s feed holds at that moment. The fanout workers, the events import, and feed-api are simulated services, and the logs, traces, and charts come from the work they did.",
    files: porchFiles("slow-posts"),
  },
];

export const PORCH: ProductDef = {
  id: "porch",
  name: "Porch",
  domain: "porch.community",
  kind: "Neighborhood network",
  description: "Lost pets, free couches, street closures, and the new bakery, for one Chicago neighborhood.",
  incidents: PORCH_INCIDENTS,
};

type Paginate = {
  feedPage: (posts: Post[], cursor: unknown, limit: number) => { items: Post[]; nextCursor: unknown };
};

type FeedResult = { items: Post[]; nextCursor: unknown; error?: string };

const MY_BUCKET = 0.12;

type Job = { post: string; author: string; followers: number; remaining: number; at: number };
export type LivePost = Post & { postedAt: number; partition: number; followers: number; deliveredAt?: number; mine?: boolean };
export type TimelineItem = { kind: "post"; post: LivePost | Post } | { kind: "events"; events: LivePost[] };
export type PartitionStat = { partition: number; consumer: string; waiting: number; oldest: number; rate: number; head?: string };

const SCRIPTED: { at: [number, number, number]; id: string; author: string; body: string; topic?: Post["topic"] }[] = [
  { at: [10, 33, 0], id: "p_0437", author: "ward47", body: "Leaf pickup ends December 5. Bags at the curb by 7 AM on your regular day.", topic: "Safety" },
  { at: [10, 39, 5], id: "p_0440", author: "priya", body: "Found: a set of keys on a red lanyard outside Sulzer library. They’re at the front desk.", topic: "Lost and found" },
  { at: [10, 41, 20], id: "p_0443", author: "hal", body: "Strong gas smell at Leland and Hermitage. Peoples Gas is on the way. Please keep kids and dogs off the block until they clear it.", topic: "Safety" },
  { at: [10, 42, 30], id: "p_0444", author: "june", body: "Is anyone else smelling gas near Hermitage? We’ve closed the windows.", topic: "Safety" },
  { at: [10, 44, 10], id: "p_0446", author: "marcus", body: "The line at the Lincoln Ave bakery is around the block. Worth it." },
];

const isoAt = (t: number) => ts(new Date(t).toTimeString().slice(0, 8));
const formatWait = (seconds: number) => (seconds >= 120 ? `${Math.round(seconds / 60)} min` : `${Math.round(seconds)} s`);

export class PorchRuntime extends LabRuntime {
  canary = 25;
  keyPublished = false;
  jwksHasNewKey = false;
  private jwksRefreshAt = 0;
  private lastBounceAt?: number;
  private nextSignIn?: number;
  private nextAudit?: number;
  private paginate: Paginate;
  private auditRuns: { t: number; missing: number; repeated: number; version: string }[] = [];
  private fixAt?: number;
  mySignIns: { t: number; ok: boolean; version: string }[] = [];
  seenRosa = false;
  consumers = PARTITIONS;
  importPaused = false;
  readThreshold = 0;
  fanoutVersion = "5.2.0";
  imported = 0;
  readonly feedPosts = new Map<string, LivePost>();
  private queues: Job[][] = Array.from({ length: PARTITIONS }, () => []);
  private rates: number[] = new Array(PARTITIONS).fill(0);
  private importStart = 0;
  private nextImportAt = 0;
  private nextPost?: number;
  private primed = false;
  private rebalanceUntil = 0;
  private lastLateAt?: number;
  private reads: { t: number; ms: number }[] = [];
  private jobSeq = 0;
  private logAt = 0;
  private scriptedAt: number[] = [];
  private mineCount = 0;

  constructor(incident: IncidentDef) {
    super(incident, incident.id === "signin" ? 214 : incident.id === "slow-posts" ? 52 : 31);
    const at = (h: number, m: number) => {
      const date = new Date(this.now);
      date.setHours(h, m, 0, 0);
      return date.getTime();
    };
    const day = 24 * 3600_000;
    this.paginate = compileModule<Paginate>(PAGINATE_V31, ["feedPage"]);
    if (incident.id === "signin") {
      this.addRelease({ service: "auth", version: "2.13.4", t: at(15, 12) - 3 * day, author: "nadia.r", note: "Rate-limit password attempts per account", state: "live", traffic: 100 });
      this.addRelease({ service: "auth", version: "2.14.0", t: at(10, 31), author: "felix.m", note: "Sign sessions with the new key porch-2026-11", state: "canary", traffic: 25 });
      this.releases[1].traffic = 75;
      this.code = undefined;
    } else if (incident.id === "slow-posts") {
      this.canary = 0;
      this.keyPublished = true;
      this.jwksHasNewKey = true;
      this.addRelease({ service: "feed-fanout", version: "5.1.4", t: at(16, 20) - 6 * day, author: "ola.b", note: "Retry feed writes that time out", state: "live", source: PARTITION_V514 });
      this.addRelease({ service: "feed-fanout", version: "5.2.0", t: at(11, 5) - 2 * day, author: "ola.b", note: "Partition fanout jobs by author so each author’s posts stay in order", state: "live", source: PARTITION_V520 });
      this.importStart = at(10, 20);
      this.nextImportAt = this.importStart;
      this.scriptedAt = SCRIPTED.map((item) => {
        const date = new Date(this.now);
        date.setHours(...item.at, 0);
        return date.getTime();
      });
      this.code = undefined;
    } else {
      this.canary = 0;
      this.keyPublished = true;
      this.jwksHasNewKey = true;
      this.addRelease({ service: "feed-api", version: "3.0.9", t: at(11, 40) - 2 * day, author: "ines.k", note: "Hide posts from blocked neighbors", state: "previous", rollback: { allowed: false, reason: "Missing the blocked-neighbors migration that ran yesterday." } });
      this.addRelease({ service: "feed-api", version: "3.1.0", t: at(14, 5) - day, author: "ines.k", note: "Cursor pagination for the home feed", state: "live", source: PAGINATE_V31 });
      this.code = {
        files: porchFiles("missing-posts"),
        path: "feed-api/src/paginate.js",
        exportNames: ["feedPage"],
        testSource: PAGINATE_TESTS,
        replay: {
          fn: "feedPage",
          inputs: () => [[POSTS, null, PAGE_SIZE]],
          judge: (outputs) => ({ ok: outputs.every((value) => value && typeof value === "object"), summary: "Replayed Theo’s first feed page" }),
        },
      };
    }
  }

  protected codeService() {
    return "feed-api";
  }

  protected install(mod: unknown) {
    this.paginate = mod as Paginate;
    this.fixAt = this.now;
  }

  get canaryRelease() {
    return this.releases.find((release) => release.version === "2.14.0");
  }

  setCanary(percent: number) {
    const release = this.canaryRelease;
    const base = this.releases.find((item) => item.version === "2.13.4");
    if (!release || !base) return;
    const value = Math.max(0, Math.min(100, Math.round(percent)));
    if (value === this.canary) return;
    this.canary = value;
    release.traffic = value;
    base.traffic = 100 - value;
    release.state = value === 0 ? "rolled back" : value === 100 ? "live" : "canary";
    base.state = value === 100 ? "previous" : "live";
    this.telemetry.mark(this.now, `auth 2.14.0 at ${value}%`);
    this.telemetry.log(this.now, "info", "deploy", `auth 2.14.0 traffic set to ${value}%`, { by: "you" }, { mine: true });
    this.touch();
  }

  publishKey() {
    if (this.keyPublished) return;
    this.keyPublished = true;
    this.telemetry.mark(this.now, "Key porch-2026-11 published");
    this.telemetry.log(this.now, "info", "auth", "signing key published to JWKS", { kid: "porch-2026-11", by: "you" }, { mine: true });
    this.touch();
  }

  simulate(from: number, to: number) {
    if (this.incident.id === "signin") this.simulateSignIns(from, to);
    else if (this.incident.id === "slow-posts") this.simulateFanout(from, to);
    else this.simulateFeed(from, to);
  }

  protected onReleaseChange(release: Release) {
    if (release.service !== "feed-fanout") return;
    this.fanoutVersion = release.version;
  }

  mergedAtRead(author: string) {
    return this.readThreshold > 0 && (ACCOUNTS[author]?.followers ?? 0) > this.readThreshold;
  }

  private partitionFor(author: string, rng = this.rng) {
    this.jobSeq += 1;
    if (this.fanoutVersion === "5.1.4") return this.jobSeq % PARTITIONS;
    return ACCOUNTS[author]?.partition ?? Math.floor(rng() * PARTITIONS);
  }

  private publish(t: number, post: Omit<LivePost, "partition" | "postedAt" | "createdAt" | "thanks" | "replies"> & { createdAt?: string }, quiet: boolean, keep: boolean) {
    const partition = this.partitionFor(post.author);
    const full: LivePost = { thanks: 0, replies: 0, createdAt: isoAt(t), ...post, postedAt: t, partition };
    if (keep) this.feedPosts.set(full.id, full);
    const skipped = this.mergedAtRead(post.author);
    if (!skipped) this.queues[partition].push({ post: post.id, author: post.author, followers: post.followers, remaining: post.followers, at: t });
    if (!quiet) {
      const service = post.author === "chamber" ? "events-import" : "api";
      this.telemetry.log(t, "info", service, post.author === "chamber" ? "event posted" : "post created", { post_id: post.id, author: post.author === "chamber" ? "ravenswood-chamber" : post.author, followers: post.followers, partition: skipped ? "read-time" : partition }, { mine: post.mine });
    }
    return full;
  }

  post(author: string, body: string) {
    this.mineCount += 1;
    const followers = ACCOUNTS[author]?.followers ?? 600;
    const post = this.publish(this.now, { id: `p_you_${this.mineCount}`, author, body, followers, mine: true }, false, true);
    this.touch();
    return post;
  }

  private deliver(job: Job, t: number, quiet: boolean) {
    const post = this.feedPosts.get(job.post);
    if (post) post.deliveredAt = t;
    const wait = (t - job.at) / 1000;
    if (quiet) return;
    const tel = this.telemetry;
    tel.observe(t, "deliver.s", wait);
    const partition = post?.partition ?? -1;
    const named = Boolean(post) || this.rng() < 0.3;
    if (!named) return;
    tel.log(t, wait > 60 ? "warn" : "info", "fanout", "post delivered", { post_id: job.post, author: job.author === "chamber" ? "ravenswood-chamber" : job.author, feeds: job.followers, waited_s: Math.round(wait) }, { mine: post?.mine });
    const traceId = hex(this.rng, 16);
    const root = hex(this.rng, 8);
    const writeMs = (job.followers / WRITES_PER_S) * 1000;
    const total = t - job.at;
    const queued = Math.max(0, total - writeMs - 47);
    const consumer = partition >= 0 ? `fanout-${partition}` : "fanout";
    tel.trace({
      id: traceId,
      t: job.at,
      name: "POST /posts",
      duration: total,
      error: wait > 60 ? "delivered late" : undefined,
      spans: [
        { id: root, service: "api", name: "POST /posts", start: 0, duration: total },
        { id: hex(this.rng, 8), parentId: root, service: "api", name: "save post", start: 0, duration: 38 },
        { id: hex(this.rng, 8), parentId: root, service: "fanout", name: "enqueue fanout job", start: 38, duration: 9, attrs: { partition: partition >= 0 ? partition : "unknown" } },
        { id: hex(this.rng, 8), parentId: root, service: "fanout", name: "wait in partition queue", start: 47, duration: queued, error: wait > 60 ? "waited behind other jobs" : undefined, attrs: { partition: partition >= 0 ? partition : "unknown" } },
        { id: hex(this.rng, 8), parentId: root, service: consumer, name: `write ${job.followers.toLocaleString()} feeds`, start: 47 + queued, duration: writeMs, attrs: { feeds: job.followers } },
      ],
      attrs: { post_id: job.post, author: job.author, followers: job.followers },
      mine: post?.mine,
    });
  }

  private fanoutStep(from: number, to: number, quiet: boolean) {
    const rng = this.rng;
    while (!this.importPaused && this.imported < IMPORT_TOTAL && this.nextImportAt < to) {
      const t = this.nextImportAt;
      this.imported += 1;
      const body = CHAMBER_EVENTS[(this.imported - 1) % CHAMBER_EVENTS.length];
      this.publish(t, { id: `evt_${String(this.imported).padStart(4, "0")}`, author: "chamber", body, topic: "Events", followers: ACCOUNTS.chamber.followers }, quiet, true);
      this.nextImportAt += IMPORT_EVERY_MS;
    }
    SCRIPTED.forEach((item, index) => {
      const t = this.scriptedAt[index];
      if (t >= from && t < to) this.publish(t, { id: item.id, author: item.author, body: item.body, topic: item.topic, followers: ACCOUNTS[item.author].followers }, quiet, true);
    });
    if (this.nextPost === undefined) this.nextPost = from;
    while (this.nextPost < to) {
      const followers = Math.round(Math.min(2_400, lognormal(rng, 520, 0.55)));
      this.publish(this.nextPost, { id: `p_${hex(rng, 6)}`, author: `n_${hex(rng, 5)}`, body: "", followers }, true, false);
      this.nextPost += (-Math.log(1 - rng()) / 0.3) * 1000;
    }
    const start = Math.max(from, Math.min(to, this.rebalanceUntil));
    const seconds = (to - start) / 1000;
    for (let partition = 0; partition < PARTITIONS; partition++) {
      const queue = this.queues[partition];
      const budget = WRITES_PER_S * seconds;
      let left = budget;
      while (queue.length && left > 0) {
        const job = queue[0];
        if (this.mergedAtRead(job.author)) {
          queue.shift();
          continue;
        }
        const take = Math.min(left, job.remaining);
        job.remaining -= take;
        left -= take;
        if (job.remaining <= 0) {
          queue.shift();
          this.deliver(job, start + ((budget - left) / WRITES_PER_S) * 1000, quiet);
        }
      }
      this.rates[partition] = seconds > 0 ? (budget - left) / ((to - from) / 1000) : 0;
    }
  }

  private simulateFanout(from: number, to: number) {
    if (!this.primed) {
      this.primed = true;
      for (let t = this.importStart; t < from; t += 1000) this.fanoutStep(t, Math.min(from, t + 1000), true);
    }
    this.fanoutStep(from, to, false);
    const tel = this.telemetry;
    const stats = this.partitionStats(to);
    const ages = stats.map((stat) => stat.oldest);
    const others = stats.filter((stat) => stat.partition !== 3);
    tel.observe(to, "lag.p3", ages[3]);
    tel.observe(to, "lag.other", Math.max(...others.map((stat) => stat.oldest)));
    tel.observe(to, "backlog.p3", stats[3].waiting);
    tel.observe(to, "backlog.other", others.reduce((sum, stat) => sum + stat.waiting, 0));
    if (Math.max(...ages) > 60) this.lastLateAt = to;
    const merged = largeAccounts(this.readThreshold);
    const reads = Math.floor(((to - from) / 1000) * 3 + this.rng());
    for (let i = 0; i < reads; i++) {
      const t = from + this.rng() * (to - from);
      const ms = lognormal(this.rng, 68, 0.28) + merged * 12 * (0.8 + this.rng() * 0.4);
      tel.observe(t, "feed.ms", ms);
      this.reads.push({ t, ms });
    }
    this.reads = this.reads.filter((read) => read.t > to - 60_000);
    if (to - this.logAt >= 10_000) {
      this.logAt = to;
      for (const stat of stats) {
        if (!stat.waiting) continue;
        tel.log(to, stat.oldest > 60 ? "warn" : "info", "fanout", "partition lag", { partition: stat.partition, consumer: stat.consumer, waiting_writes: Math.round(stat.waiting), oldest_wait_s: Math.round(stat.oldest), writes_per_s: Math.round(stat.rate), head_job: stat.head ?? "none" });
      }
      if (Math.floor(to / 30_000) !== Math.floor((to - 10_000) / 30_000)) {
        tel.log(to, "info", "fanout", "consumer group", { partitions: PARTITIONS, consumers: this.consumers, idle: Math.max(0, this.consumers - PARTITIONS) });
      }
    }
  }

  partitionStats(t = this.now): PartitionStat[] {
    return this.queues.map((queue, partition) => ({
      partition,
      consumer: `fanout-${partition}`,
      waiting: queue.reduce((sum, job) => sum + job.remaining, 0),
      oldest: queue.length ? Math.max(0, (t - queue[0].at) / 1000) : 0,
      rate: this.rates[partition],
      head: queue[0]?.post,
    }));
  }

  setConsumers(count: number) {
    if (count === this.consumers) return;
    const before = this.consumers;
    this.consumers = count;
    this.rebalanceUntil = this.now + 5_000;
    this.telemetry.mark(this.now, `Fanout consumers ${before} to ${count}`);
    this.telemetry.log(this.now, "info", "fanout", "rebalance started", { consumers: count, partitions: PARTITIONS, by: "you" }, { mine: true });
    this.telemetry.log(this.now + 5_000, count > PARTITIONS ? "warn" : "info", "fanout", "rebalance complete", { consumers: count, assigned: Math.min(count, PARTITIONS), idle: Math.max(0, count - PARTITIONS) }, { mine: true });
    this.touch();
  }

  setImportPaused(paused: boolean) {
    if (paused === this.importPaused) return;
    this.importPaused = paused;
    if (!paused) this.nextImportAt = Math.max(this.nextImportAt, this.now);
    this.telemetry.mark(this.now, paused ? "Events import paused" : "Events import resumed");
    this.telemetry.log(this.now, "info", "events-import", paused ? "import paused" : "import resumed", { posted: this.imported, total: IMPORT_TOTAL, by: "you" }, { mine: true });
    this.touch();
  }

  setReadThreshold(threshold: number) {
    if (threshold === this.readThreshold) return;
    this.readThreshold = threshold;
    const accounts = largeAccounts(threshold);
    this.telemetry.mark(this.now, threshold ? `Fan out on read above ${threshold.toLocaleString()}` : "Fan out on read off");
    this.telemetry.log(this.now, "info", "feed-api", "read-time accounts changed", { threshold: threshold || "off", accounts, by: "you" }, { mine: true });
    this.touch();
  }

  postsBy(author: string) {
    const live = [...this.feedPosts.values()].filter((post) => post.author === author).sort((a, b) => b.postedAt - a.postedAt);
    return [...live, ...POSTS.filter((post) => post.author === author)];
  }

  timeline(viewer: string): TimelineItem[] {
    const visible = (post: LivePost) => post.author === viewer || (post.deliveredAt !== undefined && post.deliveredAt <= this.now) || this.mergedAtRead(post.author);
    const posts = [...this.feedPosts.values()].filter((post) => post.author !== "chamber" && visible(post));
    const events = [...this.feedPosts.values()].filter((post) => post.author === "chamber" && visible(post)).sort((a, b) => b.postedAt - a.postedAt);
    const items: { at: number; item: TimelineItem }[] = posts.map((post) => ({ at: post.postedAt, item: { kind: "post", post } }));
    if (events.length) items.push({ at: events[0].postedAt, item: { kind: "events", events } });
    items.sort((a, b) => b.at - a.at);
    return [...items.map((entry) => entry.item), ...POSTS.map((post) => ({ kind: "post" as const, post }))];
  }

  private fanoutChecks(): CheckState[] {
    const stats = this.partitionStats();
    const worst = stats.reduce((best, stat) => (stat.oldest > best.oldest ? stat : best), stats[0]);
    const late = cleanCheck("late", this.incident.checks[0].label, this.now, this.lastLateAt);
    if (!late.done && worst.oldest > 60) late.detail = `Oldest post has waited ${formatWait(worst.oldest)}, on partition ${worst.partition}`;
    const p95 = quantile(this.reads.filter((read) => read.t > this.now - CLEAN_WINDOW_S * 1000).map((read) => read.ms), 0.95);
    const mine = [...this.feedPosts.values()].filter((post) => post.mine && post.author === "theo");
    const fast = mine.find((post) => post.deliveredAt !== undefined && post.deliveredAt - post.postedAt <= 60_000);
    const waiting = mine.find((post) => post.deliveredAt === undefined);
    return [
      late,
      { id: "reads", label: this.incident.checks[1].label, done: p95 !== null && p95 < 300, detail: p95 === null ? "Waiting for feed reads" : `p95 ${Math.round(p95)} ms over the last ${CLEAN_WINDOW_S} seconds` },
      {
        id: "mine",
        label: this.incident.checks[2].label,
        done: Boolean(fast),
        detail: fast
          ? `Delivered ${Math.max(1, Math.round((fast.deliveredAt! - fast.postedAt) / 1000))} s after you posted`
          : waiting
            ? `Posted ${Math.round((this.now - waiting.postedAt) / 1000)} s ago, waiting on partition ${waiting.partition}`
            : mine.length
              ? "Delivered too late, post again"
              : "Not yet",
      },
    ];
  }

  private refreshJwks(t: number) {
    if (t < this.jwksRefreshAt) return;
    this.jwksRefreshAt = Math.floor(t / 30_000) * 30_000 + 30_000;
    this.jwksHasNewKey = this.keyPublished;
    this.telemetry.log(t, "info", "feed-api", "jwks refreshed", { keys: this.keyPublished ? 2 : 1, kids: this.keyPublished ? "porch-2026-09,porch-2026-11" : "porch-2026-09" });
  }

  private canaryAt(t: number) {
    return t < this.releases.find((item) => item.version === "2.14.0")!.t ? 0 : this.canary;
  }

  signIn(u: number, t: number, mine: boolean) {
    this.refreshJwks(t);
    const rng = this.rng;
    const onCanary = u < this.canaryAt(t) / 100;
    const version = onCanary ? "2.14.0" : "2.13.4";
    const kid = onCanary ? "porch-2026-11" : "porch-2026-09";
    const traceId = hex(rng, 16);
    const root = hex(rng, 8);
    const login = Math.round(lognormal(rng, 140, 0.25));
    const feed = Math.round(lognormal(rng, 90, 0.3));
    const rejected = onCanary && !this.jwksHasNewKey;
    const user = mine ? "theo.park" : `n_${hex(rng, 5)}`;
    const spans: Span[] = [
      { id: root, service: "web", name: "sign in", start: 0, duration: login + feed + 20 },
      { id: hex(rng, 8), parentId: root, service: "auth", name: "POST /session", start: 8, duration: login, attrs: { version, kid } },
      { id: hex(rng, 8), parentId: root, service: "feed-api", name: "GET /feed", start: login + 14, duration: feed, error: rejected ? "401 unknown kid" : undefined, attrs: { kid } },
    ];
    const flags = { traceId, mine };
    const tel = this.telemetry;
    tel.log(t, "info", "auth", "session issued", { user, version, kid }, flags);
    tel.count(t, "signin.total");
    tel.count(t, `signin.total.${version}`);
    if (rejected) {
      tel.log(t + login + 14, "error", "feed-api", "401 token rejected", { user, reason: "unknown signing key", kid }, flags);
      tel.log(t + login + feed + 20, "warn", "web", "session ended, sent to sign-in", { user, status: 401 }, flags);
      tel.count(t, "feed.401");
      this.lastBounceAt = t;
    } else {
      tel.count(t, "signin.ok");
      tel.count(t, `signin.ok.${version}`);
    }
    tel.trace({ id: traceId, t, name: "sign in", duration: login + feed + 20, error: rejected ? "401 from feed-api" : undefined, spans, attrs: { user, version, kid }, mine });
    return { ok: !rejected, version, ms: login + feed + 20 };
  }

  mySignIn() {
    const result = this.signIn(MY_BUCKET, this.now, true);
    this.mySignIns.unshift({ t: this.now, ok: result.ok, version: result.version });
    this.touch();
    return result;
  }

  private simulateSignIns(from: number, to: number) {
    if (this.nextSignIn === undefined) this.nextSignIn = from;
    while (this.nextSignIn < to) {
      this.signIn(this.rng(), this.nextSignIn, false);
      this.nextSignIn += (-Math.log(1 - this.rng()) / 1.6) * 1000;
    }
    this.refreshJwks(to);
  }

  feedPage(cursor: unknown): FeedResult {
    const t = this.now;
    const traceId = hex(this.rng, 16);
    const ms = Math.round(lognormal(this.rng, 70, 0.3));
    try {
      const page = this.paginate.feedPage(POSTS, cursor, PAGE_SIZE);
      if (!page || !Array.isArray(page.items)) throw new Error("feedPage returned no items array");
      this.telemetry.log(t, "info", "feed-api", "feed page", { user: "theo.park", cursor: cursor ? JSON.stringify(cursor) : "none", returned: page.items.length, next: page.nextCursor ? "yes" : "no" }, { mine: true, traceId });
      this.telemetry.trace({ id: traceId, t, name: "GET /feed", duration: ms, spans: [{ id: hex(this.rng, 8), service: "feed-api", name: "GET /feed", start: 0, duration: ms, attrs: { cursor: cursor ? JSON.stringify(cursor) : "none", returned: page.items.length } }], attrs: { user: "theo.park", returned: page.items.length }, mine: true });
      if (page.items.some((post) => post.id === ROSA_POST)) {
        this.seenRosa = true;
      }
      this.touch();
      return page;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.telemetry.log(t, "error", "feed-api", "feed page failed", { user: "theo.park", error: message }, { mine: true, traceId });
      this.touch();
      return { items: [], nextCursor: null, error: message };
    }
  }

  private simulateFeed(from: number, to: number) {
    if (this.nextAudit === undefined) this.nextAudit = Math.ceil(from / 20_000) * 20_000;
    while (this.nextAudit < to) {
      this.audit(this.nextAudit);
      this.nextAudit += 20_000;
    }
    const pages = Math.floor((to - from) / 1000 * 3 + this.rng());
    for (let i = 0; i < pages; i++) {
      const t = from + this.rng() * (to - from);
      const ms = Math.round(lognormal(this.rng, 70, 0.3));
      this.telemetry.observe(t, "feed.ms", ms);
      this.telemetry.count(t, "feed.pages");
    }
  }

  private audit(t: number) {
    const rng = seeded(Math.floor(t / 1000));
    const posts: Post[] = [];
    let second = 3600 * 10;
    for (let i = 120; i > 0; i--) {
      if (rng() > 0.25) second -= 1 + Math.floor(rng() * 40);
      const hh = String(Math.floor(second / 3600)).padStart(2, "0");
      const mm = String(Math.floor((second % 3600) / 60)).padStart(2, "0");
      const ss = String(second % 60).padStart(2, "0");
      posts.push({ id: `a_${String(i).padStart(4, "0")}`, author: "audit", createdAt: ts(`${hh}:${mm}:${ss}`), body: "", thanks: 0, replies: 0 });
    }
    const seen = new Map<string, number>();
    let cursor: unknown = null;
    let error: string | undefined;
    for (let page = 0; page < 60; page++) {
      try {
        const result = this.paginate.feedPage(posts, cursor, 10);
        for (const post of result.items) seen.set(post.id, (seen.get(post.id) ?? 0) + 1);
        cursor = result.nextCursor;
        if (!cursor) break;
      } catch (caught) {
        error = caught instanceof Error ? caught.message : String(caught);
        break;
      }
    }
    const missing = posts.filter((post) => !seen.has(post.id)).length;
    const repeated = [...seen.values()].filter((count) => count > 1).length;
    const version = this.live("feed-api")?.version ?? "3.1.0";
    this.auditRuns.push({ t, missing, repeated, version });
    this.auditRuns = this.auditRuns.slice(-80);
    this.telemetry.count(t, "audit.missing", missing);
    this.telemetry.count(t, "audit.repeated", repeated);
    this.telemetry.count(t, "audit.runs");
    const level = error || missing || repeated ? "warn" : "info";
    this.telemetry.log(t, level, "feed-audit", error ? "audit failed" : "audit complete", { posts: 120, missing, repeated, feed_api: version, ...(error ? { error } : {}) });
  }

  charts(): ChartSpec[] {
    const tel = this.telemetry;
    const from = this.now - 20 * 60_000;
    const to = this.now;
    const perMin = 60_000 / tel.bucketMs;
    if (this.incident.id === "slow-posts") {
      return [
        {
          id: "lag",
          title: "Oldest post waiting for fanout",
          unit: "s",
          help: "How long the oldest job in each partition has been waiting to be copied into feeds.",
          series: [
            { label: "Partition 3", points: tel.series("lag.p3", from, to, "p95"), tone: "bad" },
            { label: "Other partitions", points: tel.series("lag.other", from, to, "p95"), tone: "primary" },
          ],
          threshold: { value: 60, label: "Objective 1 min" },
        },
        {
          id: "backlog",
          title: "Feed writes waiting",
          unit: "count",
          help: "Copies of posts still to be written into followers’ feeds. One post to 48,000 followers is 48,000 writes.",
          series: [
            { label: "Partition 3", points: tel.series("backlog.p3", from, to, "mean"), tone: "bad" },
            { label: "Other partitions", points: tel.series("backlog.other", from, to, "mean"), tone: "primary" },
          ],
        },
        {
          id: "reads",
          title: "Feed page latency",
          unit: "ms",
          help: "Time for feed-api to return a neighbor’s feed, at the 95th percentile.",
          series: [{ label: "p95", points: tel.series("feed.ms", from, to, "p95"), tone: "primary" }],
          threshold: { value: 300, label: "Objective p95 300 ms" },
        },
      ];
    }
    if (this.incident.id === "signin") {
      return [
        {
          id: "signin",
          title: "Sign-in success",
          unit: "%",
          help: "Sign-ins that reach the home feed, as a share of all sign-ins. A sign-in that is sent back to the sign-in page counts as a failure.",
          series: [{ label: "All", points: tel.ratio("signin.ok", "signin.total", from, to), tone: "primary" }],
          threshold: { value: 99, label: "Objective 99%" },
          domain: [60, 100],
        },
        {
          id: "by-version",
          title: "Sign-in success by auth version",
          unit: "%",
          help: "The same measure split by the auth release that issued the session.",
          series: [
            { label: "2.13.4", points: tel.ratio("signin.ok.2.13.4", "signin.total.2.13.4", from, to), tone: "primary" },
            { label: "2.14.0", points: tel.ratio("signin.ok.2.14.0", "signin.total.2.14.0", from, to), tone: "bad" },
          ],
          domain: [0, 100],
        },
        {
          id: "401",
          title: "feed-api 401 responses",
          unit: "/min",
          help: "Requests feed-api rejected because it could not verify the session token.",
          series: [{ label: "401", points: tel.series("feed.401", from, to, "sum").map((p) => ({ t: p.t, v: (p.v ?? 0) * perMin })), tone: "bad" }],
        },
      ];
    }
    const runs = tel.series("audit.runs", from, to, "sum");
    const perRun = (key: string) =>
      tel.series(key, from, to, "sum").map((point, index) => ({
        t: point.t,
        v: runs[index].v ? (point.v ?? 0) / runs[index].v! : null,
      }));
    return [
      {
        id: "audit",
        title: "Feed audit: posts never served",
        unit: "posts",
        help: "Posts in the audit’s 120-post test feed that did not come back while paging, per run. Both lines should sit at zero.",
        series: [
          { label: "Missing", points: perRun("audit.missing"), tone: "bad" },
          { label: "Repeated", points: perRun("audit.repeated"), tone: "muted" },
        ],
      },
      {
        id: "latency",
        title: "Feed page latency",
        unit: "ms",
        help: "Time for feed-api to return one page, at the 95th percentile. It stays flat, which is why no latency alert noticed the missing posts.",
        series: [{ label: "p95", points: tel.series("feed.ms", from, to, "p95"), tone: "primary" }],
      },
    ];
  }

  checks(): CheckState[] {
    if (this.incident.id === "slow-posts") return this.fanoutChecks();
    if (this.incident.id === "signin") {
      const mine = this.mySignIns.find((item) => item.ok);
      return [
        cleanCheck("bounces", this.incident.checks[0].label, this.now, this.lastBounceAt),
        { id: "mine", label: this.incident.checks[1].label, done: Boolean(mine), detail: mine ? `Signed in on ${mine.version}` : this.mySignIns.length ? "Sent back to sign-in" : "Not yet" },
      ];
    }
    const after = this.auditRuns.filter((run) => this.fixAt !== undefined && run.t > this.fixAt);
    const lastTwo = after.slice(-2);
    const clean = lastTwo.length === 2 && lastTwo.every((run) => run.missing === 0 && run.repeated === 0);
    const latest = this.auditRuns[this.auditRuns.length - 1];
    return [
      {
        id: "audit",
        label: this.incident.checks[0].label,
        done: clean,
        detail: latest ? `Last run: ${latest.missing} missing, ${latest.repeated} repeated${this.fixAt !== undefined && !clean ? `, ${lastTwo.length} of 2 runs since your deploy` : ""}` : "Waiting for the first run",
      },
      { id: "rosa", label: this.incident.checks[1].label, done: this.seenRosa && this.fixAt !== undefined, detail: this.seenRosa ? "Visible in the feed" : "Not in the feed yet" },
    ];
  }
}
