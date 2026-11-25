#!/usr/bin/env python3
"""Enrich coding-problems.json with framing, progressive hints, and failure coaches."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "src/lib/labs/coding-problems.json"

# Progressive hints: concept → approach → partial sketch. Shared across format variants.
PEDAGOGY: dict[str, dict] = {
    "unhealthy-instances-v1": {
        "situation": "Heartbeat scrapes feed pages and alerts. If this filter is wrong, operators page healthy hosts or miss a hot CPU before traffic shifts.",
        "guarantee": "Return each unhealthy instance id once, in the order that instance first appears in the input, even when the first record for it was healthy.",
        "edges": [
            "Missing cpu or last_heartbeat_seconds is not enough to mark unhealthy.",
            "CPU at the threshold counts as unhealthy; just under it does not.",
            "Duplicates keep the first-seen position, not the position of the failing record.",
        ],
        "failureGuide": "Name which policy fired (healthy flag, CPU, or heartbeat) and whether order or uniqueness broke.",
        "hints": [
            "An instance is unhealthy when any one of its records fails a policy. Policies are independent: a false healthy flag, CPU at or above the threshold, or a heartbeat older than 120 seconds.",
            "Walk the list once. Remember every instance id in first-seen order, and remember which ids have already failed a policy. Build a new list; do not edit the input records.",
            "Keep an ordered map (or list plus set) of first-seen ids, and a set of unhealthy ids. After the scan, emit ordered ids that also sit in the unhealthy set. For missing fields, use the defaults in the criteria instead of inventing failure.",
        ],
        "explanation": "Evaluate each policy on each record without short-circuiting the others out of existence in your head. Preserve first-seen order from the full input, including ids whose first observation was healthy. Build a fresh list so the caller's records stay untouched.",
        "coaches": {
            "missing_optional_metric": "A record without cpu must not be treated as over threshold. Only an explicit failing healthy flag, an explicit high cpu, or an explicit stale heartbeat marks it.",
            "threshold_boundary": "The criteria use at or above the threshold. Equality with cpu_threshold is unhealthy; 84.9 with a default of 85.0 is not.",
            "duplicate_instance": "i-a appears first while healthy, then fails later. The output still lists i-a once, at the position of its first appearance.",
        },
    },
    "deployment-audit-implementation-v1": {
        "situation": "This offline checker runs before a batch rollout. A miss lets an unsafe Deployment ship; a false positive blocks a safe one.",
        "guarantee": "Return only deployments that fail at least one rule, each as {name, issues}, keeping input order and the fixed issue order: replicas, readiness, memory.",
        "edges": [
            "replicas missing or ≤ 0 → no_replicas.",
            "readiness_probe must be exactly True; anything else → no_readiness_probe.",
            "memory_limit_mib missing or ≤ 0 → no_memory_limit.",
        ],
        "failureGuide": "Check issue codes and order. Safe deployments must be absent from the result entirely.",
        "hints": [
            "You are auditing defaults, not talking to a cluster. Each rule names a concrete issue code. A deployment with no issues must not appear in the result.",
            "For each record, collect issues in a fixed order: replicas, then readiness, then memory. Append {name, issues} only when that list is non-empty, preserving the input order of deployments.",
            "Sketch three independent ifs that append issue codes, then append the result row only if issues is non-empty. Do not mutate the input dicts.",
        ],
        "explanation": "Each rule is a local predicate on one record. Keep issue codes in the documented order so downstream tooling can match them. Skip healthy deployments entirely instead of returning empty issue lists.",
        "coaches": {
            "all_safe": "Every record that passes all three rules must be omitted. An empty issues array is not a valid row.",
            "issue_order": "When several rules fail, list no_replicas, then no_readiness_probe, then no_memory_limit — not the order you noticed them in the JSON.",
        },
    },
    "status-counts": {
        "situation": "Status codes land in dashboards as class counts. A wrong bucket makes a 5xx spike look like a 4xx or hides it.",
        "guarantee": "Map each status into its hundred-class and count how many records fall in each class that appears.",
        "edges": [
            "Integer division by 100 is the class key.",
            "Classes with zero count must not appear.",
            "Do not mutate the input list.",
        ],
        "failureGuide": "Confirm the class key is status // 100 and that unused classes are omitted.",
        "hints": [
            "HTTP status classes are hundreds: 200–299 share class 2, 500–599 share class 5.",
            "One pass is enough. Use a dictionary from class to count, then return the structure the examples show.",
            "For each record, key = status // 100; counts[key] = counts.get(key, 0) + 1. Skip building entries for classes you never saw.",
        ],
    },
    "error-services": {
        "situation": "On-call sorts services by error volume. A wrong rank sends people into the quiet service first.",
        "guarantee": "Count only records that count as errors, then rank services by descending count and ascending name on ties.",
        "edges": [
            "Filter before you count.",
            "Tie-break is lexicographic service name.",
            "Services with zero errors do not appear.",
        ],
        "failureGuide": "Check the filter, then the sort key (negative count, then name).",
        "hints": [
            "Only error rows contribute. Healthy or non-error rows must not inflate a service's count.",
            "Count per service, then sort with a key that prefers higher counts and breaks ties by name.",
            "After counting, sort with key=(-count, name) or the language equivalent, and return the ranked shape the examples use.",
        ],
    },
    "latency-percentile": {
        "situation": "Tail latency on a page is only as honest as the percentile definition. A wrong rank quietly lies about p99.",
        "guarantee": "On a copy of the samples, return the nearest-rank value at ceil(p*n/100), or None when there are no samples.",
        "edges": [
            "Empty input returns None.",
            "Never sort the caller's list in place.",
            "Nearest rank uses ceiling, then a zero-based index.",
        ],
        "failureGuide": "Sort a copy, compute ceil(p*n/100)-1, and confirm empty input returns None.",
        "hints": [
            "Percentile here is nearest-rank with a ceiling step, not an interpolated quantile.",
            "Copy and sort the values ascending. Translate the percentile into a one-based rank, then into a zero-based index.",
            "If n == 0: return None. Else index = ceil(p*n/100) - 1 on the sorted copy, then return sorted[index].",
        ],
    },
    "rolling-errors": {
        "situation": "A rolling error window drives burn alerts. Including future or stale events changes whether you page.",
        "guarantee": "Count only events whose timestamps sit inside the inclusive window ending at now.",
        "edges": [
            "Exclude timestamps older than the window start.",
            "Exclude timestamps after now.",
            "Write both boundaries before looping.",
        ],
        "failureGuide": "Check both window edges: too old and still in the future.",
        "hints": [
            "A window is a closed interval on the timeline ending at now, not every event you have ever seen.",
            "Compute the oldest acceptable timestamp once, then count events that sit between that bound and now.",
            "start = now - window; count events with start <= t <= now. Do not count t > now.",
        ],
    },
    "error-budget": {
        "situation": "Error budget is how much failure SLO still allows. Clamping or floating drift changes whether a release may ship.",
        "guarantee": "Compute remaining budget in integers from total, failures, and slo_bps. Negative remainders are valid evidence.",
        "edges": [
            "Keep arithmetic in integers.",
            "Do not clamp a negative budget to zero.",
            "Basis points mean / 10000, not / 100.",
        ],
        "failureGuide": "Re-check integer arithmetic and whether a negative remainder was clamped away.",
        "hints": [
            "Budget remaining is allowed budget minus observed failures, expressed with the SLO in basis points.",
            "Prefer integer math so floating point cannot nudge a boundary. A negative result means the budget is already spent.",
            "allowed = total * slo_bps // 10000; return allowed - failures without max(0, …).",
        ],
    },
    "heartbeat-gaps": {
        "situation": "Missed heartbeats are the difference between a quiet host and a missing one. Inventing or dropping times hides outages.",
        "guarantee": "Return the expected heartbeat timestamps in [start, end] that never appear in the received set.",
        "edges": [
            "Generate the schedule from start, end, and interval; do not infer it only from observations.",
            "Membership checks belong on a set of received timestamps.",
            "Do not mutate the input list.",
        ],
        "failureGuide": "Build the expected schedule independently, then subtract what was received.",
        "hints": [
            "Gaps are expected ticks that never arrived, not the spaces between whatever you happened to receive.",
            "Put received timestamps in a set. Walk the theoretical schedule from start through end by interval.",
            "expected = start, start+interval, … while <= end; emit those missing from the received set, in schedule order.",
        ],
    },
    "retry-backoff": {
        "situation": "Retry delays shape client storms. An uncapped or off-by-one sequence either hammers a dependency or gives up too soon.",
        "guarantee": "Return the delay before each retry attempt, doubling from base_ms and never exceeding cap_ms. Zero attempts means an empty list.",
        "edges": [
            "Carry the capped delay forward so the next doubling starts from the cap.",
            "attempts == 0 yields [].",
            "The list length equals attempts.",
        ],
        "failureGuide": "Check length, doubling, and that the cap sticks on later attempts.",
        "hints": [
            "Each entry is how long to wait before that retry, not including the original try.",
            "Start from base_ms, double after each entry, and replace any value above cap_ms with the cap before recording it.",
            "delays = []; delay = base_ms; for _ in range(attempts): delay = min(delay, cap_ms); delays.append(delay); delay *= 2.",
        ],
    },
    "token-bucket": {
        "situation": "Admission control protects a process from burst overload. Admitting a rejected request, or refilling on a reject, breaks the limit.",
        "guarantee": "Start full at time 0. Before each request, refill by elapsed time up to capacity; admitting spends one token; rejects spend none.",
        "edges": [
            "Rejected requests do not consume tokens.",
            "Simultaneous requests do not get a magical extra refill between them.",
            "Timestamps are nondecreasing.",
        ],
        "failureGuide": "Track tokens and last time. Refill before the decision; only successful admits decrement.",
        "hints": [
            "A token bucket allows a short burst up to capacity while limiting the long-run rate.",
            "Keep current tokens and the last timestamp you considered. On each request, refill from elapsed time, then decide.",
            "On each t: tokens = min(capacity, tokens + (t - last) * refill); last = t; if tokens >= 1: tokens -= 1; admit else reject.",
        ],
    },
    "failure-streak": {
        "situation": "Circuit breakers open on consecutive failures, not lifetime totals. Counting the wrong thing trips early or never.",
        "guarantee": "Return the index where the consecutive failure streak first reaches threshold, or the refusal the examples use when it never does.",
        "edges": [
            "A success resets the streak to zero.",
            "Total failure count is not the streak.",
            "Threshold is consecutive outcomes.",
        ],
        "failureGuide": "Reset on success. Compare the streak to threshold at each failure.",
        "hints": [
            "Opening is about a run of failures in a row, not how many failures exist in the whole list.",
            "Scan left to right with a counter. Increment on failure, reset on success, and stop when the counter hits threshold.",
            "streak = 0; for i, outcome in enumerate(...): streak = streak+1 if failure else 0; if streak == threshold: return i.",
        ],
    },
    "maintenance-windows": {
        "situation": "Overlapping maintenance windows double-book change freezes. Merging them wrong leaves gaps or invents coverage.",
        "guarantee": "Merge overlapping or touching intervals into a minimal sorted list of disjoint windows.",
        "edges": [
            "Sort a copy by start time.",
            "Compare each interval to the end of the current merged interval.",
            "Do not mutate the caller's list.",
        ],
        "failureGuide": "Sort by start, then extend or append based on overlap with the current end.",
        "hints": [
            "Merging is a sweep over intervals ordered by start, not a pairwise check of every combination.",
            "Sort a copy. Keep a current merged interval and either extend its end or push it and start a new one.",
            "After sorting, for each [s,e]: if s <= current_end: current_end = max(current_end, e); else append current and start [s,e].",
        ],
    },
    "dependency-order": {
        "situation": "Service boot order with a cycle hangs forever. A wrong topological order starts a dependent before its dependency.",
        "guarantee": "Emit a valid startup order choosing the lexicographically smallest ready service at each step, or None when a cycle remains.",
        "edges": [
            "Every dependency name is also a key.",
            "Tie-break is lexicographically smallest ready name.",
            "If you emit fewer than all services, return None.",
        ],
        "failureGuide": "Check indegrees, the ready-set tie-break, and cycle detection via emit count.",
        "hints": [
            "This is Kahn's algorithm: repeatedly start a service whose remaining dependencies are already up.",
            "Track how many dependencies each service still needs, plus reverse edges to decrement dependents. Use a min-structure for the ready set.",
            "While ready: pop the smallest name, append it, decrement dependents, and enqueue those that hit zero. If len(order) < len(services): return None.",
        ],
    },
    "peak-concurrency": {
        "situation": "Peak in-flight work sizes pools and autoscales. Counting ends after starts at the same timestamp understates the peak.",
        "guarantee": "Return the maximum number of intervals that overlap at any instant, treating an end before a start at the same time.",
        "edges": [
            "Convert intervals into start and end events.",
            "At equal timestamps, process ends before starts.",
            "Do not mutate the input.",
        ],
        "failureGuide": "Sort ends before starts at equal times, then walk the sweep counting depth.",
        "hints": [
            "Peak concurrency is the deepest overlap on a timeline, not the number of intervals.",
            "Turn each interval into a start event and an end event, sort them, and sweep while tracking current depth.",
            "Events = (+1 at start, -1 at end); sort by time, and for equal time put -1 before +1; track cur and max.",
        ],
    },
    "config-drift": {
        "situation": "Desired versus actual config drift is how silent misconfig ships. Missing keys are drift too.",
        "guarantee": "Report keys that differ or exist on only one side, using the structure the examples show.",
        "edges": [
            "Inspect the union of keys.",
            "Membership checks come before value compares.",
            "Do not mutate either mapping.",
        ],
        "failureGuide": "Walk desired ∪ actual. Absent on one side is drift even when the other value looks fine.",
        "hints": [
            "Drift includes keys present on only one side, not only unequal shared values.",
            "Take the union of keys. For each key, classify missing-desired, missing-actual, or unequal.",
            "for key in sorted(set(desired) | set(actual)): compare membership first, then values when both exist.",
        ],
    },
    "deduplicate-events": {
        "situation": "Duplicate deliveries inflate metrics and fan-out. Sorting them rewrites history; dropping the first delivery loses the real event.",
        "guarantee": "Keep the first record for each event id and preserve first-delivery order.",
        "edges": [
            "Track seen ids separately from the output list.",
            "Do not sort by id or timestamp unless the contract says so.",
            "Later duplicates are dropped entirely.",
        ],
        "failureGuide": "First delivery wins. Output order follows first appearance, not sorted ids.",
        "hints": [
            "Idempotent intake keeps the first copy of an id and ignores the rest.",
            "Maintain a set of ids you have already emitted, and append to the result only on first sight.",
            "seen = set(); out = []; for event in events: if id not in seen: seen.add(id); out.append(event).",
        ],
    },
    "shard-routing": {
        "situation": "Shard placement must be stable across processes. A randomized hash sends the same key to different shards after restart.",
        "guarantee": "Map each integer key to a shard index in [0, shard_count) with a deterministic modulo.",
        "edges": [
            "Modulo yields the shard index.",
            "Do not use process-randomized hashes for an integer id.",
            "shard_count is positive.",
        ],
        "failureGuide": "Use a stable key % shard_count (or language equivalent for the typed integer).",
        "hints": [
            "Routing here is deterministic placement, not load-aware balancing.",
            "For each key, compute a non-negative index from the key and the shard count.",
            "return [key % shard_count for key in keys] with the language's integer modulo rules matching the fixtures.",
        ],
    },
    "rollout-batches": {
        "situation": "Canary batches limit blast radius. Off-by-one slices either skip hosts or dump the remainder into one unsafe batch.",
        "guarantee": "Split hosts into contiguous batches of batch_size, with a final shorter batch if needed.",
        "edges": [
            "Advance the start index by batch_size each time.",
            "A slice handles the final partial batch.",
            "Empty hosts yield no batches.",
        ],
        "failureGuide": "Check step size and that the last batch may be shorter than batch_size.",
        "hints": [
            "A rollout batch is a contiguous slice of the host list, not a random sample.",
            "Move a window of width batch_size across the list until you pass the end.",
            "for i in range(0, len(hosts), batch_size): yield hosts[i:i+batch_size].",
        ],
    },
    "disk-pressure": {
        "situation": "Disk pressure alerts prevent full volumes. Division rounding can hide a disk that is already over the threshold.",
        "guarantee": "Return disks whose used/capacity ratio meets the threshold, using a comparison that avoids float rounding traps.",
        "edges": [
            "Guard capacity before comparing utilization.",
            "Cross multiplication avoids division error.",
            "Do not mutate the input.",
        ],
        "failureGuide": "Check zero capacity handling and whether you used cross multiplication against the threshold.",
        "hints": [
            "Pressure is used versus capacity at a percent threshold, not a free-space vibe check.",
            "Skip or refuse zero capacity per the criteria. Compare used * 100 against capacity * threshold without dividing first.",
            "if capacity > 0 and used * 100 >= capacity * threshold_percent: include the disk.",
        ],
    },
    "redact-secrets": {
        "situation": "Logs leaving the box can carry passwords. Missing a nested key leaks a secret; over-redacting hides useful fields.",
        "guarantee": "Recursively copy structures, replacing values under case-insensitive keys password, token, and authorization with \"[REDACTED]\".",
        "edges": [
            "Handle dicts, lists, and scalars separately.",
            "Redact on the key before recursing into that value.",
            "Preserve key spelling for non-sensitive fields.",
        ],
        "failureGuide": "Recurse into nested maps and lists. Compare keys case-insensitively only for the three sensitive names.",
        "hints": [
            "Redaction is a structural walk: containers are rebuilt, scalars pass through, sensitive keys swap their values.",
            "Branch on type. For mappings, decide per key whether to replace the value or recurse. For sequences, map redact over items.",
            "if dict: {k: (\"[REDACTED]\" if k.lower() in sensitive else redact(v)) for k,v in ...}; if list: [redact(x) for x in ...]; else return value.",
        ],
    },
}

# Map variant ids to the base pedagogy key.
ALIASES = {
    "unhealthy-instances-complete-v1": "unhealthy-instances-v1",
    "unhealthy-instances-debug-v1": "unhealthy-instances-v1",
    "deployment-audit-complete-v1": "deployment-audit-implementation-v1",
    "deployment-audit-debug-v1": "deployment-audit-implementation-v1",
}


def main() -> None:
    problems = json.loads(PATH.read_text())
    for problem in problems:
        key = ALIASES.get(problem["id"], problem["id"])
        pedagogy = PEDAGOGY.get(key)
        if not pedagogy:
            raise SystemExit(f"missing pedagogy for {problem['id']}")

        problem["situation"] = pedagogy["situation"]
        problem["guarantee"] = pedagogy["guarantee"]
        problem["edges"] = pedagogy["edges"]
        problem["failureGuide"] = pedagogy["failureGuide"]
        problem["hints"] = pedagogy["hints"]
        if "explanation" in pedagogy:
            problem["explanation"] = pedagogy["explanation"]

        coaches = pedagogy.get("coaches") or {}
        for case in problem["cases"]:
            if case["id"] in coaches:
                case["coach"] = coaches[case["id"]]
            else:
                case.pop("coach", None)

        if problem["id"] == "unhealthy-instances-v1":
            problem["starter"] = (
                "def get_unhealthy_instances(\n"
                "    records: list[dict[str, object]],\n"
                "    cpu_threshold: float = 85.0,\n"
                ') -> list[str]:\n'
                '    """Return unique unhealthy instance ids in first-seen order."""\n'
                "    return []\n"
            )

        assert len(problem["hints"]) == 3, problem["id"]
        assert problem["situation"] and problem["guarantee"] and problem["edges"]

    PATH.write_text(json.dumps(problems, indent=2) + "\n")
    print(f"Enriched {len(problems)} problems with framing and progressive hints.")


if __name__ == "__main__":
    main()
