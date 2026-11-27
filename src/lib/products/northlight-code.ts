import type { CodeFile } from "./types";

export const ABR_V376 = `// Chooses the rendition for the next 4-second segment.
//
// ladder          renditions from lowest to highest: { id, kbps }
// throughputKbps  measured download speed in kilobits per second
// bufferSeconds   video already downloaded ahead of the playhead
//
// Rule: pick the highest rendition whose bitrate fits in 80 percent
// of the measured throughput. With no measurement yet, start at the
// lowest rendition.

const SAFETY = 0.8;

export function chooseRendition(ladder, throughputKbps, bufferSeconds) {
  let choice = ladder[0];
  for (const rendition of ladder) {
    if (rendition.kbps <= throughputKbps * SAFETY) {
      choice = rendition;
    }
  }
  return choice;
}
`;

export const ABR_V380 = `// Chooses the rendition for the next 4-second segment.
//
// ladder          renditions from lowest to highest: { id, kbps }
// throughputBps   measured download speed in bits per second
// bufferSeconds   video already downloaded ahead of the playhead
//
// Rule: pick the highest rendition whose bitrate fits in 80 percent
// of the measured throughput. With no measurement yet, start at the
// lowest rendition.

const SAFETY = 0.8;

export function chooseRendition(ladder, throughputBps, bufferSeconds) {
  let choice = ladder[0];
  for (const rendition of ladder) {
    if (rendition.kbps <= throughputBps * SAFETY) {
      choice = rendition;
    }
  }
  return choice;
}
`;

export const ABR_TESTS = `import { chooseRendition } from "./abr.js";

const ladder = [
  { id: "360p", kbps: 800 },
  { id: "540p", kbps: 1600 },
  { id: "720p", kbps: 3000 },
  { id: "1080p", kbps: 6000 },
];
const pick = (bps, buffer = 12) => chooseRendition(ladder, bps, buffer).id;

test("4.2 Mbps home broadband plays 720p", () => {
  assert.equal(pick(4_200_000), "720p");
});

test("2.5 Mbps plays 540p", () => {
  assert.equal(pick(2_500_000), "540p");
});

test("1 Mbps falls back to the lowest rendition", () => {
  assert.equal(pick(1_000_000), "360p");
});

test("25 Mbps fiber plays 1080p", () => {
  assert.equal(pick(25_000_000), "1080p");
});

test("7.5 Mbps is exactly enough for 1080p", () => {
  assert.equal(pick(7_500_000), "1080p");
});

test("no measurement yet starts at the lowest rendition", () => {
  assert.equal(pick(0, 0), "360p");
});

test("works for a ladder other than the default", () => {
  const short = [{ id: "low", kbps: 400 }, { id: "high", kbps: 1200 }];
  assert.equal(chooseRendition(short, 1_500_000, 8).id, "high");
  assert.equal(chooseRendition(short, 1_400_000, 8).id, "low");
});
`;

export const PLAYER_JS = `// Read-only here: the part of the player loop that calls your code.
import { chooseRendition } from "./abr.js";

export function fetchNextSegment(player) {
  const rendition = chooseRendition(
    player.ladder,
    player.throughput.bitsPerSecond(), // 3.8: was kilobitsPerSecond()
    player.buffer.secondsAhead(),
  );
  return player.cdn.fetch(player.segmentUrl(rendition, player.nextIndex));
}
`;

export const LADDER_DOC = `# Northlight encoding ladder

Every title is packaged as 4-second segments in four renditions.

  360p    800 kbps
  540p   1600 kbps
  720p   3000 kbps
  1080p  6000 kbps

A segment downloads in (kbps x 4 s) / throughput. If that takes
longer than 4 seconds, the buffer shrinks; when it reaches zero the
picture stops and the spinner appears (a rebuffer).

Rebuffering objective: under 1 percent of watch time.
`;

