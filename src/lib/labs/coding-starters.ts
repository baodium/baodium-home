import type { CodingProblem } from "./coding";
import type { PracticeLanguage } from "./languages";

/**
 * Authored Go / TypeScript drafts for implementation, complete, and debug tracks.
 * Implementation starters carry typed scaffolding and TODOs instead of bare zeros.
 * Complete and debug mirror the Python gap or bug quality.
 */
const STARTERS: Record<string, Partial<Record<Exclude<PracticeLanguage, "python">, string>>> = {
  "unhealthy-instances-v1": {
    typescript: `type Heartbeat = {
  instance_id: string;
  cpu?: number;
  healthy?: boolean;
  last_heartbeat_seconds?: number;
};

function getUnhealthyInstances(
  records: Heartbeat[],
  cpuThreshold = 85.0,
): string[] {
  // Build the answer from an empty return.
  // TODO 1: remember first-seen order for every instance id.
  // TODO 2: mark an id unhealthy when any record fails a policy.
  // TODO 3: emit ordered ids that are unhealthy. Do not mutate records.
  void records;
  void cpuThreshold;
  return [];
}
`,
    go: `package solution

type Heartbeat struct {
	InstanceID           string   \`json:"instance_id"\`
	CPU                  *float64 \`json:"cpu"\`
	Healthy              *bool    \`json:"healthy"\`
	LastHeartbeatSeconds *float64 \`json:"last_heartbeat_seconds"\`
}

// Build the answer from an empty return.
func GetUnhealthyInstances(records []Heartbeat, cpuThreshold float64) []string {
	// TODO 1: remember first-seen order for every instance id.
	// TODO 2: mark an id unhealthy when any record fails a policy.
	// TODO 3: emit ordered ids that are unhealthy. Do not mutate records.
	_ = records
	_ = cpuThreshold
	return []string{}
}
`,
  },
  "deployment-audit-implementation-v1": {
    typescript: `type Deployment = {
  name: string;
  replicas?: number;
  readiness_probe?: boolean;
  memory_limit_mib?: number;
};

type Finding = {
  name: string;
  issues: string[];
};

function auditDeployments(deployments: Deployment[]): Finding[] {
  // Build findings from an empty list.
  // TODO 1: for each deployment, collect issue codes in order:
  //         no_replicas, no_readiness_probe, no_memory_limit.
  // TODO 2: append a finding only when issues is non-empty.
  // Keep input order. Do not mutate deployments.
  void deployments;
  return [];
}
`,
    go: `package solution

type Deployment struct {
	Name           string   \`json:"name"\`
	Replicas       *float64 \`json:"replicas"\`
	ReadinessProbe *bool    \`json:"readiness_probe"\`
	MemoryLimitMiB *float64 \`json:"memory_limit_mib"\`
}

type Finding struct {
	Name   string   \`json:"name"\`
	Issues []string \`json:"issues"\`
}

// Build findings from an empty list.
func AuditDeployments(deployments []Deployment) []Finding {
	// TODO 1: for each deployment, collect issue codes in order:
	//         no_replicas, no_readiness_probe, no_memory_limit.
	// TODO 2: append a finding only when issues is non-empty.
	// Keep input order. Do not mutate deployments.
	_ = deployments
	return []Finding{}
}
`,
  },
  "status-counts": {
    typescript: `type StatusRecord = {
  status: number;
};

function countStatuses(records: StatusRecord[]): Record<string, number> {
  // Build class counts from an empty map.
  // TODO 1: map each status to a class key with integer division by 100 (2xx, 5xx, …).
  // TODO 2: increment counts; omit classes that never appear.
  // Do not mutate records.
  void records;
  return {};
}
`,
    go: `package solution

// Build class counts from an empty map.
func CountStatuses(records []map[string]float64) map[string]float64 {
	// TODO 1: map each status to a class key with integer division by 100.
	// TODO 2: increment counts; omit classes that never appear.
	_ = records
	return map[string]float64{}
}
`,
  },
  "error-services": {
    typescript: `type ErrorRecord = {
  service: string;
  status: number;
};

function rankErrors(records: ErrorRecord[]): string[] {
  // Rank services by 5xx volume.
  // TODO 1: count only records whose status is in the 5xx class.
  // TODO 2: sort by descending count, then lexicographic service name.
  // Do not mutate records.
  void records;
  return [];
}
`,
    go: `package solution

// Rank services by 5xx volume.
func RankErrors(records []map[string]any) []string {
	// TODO 1: count only records whose status is in the 5xx class.
	// TODO 2: sort by descending count, then lexicographic service name.
	_ = records
	return []string{}
}
`,
  },
  "latency-percentile": {
    typescript: `function percentile(values: number[], p: number): number | null {
  // Nearest-rank percentile without sorting in place.
  // TODO 1: return null when values is empty.
  // TODO 2: copy, sort ascending, pick the nearest-rank index for p.
  void values;
  void p;
  return null;
}
`,
    go: `package solution

// Nearest-rank percentile without sorting in place.
// Empty input returns nil (JSON null).
func Percentile(values []float64, p float64) any {
	// TODO 1: return nil when values is empty.
	// TODO 2: copy, sort ascending, pick the nearest-rank index for p.
	_ = values
	_ = p
	return nil
}
`,
  },
  "rolling-errors": {
    typescript: `type ErrorEvent = {
  ts: number;
  failed?: boolean;
};

function windowErrors(
  events: ErrorEvent[],
  now: number,
  window: number,
): number {
  // Count failures inside [now - window, now].
  // TODO 1: drop timestamps older than the window start or after now.
  // TODO 2: count only events marked failed.
  void events;
  void now;
  void window;
  return 0;
}
`,
    go: `package solution

// Count failures inside [now - window, now].
func WindowErrors(events []map[string]float64, now float64, window float64) float64 {
	// TODO 1: drop timestamps older than the window start or after now.
	// TODO 2: count only events marked failed.
	_ = events
	_ = now
	_ = window
	return 0
}
`,
  },
  "error-budget": {
    typescript: `function remainingBudget(
  total: number,
  failures: number,
  sloBps: number,
): number {
  // Integer budget left in basis points of total.
  // TODO 1: allowed failures = floor(total * (10000 - slo_bps) / 10000).
  // TODO 2: return allowed - failures without clamping negatives to zero.
  void total;
  void failures;
  void sloBps;
  return 0;
}
`,
    go: `package solution

// Integer budget left in basis points of total.
func RemainingBudget(total float64, failures float64, sloBps float64) float64 {
	// TODO 1: allowed failures = floor(total * (10000 - sloBps) / 10000).
	// TODO 2: return allowed - failures without clamping negatives to zero.
	_ = total
	_ = failures
	_ = sloBps
	return 0
}
`,
  },
  "retry-backoff": {
    typescript: `function retryDelays(
  attempts: number,
  baseMs: number,
  capMs: number,
): number[] {
  // Capped exponential delays for each attempt.
  // TODO 1: attempts == 0 yields [].
  // TODO 2: double from base, cap at capMs, and carry the capped value forward.
  void attempts;
  void baseMs;
  void capMs;
  return [];
}
`,
    go: `package solution

// Capped exponential delays for each attempt.
func RetryDelays(attempts float64, baseMs float64, capMs float64) []float64 {
	// TODO 1: attempts == 0 yields an empty slice.
	// TODO 2: double from base, cap at capMs, and carry the capped value forward.
	_ = attempts
	_ = baseMs
	_ = capMs
	return []float64{}
}
`,
  },
  "token-bucket": {
    typescript: `function admitRequests(
  timestamps: number[],
  capacity: number,
  refillPerSecond: number,
): boolean[] {
  // Admit or reject each request in arrival order.
  // TODO 1: refill from elapsed time, never above capacity.
  // TODO 2: consume one token only when admitting; rejections spend none.
  void timestamps;
  void capacity;
  void refillPerSecond;
  return [];
}
`,
    go: `package solution

// Admit or reject each request in arrival order.
func AdmitRequests(timestamps []float64, capacity float64, refillPerSecond float64) []bool {
	// TODO 1: refill from elapsed time, never above capacity.
	// TODO 2: consume one token only when admitting; rejections spend none.
	_ = timestamps
	_ = capacity
	_ = refillPerSecond
	return []bool{}
}
`,
  },
  "dependency-order": {
    typescript: `function startupOrder(
  dependencies: Record<string, string[]>,
): string[] | null {
  // Kahn order with lexicographic ready-set tie-break.
  // TODO 1: every dependency name is also a service key.
  // TODO 2: emit the lexicographically smallest ready name each step.
  // TODO 3: return null when a cycle remains.
  void dependencies;
  return null;
}
`,
    go: `package solution

// Kahn order with lexicographic ready-set tie-break.
// Cycles return nil (JSON null).
func StartupOrder(dependencies map[string][]string) any {
	// TODO 1: every dependency name is also a service key.
	// TODO 2: emit the lexicographically smallest ready name each step.
	// TODO 3: return nil when a cycle remains.
	_ = dependencies
	return nil
}
`,
  },
  "heartbeat-gaps": {
    typescript: `function heartbeatGaps(
  timestamps: number[],
  start: number,
  end: number,
  interval: number,
): number[] {
  // Find missing scheduled heartbeats.
  // TODO 1: generate the schedule from start, end, and interval.
  // TODO 2: compare against a set of received timestamps.
  // Do not mutate timestamps.
  void timestamps;
  void start;
  void end;
  void interval;
  return [];
}
`,
    go: `package solution

// Find missing scheduled heartbeats.
func HeartbeatGaps(timestamps []float64, start float64, end float64, interval float64) []float64 {
	// TODO 1: generate the schedule from start, end, and interval.
	// TODO 2: compare against a set of received timestamps.
	_ = timestamps
	_ = start
	_ = end
	_ = interval
	return []float64{}
}
`,
  },
  "failure-streak": {
    typescript: `function openingIndex(
  outcomes: boolean[],
  threshold: number,
): number | null {
  // Index where a consecutive failure streak opens.
  // TODO 1: a success resets the streak to zero.
  // TODO 2: return the index where the streak first reaches threshold, else null.
  void outcomes;
  void threshold;
  return null;
}
`,
    go: `package solution

// Index where a consecutive failure streak opens.
// No opening returns nil (JSON null).
func OpeningIndex(outcomes []bool, threshold float64) any {
	// TODO 1: a success resets the streak to zero.
	// TODO 2: return the index where the streak first reaches threshold, else nil.
	_ = outcomes
	_ = threshold
	return nil
}
`,
  },
  "maintenance-windows": {
    typescript: `function mergeWindows(windows: number[][]): number[][] {
  // Merge overlapping or touching [start, end] windows.
  // TODO 1: sort a copy by start time.
  // TODO 2: extend the current end when the next window overlaps or touches.
  // Do not mutate the caller's list.
  void windows;
  return [];
}
`,
    go: `package solution

// Merge overlapping or touching [start, end] windows.
func MergeWindows(windows [][]float64) [][]float64 {
	// TODO 1: sort a copy by start time.
	// TODO 2: extend the current end when the next window overlaps or touches.
	_ = windows
	return [][]float64{}
}
`,
  },
  "peak-concurrency": {
    typescript: `function peakConcurrency(intervals: number[][]): number {
  // Peak overlapping [start, end) intervals.
  // TODO 1: turn intervals into start and end events.
  // TODO 2: at equal timestamps, process ends before starts.
  // Do not mutate intervals.
  void intervals;
  return 0;
}
`,
    go: `package solution

// Peak overlapping [start, end) intervals.
func PeakConcurrency(intervals [][]float64) float64 {
	// TODO 1: turn intervals into start and end events.
	// TODO 2: at equal timestamps, process ends before starts.
	_ = intervals
	return 0
}
`,
  },
  "config-drift": {
    typescript: `function configDrift(
  desired: Record<string, unknown>,
  actual: Record<string, unknown>,
): string[] {
  // Keys that drifted between desired and actual.
  // TODO 1: inspect the union of keys.
  // TODO 2: missing, extra, and value changes all count; null is not missing.
  // Do not mutate either mapping.
  void desired;
  void actual;
  return [];
}
`,
    go: `package solution

// Keys that drifted between desired and actual.
func ConfigDrift(desired map[string]any, actual map[string]any) []string {
	// TODO 1: inspect the union of keys.
	// TODO 2: missing, extra, and value changes all count; null is not missing.
	_ = desired
	_ = actual
	return []string{}
}
`,
  },
  "deduplicate-events": {
    typescript: `type EventRow = {
  id: string;
  [key: string]: string;
};

function uniqueEvents(events: EventRow[]): EventRow[] {
  // Keep first-seen id order.
  // TODO 1: track seen ids separately from the output list.
  // TODO 2: drop later duplicates entirely; do not sort.
  // Do not mutate events.
  void events;
  return [];
}
`,
    go: `package solution

// Keep first-seen id order.
func UniqueEvents(events []map[string]string) []map[string]string {
	// TODO 1: track seen ids separately from the output list.
	// TODO 2: drop later duplicates entirely; do not sort.
	_ = events
	return []map[string]string{}
}
`,
  },
  "shard-routing": {
    typescript: `function routeKeys(
  keys: number[],
  shardCount: number,
): Record<string, number[]> {
  // Stable modulo routing into shard buckets.
  // TODO 1: shard index is key % shardCount.
  // TODO 2: preserve encounter order inside each shard; omit empty shards.
  void keys;
  void shardCount;
  return {};
}
`,
    go: `package solution

// Stable modulo routing into shard buckets.
func RouteKeys(keys []float64, shardCount float64) map[string][]float64 {
	// TODO 1: shard index is int(key) % int(shardCount).
	// TODO 2: preserve encounter order inside each shard; omit empty shards.
	_ = keys
	_ = shardCount
	return map[string][]float64{}
}
`,
  },
  "rollout-batches": {
    typescript: `function rolloutBatches(
  hosts: string[],
  batchSize: number,
): string[][] {
  // Split hosts into rollout batches.
  // TODO 1: advance the start index by batchSize each step.
  // TODO 2: the final batch may be shorter; empty hosts yield [].
  // Do not mutate hosts.
  void hosts;
  void batchSize;
  return [];
}
`,
    go: `package solution

// Split hosts into rollout batches.
func RolloutBatches(hosts []string, batchSize float64) [][]string {
	// TODO 1: advance the start index by batchSize each step.
	// TODO 2: the final batch may be shorter; empty hosts yield an empty slice.
	_ = hosts
	_ = batchSize
	return [][]string{}
}
`,
  },
  "disk-pressure": {
    typescript: `type DiskRow = {
  name: string;
  used?: number;
  capacity?: number;
};

function pressuredDisks(
  disks: DiskRow[],
  thresholdPercent: number,
): string[] {
  // Names at or above utilization threshold.
  // TODO 1: skip rows with missing or non-positive capacity.
  // TODO 2: compare used*100 with capacity*threshold without float traps.
  // Do not mutate disks.
  void disks;
  void thresholdPercent;
  return [];
}
`,
    go: `package solution

// Names at or above utilization threshold.
func PressuredDisks(disks []map[string]any, thresholdPercent float64) []string {
	// TODO 1: skip rows with missing or non-positive capacity.
	// TODO 2: compare used*100 with capacity*threshold without float traps.
	_ = disks
	_ = thresholdPercent
	return []string{}
}
`,
  },
  "redact-secrets": {
    typescript: `function redact(value: unknown): unknown {
  // Redact sensitive keys in nested structures.
  // TODO 1: handle objects, arrays, and scalars separately.
  // TODO 2: redact on the key before recursing into that value.
  // Preserve key spelling for non-sensitive fields.
  void value;
  return value;
}
`,
    go: `package solution

// Redact sensitive keys in nested structures.
func Redact(value any) any {
	// TODO 1: handle maps, slices, and scalars separately.
	// TODO 2: redact on the key before recursing into that value.
	return value
}
`,
  },
  "unhealthy-instances-complete-v1": {
    typescript: `type Heartbeat = {
  instance_id: string;
  cpu?: number;
  healthy?: boolean;
  last_heartbeat_seconds?: number;
};

function getUnhealthyInstances(
  records: Heartbeat[],
  cpuThreshold = 85.0,
): string[] {
  // Heartbeat scrapes feed pages. Finish the filter; keep first-seen order.
  const order: string[] = [];
  const seen = new Set<string>();
  const unhealthy = new Set<string>();
  for (const row of records) {
    const instanceId = row.instance_id;
    if (!seen.has(instanceId)) {
      seen.add(instanceId);
      order.push(instanceId);
    }
    // TODO 1: unhealthy when healthy===false, cpu >= threshold, or heartbeat > 120.
    // Missing optional fields are not enough on their own.
    const isUnhealthy = false;
    // TODO 2: add instanceId to unhealthy when isUnhealthy is true.
    void isUnhealthy;
  }
  return order.filter((instanceId) => unhealthy.has(instanceId));
}
`,
    go: `package solution

type Heartbeat struct {
	InstanceID           string   \`json:"instance_id"\`
	CPU                  *float64 \`json:"cpu"\`
	Healthy              *bool    \`json:"healthy"\`
	LastHeartbeatSeconds *float64 \`json:"last_heartbeat_seconds"\`
}

// Heartbeat scrapes feed pages. Finish the filter; keep first-seen order.
func GetUnhealthyInstances(records []Heartbeat, cpuThreshold float64) []string {
	order := make([]string, 0)
	seen := map[string]bool{}
	unhealthy := map[string]bool{}
	for _, row := range records {
		id := row.InstanceID
		if !seen[id] {
			seen[id] = true
			order = append(order, id)
		}
		// TODO 1: unhealthy when Healthy==false, CPU >= threshold, or heartbeat > 120.
		// Missing optional fields are not enough on their own.
		isUnhealthy := false
		// TODO 2: mark id in unhealthy when isUnhealthy is true.
		_ = isUnhealthy
	}
	out := make([]string, 0)
	for _, id := range order {
		if unhealthy[id] {
			out = append(out, id)
		}
	}
	return out
}
`,
  },
  "unhealthy-instances-debug-v1": {
    typescript: `type Heartbeat = {
  instance_id: string;
  cpu?: number;
  healthy?: boolean;
  last_heartbeat_seconds?: number;
};

function getUnhealthyInstances(
  records: Heartbeat[],
  cpuThreshold = 85.0,
): string[] {
  // Live check: pages healthy hosts and duplicates the same id.
  const result: string[] = [];
  for (const row of records) {
    if (
      row.healthy === false ||
      (row.cpu ?? 0) > cpuThreshold ||
      (row.last_heartbeat_seconds ?? 0) >= 120
    ) {
      result.push(row.instance_id);
    }
  }
  return result;
}
`,
    go: `package solution

type Heartbeat struct {
	InstanceID           string   \`json:"instance_id"\`
	CPU                  *float64 \`json:"cpu"\`
	Healthy              *bool    \`json:"healthy"\`
	LastHeartbeatSeconds *float64 \`json:"last_heartbeat_seconds"\`
}

// Live check: pages healthy hosts and duplicates the same id.
func GetUnhealthyInstances(records []Heartbeat, cpuThreshold float64) []string {
	result := make([]string, 0)
	for _, row := range records {
		cpu := 0.0
		if row.CPU != nil {
			cpu = *row.CPU
		}
		heartbeat := 0.0
		if row.LastHeartbeatSeconds != nil {
			heartbeat = *row.LastHeartbeatSeconds
		}
		healthyFalse := row.Healthy != nil && !*row.Healthy
		if healthyFalse || cpu > cpuThreshold || heartbeat >= 120 {
			result = append(result, row.InstanceID)
		}
	}
	return result
}
`,
  },
  "deployment-audit-complete-v1": {
    typescript: `type Deployment = {
  name: string;
  replicas?: number;
  readiness_probe?: boolean;
  memory_limit_mib?: number;
};

type Finding = {
  name: string;
  issues: string[];
};

function auditDeployments(deployments: Deployment[]): Finding[] {
  // Offline pre-deploy gate. Issue codes: no_replicas, no_readiness_probe, no_memory_limit.
  const findings: Finding[] = [];
  for (const deployment of deployments) {
    const issues: string[] = [];
    // TODO 1: flag replicas missing or < 1 as no_replicas.
    // TODO 2: flag readiness_probe missing or false as no_readiness_probe.
    // TODO 3: flag memory_limit_mib missing or <= 0 as no_memory_limit.
    // Keep that issue order. Leave the input unchanged.
    void deployment;
    // TODO 4: append { name, issues } only when issues is non-empty.
    void issues;
  }
  return findings;
}
`,
    go: `package solution

type Deployment struct {
	Name           string   \`json:"name"\`
	Replicas       *float64 \`json:"replicas"\`
	ReadinessProbe *bool    \`json:"readiness_probe"\`
	MemoryLimitMiB *float64 \`json:"memory_limit_mib"\`
}

type Finding struct {
	Name   string   \`json:"name"\`
	Issues []string \`json:"issues"\`
}

// Offline pre-deploy gate. Issue codes: no_replicas, no_readiness_probe, no_memory_limit.
func AuditDeployments(deployments []Deployment) []Finding {
	findings := make([]Finding, 0)
	for _, deployment := range deployments {
		issues := make([]string, 0)
		// TODO 1: flag replicas missing or < 1 as no_replicas.
		// TODO 2: flag readiness_probe missing or false as no_readiness_probe.
		// TODO 3: flag memory_limit_mib missing or <= 0 as no_memory_limit.
		// Keep that issue order. Leave the input unchanged.
		_ = deployment
		// TODO 4: append a Finding only when issues is non-empty.
		_ = issues
	}
	return findings
}
`,
  },
  "deployment-audit-debug-v1": {
    typescript: `type Deployment = {
  name: string;
  replicas?: number;
  readiness_probe?: boolean;
  memory_limit_mib?: number;
};

type Finding = {
  name: string;
  issues: string[];
};

function auditDeployments(deployments: Deployment[]): Finding[] {
  // Live check: marks healthy services and misses unsafe defaults.
  const findings: Finding[] = [];
  for (const deployment of deployments) {
    const issues: string[] = [];
    if ((deployment.replicas ?? 1) < 0) {
      issues.push("no_replicas");
    }
    if (deployment.readiness_probe ?? true) {
      issues.push("no_readiness_probe");
    }
    if ((deployment.memory_limit_mib ?? 512) < 0) {
      issues.push("no_memory_limit");
    }
    findings.push({ name: deployment.name, issues });
  }
  return findings;
}
`,
    go: `package solution

type Deployment struct {
	Name           string   \`json:"name"\`
	Replicas       *float64 \`json:"replicas"\`
	ReadinessProbe *bool    \`json:"readiness_probe"\`
	MemoryLimitMiB *float64 \`json:"memory_limit_mib"\`
}

type Finding struct {
	Name   string   \`json:"name"\`
	Issues []string \`json:"issues"\`
}

// Live check: marks healthy services and misses unsafe defaults.
func AuditDeployments(deployments []Deployment) []Finding {
	findings := make([]Finding, 0)
	for _, deployment := range deployments {
		issues := make([]string, 0)
		replicas := 1.0
		if deployment.Replicas != nil {
			replicas = *deployment.Replicas
		}
		readiness := true
		if deployment.ReadinessProbe != nil {
			readiness = *deployment.ReadinessProbe
		}
		memory := 512.0
		if deployment.MemoryLimitMiB != nil {
			memory = *deployment.MemoryLimitMiB
		}
		if replicas < 0 {
			issues = append(issues, "no_replicas")
		}
		if readiness {
			issues = append(issues, "no_readiness_probe")
		}
		if memory < 0 {
			issues = append(issues, "no_memory_limit")
		}
		findings = append(findings, Finding{Name: deployment.Name, Issues: issues})
	}
	return findings
}
`,
  },
  "status-counts-complete-v1": {
    typescript: `type StatusRecord = {
  status: number;
};

function countStatuses(records: StatusRecord[]): Record<string, number> {
  // Finish the class map. Keys look like 2xx and 5xx.
  const counts: Record<string, number> = {};
  for (const row of records) {
    // TODO 1: build the class key with integer division by 100.
    const key = "";
    // TODO 2: increment counts[key]. Omit classes that never appear.
    void key;
    void row;
  }
  return counts;
}
`,
    go: `package solution

// Finish the class map. Keys look like 2xx and 5xx.
func CountStatuses(records []map[string]float64) map[string]float64 {
	counts := map[string]float64{}
	for _, row := range records {
		// TODO 1: build the class key with integer division by 100.
		key := ""
		// TODO 2: increment counts[key]. Omit classes that never appear.
		_ = key
		_ = row
	}
	return counts
}
`,
  },
  "status-counts-debug-v1": {
    typescript: `type StatusRecord = {
  status: number;
};

function countStatuses(records: StatusRecord[]): Record<string, number> {
  // Existing map: tests report wrong keys and inflated totals.
  const counts: Record<string, number> = {};
  for (const row of records) {
    const key = String(row.status / 100) + "x";
    counts[key] = (counts[key] ?? 0) + 2;
  }
  return counts;
}
`,
    go: `package solution

import "strconv"

// Existing map: tests report wrong keys and inflated totals.
func CountStatuses(records []map[string]float64) map[string]float64 {
	counts := map[string]float64{}
	for _, row := range records {
		status := row["status"]
		key := strconv.FormatFloat(status/100, 'f', -1, 64) + "x"
		counts[key] = counts[key] + 2
	}
	return counts
}
`,
  },
  "retry-backoff-complete-v1": {
    typescript: `function retryDelays(
  attempts: number,
  baseMs: number,
  capMs: number,
): number[] {
  // Finish the capped exponential schedule.
  const delays: number[] = [];
  // TODO 1: if attempts is 0, return [] without building delay.
  let delay = Math.min(baseMs, capMs);
  for (let i = 0; i < attempts; i += 1) {
    // TODO 2: append the current delay, then double and cap for the next step.
    void delay;
  }
  return delays;
}
`,
    go: `package solution

// Finish the capped exponential schedule.
func RetryDelays(attempts float64, baseMs float64, capMs float64) []float64 {
	delays := make([]float64, 0)
	// TODO 1: if attempts is 0, return an empty slice.
	delay := baseMs
	if capMs < delay {
		delay = capMs
	}
	for i := 0.0; i < attempts; i++ {
		// TODO 2: append the current delay, then double and cap for the next step.
		_ = delay
	}
	return delays
}
`,
  },
  "retry-backoff-debug-v1": {
    typescript: `function retryDelays(
  attempts: number,
  baseMs: number,
  capMs: number,
): number[] {
  // Existing schedule: uncapped growth and an off-by-one length.
  const delays: number[] = [];
  let delay = baseMs;
  for (let i = 0; i < attempts + 1; i += 1) {
    delay = delay * 2;
    delays.push(delay);
  }
  void capMs;
  return delays;
}
`,
    go: `package solution

// Existing schedule: uncapped growth and an off-by-one length.
func RetryDelays(attempts float64, baseMs float64, capMs float64) []float64 {
	delays := make([]float64, 0)
	delay := baseMs
	for i := 0.0; i < attempts+1; i++ {
		delay = delay * 2
		delays = append(delays, delay)
	}
	_ = capMs
	return delays
}
`,
  },
  "error-budget-complete-v1": {
    typescript: `function remainingBudget(
  total: number,
  failures: number,
  sloBps: number,
): number {
  // Finish the integer budget. Do not clamp negatives to zero.
  // TODO 1: allowed = floor(total * (10000 - sloBps) / 10000)
  const allowed = 0;
  // TODO 2: return allowed - failures
  void total;
  void failures;
  void sloBps;
  return allowed;
}
`,
    go: `package solution

// Finish the integer budget. Do not clamp negatives to zero.
func RemainingBudget(total float64, failures float64, sloBps float64) float64 {
	// TODO 1: allowed = floor(total * (10000 - sloBps) / 10000)
	allowed := 0.0
	// TODO 2: return allowed - failures
	_ = total
	_ = failures
	_ = sloBps
	return allowed
}
`,
  },
  "error-budget-debug-v1": {
    typescript: `function remainingBudget(
  total: number,
  failures: number,
  sloBps: number,
): number {
  // Existing budget math: float drift and a clamped floor.
  const allowed = total * (1 - sloBps / 10000);
  return Math.max(Math.trunc(allowed) - failures, 0);
}
`,
    go: `package solution

import "math"

// Existing budget math: float drift and a clamped floor.
func RemainingBudget(total float64, failures float64, sloBps float64) float64 {
	allowed := total * (1 - sloBps/10000)
	out := math.Trunc(allowed) - failures
	if out < 0 {
		return 0
	}
	return out
}
`,
  },
  "heartbeat-gaps-complete-v1": {
    typescript: `function heartbeatGaps(
  timestamps: number[],
  start: number,
  end: number,
  interval: number,
): number[] {
  // Finish the missing schedule. Include end when it lands on the grid.
  const received = new Set(timestamps);
  const missing: number[] = [];
  // TODO 1: walk t from start through end in steps of interval.
  let t = start;
  while (false) {
    // TODO 2: append t when it is absent from received.
    void t;
    void received;
    break;
  }
  void end;
  void interval;
  return missing;
}
`,
    go: `package solution

// Finish the missing schedule. Include end when it lands on the grid.
func HeartbeatGaps(timestamps []float64, start float64, end float64, interval float64) []float64 {
	received := map[float64]bool{}
	for _, t := range timestamps {
		received[t] = true
	}
	missing := make([]float64, 0)
	// TODO 1: walk t from start through end in steps of interval.
	t := start
	for false {
		// TODO 2: append t when it is absent from received.
		_ = t
		_ = received
		break
	}
	_ = end
	_ = interval
	return missing
}
`,
  },
  "heartbeat-gaps-debug-v1": {
    typescript: `function heartbeatGaps(
  timestamps: number[],
  start: number,
  end: number,
  interval: number,
): number[] {
  // Existing scan: misses the final tick and invents extras.
  const received = new Set(timestamps);
  const missing: number[] = [];
  for (let t = start; t < end; t += interval) {
    if (received.has(t)) missing.push(t);
  }
  return missing;
}
`,
    go: `package solution

// Existing scan: misses the final tick and invents extras.
func HeartbeatGaps(timestamps []float64, start float64, end float64, interval float64) []float64 {
	received := map[float64]bool{}
	for _, t := range timestamps {
		received[t] = true
	}
	missing := make([]float64, 0)
	for t := start; t < end; t += interval {
		if received[t] {
			missing = append(missing, t)
		}
	}
	return missing
}
`,
  },
  "failure-streak-complete-v1": {
    typescript: `function openingIndex(
  outcomes: boolean[],
  threshold: number,
): number | null {
  // Finish the consecutive-failure open index.
  let streak = 0;
  for (let index = 0; index < outcomes.length; index += 1) {
    // TODO 1: reset streak on success; otherwise increment.
    void streak;
    // TODO 2: return index when streak first reaches threshold.
    void threshold;
  }
  return null;
}
`,
    go: `package solution

// Finish the consecutive-failure open index. No opening returns nil.
func OpeningIndex(outcomes []bool, threshold float64) any {
	streak := 0.0
	for index := range outcomes {
		// TODO 1: reset streak on success; otherwise increment.
		_ = streak
		// TODO 2: return index when streak first reaches threshold.
		_ = index
		_ = threshold
	}
	return nil
}
`,
  },
  "failure-streak-debug-v1": {
    typescript: `function openingIndex(
  outcomes: boolean[],
  threshold: number,
): number | null {
  // Existing open check: opens too late or on lifetime totals.
  let streak = 0;
  for (const success of outcomes) {
    if (!success) {
      streak += 1;
      if (streak >= threshold) return streak;
    }
  }
  return null;
}
`,
    go: `package solution

// Existing open check: opens too late or on lifetime totals.
func OpeningIndex(outcomes []bool, threshold float64) any {
	streak := 0.0
	for _, success := range outcomes {
		if !success {
			streak++
			if streak >= threshold {
				return streak
			}
		}
	}
	return nil
}
`,
  },
  "redact-secrets-complete-v1": {
    typescript: `function redact(value: unknown): unknown {
  // Finish nested redaction for password, token, and authorization keys.
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      // TODO 1: redact when key.toLowerCase() is password, token, or authorization.
      // TODO 2: otherwise recurse into item.
      out[key] = item;
    }
    return out;
  }
  if (Array.isArray(value)) {
    // TODO 3: recurse into each list item.
    return value;
  }
  return value;
}
`,
    go: `package solution

// Finish nested redaction for password, token, and authorization keys.
func Redact(value any) any {
	switch typed := value.(type) {
	case map[string]any:
		out := map[string]any{}
		for key, item := range typed {
			// TODO 1: redact when strings.ToLower(key) is password, token, or authorization.
			// TODO 2: otherwise recurse into item.
			out[key] = item
		}
		return out
	case []any:
		// TODO 3: recurse into each list item.
		return typed
	default:
		return value
	}
}
`,
  },
  "redact-secrets-debug-v1": {
    typescript: `function redact(value: unknown): unknown {
  // Existing redactor: still leaks nested and mixed-case secrets.
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      if (key === "password" || key === "token" || key === "authorization") {
        record[key] = "[REDACTED]";
      }
    }
    return record;
  }
  return value;
}
`,
    go: `package solution

// Existing redactor: still leaks nested and mixed-case secrets.
func Redact(value any) any {
	typed, ok := value.(map[string]any)
	if !ok {
		return value
	}
	for key := range typed {
		if key == "password" || key == "token" || key == "authorization" {
			typed[key] = "[REDACTED]"
		}
	}
	return typed
}
`,
  },
};

export function authoredStarter(
  problem: Pick<CodingProblem, "id">,
  language: PracticeLanguage,
): string | null {
  if (language === "python") return null;
  return STARTERS[problem.id]?.[language] ?? null;
}
