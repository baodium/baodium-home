import type { CodeFile } from "./types";

export const PAGINATE_V31 = `// Returns one page of a neighborhood feed.
//
// posts   every post in the feed, newest first: sorted by createdAt
//         descending, then by id descending. createdAt is an ISO
//         string ("2026-11-27T09:00:00Z"), id is a string ("p_0412").
// cursor  null for the first page, otherwise the nextCursor this
//         function returned for the previous page.
// limit   posts per page.
//
// The client keeps calling with nextCursor until it is null. Every
// post must appear exactly once across all pages.

export function feedPage(posts, cursor, limit) {
  const remaining = cursor
    ? posts.filter((post) => post.createdAt < cursor.createdAt)
    : posts;
  const items = remaining.slice(0, limit);
  const last = items[items.length - 1];
  const more = remaining.length > items.length;
  return {
    items,
    nextCursor: more ? { createdAt: last.createdAt } : null,
  };
}
`;

export const PAGINATE_TESTS = `import { feedPage } from "./paginate.js";

const post = (id, minute, second = 0) => ({
  id,
  createdAt: "2026-11-27T09:" + String(minute).padStart(2, "0") + ":" + String(second).padStart(2, "0") + "Z",
});

function walk(posts, limit) {
  const seen = [];
  let cursor = null;
  for (let page = 0; page < 100; page++) {
    const result = feedPage(posts, cursor, limit);
    seen.push(...result.items.map((item) => item.id));
    cursor = result.nextCursor;
    if (!cursor) return seen;
  }
  throw new Error("pagination never ended");
}

test("first page returns the newest posts", () => {
  const posts = [post("p_9", 9), post("p_8", 8), post("p_7", 7)];
  assert.deepEqual(feedPage(posts, null, 2).items.map((p) => p.id), ["p_9", "p_8"]);
});

test("the last page has no next cursor", () => {
  const posts = [post("p_2", 2), post("p_1", 1)];
  assert.equal(feedPage(posts, null, 5).nextCursor, null);
});

test("Rosa's post is not skipped at a page boundary", () => {
  const posts = [post("p_0420", 41), post("p_0412", 0), post("p_0398", 0), post("p_0391", 0, 0)];
  posts[3].createdAt = "2026-11-27T08:47:10Z";
  assert.deepEqual(walk(posts, 2), ["p_0420", "p_0412", "p_0398", "p_0391"]);
});

test("seven posts in the same second, three per page", () => {
  const posts = ["p_7", "p_6", "p_5", "p_4", "p_3", "p_2", "p_1"].map((id) => post(id, 30));
  assert.deepEqual(walk(posts, 3), ["p_7", "p_6", "p_5", "p_4", "p_3", "p_2", "p_1"]);
});

test("every post exactly once in a feed of 200 with repeats", () => {
  const posts = [];
  let second = 3599;
  for (let i = 200; i > 0; i--) {
    if (i % 3 !== 0) second -= 1;
    const id = "p_" + String(i).padStart(4, "0");
    posts.push({ id, createdAt: "2026-11-27T09:" + String(Math.floor(second / 60)).padStart(2, "0") + ":" + String(second % 60).padStart(2, "0") + "Z" });
  }
  const seen = walk(posts, 10);
  assert.equal(seen.length, 200, "posts returned");
  assert.equal(new Set(seen).size, 200, "distinct posts");
});
`;

export const FEED_HANDLER = `// Read-only here: the feed endpoint that calls your code.
import { feedPage } from "./paginate.js";

export async function getFeed(request, db) {
  const posts = await db.feedFor(request.user, { order: "createdAt desc, id desc" });
  const cursor = request.query.cursor ? decodeCursor(request.query.cursor) : null;
  const page = feedPage(posts, cursor, 5);
  return {
    posts: page.items,
    next: page.nextCursor ? encodeCursor(page.nextCursor) : null,
  };
}
`;

export const AUDIT_DOC = `# Feed audit

A synthetic monitor builds a test feed of 120 posts every 20 seconds,
with some posts sharing a createdAt second the way posts synced from
the mobile app's offline queue do. It pages through the feed with the
deployed feedPage and reports:

  feed_audit_missing    posts in the test feed that never came back
  feed_audit_repeated   posts that came back more than once

Both should be zero.
`;

export const AUTH_NOTES = `# Session tokens

auth signs a session token at sign-in with the current signing key
and puts the key id (kid) in the token header.

feed-api verifies every request's token against the keys published in
the JWKS document. It caches the JWKS and refreshes it every 30 seconds.
A token signed with a key that is not published is rejected with 401,
and the web app sends the user back to the sign-in page.

Keys
  porch-2026-09   published   current
  porch-2026-11   created by auth 2.14.0, publish before signing with it
`;

export const FANOUT_DOC = `# Feed fanout

When a neighbor posts, the API saves the post and enqueues one fanout
job. A fanout worker copies the post into the home feed of every
follower, so loading a feed is a single read.

Jobs are split across 8 partitions. Since feed-fanout 5.2.0 the
partition comes from the author id, so one author's posts are always
copied in the order they were written. Each partition is read by
exactly one consumer in the group, and a consumer writes about 6,000
feed entries per second. Consumers beyond the number of partitions
sit idle. Changing the size of the group pauses every partition for
a few seconds while partitions are reassigned.

Fan out on read: accounts above a follower threshold skip the
fanout. Their posts are not copied into feeds; feed-api fetches them
from the author when a feed loads and merges them in. Queued jobs
for those accounts are dropped when a consumer reaches them. Every
such account a neighbor follows adds about 12 ms to each feed page.

Objectives
  A new post reaches followers' feeds within 60 seconds.
  Feed pages load in under 300 ms at p95.
`;

export const IMPORT_NOTE = `# Events calendar import

Owner: events team. Runs on request from a partner account.

Posts each event in the partner's calendar as a regular post from
the partner's account, one every 4.5 seconds, so the feed is not
flooded all at once.

Today: Ravenswood Chamber of Commerce, 400 holiday events,
started 10:20. Can be paused from the fanout settings.
`;

export const PARTITION_V514 = `// feed-fanout 5.1.4: spread jobs evenly across partitions.
const PARTITIONS = 8;

export function partitionFor(job) {
  return job.sequence % PARTITIONS;
}
`;

export const PARTITION_V520 = `// feed-fanout 5.2.0: keep each author's posts in order by sending
// all of an author's jobs to the same partition.
import { hash } from "./hash.js";

const PARTITIONS = 8;

export function partitionFor(job) {
  return hash(job.authorId) % PARTITIONS;
}
`;

export function porchFiles(incident: "signin" | "missing-posts" | "slow-posts"): CodeFile[] {
  if (incident === "slow-posts") {
    return [
      { path: "feed-fanout/src/partition.js", source: PARTITION_V520, language: "javascript" },
      { path: "docs/feed-fanout.md", source: FANOUT_DOC, language: "markdown" },
      { path: "docs/events-import.md", source: IMPORT_NOTE, language: "markdown" },
    ];
  }
  if (incident === "missing-posts") {
    return [
      { path: "feed-api/src/paginate.js", source: PAGINATE_V31, language: "javascript", editable: true },
      { path: "feed-api/src/paginate.test.js", source: PAGINATE_TESTS, language: "javascript" },
      { path: "feed-api/src/feed.js", source: FEED_HANDLER, language: "javascript" },
      { path: "docs/feed-audit.md", source: AUDIT_DOC, language: "markdown" },
    ];
  }
  return [{ path: "docs/session-tokens.md", source: AUTH_NOTES, language: "markdown" }];
}
