"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, CalendarDays, Heart, Home, Mail, MessageCircle, Users } from "lucide-react";
import {
  ACCOUNTS,
  IMPORT_TOTAL,
  NEIGHBORS,
  PARTITIONS,
  POSTS,
  READ_THRESHOLDS,
  largeAccounts,
  type LivePost,
  type Post,
  type PorchRuntime,
} from "@/lib/products/porch";
import { BrowserFrame } from "../BrowserFrame";
import "./porch.css";

type View = { name: "home" } | { name: "profile"; id: string };

function timeOf(iso: string) {
  const [h, m] = iso.slice(11, 16).split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function PorchApp({ runtime }: { runtime: PorchRuntime }) {
  const signin = runtime.incident.id === "signin";
  const fanout = runtime.incident.id === "slow-posts";
  const [viewer, setViewer] = useState<"theo" | "june">("theo");
  const [signedIn, setSignedIn] = useState(!signin);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<View>({ name: "home" });
  const [mine, setMine] = useState<Post[]>([]);
  const [draft, setDraft] = useState("");
  const [generation, setGeneration] = useState(0);

  async function submitSignIn() {
    setBusy(true);
    setNotice(null);
    const result = runtime.mySignIn();
    await sleep(result.ms + 250);
    if (result.ok) {
      setSignedIn(true);
      setView({ name: "home" });
    } else {
      setSignedIn(false);
      setNotice("Your session ended. Sign in again.");
    }
    setBusy(false);
  }

  const path = !signedIn ? "/sign-in" : view.name === "profile" ? `/neighbors/${view.id}` : "/";

  let body;
  if (!signedIn) {
    body = (
      <div className="pc-signin">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submitSignIn();
          }}
        >
          <span className="pc-mark" aria-hidden="true">
            <Home size={18} />
          </span>
          <h2>Sign in to Porch</h2>
          <p className="pc-muted">Ravenswood, Chicago</p>
          {notice ? (
            <p className="pc-notice" role="alert">
              {notice}
            </p>
          ) : null}
          <label>
            Email
            <input type="email" defaultValue="theo.park@fastmail.com" autoComplete="off" />
          </label>
          <label>
            Password
            <input type="password" defaultValue="porch-demo-password" autoComplete="off" />
          </label>
          <button type="submit" className="pc-primary" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <p className="pc-small">New to the neighborhood? Ask a neighbor for an invite.</p>
        </form>
      </div>
    );
  } else {
    const profile = view.name === "profile" ? NEIGHBORS[view.id] : null;
    body = (
      <div className="pc-layout">
        <aside className="pc-side">
          <p className="pc-logo">
            <span className="pc-mark" aria-hidden="true">
              <Home size={14} />
            </span>
            porch
          </p>
          <nav aria-label="Porch">
            <button type="button" aria-current={view.name === "home" ? "page" : undefined} onClick={() => setView({ name: "home" })}>
              <Home size={16} aria-hidden="true" /> Home
            </button>
            <button type="button">
              <Users size={16} aria-hidden="true" /> Neighbors
            </button>
            <button type="button">
              <CalendarDays size={16} aria-hidden="true" /> Events
            </button>
            <button type="button">
              <Mail size={16} aria-hidden="true" /> Messages
            </button>
            <button type="button">
              <Bell size={16} aria-hidden="true" /> Alerts
            </button>
          </nav>
          <div className="pc-me">
            <Avatar id={viewer} />
            <span>
              {NEIGHBORS[viewer].name}
              <small>{NEIGHBORS[viewer].street}</small>
            </span>
          </div>
        </aside>
        <div className="pc-main">
          {profile ? (
            <>
              <header className="pc-profile">
                <Avatar id={profile.id} size={52} />
                <div>
                  <h2>{profile.name}</h2>
                  <p className="pc-muted">{profile.street} · Neighbor since 2019</p>
                </div>
              </header>
              <ul className="pc-feed">
                {(fanout ? runtime.postsBy(profile.id) : POSTS.filter((post) => post.author === profile.id)).map((post) => (
                  <PostCard key={post.id} post={post} open={(id) => setView({ name: "profile", id })} exact />
                ))}
              </ul>
            </>
          ) : (
            <>
              <form
                className="pc-composer"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!draft.trim()) return;
                  if (fanout) runtime.post(viewer, draft.trim());
                  else setMine((items) => [{ id: `local-${items.length}`, author: "theo", createdAt: "", body: draft.trim(), thanks: 0, replies: 0 }, ...items]);
                  setDraft("");
                }}
              >
                <Avatar id={viewer} />
                <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Share something with Ravenswood" rows={2} aria-label="New post" />
                <button type="submit" className="pc-primary" disabled={!draft.trim()}>
                  Post
                </button>
              </form>
              {fanout ? (
                <Timeline key={`${viewer}-${generation}`} runtime={runtime} viewer={viewer} open={(id) => setView({ name: "profile", id })} />
              ) : (
                <Feed key={generation} runtime={runtime} mine={mine} open={(id) => setView({ name: "profile", id })} />
              )}
            </>
          )}
        </div>
        <aside className="pc-rail">
          <h3>This week in Ravenswood</h3>
          <ul>
            <li>
              <strong>Thu</strong> Leland closed 7 to 3 for the water main
            </li>
            <li>
              <strong>Fri</strong> Bakery opening on Lincoln, buns before 9
            </li>
            <li>
              <strong>Sat</strong> Farmers market, Wilson Ave gym, 8 to 1
            </li>
          </ul>
          <h3>Weather</h3>
          <p className="pc-muted">29°F, light snow after 4 PM.</p>
        </aside>
      </div>
    );
  }

  return (
    <BrowserFrame
      domain="porch.community"
      path={path}
      onReload={() => {
        setGeneration((value) => value + 1);
        setNotice(null);
      }}
      tools={
        fanout ? (
          <>
            <span className="pl-tools-label">Support view</span>
            <label>
              <span>Viewing as</span>
              <select
                value={viewer}
                onChange={(event) => {
                  setViewer(event.target.value as "theo" | "june");
                  setView({ name: "home" });
                }}
              >
                <option value="theo">Theo Park, Winchester Ave</option>
                <option value="june">June Whitaker, Hermitage Ave</option>
              </select>
            </label>
          </>
        ) : undefined
      }
    >
      <div className="pc-app">{body}</div>
    </BrowserFrame>
  );
}