export const STEERING_DOC = `# CDN steering

Each metro sends viewers to one or more edges by weight. An edge
can be drained to 0 percent; its share moves to the other edges in
the same metro.

The CDN health check opens a TCP connection to each edge every 10
seconds. It does not fetch a segment.

Real user monitoring (RUM) reports time to first byte and
rebuffering from every player session, grouped by edge.
`;

export const CACHE_RULES_DOC = `# CDN cache rules

The CDN checks the rules from the top and uses the first rule whose
path pattern matches the request. Rules further down are never read
for that request.

The cache key decides which requests share one cached copy:

  Path only                    /vod/long-coast/720p/seg_00012.m4s
  Path and full query string   the path plus everything after the ?
  Path and token parameter     the path plus ?token=..., other
                               parameters ignored
  Do not cache                 every request goes to origin (films)
                               or to the live packager (live)

The rules editor adds a new rule at the top of the list, with the
pattern /*. Use Check a URL to see which rule a request matches and
the key it gets.

Origin serves about 6 film requests per second. Above that it queues
requests, and past about 8 per second it starts returning 503.
`;

export const URLS_DOC = `# Northlight request URLs

Films
  /vod/{title}/master.m3u8?sid={session}
  /vod/{title}/{rendition}/seg_{index}.m4s?sid={session}

  A film segment is the same file for every viewer. sid is a random
  id for each play session. Web player 3.8.2 added it so playback
  analytics can group a session's requests; the CDN does not use it.

Live
  /live/{channel}/{rendition}/seg_{index}.m4s?token={token}&sid={session}

  token is signed for one viewer and expires after 60 seconds. A live
  response fetched with one viewer's token must never be served to
  another viewer. That happened on Monday under cdn-config r89
  (INC-2291).
`;

const PROGRESS_HEADER = `// Reads a viewer's saved position in one film.
//
// db.primary()
//   pg-main, which takes every write.
// db.replica(viewerId)
//   The read replica assigned to this viewer, or
//   pg-main when the read pool is empty.
//
// Both return a node with:
//   node.read("progress", viewerId, titleId)
//     The newest row the node holds, as
//     { positionS, savedAt, lsn }, or null.
//   node.replayedLsn()
//     The LSN of the newest write the node has
//     applied.
//
// viewer.lastProgressLsn
//   The LSN pg-main returned for the viewer's most
//   recent progress save, from any device and for
//   any film, or null if the viewer has never saved.
//
// LSNs are numbers. A larger LSN is a later write.
`;

export const PROGRESS_V732 = `${PROGRESS_HEADER}
export function readProgress(db, viewer, titleId) {
  return db.primary().read("progress", viewer.id, titleId);
}
`;

export const PROGRESS_V740 = `${PROGRESS_HEADER}
export function readProgress(db, viewer, titleId) {
  return db.replica(viewer.id).read("progress", viewer.id, titleId);
}
`;

export const PROGRESS_TESTS = `import { readProgress } from "./progress.js";

// A primary and one replica over the same progress rows. The replica
// holds only the rows up to the LSN it has replayed.
function fakeDb({ replicaLsn, rows }) {
  const reads = [];
  const node = (name, replayed) => ({
    replayedLsn: () => replayed,
    read: () => {
      reads.push(name);
      return rows.filter((row) => row.lsn <= replayed).at(-1) ?? null;
    },
  });
  return {
    reads,
    primary: () => node("primary", Number.MAX_SAFE_INTEGER),
    replica: () => node("replica", replicaLsn),
  };
}

const saves = [
  { positionS: 610, savedAt: "10:20:00", lsn: 4100 },
  { positionS: 1830, savedAt: "10:40:20", lsn: 5260 },
];

test("returns the latest save when the replica has not replayed it", () => {
  const db = fakeDb({ replicaLsn: 4800, rows: saves });
  const row = readProgress(db, { id: "v_1", lastProgressLsn: 5260 }, "ice-road");
  assert.equal(row?.positionS, 1830);
});

test("reads from the replica once it has replayed the latest save", () => {
  const db = fakeDb({ replicaLsn: 5300, rows: saves });
  const row = readProgress(db, { id: "v_1", lastProgressLsn: 5260 }, "ice-road");
  assert.equal(row?.positionS, 1830);
  assert.equal(db.reads.join(", "), "replica");
});

test("a viewer who has never saved reads from the replica", () => {
  const db = fakeDb({ replicaLsn: 4800, rows: [] });
  const row = readProgress(db, { id: "v_2", lastProgressLsn: null }, "ice-road");
  assert.equal(row, null);
  assert.equal(db.reads.join(", "), "replica");
});
`;

