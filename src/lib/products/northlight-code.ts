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

export function northlightFiles(incident: "stalls" | "frankfurt"): CodeFile[] {
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