function Feed({ runtime, mine, open }: { runtime: PorchRuntime; mine: Post[]; open: (id: string) => void }) {
  const [feed, setFeed] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<unknown>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const receive = useCallback(
    (from: unknown) => {
      const page = runtime.feedPage(from);
      setLoading(false);
      if (page.error) {
        setError("Something went wrong loading posts. Refresh to try again.");
        return;
      }
      setError(null);
      setFeed((items) => (from === null ? page.items : [...items, ...page.items]));
      setCursor(page.nextCursor);
      setDone(!page.nextCursor);
    },
    [runtime],
  );

  useEffect(() => {
    let live = true;
    void sleep(260).then(() => {
      if (live) receive(null);
    });
    return () => {
      live = false;
    };
  }, [receive]);

  return (
    <>
      <ul className="pc-feed" aria-label="Home feed">
        {mine.map((post) => (
          <PostCard key={post.id} post={post} open={open} />
        ))}
        {feed.map((post) => (
          <PostCard key={post.id} post={post} open={open} />
        ))}
      </ul>
      {error ? <p className="pc-notice">{error}</p> : null}
      {done ? (
        <p className="pc-end">You’re all caught up. That’s everything from the last day.</p>
      ) : (
        <button
          type="button"
          className="pc-more"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            await sleep(260);
            receive(cursor);
          }}
        >
          {loading ? "Loading…" : "Show more posts"}
        </button>
      )}
    </>
  );
}

function Avatar({ id, size = 36 }: { id: string; size?: number }) {
  const person = NEIGHBORS[id];
  return (
    <span className="pc-avatar" style={{ background: person.tone, width: size, height: size, fontSize: size * 0.36 }} aria-hidden="true">
      {person.name
        .split(" ")
        .slice(0, 2)
        .map((part) => part[0])
        .join("")}
    </span>
  );
}

