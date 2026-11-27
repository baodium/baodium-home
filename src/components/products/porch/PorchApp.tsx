"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, CalendarDays, Heart, Home, Mail, MessageCircle, Users } from "lucide-react";
import { NEIGHBORS, POSTS, type Post, type PorchRuntime } from "@/lib/products/porch";
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
            <Avatar id="theo" />
            <span>
              Theo Park
              <small>Winchester Ave</small>
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
                {POSTS.filter((post) => post.author === profile.id).map((post) => (
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
                  setMine((items) => [{ id: `local-${items.length}`, author: "theo", createdAt: "", body: draft.trim(), thanks: 0, replies: 0 }, ...items]);
                  setDraft("");
                }}
              >
                <Avatar id="theo" />
                <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Share something with Ravenswood" rows={2} aria-label="New post" />
                <button type="submit" className="pc-primary" disabled={!draft.trim()}>
                  Post
                </button>
              </form>
              <Feed key={generation} runtime={runtime} mine={mine} open={(id) => setView({ name: "profile", id })} />
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
        .map((part) => part[0])
        .join("")}
    </span>
  );
}

function PostCard({ post, open, exact = false }: { post: Post; open: (id: string) => void; exact?: boolean }) {
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
