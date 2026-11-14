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
    title: "Instrument a service",
    summary:
      "Checkout is slow, but the outbound call is invisible. Add the signals that let you locate the delay.",
    outcome:
      "Identify the slow hop using metrics, trace context and structured logs.",
    topic: "Observability",
    difficulty: "Beginner",
    minutes: 10,
    prerequisites: [],
  },
  {
    id: "slo",
    title: "Define and spend an error budget",
    summary:
      "Decide what counts as a good checkout, set a target, and observe the failures that consume the budget.",
    outcome:
      "Distinguish request success from an SLI that also requires timely responses.",
    topic: "Service levels",
    difficulty: "Beginner",
    minutes: 12,
    prerequisites: ["instrument"],
  },
  {
    id: "alert",
    title: "When a page is warranted",
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
    title: "A checkout is failing, and the failure is spreading.",
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
    title: "Recover a queue with replicas and autoscaling",
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
    title: "Contain a faulty canary release",
    summary:
      "Release to a fraction of traffic, observe failures and recover by rollback or a repaired release.",
    outcome: "Treat exposure as an experiment and assess the customer impact.",
    topic: "Deployments",
    difficulty: "Intermediate",
    minutes: 12,
    prerequisites: ["slo", "alert"],
  },
];