function Timeline({ runtime, viewer, open }: { runtime: PorchRuntime; viewer: string; open: (id: string) => void }) {
  const [limit, setLimit] = useState(8);
  const items = runtime.timeline(viewer);
  const note = (post: Post | LivePost) => {
    if (!("mine" in post) || !post.mine || post.author !== viewer) return undefined;
    const count = post.followers.toLocaleString();
    return post.deliveredAt !== undefined && post.deliveredAt <= runtime.now ? `Shared with ${count} neighbors` : `Sharing with ${count} neighbors…`;
  };
  return (
    <>
      <ul className="pc-feed" aria-label="Home feed">
        {items.slice(0, limit).map((item) =>
          item.kind === "events" ? (
            <EventsCard key="events" events={item.events} open={open} />
          ) : (
            <PostCard key={item.post.id} post={item.post} open={open} note={note(item.post)} />
          ),
        )}
      </ul>
      {limit < items.length ? (
        <button type="button" className="pc-more" onClick={() => setLimit(limit + 8)}>
          Show more posts
        </button>
      ) : (
        <p className="pc-end">You’re all caught up. That’s everything from the last day.</p>
      )}
    </>
  );
}

function EventsCard({ events, open }: { events: LivePost[]; open: (id: string) => void }) {
  const latest = events[0];
  return (
    <li className="pc-post pc-events" data-post="chamber-events">
      <header>
        <Avatar id="chamber" />
        <div>
          <button type="button" className="pc-name" onClick={() => open("chamber")}>
            {NEIGHBORS.chamber.name}
          </button>
          <p className="pc-muted">
            Organization · <time dateTime={latest.createdAt}>{timeOf(latest.createdAt)}</time>
          </p>
        </div>
        <span className="pc-topic">Events</span>
      </header>
      <p className="pc-body">
        Added {events.length} holiday {events.length === 1 ? "event" : "events"} to the Ravenswood calendar.
      </p>
      <ul className="pc-event-list">
        {events.slice(0, 3).map((event) => (
          <li key={event.id}>
            <CalendarDays size={14} aria-hidden="true" /> {event.body}
          </li>
        ))}
      </ul>
      {events.length > 3 ? <p className="pc-muted pc-event-more">and {events.length - 3} more on the calendar</p> : null}
    </li>
  );
}

function PostCard({ post, open, exact = false, note }: { post: Post; open: (id: string) => void; exact?: boolean; note?: string }) {
  const person = NEIGHBORS[post.author];
  return (
    <li className="pc-post" data-post={post.id}>
      <header>
        <Avatar id={post.author} />
        <div>
          <button type="button" className="pc-name" onClick={() => open(post.author)}>
            {person.name}
          </button>
          <p className="pc-muted">
            {person.street} ·{" "}
            {post.createdAt ? (
              <time dateTime={post.createdAt} title={post.createdAt}>
                {exact ? `${timeOf(post.createdAt)}, ${post.createdAt.slice(11, 19)}` : timeOf(post.createdAt)}
              </time>
            ) : (
              "Just now"
            )}
          </p>
        </div>
        {post.topic ? <span className="pc-topic">{post.topic}</span> : null}
      </header>
      <p className="pc-body">{post.body}</p>
      {post.photo ? <PostPhoto kind={post.photo} /> : null}
      {note ? <p className="pc-delivery">{note}</p> : null}
      <footer>
        <button type="button">
          <Heart size={14} aria-hidden="true" /> Thank · {post.thanks}
        </button>
        <button type="button">
          <MessageCircle size={14} aria-hidden="true" /> Reply · {post.replies}
        </button>
      </footer>
    </li>
  );
}

