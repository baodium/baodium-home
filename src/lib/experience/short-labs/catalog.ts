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

export const SHORT_LABS: ShortLab[] = [
  {
    slug: "chapter-2",
    number: 2,
    title: manuscriptTitle("chapter-2"),
    durationMin: 8,
    h1: "Can you release the connection before the payload is built?",
    situation: [
      "Recommendation Service allows 40 connections on each instance. About 400 lookups a second each hold a connection for about 70 milliseconds. Little's Law says the average number busy is the rate times that hold: 400 × 0.070 = 28, with 12 connections left for a burst.",
      "The first handler builds the payload while the connection is already assigned, so that work is part of the hold. The second handler builds the payload, then acquires the connection only for the query.",
    ],
    objective:
      "Keep the average at or below 32 connections, with no pending acquisitions, by building the payload before the connection is taken.",
    terms: [
      {
        term: "Little's Law",
        explain: "Average concurrency is the completion rate times the time each operation spends inside the boundary you measured. For this pool, the boundary starts when a connection is assigned and ends when it is returned.",
      },
      {
        term: "Occupancy",
        explain: "How long one lookup keeps its connection. Query time always counts. Payload time counts only when the connection is already assigned.",
      },
      {
        term: "Pending acquisitions",
        explain: "Requests waiting for a connection because the average demand is above the 40 the pool allows.",
      },
    ],
    explore: ["Little's Law", "Connection occupancy", "build_payload", "The 40-connection pool"],
    gettingStarted:
      "Start from the chapter's estimate, 400 lookups a second and a 70 ms query. Then add payload work while the connection is held, and watch pending acquisitions. Move that work to before the acquire and let the queue finish.",
    keepInMind:
      "The load test in the chapter completed 400 requests a second with no rejections. At 480 a second, about 2 percent were rejected even though acquisition p95 was still 25 ms, under the 50 ms bar. The passing stage is what the admission limit should sit under.",
    challengeSituation:
      "Recommendation Service is taking 400 lookups a second. The query holds a connection for 70 ms, and build_payload is running for 40 ms while that connection is already assigned. The pool allows 40 connections.",
    challengeObjective:
      "Bring the average number of busy connections to 32 or fewer, and bring pending acquisitions to zero.",
    challengeSuccess:
      "Average connections stay at or below 32 and pending acquisitions stay at zero.",
    metrics: [
      { id: "predicted", label: "Average connections", unit: "", explain: "Lookups per second times occupancy in seconds.", digits: 1 },
      { id: "occupancyMs", label: "Occupancy", unit: "ms", explain: "Query time, plus payload time when the connection is already held.", digits: 0 },
      { id: "pending", label: "Pending acquisitions", unit: "", explain: "Requests waiting because demand is above 40 connections.", digits: 0 },
      { id: "acquireP99", label: "Acquire wait", unit: "ms", explain: "How long a new lookup waits for a connection. The query time is separate.", digits: 0 },
      { id: "busy", label: "Connections busy", unit: "", explain: "Never more than 40. Extra demand waits.", digits: 1 },
    ],
    controls: [
      { id: "lookupsPerSec", kind: "range", label: "Lookups", explain: "How many times a second a handler acquires a connection. The chapter's estimate for this instance is about 400.", min: 100, max: 560, step: 10, unit: "/s" },
      { id: "queryMs", kind: "range", label: "Query time", explain: "How long the database call holds the connection. The chapter uses about 70 ms for the recommendation lookup.", min: 10, max: 120, step: 5, unit: "ms" },
      { id: "payloadMs", kind: "range", label: "Payload build", explain: "Time spent in build_payload. It counts toward occupancy only when the connection is already assigned.", min: 0, max: 80, step: 5, unit: "ms" },
      { id: "holdDuringBuild", kind: "toggle", label: "Build while holding the connection", explain: "On, the handler matches the first listing: the payload is built inside pool.acquire. Off, it matches the second listing: the payload is built, then the connection is acquired." },
    ],
    stages: [
      { id: "estimate", letter: "A", title: "Read the 28", body: "Leave the payload at 0. Average connections should sit near 28 of the 40 allowed.", gate: "estimate" },
      { id: "over", letter: "B", title: "Hold the connection during the build", body: "Keep the first listing, and raise payload build until average connections pass 40.", gate: "over" },
      { id: "queue", letter: "C", title: "Watch acquisitions wait", body: "Leave that hold in place until pending acquisitions climb. The query itself has not gotten slower.", gate: "queued" },
      { id: "release", letter: "D", title: "Build, then acquire", body: "Switch to the second listing. Occupancy falls back to the query, and pending acquisitions should finish.", gate: "released" },
    ],
    graphLabel: "Product Page calls Recommendation. The pool and the database live in that service.",
    graph: {
      nodes: [
        { id: "page", label: "Product Page", x: 0, y: 80, sourceRight: true },
        { id: "recommendation", label: "Recommendation", x: 250, y: 80, target: "left", sourceRight: true },
        { id: "pool", label: "Pool", x: 520, y: 80, target: "left", sourceRight: true },
        { id: "database", label: "Database", x: 760, y: 80, target: "left" },
      ],
      edges: [
        { id: "page-rec", source: "page", target: "recommendation" },
        { id: "rec-pool", source: "recommendation", target: "pool" },
        { id: "pool-db", source: "pool", target: "database" },
      ],
    },
    chart: {
      title: "Average connections against the pool of 40",
      caption: "The line is L = λW. Pending acquisitions are in the metrics once the average passes 40.",
      yUnit: "connections",
      series: [
        { key: "predicted", label: "Average", swatch: accent },
        { key: "pending", label: "Pending", swatch: signal },
      ],
      guide: { value: 40, label: "40" },
    },
    code: {
      title: "pool.acquire",
      source: `with pool.acquire() as conn:
    payload = build_payload(request)
    result = query_database(conn, payload)

payload = build_payload(request)
with pool.acquire() as conn:
    result = query_database(conn, payload)`,
    },
    sim: SHORT_LAB_SIMS["chapter-2"],
  },
  {
    slug: "chapter-4",
    number: 4,
    title: manuscriptTitle("chapter-4"),
    durationMin: 8,
    h1: "Can you stop the fraud provider when checkout is out of time?",
    situation: [
      "Checkout calls Fraud Service, which asks an external provider to approve, deny, or request review. Before the call, the handler builds a child deadline with a 1,000 ms maximum and reserves time for the work that still has to happen after risk.",
      "If that deadline cannot start, or the outbound permit is missing, the assessment is deferred. If the call is admitted and checkout gives up, the provider keeps working unless cancellation is passed through with the deadline.",
    ],
    objective:
      "When the provider is slower than the child deadline, return inside the time checkout has left and leave no provider work running.",
    terms: [
      { term: "Child deadline", explain: "The smaller of 1,000 ms and the time checkout still has after the reserve. The provider call is not started when that budget cannot start." },
      { term: "Outbound permit", explain: "outbound_fraud_slots.try_acquire. A missing permit sends the assessment to recovery instead of calling the provider." },
      { term: "Cancellation", explain: "evaluate_risk passes request.cancellation with the deadline. Without it, the provider keeps working after checkout has returned." },
    ],
    explore: ["Child deadline", "Outbound permit", "Cancellation", "Fraud provider"],
    gettingStarted:
      "Start with a provider call that fits inside the child deadline. Then slow the provider until work is still running after checkout returns. Pass cancellation with the deadline, and also try refusing the permit.",
    keepInMind:
      "A timeout on checkout does not, by itself, stop the provider. The call has to receive the deadline and the cancellation, or it should not have been started.",
    challengeSituation:
      "Checkout has 500 ms left. The fraud provider needs 900 ms. The call already holds an outbound permit, and 80 ms is reserved for the work after risk.",
    challengeObjective:
      "Return inside the time checkout has left, and leave no provider work running after that.",
    challengeSuccess: "The caller is inside its remaining time and leftover provider work is 0 ms.",
    metrics: [
      { id: "callerMs", label: "Caller time", unit: "ms", explain: "How long checkout waits before it returns.", digits: 0 },
      { id: "orphanMs", label: "Provider still running", unit: "ms", explain: "Provider work that continues after checkout has returned.", digits: 0 },
      { id: "childMs", label: "Child deadline", unit: "ms", explain: "min(1000, time left minus the reserve).", digits: 0 },
      { id: "remainingMs", label: "Time left", unit: "ms", explain: "What checkout still has for this call.", digits: 0 },
      { id: "admitted", label: "Call admitted", unit: "", explain: "1 when the deadline can start and a permit was acquired. 0 when the assessment is deferred.", digits: 0 },
    ],
    controls: [
      { id: "providerMs", kind: "range", label: "Provider work", explain: "How long the fraud provider takes if it is allowed to finish.", min: 20, max: 1200, step: 20, unit: "ms" },
      { id: "remainingMs", kind: "range", label: "Time checkout has left", explain: "The budget the child deadline is cut from.", min: 100, max: 1500, step: 20, unit: "ms" },
      { id: "reserveMs", kind: "range", label: "Reserve after risk", explain: "checkout_policy.after_risk_budget_ms. This time is kept back before the child deadline is computed.", min: 0, max: 400, step: 10, unit: "ms" },
      { id: "permit", kind: "toggle", label: "Acquire an outbound permit", explain: "On, outbound_fraud_slots.try_acquire returns a permit and the provider may be called. Off, the assessment is deferred." },
      { id: "cancel", kind: "toggle", label: "Pass cancellation with the deadline", explain: "On, evaluate_risk passes request.cancellation, and the provider stops when the child deadline is spent. Off, the provider keeps working." },
    ],
    stages: [
      { id: "fit", letter: "A", title: "A call that fits", body: "With the starting times, the provider should finish inside the child deadline and leave nothing running.", gate: "inside" },
      { id: "slow", letter: "B", title: "Slow the provider", body: "Raise provider work until checkout has returned and the provider is still running.", gate: "overrun" },
      { id: "stop", letter: "C", title: "Stop the provider with the caller", body: "Pass cancellation with the deadline. Leftover provider work should fall to zero.", gate: "stopped" },
      { id: "defer", letter: "D", title: "Refuse the permit", body: "Turn the permit off. The provider should not be called, and nothing should be left running.", gate: "deferred" },
    ],
    graphLabel: "Checkout to Fraud Service, then the external provider.",
    graph: {
      nodes: [
        { id: "checkout", label: "Checkout", x: 0, y: 80, sourceRight: true },
        { id: "fraud", label: "Fraud", x: 280, y: 80, target: "left", sourceRight: true },
        { id: "provider", label: "Provider", x: 560, y: 80, target: "left" },
      ],
      edges: [
        { id: "checkout-fraud", source: "checkout", target: "fraud" },
        { id: "fraud-provider", source: "fraud", target: "provider" },
      ],
    },
    chart: {
      title: "Caller time and provider work left running",
      caption: "Caller time should stay inside the time checkout has left. The second line is provider work that continues after that.",
      yUnit: "ms",
      series: [
        { key: "callerMs", label: "Caller", swatch: signal },
        { key: "orphanMs", label: "Still running", swatch: accent },
      ],
    },
    code: {
      title: "reserve_fraud_call",
      source: `def reserve_fraud_call(request):
    deadline = request.child_deadline(
        maximum_ms=1000,
        reserve_ms=checkout_policy.after_risk_budget_ms,
    )
    if not deadline.can_start_call():
        return deadline, None
    return deadline, outbound_fraud_slots.try_acquire()

def evaluate_risk(assessment, request, permit, deadline):
    with permit:
        return fraud_client.evaluate(
            assessment_id=assessment.id,
            inputs=assessment.inputs,
            deadline=deadline,
            cancellation=request.cancellation,
        )`,
    },
    sim: SHORT_LAB_SIMS["chapter-4"],
  },
  {
    slug: "chapter-5",
    number: 5,
    title: manuscriptTitle("chapter-5"),
    durationMin: 8,
    h1: "Can one catalog read fill a missed product-metadata key?",
    situation: [
      "Catalog stores product metadata under product-metadata:v1:{product_id}, with a 300 second TTL. A fresh entry is returned from cache. A miss reads catalog_db.fetch_metadata and stores the result.",
      "Concurrent misses each call the database unless one loader is shared. That loader must acquire a source-read permit. If the permit is missing, the loader returns TemporarilyUnavailable instead of calling the database.",
    ],
    objective:
      "On a miss, hold catalog to one successful read, or to zero reads when the source permit is refused.",
    terms: [
      { term: "Cache-aside", explain: "The application reads the cache, and on a miss it reads the database and stores the value. The database is not updated by the cache." },
      { term: "Shared loader", explain: "One in-flight load serves every reader waiting on that key. The loader checks the cache again before it uses a database permit." },
      { term: "Source permit", explain: "source_reads.try_acquire. Without a permit the loader does not call the database." },
    ],
    explore: ["Cache-aside", "product-metadata", "Shared loader", "Source permit"],
    gettingStarted:
      "Read the key while it is fresh. Then miss it and let every reader call Catalog. Share one loader, then refuse the source permit and read what the callers receive.",
    keepInMind:
      "A failed cache write does not undo a successful source read. A version rejection means newer data is already known, and this handler returns temporary unavailability instead of starting another read.",
    challengeSituation:
      "The product-metadata entry is missing. Eighty readers ask for it at the same time, and a source read permit is available. Each reader can call Catalog on its own.",
    challengeObjective:
      "Catalog performs one read for that miss, and no reader is refused for lack of a permit.",
    challengeSuccess: "Catalog stays at one read for the miss, and unavailable responses stay at zero.",
    metrics: [
      { id: "origin", label: "Catalog reads", unit: "", explain: "How many fetch_metadata calls this miss produces.", digits: 0 },
      { id: "unavailable", label: "Unavailable", unit: "", explain: "Readers that got source_read_limit because the permit was missing.", digits: 0 },
      { id: "hitPct", label: "Fresh hit", unit: "%", explain: "100 while the entry is inside its TTL.", digits: 0 },
      { id: "readers", label: "Readers", unit: "", explain: "Concurrent requests for the same key.", digits: 0 },
    ],
    controls: [
      { id: "readers", kind: "range", label: "Readers on this key", explain: "How many requests miss together and would each call Catalog.", min: 1, max: 120, step: 1, unit: "" },
      { id: "fresh", kind: "toggle", label: "Entry is fresh", explain: "On, cache.get returns the value and Catalog is not called. Off, the key has missed." },
      { id: "singleflight", kind: "toggle", label: "Share one loader", explain: "On, singleflight.run uses one loader for every waiter. Off, each miss calls Catalog." },
      { id: "permit", kind: "toggle", label: "Source permit available", explain: "On, try_acquire returns a permit and the loader may read Catalog. Off, the loader returns TemporarilyUnavailable(source_read_limit)." },
    ],
    stages: [
      { id: "warm", letter: "A", title: "Read a fresh entry", body: "Leave the entry fresh. Catalog should stay at zero.", gate: "warm" },
      { id: "miss", letter: "B", title: "Miss without a shared loader", body: "Mark the entry missed and leave each reader to load it. Catalog reads should jump to the reader count.", gate: "stampede" },
      { id: "share", letter: "C", title: "Share one loader", body: "Share one loader for the key. Catalog should fall to one read.", gate: "coalesced" },
      { id: "limit", letter: "D", title: "Refuse the source permit", body: "Take the source permit away. Catalog should stay at zero, and readers should see source_read_limit.", gate: "limited" },
    ],
    graphLabel: "Client to the app, the cache, and Catalog.",
    graph: {
      nodes: [
        { id: "client", label: "Client", x: 0, y: 80, sourceRight: true },
        { id: "app", label: "App", x: 250, y: 80, target: "left", sourceRight: true },
        { id: "cache", label: "Cache", x: 500, y: 80, target: "left", sourceRight: true },
        { id: "catalog", label: "Catalog", x: 750, y: 80, target: "left" },
      ],
      edges: [
        { id: "client-app", source: "client", target: "app" },
        { id: "app-cache", source: "app", target: "cache" },
        { id: "cache-catalog", source: "cache", target: "catalog" },
      ],
    },
    chart: {
      title: "Catalog reads for this miss",
      caption: "One shared loader is one read. No permit is zero reads, and the callers are unavailable.",
      yUnit: "reads",
      series: [
        { key: "origin", label: "Catalog", swatch: accent },
        { key: "unavailable", label: "Unavailable", swatch: signal },
      ],
      guide: { value: 1, label: "1 read" },
    },
    code: {
      title: "get_product_metadata",
      source: `def get_product_metadata(product_id):
    key = f"product-metadata:v1:{product_id}"
    cached = cache.get(key)
    if cached is not None:
        return decode(cached)
    product = catalog_db.fetch_metadata(product_id)
    if product is not None:
        cache.set(key, encode(product), ttl_seconds=300)
    return product

def get_metadata(key, request):
    cached = cache.try_read(key, deadline=request.cache_deadline())
    if cached.is_usable:
        return cached.result
    return singleflight.run(
        key=key,
        wait_deadline=request.deadline,
        loader=lambda load_context: load_metadata(key, load_context),
    )`,
    },
    sim: SHORT_LAB_SIMS["chapter-5"],
  },
  {
    slug: "chapter-7",
    number: 7,
    title: manuscriptTitle("chapter-7"),
    durationMin: 8,
    h1: "Can the next read show the address that was just saved?",
    situation: [
      "A customer saves a shipping address. The primary commits the write. The replicas apply the log later, so a read that follows the write can still see the old row.",
      "choose_read_target keeps a replica only when it is available, the lag sample is current, and the policy accepts it. If none qualify and primary fallback is allowed, the read goes to the primary. Otherwise the read is ReadTemporarilyUnavailable. It does not relax the freshness requirement because the replicas are behind.",
    ],
    objective: "After the address is saved, the next read shows that address, or fails as unavailable. It does not show the old one.",
    terms: [
      { term: "Read-your-writes", explain: "The session that just saved the address must see that write on its next read." },
      { term: "Eligible replica", explain: "Available, with a current lag sample, and accepted by the policy. A replica that has not applied the write is not a candidate." },
      { term: "Primary fallback", explain: "policy.allow_primary_fallback. Used only when no replica candidate remains." },
    ],
    explore: ["Read-your-writes", "Replica lag", "Primary fallback", "choose_read_target"],
    gettingStarted:
      "Read a replica that has not applied the write and watch the old address come back. Then run the router. Without fallback the read should be unavailable. With fallback it should come from the primary. Catch a replica up and watch the router choose it again.",
    keepInMind:
      "A replica can be up and still be the wrong place to read a row you just wrote. The router must not serve that replica just because the primary is busy.",
    challengeSituation:
      "A customer saved a new address. The replicas have not replayed that write. The next read is still aimed at a replica.",
    challengeObjective: "The next read shows the address that was just saved.",
    challengeSuccess: "The saved address is what the read returns.",
    metrics: [
      { id: "lagMs", label: "Replica lag", unit: "ms", explain: "How far the replicas are behind the primary's log. Zero means the write has been applied.", digits: 0 },
      { id: "sawPct", label: "Saved address shown", unit: "%", explain: "100 when this read returns the new address.", digits: 0 },
      { id: "primaryPct", label: "Served by the primary", unit: "%", explain: "100 when this read was admitted to the primary.", digits: 0 },
      { id: "unavailable", label: "Unavailable", unit: "", explain: "1 when the router raises ReadTemporarilyUnavailable.", digits: 0 },
    ],
    controls: [
      { id: "lagMs", kind: "range", label: "Replica lag", explain: "How many milliseconds the replicas are behind the write. Above zero, a read-your-writes policy does not accept them.", min: 0, max: 2000, step: 20, unit: "ms" },
      {
        id: "route",
        kind: "choice",
        label: "How the read is chosen",
        explain: "A replica anyway returns whatever the replica has, including the old address. The router runs choose_read_target.",
        options: [
          { value: "replica", label: "A replica anyway" },
          { value: "router", label: "choose_read_target" },
        ],
      },
      { id: "allowPrimaryFallback", kind: "toggle", label: "Allow primary fallback", explain: "On, a read with no eligible replica may be admitted to the primary. Off, that read is unavailable." },
      { id: "replicaAvailable", kind: "toggle", label: "Replica available", explain: "Off, the replica is not a candidate even if it has caught up." },
      { id: "sampleCurrent", kind: "toggle", label: "Lag sample is current", explain: "Off, the router will not trust the replica's lag and will not select it." },
    ],
    stages: [
      { id: "stale", letter: "A", title: "Read the replica anyway", body: "Leave the read on a replica that is behind. The old address should come back.", gate: "stale" },
      { id: "refuse", letter: "B", title: "Run the router without fallback", body: "Switch to choose_read_target and leave primary fallback off. The read should be unavailable, not the old address.", gate: "refused" },
      { id: "primary", letter: "C", title: "Allow the primary", body: "Allow primary fallback. The saved address should come from the primary.", gate: "current" },
      { id: "caught", letter: "D", title: "Catch a replica up", body: "Set replica lag to 0 and turn primary fallback off. The router should choose the replica, and the address should still be the new one.", gate: "caughtUp" },
    ],
    graphLabel: "The app chooses a primary or a replica for this read.",
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
      title: "This read",
      caption: "Saved-address shown and primary share are both percents of this one read, not of the whole fleet.",
      yUnit: "%",
      series: [
        { key: "sawPct", label: "Saved address", swatch: signal },
        { key: "primaryPct", label: "Primary", swatch: accent },
      ],
    },
    code: {
      title: "choose_read_target",
      source: `def choose_read_target(policy, observations, request):
    candidates = [
        replica
        for replica in observations.replicas
        if replica.available
        and replica.sample_is_current()
        and policy.accepts(replica)
    ]
    if candidates:
        return replica_admission.try_choose(
            candidates,
            deadline=request.deadline,
        )
    if policy.allow_primary_fallback:
        return primary_fallback.try_admit(
            deadline=request.deadline,
        )
    raise ReadTemporarilyUnavailable()`,
    },
    sim: SHORT_LAB_SIMS["chapter-7"],
  },
  {
    slug: "chapter-12",
    number: 12,
    title: manuscriptTitle("chapter-12"),
    durationMin: 8,
    h1: "Can the notification task be created once, then committed?",
    situation: [
      "Order confirmations are built by process_order_event in the notification-task-creator group. The handler claims the message_id inside a transaction, creates the task only on the first delivery, and commits the next offset after that transaction.",
      "order-events has 12 partitions, so consumers beyond that count sit idle. Committing the offset before the task exists loses the message. Skipping the claim makes a redelivery create a second confirmation task.",
    ],
    objective: "Hold backlog age under 2 seconds, with no second confirmation task and no lost task.",
    terms: [
      { term: "Backlog age", explain: "Lag divided by the rate the group is actually consuming. The size alone does not say how late the oldest message is." },
      { term: "claim_event", explain: "Inserts the consumer and message_id. A conflict means this delivery already created the task." },
      { term: "Commit after", explain: "consumer.commit_next_offset runs after the transaction that created the task. Committing first drops the message on a crash." },
    ],
    explore: ["message_id", "Partitions", "Backlog age", "Commit order"],
    gettingStarted:
      "Match consume to produce and read a young backlog. Slow the handler until age climbs. Add consumers up to the partition count, then decide what a redelivered message_id should do and when the offset is committed.",
    keepInMind:
      "An extra consumer with no partition does not make the backlog younger. A redelivery is the same message_id, not a new order to confirm.",
    challengeSituation:
      "The producer writes 80 messages a second across 12 partitions. Each message takes 50 ms. A crash delivers the last batch again, and a repeated message still creates another task.",
    challengeObjective:
      "Hold backlog age under 2 seconds, with no second confirmation task and no lost task.",
    challengeSuccess: "Age stays under 2 seconds, second tasks stay at zero, and lost tasks stay at zero.",
    metrics: [
      { id: "ageSec", label: "Backlog age", unit: "s", explain: "How long the oldest unprocessed message has been waiting.", digits: 1 },
      { id: "lag", label: "Backlog size", unit: "msgs", explain: "Messages produced and not yet consumed.", digits: 0 },
      { id: "consumePerSec", label: "Consume rate", unit: "msg/s", explain: "Messages the assigned consumers finish each second.", digits: 0 },
      { id: "duplicatePerSec", label: "Second tasks", unit: "/s", explain: "Extra confirmation tasks from a redelivery that was not claimed.", digits: 0 },
      { id: "lostPerSec", label: "Lost tasks", unit: "/s", explain: "Messages committed before the task existed, then lost in a crash.", digits: 0 },
      { id: "effective", label: "Assigned consumers", unit: "", explain: "The smaller of the consumer count and the partition count.", digits: 0 },
    ],
    controls: [
      { id: "producePerSec", kind: "range", label: "Produce rate", explain: "Messages appended to order-events each second.", min: 10, max: 200, step: 5, unit: "msg/s" },
      { id: "partitions", kind: "range", label: "Partitions", explain: "The chapter's topic is created with 12 partitions. The group cannot assign more consumers than this.", min: 1, max: 12, step: 1, unit: "" },
      { id: "consumers", kind: "range", label: "Consumers", explain: "Processes in notification-task-creator. Any consumer past the partition count sits idle.", min: 1, max: 12, step: 1, unit: "" },
      { id: "processMs", kind: "range", label: "Handler time", explain: "How long one consumer spends on one record. A slower handler lowers the consume rate.", min: 10, max: 120, step: 5, unit: "ms" },
      { id: "claim", kind: "toggle", label: "Claim the message_id first", explain: "On, claim_event inserts the message_id and a repeat does not create another task. Off, every delivery creates a task." },
      { id: "commitAfter", kind: "toggle", label: "Commit the offset after the task exists", explain: "On, commit_next_offset runs after the transaction, as in the listing. Off, the offset is committed first and a crash loses the message." },
    ],
    stages: [
      { id: "steady", letter: "A", title: "Hold a young backlog", body: "With the starting rates, consume should stay ahead of produce and age should stay under 2 seconds.", gate: "steady" },
      { id: "age", letter: "B", title: "Slow the handler", body: "Raise handler time until backlog age passes 5 seconds.", gate: "aged" },
      { id: "scale", letter: "C", title: "Give the partitions consumers", body: "Add consumers and shorten the handler until consume is ahead of produce and age is under 4 seconds. A consumer past the partition count will not help.", gate: "scaled" },
      { id: "once", letter: "D", title: "Make the redelivery safe", body: "Claim the message_id, and commit the offset only after the task exists. Second tasks and lost tasks should both be zero.", gate: "safe" },
    ],
    graphLabel: "The API writes the outbox. The relay appends order-events. notification-task-creator reads it.",
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
      caption: "Age is how late the oldest message is. The guide is 2 seconds, the steady state this lab asks you to hold.",
      yUnit: "s",
      series: [{ key: "ageSec", label: "Age", swatch: accent }],
      guide: { value: 2, label: "2 s" },
    },
    code: {
      title: "process_order_event",
      source: `def process_order_event(record, db, consumer):
    event = decode_and_validate(record.value)
    with db.transaction() as tx:
        first_delivery = tx.claim_event(
            consumer="notification-task-creator",
            message_id=event.message_id,
        )
        if first_delivery:
            tx.create_notification_task(
                event_id=event.message_id,
                order_id=event.order_id,
                notification_type="order_confirmation",
                state="PENDING",
            )
    consumer.commit_next_offset(
        topic=record.topic,
        partition=record.partition,
        offset=record.offset + 1,
    )`,
    },
    sim: SHORT_LAB_SIMS["chapter-12"],
  },
  {
    slug: "chapter-14",
    number: 14,
    title: manuscriptTitle("chapter-14"),
    durationMin: 8,
    h1: "Can you tell 17 connections from the pools you will actually open?",
    situation: [
      "European Catalog was estimated at 1,440 database reads a second, with a mean connection occupancy of 12 milliseconds. Little's Law gives about 17.3 connections in use.",
      "The planning case adds 25 percent more reads and uses 18 milliseconds: 32.4 connections. At 70 percent utilization that is about 47 across the region. The configuration is four instances with 20 connections each, 80 in total, so that one instance can be down and a free connection on one instance is not assumed to help another.",
    ],
    objective:
      "With one Catalog instance down, the remaining pools still cover the planning demand of 32.4 connections. Do not treat 17.3 as the size of one pool.",
    terms: [
      { term: "Regional average", explain: "1,440 × 0.012 is about 17.3 connections across the region, not the pool size of one instance." },
      { term: "Planning case", explain: "1,440 × 1.25 × 0.018 = 32.4 connections. The 70 percent target of that figure is about 47, rounded up from 46." },
      { term: "Surviving pools", explain: "Four instances of 20 open 80. With one instance down, three instances open 60. A connection idle on one instance cannot serve a waiter on another." },
    ],
    explore: ["Little's Law", "Planning case", "Instance loss", "Per-instance pools"],
    gettingStarted:
      "Read the 17.3 figure first. Then apply the planning case and compare it with four pools of 20. Take one instance down and check that the remaining pools still cover 32.4.",
    keepInMind:
      "A pool that covers the planning demand still does not decide which region may retry a payment. The provider key is the operation identifier, and the region is only metadata on that attempt.",
    challengeSituation:
      "European Catalog is in the planning case: 1,440 reads a second, 25 percent more traffic, and 18 ms occupancy. One of the four instances is down. Each instance is allowed 8 connections.",
    challengeObjective:
      "With one instance down, the remaining pools cover the planning demand of 32.4 connections.",
    challengeSuccess: "Surviving connections stay at or above 32.4 while one instance is down.",
    metrics: [
      { id: "average", label: "Average connections", unit: "", explain: "Reads per second, including the extra fraction, times occupancy in seconds.", digits: 1 },
      { id: "target70", label: "70 percent target", unit: "", explain: "Average divided by 0.70. The chapter rounds the planning case of this figure to 47.", digits: 1 },
      { id: "opened", label: "Opened if all instances are up", unit: "", explain: "Instances times connections per instance.", digits: 0 },
      { id: "surviving", label: "Surviving connections", unit: "", explain: "What remains when one instance is down, or the full set when every instance is up.", digits: 0 },
    ],
    controls: [
      { id: "readsPerSec", kind: "range", label: "Reads per second", explain: "The launch estimate is 1,440 European Catalog reads a second.", min: 400, max: 2000, step: 20, unit: "/s" },
      { id: "occupancyMs", kind: "range", label: "Occupancy", explain: "Mean time a connection is held. The measured class is 12 ms. The planning case uses 18 ms.", min: 5, max: 40, step: 1, unit: "ms" },
      { id: "extraPct", kind: "range", label: "Extra reads", explain: "Percent added for the planning case. The chapter uses 25 percent.", min: 0, max: 50, step: 5, unit: "%" },
      { id: "instances", kind: "range", label: "Instances", explain: "How many Catalog instances open a pool. The configuration uses four.", min: 1, max: 6, step: 1, unit: "" },
      { id: "perInstance", kind: "range", label: "Connections per instance", explain: "The local pool size. The configuration uses 20.", min: 4, max: 40, step: 1, unit: "" },
      { id: "instanceDown", kind: "toggle", label: "One instance is down", explain: "On, the surviving pools are one instance fewer. A free connection on a living instance does not move to the missing one." },
    ],
    stages: [
      { id: "base", letter: "A", title: "Read the 17.3", body: "Leave the rate at 1,440 and the occupancy at 12 ms, with no extra reads. Average connections should sit near 17.3.", gate: "baseline" },
      { id: "plan", letter: "B", title: "Apply the planning case", body: "Add 25 percent more reads and set occupancy to 18 ms. Average connections should sit near 32.4.", gate: "planning" },
      { id: "fleet", letter: "C", title: "Open four pools of 20", body: "Set four instances and 20 connections each, with every instance up. That opens 80, which is the configuration, not the 17.3.", gate: "fleet" },
      { id: "down", letter: "D", title: "Lose one instance", body: "Take one instance down. Three pools of 20 should still cover the 32.4 planning demand.", gate: "survivor" },
    ],
    graphLabel: "European Catalog, its per-instance pools, and the database.",
    graph: {
      nodes: [
        { id: "region", label: "Region", x: 0, y: 80, sourceRight: true },
        { id: "catalog", label: "Catalog", x: 250, y: 80, target: "left", sourceRight: true },
        { id: "pool", label: "Pool", x: 500, y: 80, target: "left", sourceRight: true },
        { id: "database", label: "Database", x: 750, y: 80, target: "left" },
      ],
      edges: [
        { id: "region-catalog", source: "region", target: "catalog" },
        { id: "catalog-pool", source: "catalog", target: "pool" },
        { id: "pool-db", source: "pool", target: "database" },
      ],
    },
    chart: {
      title: "Average demand and surviving connections",
      caption: "Demand is the Little's Law figure. Surviving connections are what the living instances can still open.",
      yUnit: "connections",
      series: [
        { key: "average", label: "Average", swatch: accent },
        { key: "surviving", label: "Surviving", swatch: signal },
      ],
      guide: { value: 32.4, label: "32.4" },
    },
    code: {
      title: "L = λW",
      source: `1,440 × 0.012 ≈ 17.3 connections
1,440 × 1.25 × 0.018 = 32.4 connections
70 percent of 32.4 ≈ 46, rounded to 47
4 instances × 20 connections = 80
3 instances × 20 connections = 60`,
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