export const CONTINUE_ROUTE_JS = `// Read-only here: the routes that save progress and fill the
// Continue watching row and the resume prompt.
import { readProgress } from "./progress.js";

export async function saveProgress(req, db, accounts) {
  const { lsn } = await db.primary().write("progress", req.viewerId, req.titleId, {
    positionS: req.positionS,
    device: req.device,
  });
  await accounts.setLastProgressLsn(req.viewerId, lsn);
}

export async function continueWatching(req, db, accounts) {
  const viewer = await accounts.viewer(req.viewerId);
  const titles = await accounts.recentTitles(req.viewerId);
  return titles.map((titleId) => ({
    titleId,
    progress: readProgress(db, viewer, titleId),
  }));
}
`;

export const PROGRESS_DB_DOC = `# Progress database

Playback progress lives in Postgres. The player saves the viewer's
position every 10 seconds while a film plays, and once more when the
viewer leaves the player.

  pg-main     primary. Every progress save is written here.
  pg-read-1   streaming replica
  pg-read-2   streaming replica, also used for analytics exports
  pg-read-3   streaming replica

Replicas apply the primary's write-ahead log in order and answer reads
from what they have applied so far. Replication lag is how far a
replica's applied log trails the primary.

Read routing (api 7.4.0 and later)
  Each viewer is assigned one replica in the read pool by a hash of
  the viewer id, so all of a viewer's reads go to the same replica.
  Taking a replica out of the pool moves its viewers to the others.
  With an empty pool, reads go to pg-main.

Capacity
  pg-main runs at about 40 percent CPU from writes alone. Progress
  reads add about 105 percent of one instance at today's traffic,
  which is why api 7.4.0 moved them off the primary (DB-311). Above
  70 percent, saves slow down; saves that take longer than a second
  time out and the position is lost.

Standby delay
  When applying the log would remove row versions that a running
  query on the replica still needs, the replica waits up to
  max_standby_streaming_delay for that query, then cancels it.
  -1 means wait for as long as the query runs.
`;

export function northlightFiles(incident: "stalls" | "frankfurt" | "cache-key" | "resume"): CodeFile[] {
  if (incident === "resume") {
    return [
      { path: "api/src/progress.js", source: PROGRESS_V740, language: "javascript", editable: true },
      { path: "api/src/progress.test.js", source: PROGRESS_TESTS, language: "javascript" },
      { path: "api/src/routes/progress.js", source: CONTINUE_ROUTE_JS, language: "javascript" },
      { path: "docs/progress-database.md", source: PROGRESS_DB_DOC, language: "markdown" },
    ];
  }
  if (incident === "cache-key") {
    return [
      { path: "docs/cdn-cache-rules.md", source: CACHE_RULES_DOC, language: "markdown" },
      { path: "docs/request-urls.md", source: URLS_DOC, language: "markdown" },
    ];
  }
  if (incident === "stalls") {
    return [
      { path: "player/src/abr.js", source: ABR_V380, language: "javascript", editable: true },
      { path: "player/src/abr.test.js", source: ABR_TESTS, language: "javascript" },
      { path: "player/src/player.js", source: PLAYER_JS, language: "javascript" },
      { path: "docs/encoding-ladder.md", source: LADDER_DOC, language: "markdown" },
    ];
  }
  return [
    { path: "docs/cdn-steering.md", source: STEERING_DOC, language: "markdown" },
    { path: "docs/encoding-ladder.md", source: LADDER_DOC, language: "markdown" },
  ];
}