function PostPhoto({ kind }: { kind: NonNullable<Post["photo"]> }) {
  if (kind === "cat") {
    return (
      <svg viewBox="0 0 400 200" className="pc-photo" role="img" aria-label="Photo of an orange tabby cat with a white chest">
        <rect width="400" height="200" fill="#e9e2d6" />
        <rect y="150" width="400" height="50" fill="#c9b9a1" />
        <ellipse cx="200" cy="142" rx="74" ry="40" fill="#d98a3d" />
        <ellipse cx="200" cy="150" rx="30" ry="26" fill="#f6efe4" />
        <circle cx="200" cy="88" r="38" fill="#d98a3d" />
        <path d="M168 66 L174 40 L190 58 Z M232 66 L226 40 L210 58 Z" fill="#d98a3d" />
        <path d="M172 72 h56 M168 84 h64" stroke="#b86e2a" strokeWidth="5" />
        <circle cx="186" cy="90" r="5" fill="#2b2b2b" />
        <circle cx="214" cy="90" r="5" fill="#2b2b2b" />
        <path d="M196 102 l4 4 l4 -4" stroke="#2b2b2b" strokeWidth="3" fill="none" />
        <path d="M270 150 q40 -10 30 -50" stroke="#d98a3d" strokeWidth="14" fill="none" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "couch") {
    return (
      <svg viewBox="0 0 400 200" className="pc-photo" role="img" aria-label="Photo of a grey three-seat couch on a front porch">
        <rect width="400" height="200" fill="#d9dfe3" />
        <rect y="140" width="400" height="60" fill="#a7896b" />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <rect key={i} x={i * 52} y="140" width="2" height="60" fill="#8f735a" />
        ))}
        <rect x="90" y="70" width="220" height="60" rx="10" fill="#7d858c" />
        <rect x="80" y="100" width="240" height="44" rx="10" fill="#8c959c" />
        <rect x="70" y="86" width="30" height="62" rx="10" fill="#737b82" />
        <rect x="300" y="86" width="30" height="62" rx="10" fill="#737b82" />
        <rect x="100" y="148" width="8" height="12" fill="#3a3a3a" />
        <rect x="292" y="148" width="8" height="12" fill="#3a3a3a" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 400 200" className="pc-photo" role="img" aria-label="Photo of market stalls inside a school gym">
      <rect width="400" height="200" fill="#efe6d6" />
      <rect y="150" width="400" height="50" fill="#c79a62" />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${30 + i * 125} 60)`}>
          <path d="M0 30 L50 0 L100 30 Z" fill={["#c84f3b", "#3f6a8a", "#5d7f3a"][i]} />
          <rect x="6" y="30" width="88" height="56" fill="#fbf6ec" />
          {[0, 1, 2, 3].map((k) => (
            <circle key={k} cx={20 + k * 20} cy="72" r="8" fill={["#e2a23b", "#b8413a", "#6f8f3a", "#d77a2e"][(k + i) % 4]} />
          ))}
        </g>
      ))}
    </svg>
  );
}

export function AuthConfig({ runtime }: { runtime: PorchRuntime }) {
  const steps = [0, 5, 25, 50, 100];
  return (
    <>
      <section className="pl-config" aria-labelledby="rollout-title">
        <h3 id="rollout-title">Auth rollout</h3>
        <p>Share of new sign-ins that auth 2.14.0 handles. The rest go to 2.13.4. A browser keeps its group between attempts.</p>
        <div className="pl-segmented" role="group" aria-label="Auth 2.14.0 traffic">
          {steps.map((value) => (
            <button key={value} type="button" aria-pressed={runtime.canary === value} onClick={() => runtime.setCanary(value)}>
              {value}%
            </button>
          ))}
        </div>
      </section>
      <section className="pl-config" aria-labelledby="keys-title">
        <h3 id="keys-title">Session signing keys</h3>
        <p>Published keys go into the JWKS document that feed-api reads every 30 seconds.</p>
        <table className="pl-config-table">
          <thead>
            <tr>
              <th scope="col">Key id</th>
              <th scope="col">Signs for</th>
              <th scope="col">JWKS</th>
              <th scope="col">
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>porch-2026-09</strong>
              </td>
              <td>auth 2.13.4</td>
              <td>Published</td>
              <td />
            </tr>
            <tr>
              <td>
                <strong>porch-2026-11</strong>
              </td>
              <td>auth 2.14.0</td>
              <td>{runtime.keyPublished ? (runtime.jwksHasNewKey ? "Published, in feed-api cache" : "Published, waiting for feed-api refresh") : "Not published"}</td>
              <td>
                {runtime.keyPublished ? null : (
                  <button type="button" className="pl-ghost" onClick={() => runtime.publishKey()}>
                    Publish
                  </button>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </>
  );
}

export function FanoutConfig({ runtime }: { runtime: PorchRuntime }) {
  const stats = runtime.partitionStats();
  const idle = Math.max(0, runtime.consumers - PARTITIONS);
  const accounts = largeAccounts(runtime.readThreshold);
  const named = Object.entries(ACCOUNTS)
    .filter(([, account]) => runtime.readThreshold > 0 && account.followers > runtime.readThreshold)
    .map(([id, account]) => `${NEIGHBORS[id].name} (${account.followers.toLocaleString()})`);
  const wait = (seconds: number) => (seconds < 1 ? "none" : seconds >= 120 ? `${Math.round(seconds / 60)} min` : `${Math.round(seconds)} s`);
  return (
    <>
      <section className="pl-config" aria-labelledby="fanout-title">
        <h3 id="fanout-title">Feed fanout</h3>
        <p>Fanout workers copy each new post into its followers’ feeds. Jobs are split across {PARTITIONS} partitions by author, and each partition is read by one consumer at a time.</p>
        <table className="pl-config-table">
          <thead>
            <tr>
              <th scope="col">Partition</th>
              <th scope="col">Consumer</th>
              <th scope="col">Writes waiting</th>
              <th scope="col">Oldest wait</th>
              <th scope="col">Writes per second</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((stat) => (
              <tr key={stat.partition} data-hot={stat.oldest > 60 || undefined}>
                <td className="pl-num">{stat.partition}</td>
                <td>{stat.consumer}</td>
                <td className="pl-num">{Math.round(stat.waiting).toLocaleString()}</td>
                <td className="pl-num">{wait(stat.oldest)}</td>
                <td className="pl-num">{Math.round(stat.rate).toLocaleString()}</td>
              </tr>
            ))}
            {Array.from({ length: idle }, (_, index) => (
              <tr key={`idle-${index}`} data-drained>
                <td className="pl-num">none</td>
                <td>fanout-{PARTITIONS + index}</td>
                <td colSpan={3}>Idle, no partition assigned</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pl-config-actions">
          <label className="pl-inline-field">
            <span>Consumers in the group</span>
            <select value={runtime.consumers} onChange={(event) => runtime.setConsumers(Number(event.target.value))}>
              {[8, 12, 16].map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>
      <section className="pl-config" aria-labelledby="import-title">
        <h3 id="import-title">Events import</h3>
        <p>
          {runtime.imported >= IMPORT_TOTAL ? "Finished" : runtime.importPaused ? "Paused" : "Running"}: {runtime.imported} of {IMPORT_TOTAL} Chamber events posted, one every 4.5
          seconds, each to {ACCOUNTS.chamber.followers.toLocaleString()} followers.
        </p>
        {runtime.imported < IMPORT_TOTAL ? (
          <button type="button" className="pl-ghost" onClick={() => runtime.setImportPaused(!runtime.importPaused)}>
            {runtime.importPaused ? "Resume import" : "Pause import"}
          </button>
        ) : null}
      </section>
      <section className="pl-config" aria-labelledby="read-title">
        <h3 id="read-title">Fan out on read</h3>
        <p>Accounts above the threshold skip the fanout. Feed-api merges their posts in when a feed loads, which adds about 12 ms per account to each feed page.</p>
        <div className="pl-segmented" role="group" aria-label="Fan out on read for accounts with more followers than">
          {READ_THRESHOLDS.map((value) => (
            <button key={value} type="button" aria-pressed={runtime.readThreshold === value} onClick={() => runtime.setReadThreshold(value)}>
              {value ? `Over ${value.toLocaleString()}` : "Off"}
            </button>
          ))}
        </div>
        <p className="pl-config-note">
          {runtime.readThreshold
            ? `${accounts.toLocaleString()} ${accounts === 1 ? "account is" : "accounts are"} read at request time${named.length && accounts <= 4 ? `: ${named.join(", ")}` : ""}.`
            : "Every post is copied into followers’ feeds."}
        </p>
      </section>
    </>
  );
}
