import { SHORT_LAB_SIMS } from "@/lib/experience/short-labs/sims";
import type { ShortLab } from "@/lib/experience/short-labs/types";
import { getChapter } from "@/lib/learning/registry";

function manuscriptTitle(slug: string): string {
  const title = getChapter(slug)?.title;
  if (!title) throw new Error(`Missing manuscript title for ${slug}`);
  return title;
}

const signal = "#2f7a7e";
const accent = "#ad4f36";
const ink = "#5b6778";

export const SHORT_LABS: ShortLab[] = [
  {
    slug: "chapter-2",
    number: 2,
    title: manuscriptTitle("chapter-2"),
    durationMin: 8,
    h1: "Can you size the workers before the queue takes off?",
    situation: [
      "09:15, checkout API. The queue is empty. Each request holds a worker for a fixed time, and arrivals are steady. Little's Law says the average number of requests in flight is the arrival rate multiplied by that service time.",
      "When that number is larger than the workers you have, the rest wait. The wait grows for as long as the overload continues. A retry is another arrival. A client that sends the work twice offers twice the load, including while the service is already full.",
    ],
    objective:
      "Keep queue wait under 25 ms and utilization under 85 percent, with 20 workers or fewer.",
    terms: [
      {
        term: "Arrival rate",
        explain: "New requests per second, before any retry is counted.",
      },
      {
        term: "Predicted concurrency",
        explain: "Offered arrivals per second, retries included, multiplied by service time in seconds.",
      },
      {
        term: "Utilization",
        explain: "Requests in service divided by the workers on hand.",
      },
    ],
    explore: ["Little's Law", "Queue wait", "Retry load", "Worker count"],
    gettingStarted:
      "The chart compares predicted concurrency with the workers you have. Raise arrivals until the prediction passes the worker count, then watch the queue. Add workers until the wait falls.",
    keepInMind:
      "A worker count sized for the average, with retries left out of the arrival rate, is a queue that has not started yet. Count the retries first.",
    challengeSituation:
      "09:15, checkout API. A campaign raised arrivals, and clients retry when they time out. Service time and the retry multiplier are already set. The queue starts empty. You choose how many workers are on the shift.",
    challengeObjective:
      "Hold queue wait under 25 ms and utilization under 85 percent for six seconds, with 20 workers or fewer.",
    challengeSuccess:
      "Queue wait stays under 25 ms, utilization stays under 85 percent, and the worker count is at most 20.",
    metrics: [
      { id: "predicted", label: "Predicted concurrency", unit: "requests", explain: "Offered rate times service time.", digits: 1 },
      { id: "busy", label: "Workers busy", unit: "workers", explain: "How many workers are holding a request right now.", digits: 1 },
      { id: "utilPct", label: "Utilization", unit: "%", explain: "Busy workers divided by the worker count.", digits: 0 },
      { id: "queueWaitMs", label: "Queue wait", unit: "ms", explain: "How long a new arrival waits before a worker takes it.", digits: 0 },
      { id: "offered", label: "Offered rate", unit: "req/s", explain: "Arrivals multiplied by the retry factor.", digits: 0 },
    ],
    controls: [
      { id: "arrivalPerSec", kind: "range", label: "Arrival rate", explain: "New requests each second, before retries. Raising this raises predicted concurrency in a straight line.", min: 40, max: 900, step: 10, unit: "req/s" },
      { id: "serviceMs", kind: "range", label: "Service time", explain: "How long one worker holds one request. A longer hold means more requests in flight for the same arrival rate.", min: 5, max: 80, step: 1, unit: "ms" },
      { id: "workers", kind: "range", label: "Workers", explain: "How many requests can be in service at once. Past this count, arrivals wait.", min: 1, max: 40, step: 1, unit: "workers" },
      { id: "retryFactor", kind: "range", label: "Retry factor", explain: "1.0 means each client sends the work once. 2.0 means the service sees two arrivals for every original request.", min: 1, max: 3, step: 0.1, unit: "×", digits: 1 },
    ],
    stages: [
      { id: "read", letter: "A", title: "Read the prediction", body: "Leave the controls where they are. Predicted concurrency should sit well under the worker count, and the queue should stay empty.", gate: "seen" },
      { id: "overload", letter: "B", title: "Cross the worker count", body: "Raise the arrival rate until predicted concurrency is larger than the workers you have.", gate: "overCapacity" },
      { id: "queue", letter: "C", title: "Let the queue grow", body: "Keep the service overloaded, or raise the retry factor, until the backlog is more than 20 requests.", gate: "queued" },
      { id: "recover", letter: "D", title: "Drain it", body: "Add workers, or ease the offered rate, until the queue drains and utilization is under 90 percent.", gate: "recovered" },
    ],
    graphLabel: "Clients to the API, then the workers, then the downstream call.",
    graph: {
      nodes: [
        { id: "clients", label: "Clients", x: 0, y: 80, sourceRight: true },
        { id: "api", label: "API", x: 250, y: 80, target: "left", sourceRight: true },
        { id: "workers", label: "Workers", x: 500, y: 80, target: "left", sourceRight: true },
        { id: "downstream", label: "Downstream", x: 750, y: 80, target: "left" },
      ],
      edges: [
        { id: "clients-api", source: "clients", target: "api" },
        { id: "api-workers", source: "api", target: "workers" },
        { id: "workers-down", source: "workers", target: "downstream" },
      ],
    },
    chart: {
      title: "Concurrency against the workers you have",
      caption: "Predicted concurrency is the Little's Law figure. Workers busy cannot rise above the worker count. The queue is in the metrics, not on this chart.",
      yUnit: "requests",
      series: [
        { key: "predicted", label: "Predicted", swatch: accent },
        { key: "busy", label: "Busy", swatch: signal },
      ],
    },
    sim: SHORT_LAB_SIMS["chapter-2"],
  },
  {
    slug: "chapter-4",
    number: 4,
    title: manuscriptTitle("chapter-4"),
    durationMin: 8,
    h1: "Can you stop downstream work after the caller has given up?",
    situation: [
      "16:40, checkout. The caller has one deadline for the whole call. Inventory runs, then payments. Time spent on inventory is time payments do not get.",
      "A child with its own long timeout can still be working after the caller has returned. That leftover work holds capacity nobody is waiting on. The child stops with the caller only if it receives the time remaining and is cancelled when that budget is spent.",
    ],
    objective:
      "When the path is slower than the deadline, return by the deadline and leave no downstream work running.",
    terms: [
      { term: "Caller time", explain: "How long checkout waits before it returns to its own caller." },
      { term: "Work still running", explain: "Milliseconds of downstream work that continue after the caller has already returned." },
      { term: "Attempt timeout", explain: "The child's own limit, used when nobody tells it how much time the caller has left." },
    ],
    explore: ["Deadline", "Attempt timeout", "Cancellation", "Leftover work"],
    gettingStarted:
      "Start with a call that fits. Then slow inventory until the caller runs out of time, and read the work that is still running. Pass the remaining deadline down and cancel when it is spent.",
    keepInMind:
      "A timeout on the caller does not, by itself, stop the child. The child needs the remaining budget, and it needs to hear the cancel.",
    challengeSituation:
      "16:40, checkout. The caller has 400 ms. Inventory and payments each keep a long timeout of their own, and together they take longer than the time left. Watch what is still running after the caller has already returned.",
    challengeObjective:
      "The caller returns by 400 ms, and downstream work still running after that stays at 0 ms for six seconds.",
    challengeSuccess: "Caller time is at most 400 ms and leftover downstream work is 0 ms.",
    metrics: [
      { id: "callerMs", label: "Caller time", unit: "ms", explain: "How long checkout waits before returning.", digits: 0 },
      { id: "orphanMs", label: "Work still running", unit: "ms", explain: "Downstream time that continues after the caller has returned.", digits: 0 },
      { id: "parentMs", label: "Deadline", unit: "ms", explain: "The budget for the whole call.", digits: 0 },
      { id: "inventoryMs", label: "Inventory, as the caller saw it", unit: "ms", explain: "How much of the inventory work the caller waited for.", digits: 0 },
      { id: "paymentsMs", label: "Payments, as the caller saw it", unit: "ms", explain: "How much of the payments work the caller waited for.", digits: 0 },
    ],
    controls: [
      { id: "inventoryMs", kind: "range", label: "Inventory work", explain: "How long inventory takes if it is allowed to finish.", min: 20, max: 400, step: 10, unit: "ms" },
      { id: "paymentsMs", kind: "range", label: "Payments work", explain: "How long payments takes after inventory. It only starts if inventory finishes.", min: 20, max: 400, step: 10, unit: "ms" },
      { id: "parentMs", kind: "range", label: "Caller deadline", explain: "The most time checkout will wait for the whole call.", min: 100, max: 800, step: 20, unit: "ms" },
      { id: "attemptMs", kind: "range", label: "Child attempt timeout", explain: "The timeout a child uses when it does not receive the caller's remaining time.", min: 50, max: 800, step: 10, unit: "ms" },
      { id: "propagate", kind: "toggle", label: "Pass the remaining deadline", explain: "On, each child receives the time checkout still has. Off, the child uses its own attempt timeout." },
      { id: "cancel", kind: "toggle", label: "Cancel when the budget is spent", explain: "On, a child that was given the remaining deadline stops when that time is gone. Off, it keeps working." },
    ],
    stages: [
      { id: "fit", letter: "A", title: "A call that fits", body: "With the starting times, the call should finish well inside the deadline and leave nothing running afterward.", gate: "inside" },
      { id: "slow", letter: "B", title: "Spend the deadline", body: "Raise inventory work until the caller hits the deadline or payments keeps running after the caller returns.", gate: "overrun" },
      { id: "pass", letter: "C", title: "Tell the child how much time is left", body: "Pass the remaining deadline to the child. The attempt timeout is no longer what bounds that hop.", gate: "passedDown" },
      { id: "stop", letter: "D", title: "Stop the child with the caller", body: "Cancel when the budget is spent. Work still running should fall to zero, and the caller should return by the deadline.", gate: "stopped" },
    ],
    graphLabel: "Edge to checkout, then inventory, then payments.",
    graph: {
      nodes: [
        { id: "edge", label: "Edge", x: 0, y: 90, sourceRight: true },
        { id: "checkout", label: "Checkout", x: 250, y: 90, target: "left", sourceRight: true },
        { id: "inventory", label: "Inventory", x: 520, y: 0, target: "left" },
        { id: "payments", label: "Payments", x: 520, y: 190, target: "left" },
      ],
      edges: [
        { id: "edge-checkout", source: "edge", target: "checkout" },
        { id: "checkout-inventory", source: "checkout", target: "inventory" },
        { id: "checkout-payments", source: "checkout", target: "payments" },
      ],
    },
    chart: {
      title: "Caller time and work left running",
      caption: "Caller time should stay at or under the deadline. The second line is work that continues after the caller has returned.",
      yUnit: "ms",
      series: [
        { key: "callerMs", label: "Caller", swatch: signal },
        { key: "orphanMs", label: "Still running", swatch: accent },
      ],
      guide: { value: 400, label: "400 ms" },
    },
    sim: SHORT_LAB_SIMS["chapter-4"],
  },
  {
    slug: "chapter-5",
    number: 5,
    title: manuscriptTitle("chapter-5"),
    durationMin: 8,
    h1: "Can you keep origin under 24 requests per second when the keys expire?",
    situation: [
      "Friday afternoon, the product cache. Twelve keys are in play, and one of them takes almost half the reads. A fresh entry is served from cache. A miss fills from origin.",
      "If those keys expire together, every read misses at once and origin sees the full arrival rate. One fill in flight can serve the reads that arrive behind it. Spreading the expiry times keeps those fills from landing in the same instant.",
    ],
    objective:
      "After the keys expire, hold origin at or below 24 requests per second and the hit rate at or above 75 percent.",
    terms: [
      { term: "Hit rate", explain: "The share of reads served from an entry that has not expired." },
      { term: "Origin rate", explain: "Requests per second that reach the database because the cache could not answer." },
      { term: "Aligned expiry", explain: "Every key becomes due at the same moment." },
    ],
    explore: ["Cache-aside", "Expiry", "Shared fill", "Origin load"],
    gettingStarted:
      "Let the cache warm. Then line the expiries up and watch origin. Share each fill, then spread the expiry times, and compare the origin rate.",
    keepInMind:
      "A high hit rate between expiries does not tell you what origin will see in the second the keys all become due.",
    challengeSituation:
      "Friday afternoon, twelve product keys come due together. One key is almost half of the reads. Origin cannot take the full arrival rate in that second. Read rate and time-to-live stay where they are for this wave.",
    challengeObjective:
      "After the keys expire, hold origin at or below 24 requests per second and the hit rate at or above 75 percent for six seconds.",
    challengeSuccess: "Origin stays at or below 24 req/s and the average hit rate stays at or above 75 percent.",
    metrics: [
      { id: "hitPct", label: "Hit rate", unit: "%", explain: "Reads served by a fresh cache entry.", digits: 0 },
      { id: "originQps", label: "Origin", unit: "req/s", explain: "How hard the database is being asked to fill misses right now.", digits: 0 },
      { id: "coldKeys", label: "Cold keys", unit: "keys", explain: "How many of the twelve keys are expired at this moment.", digits: 0 },
    ],
    controls: [
      { id: "rps", kind: "range", label: "Read rate", explain: "Product reads per second across the twelve keys.", min: 40, max: 500, step: 20, unit: "req/s" },
      { id: "ttlSec", kind: "range", label: "TTL", explain: "How long a filled entry stays fresh.", min: 2, max: 20, step: 1, unit: "s" },
      { id: "align", kind: "toggle", label: "Align expiry", explain: "On, every key becomes due together. Off, the keys already expire at different times." },
      { id: "singleflight", kind: "toggle", label: "Share one fill per key", explain: "On, reads that miss a key wait for the fill already in flight instead of each calling origin." },
      { id: "jitter", kind: "toggle", label: "Spread expiry times", explain: "On, each key gets its own offset inside the TTL, so the fills do not line up." },
    ],
    stages: [
      { id: "warm", letter: "A", title: "Read a warm cache", body: "Before you change anything, the hit rate should be high and origin should be quiet.", gate: "warm" },
      { id: "lineup", letter: "B", title: "Line the expiries up", body: "Turn on aligned expiry and wait for the keys to become due together. Origin should jump.", gate: "stampede" },
      { id: "share", letter: "C", title: "Share the fill", body: "Turn on a shared fill. Origin should fall to about one fill per key, which is still a spike if every key is due now.", gate: "coalesced" },
      { id: "spread", letter: "D", title: "Spread the due times", body: "Spread the expiry times as well. Origin should stay under 20 requests per second while the hit rate recovers.", gate: "spread" },
    ],
    graphLabel: "Client to the app, the cache, and origin.",
    graph: {
      nodes: [
        { id: "client", label: "Client", x: 0, y: 80, sourceRight: true },
        { id: "app", label: "App", x: 250, y: 80, target: "left", sourceRight: true },
        { id: "cache", label: "Cache", x: 500, y: 80, target: "left", sourceRight: true },
        { id: "origin", label: "Origin", x: 750, y: 80, target: "left" },
      ],
      edges: [
        { id: "client-app", source: "client", target: "app" },
        { id: "app-cache", source: "app", target: "cache" },
        { id: "cache-origin", source: "cache", target: "origin" },
      ],
    },
    chart: {
      title: "Origin requests per second",
      caption: "The line is origin load. Hit rate stays in the metrics so a 0 to 100 percent figure does not share an axis with request rate.",
      yUnit: "req/s",
      series: [{ key: "originQps", label: "Origin", swatch: accent }],
      guide: { value: 24, label: "24 req/s" },
    },
    sim: SHORT_LAB_SIMS["chapter-5"],
  },
  {
    slug: "chapter-7",
    number: 7,
    title: manuscriptTitle("chapter-7"),
    durationMin: 8,
    h1: "Can you read your own write without sending every read to the primary?",
    situation: [
      "A shopper saves a new address and the next read still shows the old one. The primary committed the write. The replicas apply the log later, so a read that follows the write can still see the old row.",
      "Sending every read to the primary makes that read correct, and it also puts the whole read rate on one node. About a third of reads come from a session that just wrote and must see that write. The rest can use a replica when the lag is inside the bound you set.",
    ],
    objective:
      "Keep read-your-writes success at or above 99 percent, and keep the primary's share of reads at or below 45 percent.",
    terms: [
      { term: "Replica lag", explain: "How far, in milliseconds, the replica is behind the primary's log." },
      { term: "Read-your-writes", explain: "A session sees the write it just committed." },
      { term: "Primary share", explain: "The fraction of all reads that land on the primary." },
    ],
    explore: ["Replica lag", "Read-your-writes", "Primary load", "Lag bound"],
    gettingStarted:
      "Read from a replica first and watch read-your-writes fail. Then send every read to the primary and watch that node's share. Then send a read to the primary only when lag is past the bound.",
    keepInMind:
      "A replica can be healthy and still be the wrong place to read a row you just wrote. The bound is what decides which reads can tolerate that.",
    challengeSituation:
      "A shopper saves a new address and immediately reads it back. Replica lag is holding at 480 ms. About a third of reads are from a session that just wrote and must see that write. The rest can use a replica. Lag does not move during this wave.",
    challengeObjective:
      "Keep read-your-writes success at or above 99 percent, and keep the primary's share of reads at or below 45 percent, for six seconds.",
    challengeSuccess: "Read-your-writes stays at or above 99 percent and the primary handles at most 45 percent of reads.",
    metrics: [
      { id: "lagMs", label: "Replica lag", unit: "ms", explain: "How far both replicas are behind the primary.", digits: 0 },
      { id: "rywPct", label: "Read-your-writes", unit: "%", explain: "Share of writer sessions that see their own write.", digits: 0 },
      { id: "primaryPct", label: "Primary share", unit: "%", explain: "Share of all reads served by the primary.", digits: 0 },
      { id: "replicaPct", label: "Replica share", unit: "%", explain: "Share of reads served by a replica.", digits: 0 },
    ],
    controls: [
      { id: "lagMs", kind: "range", label: "Replica lag", explain: "How many milliseconds the replicas are behind the primary.", min: 0, max: 2000, step: 20, unit: "ms" },
      {
        id: "route",
        kind: "choice",
        label: "Where reads go",
        explain: "Any replica spreads reads and can miss a write you just made. The primary is always current. The lag bound sends a read to the primary only when the replica is too far behind.",
        options: [
          { value: "any", label: "Any replica" },
          { value: "primary", label: "Primary for every read" },
          { value: "bound", label: "Primary when lag exceeds the bound" },
        ],
      },
      { id: "lagBoundMs", kind: "range", label: "Lag bound", explain: "When routing uses the bound, reads that must see a recent write go to the primary if replica lag is above this number.", min: 0, max: 2000, step: 20, unit: "ms" },
    ],
    stages: [
      { id: "stale", letter: "A", title: "Read the replica", body: "Leave reads on any replica. Read-your-writes should fail while lag is hundreds of milliseconds.", gate: "stale" },
      { id: "primary", letter: "B", title: "Read the primary", body: "Send every read to the primary. Read-your-writes should recover, and the primary share should go to 100 percent.", gate: "primaryOnly" },
      { id: "bound", letter: "C", title: "Use a bound under the lag", body: "Route to the primary only when lag exceeds the bound, and set the bound below the lag you see. Read-your-writes should hold, with the primary under half of reads.", gate: "bounded" },
      { id: "hold", letter: "D", title: "Hold it", body: "Leave that routing in place for a few seconds. The primary share should stay under half.", gate: "held" },
    ],
    graphLabel: "App to the primary, then replica A and replica B.",
    graph: {
      nodes: [
        { id: "app", label: "App", x: 0, y: 100, sourceRight: true },
        { id: "primary", label: "Primary", x: 280, y: 100, target: "left", sourceRight: true },
        { id: "replicaA", label: "Replica A", x: 580, y: 0, target: "left" },
        { id: "replicaB", label: "Replica B", x: 580, y: 200, target: "left" },
      ],
      edges: [
        { id: "app-primary", source: "app", target: "primary" },
        { id: "primary-a", source: "primary", target: "replicaA" },
        { id: "primary-b", source: "primary", target: "replicaB" },
      ],
    },
    chart: {
      title: "Read-your-writes and primary share",
      caption: "Both lines are percents. You want read-your-writes high and the primary share well under half.",
      yUnit: "%",
      series: [
        { key: "rywPct", label: "Read-your-writes", swatch: signal },
        { key: "primaryPct", label: "Primary share", swatch: accent },
      ],
      guide: { value: 45, label: "45%" },
    },
    sim: SHORT_LAB_SIMS["chapter-7"],
  },
  {
    slug: "chapter-12",
    number: 12,
    title: manuscriptTitle("chapter-12"),
    durationMin: 8,
    h1: "Can you hold backlog age under 8 seconds with no duplicate sends?",
    situation: [
      "Order notifications are falling behind. The producer appends to a log split into partitions. A consumer group gives each partition to one consumer, so consumers beyond the partition count sit idle and do not raise the consume rate.",
      "Backlog age is how long the oldest unprocessed message has been waiting. Age climbs when consume stays below produce. A crash redelivers the last batch. If the notification already went out, a second delivery sends it again unless the consumer recognizes the message. Acknowledging before the send loses the message if the process dies in between.",
    ],
    objective:
      "Hold backlog age under 8 seconds, with no duplicate sends and no lost sends.",
    terms: [
      { term: "Backlog age", explain: "Lag divided by the rate the group is actually consuming. Size alone does not tell you how late the oldest message is." },
      { term: "Assigned consumers", explain: "The smaller of the consumer count and the partition count." },
      { term: "Redelivery", explain: "A message the group receives again after a crash." },
    ],
    explore: ["Consumer lag", "Partitions", "Backlog age", "Redelivery"],
    gettingStarted:
      "Match consume to produce and read a flat age. Slow the handler until age climbs. Add consumers up to the partition count, then decide what a redelivered message should do.",
    keepInMind:
      "An extra consumer with no partition does not make the backlog younger. And a redelivery is a second chance at the same message, not a new notification to send.",
    challengeSituation:
      "Order notifications are late. The producer holds at 80 messages per second, one message takes 50 ms, and the log has 4 partitions. Consumers crash and the last batch is delivered again. A lost send and a second send both count against you. Produce rate, partition count, and handler time stay where they are.",
    challengeObjective:
      "Hold backlog age under 8 seconds, duplicate sends at zero, and lost sends at zero, for six seconds.",
    challengeSuccess: "Age stays under 8 seconds, duplicate sends stay at zero, and lost sends stay at zero.",
    metrics: [
      { id: "ageSec", label: "Backlog age", unit: "s", explain: "How long the oldest unprocessed message has been waiting.", digits: 1 },
      { id: "lag", label: "Backlog size", unit: "msgs", explain: "Messages produced and not yet consumed.", digits: 0 },
      { id: "consumePerSec", label: "Consume rate", unit: "msg/s", explain: "Messages the assigned consumers finish each second.", digits: 0 },
      { id: "duplicatePerSec", label: "Duplicate sends", unit: "/s", explain: "Extra notifications caused by a redelivery the handler did not recognize.", digits: 0 },
      { id: "lostPerSec", label: "Lost sends", unit: "/s", explain: "Messages acknowledged before the send, then lost in a crash.", digits: 0 },
      { id: "effective", label: "Assigned consumers", unit: "", explain: "Consumers that actually own a partition.", digits: 0 },
    ],
    controls: [
      { id: "producePerSec", kind: "range", label: "Produce rate", explain: "Messages appended to the log each second.", min: 10, max: 200, step: 5, unit: "msg/s" },
      { id: "partitions", kind: "range", label: "Partitions", explain: "How many slices the log is split into. The group cannot assign more consumers than this.", min: 1, max: 8, step: 1, unit: "" },
      { id: "consumers", kind: "range", label: "Consumers", explain: "Processes in the group. Any consumer past the partition count sits idle.", min: 1, max: 8, step: 1, unit: "" },
      { id: "processMs", kind: "range", label: "Handler time", explain: "How long one consumer spends on one message. A slower handler lowers the consume rate.", min: 10, max: 120, step: 5, unit: "ms" },
      { id: "idempotent", kind: "toggle", label: "Treat a redelivery as already done", explain: "On, a message that was already sent does not send again. Off, each delivery sends." },
      { id: "ackBefore", kind: "toggle", label: "Acknowledge before the send", explain: "On, a crash after the acknowledge loses the message. Off, the message is delivered again." },
    ],
    stages: [
      { id: "steady", letter: "A", title: "Hold a young backlog", body: "With the starting rates, consume should stay ahead of produce and age should stay under 2 seconds.", gate: "steady" },
      { id: "age", letter: "B", title: "Slow the handler", body: "Raise handler time until backlog age passes 5 seconds. Watch age, not only the size.", gate: "aged" },
      { id: "scale", letter: "C", title: "Assign every partition", body: "Add consumers up to the partition count. If age does not fall, shorten the handler until consume is ahead of produce, and wait until age is under 4 seconds. A consumer past the partition count will not help.", gate: "scaled" },
      { id: "once", letter: "D", title: "Make the redelivery safe", body: "Treat a redelivery as already done, and do not acknowledge before the send. Duplicate sends and lost sends should both be zero.", gate: "safe" },
    ],
    graphLabel: "API to the outbox, the log, and the consumer group.",
    graph: {
      nodes: [
        { id: "api", label: "API", x: 0, y: 80, sourceRight: true },
        { id: "outbox", label: "Outbox", x: 250, y: 80, target: "left", sourceRight: true },
        { id: "log", label: "Log", x: 500, y: 80, target: "left", sourceRight: true },
        { id: "group", label: "Consumers", x: 750, y: 80, target: "left" },
      ],
      edges: [
        { id: "api-outbox", source: "api", target: "outbox" },
        { id: "outbox-log", source: "outbox", target: "log" },
        { id: "log-group", source: "log", target: "group" },
      ],
    },
    chart: {
      title: "Backlog age",
      caption: "Age is how late the oldest message is. The guide is 8 seconds.",
      yUnit: "s",
      series: [{ key: "ageSec", label: "Age", swatch: accent }],
      guide: { value: 8, label: "8 s" },
    },
    sim: SHORT_LAB_SIMS["chapter-12"],
  },
  {
    slug: "chapter-14",
    number: 14,
    title: manuscriptTitle("chapter-14"),
    durationMin: 9,
    h1: "Can you keep checkout inside 500 ms when the provider slows down?",
    situation: [
      "Checkout in one region is missing its 500 ms budget. The path is the edge, checkout, inventory, payments, and the provider. The times add.",
      "A slow provider uses most of that budget. Inventory confirmation does not have to sit on the same deadline. Retries multiply attempts against the provider. Shedding checkouts lowers the success rate even when the path itself is fast.",
    ],
    objective:
      "Keep accepted checkout success at or above 99 percent, p99 at or below 500 ms, and retry amplification at or below 1.15.",
    terms: [
      { term: "Path time", explain: "The sum of the hops that still sit on the checkout deadline." },
      { term: "Retry amplification", explain: "How many attempts you offer the provider for each checkout. 1.00 is a single try." },
      { term: "Shed", explain: "The share of checkouts you refuse before they start. Refusals count against success." },
    ],
    explore: ["Latency budget", "Provider slowdown", "Retry budget", "What sits on the deadline"],
    gettingStarted:
      "Read the path while the provider is healthy. Turn on the slowdown and watch the sum pass 500 ms. Then decide which hop stays on the deadline, and how many extra attempts you allow.",
    keepInMind:
      "A budget is a sum. Putting a hop on the deadline spends that budget whether or not the customer is waiting on that hop.",
    challengeSituation:
      "Checkout in one region is missing its 500 ms budget. The provider has slowed down, and that slowdown stays on. The panel shows the path as it is when you arrive.",
    challengeObjective:
      "Keep accepted checkout success at or above 99 percent, p99 at or below 500 ms, and retry amplification at or below 1.15 for six seconds.",
    challengeSuccess:
      "Success stays at or above 99 percent, p99 stays at or below 500 ms, and retry amplification stays at or below 1.15.",
    metrics: [
      { id: "p99Ms", label: "Checkout p99", unit: "ms", explain: "End to end time of the hops still on the deadline.", digits: 0 },
      { id: "successPct", label: "Success", unit: "%", explain: "Accepted checkouts that finish. Sheds and provider overload both reduce this.", digits: 0 },
      { id: "amplification", label: "Retry amplification", unit: "×", explain: "Attempts per checkout offered to the provider.", digits: 2 },
      { id: "providerMs", label: "Provider time on the path", unit: "ms", explain: "How much of the provider's work checkout waits for.", digits: 0 },
      { id: "inventoryMs", label: "Inventory on the path", unit: "ms", explain: "Zero when inventory is not on this deadline.", digits: 0 },
    ],
    controls: [
      { id: "slowdown", kind: "toggle", label: "Provider slowdown", explain: "On, the provider takes 260 ms instead of 140 ms." },
      { id: "inventoryCritical", kind: "toggle", label: "Keep inventory on the checkout deadline", explain: "On, inventory's 100 ms is part of the 500 ms budget. Off, inventory is confirmed off this deadline." },
      { id: "retryExtra", kind: "range", label: "Extra retry fraction", explain: "Added to 1 to get retry amplification. 0.40 means 1.40 attempts per checkout.", min: 0, max: 0.6, step: 0.05, unit: "", digits: 2 },
      { id: "providerBudgetMs", kind: "range", label: "Provider hop budget", explain: "If the provider needs longer than this, the checkout fails instead of waiting.", min: 80, max: 400, step: 10, unit: "ms" },
      { id: "shedPct", kind: "range", label: "Shed", explain: "Percent of checkouts refused before they start. Each refused checkout lowers success.", min: 0, max: 20, step: 1, unit: "%" },
    ],
    stages: [
      { id: "fits", letter: "A", title: "A path inside the budget", body: "Leave the slowdown off. The hops should add up to less than 500 ms.", gate: "fits" },
      { id: "over", letter: "B", title: "Slow the provider", body: "Turn on the provider slowdown. With inventory still on the deadline, p99 should pass 500 ms.", gate: "overBudget" },
      { id: "move", letter: "C", title: "Take inventory off this deadline", body: "Inventory does not have to be inside the 500 ms. Take it off the deadline and read p99 again.", gate: "deferred" },
      { id: "retries", letter: "D", title: "Leave the provider a single try", body: "Bring retry amplification to 1.15 or less, and do not shed checkouts to get there. Success should stay at or above 99 percent.", gate: "reserved" },
    ],
    graphLabel: "Region to edge, checkout, inventory, payments, and the provider.",
    graph: {
      nodes: [
        { id: "region", label: "Region", x: 0, y: 70, sourceRight: true },
        { id: "edge", label: "Edge", x: 190, y: 70, target: "left", sourceRight: true },
        { id: "checkout", label: "Checkout", x: 380, y: 70, target: "left", sourceRight: true },
        { id: "inventory", label: "Inventory", x: 570, y: 70, target: "left", sourceRight: true },
        { id: "payments", label: "Payments", x: 760, y: 70, target: "left", sourceRight: true },
        { id: "provider", label: "Provider", x: 950, y: 70, target: "left" },
      ],
      edges: [
        { id: "region-edge", source: "region", target: "edge" },
        { id: "edge-checkout", source: "edge", target: "checkout" },
        { id: "checkout-inventory", source: "checkout", target: "inventory" },
        { id: "inventory-payments", source: "inventory", target: "payments" },
        { id: "payments-provider", source: "payments", target: "provider" },
      ],
    },
    chart: {
      title: "Checkout time against the 500 ms budget",
      caption: "The line is p99 for the hops still on the deadline. The guide is the budget.",
      yUnit: "ms",
      series: [{ key: "p99Ms", label: "p99", swatch: accent }],
      guide: { value: 500, label: "500 ms" },
    },
    sim: SHORT_LAB_SIMS["chapter-14"],
  },
];

export function getShortLab(slug: string): ShortLab | undefined {
  return SHORT_LABS.find((lab) => lab.slug === slug);
}

export function controlsFor(lab: ShortLab, mode: "guided" | "practice" | "challenge") {
  if (mode !== "challenge") return { ...lab.sim.initialControls };
  return { ...lab.sim.initialControls, ...lab.sim.challengeLocks };
}
