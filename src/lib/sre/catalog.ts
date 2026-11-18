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
    title: "Which call made playback slow",
    summary:
      "A play start is slow, and the manifest fetch is invisible. The metric, the trace, and the log are how you find it.",
    outcome:
      "The metric shows the slowdown. The trace and the log show the call.",
    topic: "Observability",
    difficulty: "Beginner",
    minutes: 10,
    prerequisites: [],
  },
  {
    id: "slo",
    title: "Whether these sends meet 99.5 percent",
    summary:
      "Decide what counts as a good message send, set 99.5 percent, and watch the misses spend the budget.",
    outcome:
      "Count a slow success as a miss when the line includes latency.",
    topic: "Service levels",
    difficulty: "Beginner",
    minutes: 12,
    prerequisites: ["instrument"],
  },
  {
    id: "alert",
    title: "Whether this failure should page someone",
    summary:
      "Compare a busy host, a short spike, a sustained search failure, and missing telemetry.",
    outcome:
      "Use customer impact and burn rate to separate an incident from noise.",
    topic: "Alerting",
    difficulty: "Intermediate",
    minutes: 15,
    prerequisites: ["slo"],
  },
  {
    id: "cascade",
    title: "A slow card provider fills its slots",
    summary:
      "A card provider holds each charge longer. Retries ask for another slot, and new charges wait. Recover the path.",
    outcome: "Use traces and measured outcomes to contain retry amplification.",
    topic: "Resilience",
    difficulty: "Intermediate",
    minutes: 20,
    prerequisites: ["instrument", "slo"],
  },
  {
    id: "capacity",
    title: "Dispatch jobs fill the queue",
    summary:
      "Jobs arrive faster than workers finish them. Compare a fixed crew with a utilization rule on the same surge.",
    outcome: "Recover request success without reducing the offered load.",
    topic: "Capacity",
    difficulty: "Intermediate",
    minutes: 15,
    prerequisites: ["slo"],
  },
  {
    id: "deployment",
    title: "A bad sign-in release has some of the traffic",
    summary:
      "Send a fraction of sign-ins to a bad release, watch the failures, and take that share back.",
    outcome: "Read how customer failures scale with the share on the bad release.",
    topic: "Deployments",
    difficulty: "Intermediate",
    minutes: 12,
    prerequisites: ["slo", "alert"],
  },
];
