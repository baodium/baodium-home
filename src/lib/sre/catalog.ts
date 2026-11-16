export type SreLabKey =
  "instrument" | "slo" | "alert" | "cascade" | "capacity" | "deployment";
export type SreMode = "guided" | "practice" | "challenge";
export type SreLesson = {
  id: SreLabKey;
  title: string;
  summary: string;
  outcome: string;
  topic:
    | "Observability"
    | "Service levels"
    | "Alerting"
    | "Resilience"
    | "Capacity"
    | "Deployments";
  difficulty: "Beginner" | "Intermediate";
  minutes: number;
  prerequisites: SreLabKey[];
};
export const SRE_LESSONS: SreLesson[] = [
  {
    id: "instrument",
    title: "Name the slow hop in a checkout",
    summary:
      "Checkout is slow, and the outbound call is invisible. Add the signals and name the hop.",
    outcome:
      "Name the slow hop from the metric, the trace, and the log.",
    topic: "Observability",
    difficulty: "Beginner",
    minutes: 10,
    prerequisites: [],
  },
  {
    id: "slo",
    title: "Check a window against a 99.5% budget",
    summary:
      "Decide what counts as a good checkout, set 99.5 percent, and watch the misses spend the budget.",
    outcome:
      "Count a slow success as a miss when the line includes latency.",
    topic: "Service levels",
    difficulty: "Beginner",
    minutes: 12,
    prerequisites: ["instrument"],
  },
  {
    id: "alert",
    title: "Decide when a checkout failure should page",
    summary:
      "Compare a busy host, a short spike, a sustained checkout failure and missing telemetry.",
    outcome:
      "Use customer impact and burn rate to separate an incident from noise.",
    topic: "Alerting",
    difficulty: "Intermediate",
    minutes: 15,
    prerequisites: ["slo"],
  },
  {
    id: "cascade",
    title: "Follow a slow provider until checkout fails",
    summary:
      "A slow external provider fills its slots. Follow checkout through retries, queues and deadlines, then recover it.",
    outcome: "Use traces and measured outcomes to contain retry amplification.",
    topic: "Resilience",
    difficulty: "Intermediate",
    minutes: 20,
    prerequisites: ["instrument", "slo"],
  },
  {
    id: "capacity",
    title: "Hold latency while the checkout queue fills",
    summary:
      "A surge overwhelms a bounded worker queue. Compare manual capacity and a utilization-based scaling controller.",
    outcome: "Recover request success without reducing the offered load.",
    topic: "Capacity",
    difficulty: "Intermediate",
    minutes: 15,
    prerequisites: ["slo"],
  },
  {
    id: "deployment",
    title: "Take traffic off a bad release",
    summary:
      "Send a fraction of traffic to a bad release, watch the failures, and take the share back.",
    outcome: "Read how customer failures scale with the share on the bad release.",
    topic: "Deployments",
    difficulty: "Intermediate",
    minutes: 12,
    prerequisites: ["slo", "alert"],
  },
];
