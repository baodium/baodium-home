import type { LessonConcept, LessonLink } from "@/components/learning/LessonCraft";
import type { SreLabKey } from "@/lib/sre/catalog";

export type SreLessonCraft = {
  id: SreLabKey;
  index: number;
  minutes: number;
  title: string;
  outcomes: string[];
  paragraphs: string[];
  concepts: LessonConcept[];
  goal: string;
  steps: string[];
  takeaways: string[];
  reflection: string[];
  next?: LessonLink;
};

const COURSE = "SRE path";
const TOTAL = 6;

export const SRE_COURSE: SreLessonCraft[] = [
  {
    id: "instrument",
    index: 1,
    minutes: 10,
    title: "Name the slow hop in a checkout",
    outcomes: [
      "Tell a metric, a span, and a log apart on one checkout.",
      "Turn on the missing record, then name the hop holding the extra time.",
      "Say what you still could not see if you had only one of those three records.",
    ],
    paragraphs: [
      "A slow checkout is a complaint, not a diagnosis. The page waited. The wait has a place, and that place is a hop on the path from the product page to the database. Until a record names the hop, you are guessing.",
      "This lesson uses one checkout and three kinds of record. Each one answers a different question. In Guided, you turn the four signals on in order. In Practice, you turn them yourself. In Challenge, the page is already slow and the prompt does not name the hop.",
    ],
    concepts: [
      {
        name: "Metric",
        body: "Checkout slowed. This record does not name the hop.",
      },
      {
        name: "Span",
        body: "One hop, with a start and an end, on the same trace.",
      },
      {
        name: "Structured log",
        body: "Fields you join to the span that was open.",
      },
    ],
    goal: "Turn the four signals on, then name the hop holding the time.",
    steps: [
      "Run a checkout before the four signals are on, and notice what you cannot name.",
      "Turn on HTTP metrics, the outbound span, trace context, and a structured log.",
      "Open one trace and point at the hop whose duration accounts for the wait.",
      "In challenge mode, do the same from a slow page. The prompt does not name the hop.",
    ],
    takeaways: [
      "From the metric, you see that checkout slowed. From the span, you see which hop held the time. From the log, you see what the code decided while that span was open.",
      "Trace context is what makes the span and the log the same request, rather than two records that happen to be near each other in time.",
      "If the hop is still unnamed after you add a signal, the signal is in the wrong place or it is not joined to the request.",
    ],
    reflection: [
      "Which record would you open first the next time a page is slow, and what would make you open a second one?",
      "What would still be invisible if you had the metric and not the span?",
      "Where would you put the log if the slow hop belonged to another team?",
    ],
    next: {
      href: "/sre-labs/slo",
      label: "Lesson 2, the error budget",
      bridge:
        "You can now see where the time went. The next lesson asks a different question: of the checkouts that finished, how many were actually good, and have you already spent the failures you said you would allow?",
    },
  },
  {
    id: "slo",
    index: 2,
    minutes: 12,
    title: "Check a window against a 99.5% budget",
    outcomes: [
      "Write the checkout promise as a fraction of requests that both succeed and return in time.",
      "Count a slow success as a miss when the target includes a latency line.",
      "Say whether a window meets 99.5 percent.",
    ],
    paragraphs: [
      "An SLO is the promise you are willing to be held to. On this checkout the promise is 99.5 percent of requests succeeding in under 300 milliseconds. The error budget is the half a percent you are allowed to miss. Spending the budget means those misses happened in the window you are looking at.",
      "A 200 after the time limit is not a good checkout. The customer already waited. Seventeen failures in a thousand requests is 98.3 percent, and 98.3 does not meet 99.5. In Guided, you spend the budget on purpose. In Challenge, you judge the window. The prompt does not say whether it meets the line.",
    ],
    concepts: [
      {
        name: "SLI",
        body: "A good checkout succeeds in under 300 milliseconds. A slow success is a miss.",
      },
      {
        name: "SLO",
        body: "The line is 99.5 percent of the events in the window.",
      },
      {
        name: "Error budget",
        body: "You may miss 5 events in 1,000. Past that, the window has spent the budget.",
      },
    ],
    goal: "Judge the window in front of you against 99.5 percent.",
    steps: [
      "Read the target on the chart before you change anything.",
      "Raise failures or latency until good events fall below 99.5 percent.",
      "Check a window of 17 misses in 1,000. That is 98.3 percent, and it does not meet the line.",
      "In challenge mode, mark the window as meeting the target or missing it. The prompt does not tell you which.",
    ],
    takeaways: [
      "The SLO here is 99.5 percent of checkouts succeeding in under 300 milliseconds.",
      "A slow success spends the budget. The status code alone is not the SLI.",
      "Seventeen misses in a thousand is 98.3 percent. That window does not meet 99.5 percent.",
    ],
    reflection: [
      "Which events in the window did you almost count as good, and why were they misses?",
      "What would you tell someone who says the service is fine because most requests returned 200?",
      "If the next window is quiet, has the budget you already spent come back?",
    ],
    next: {
      href: "/sre-labs/alert",
      label: "Lesson 3, when to page",
      bridge:
        "A spent budget is not yet a page. The next lesson is the decision to wake someone. A busy host and a short spike are on the same checkout as a failure that keeps spending the budget.",
    },
  },
  {
    id: "alert",
    index: 3,
    minutes: 15,
    title: "Decide when a checkout failure should page",
    outcomes: [
      "Separate a busy host from a checkout failing for customers.",
      "Explain why a burn-rate page waits for both the short window and the long window.",
      "Choose which situation should wake someone, and say why the others should not.",
    ],
    paragraphs: [
      "You interrupt a person only when the customer symptom is still true in more than one window. The host can be busy while customers are fine, and one slow checkout can light a chart without starting an incident.",
      "The burn-rate rule pages only when the 12-second window and the 60-second window are both spending the 99.5 percent budget at 14.4 times the allowed rate or faster, with enough requests in each window. A spike lights the short window and then fades. Both windows have to agree. In Challenge, you have the telemetry. The prompt does not say whether to page.",
    ],
    concepts: [
      {
        name: "Symptom",
        body: "Checkout failures are what the customer hit. CPU is the host.",
      },
      {
        name: "Burn rate",
        body: "How fast the budget is spent. A page waits until both windows agree.",
      },
      {
        name: "Page",
        body: "Wake someone only while customers are still failing.",
      },
    ],
    goal: "Page only when you can name the customer impact and both windows agree.",
    steps: [
      "Read the four scenes before you pick a rule. Note which ones are about a host, a short spike, missing data, or customers who keep failing.",
      "Select a rule and run it against the scenes.",
      "Page only when the rule you chose is still true after you look at both windows. Hold when it is not.",
      "In challenge mode, decide from the telemetry whether a customer is failing badly enough to wake someone. The prompt does not tell you.",
    ],
    takeaways: [
      "A page describes customer impact that is still happening, not a host that looks busy.",
      "The burn-rate page in this lab needs both the 12-second window and the 60-second window.",
      "A spike that fades, and a scrape that stopped, are real problems. They are not this page.",
    ],
    reflection: [
      "Which scene was easiest to mistake for an incident, and what record separated them?",
      "What would go wrong if the short window could page by itself?",
      "Who is woken by this page, and what do you expect them to do in the first five minutes?",
    ],
    next: {
      href: "/sre-labs/cascade",
      label: "Lesson 4, a slow provider",
      bridge:
        "You know when to wake someone. Next, you watch the shape of the failure: a slow dependency holds its slots, retries request another slot, and checkout fails for people who never called that dependency.",
    },
  },
  {
    id: "cascade",
    index: 4,
    minutes: 20,
    title: "Follow a slow provider until checkout fails",
    outcomes: [
      "Follow one checkout across the gateway, checkout, payment, and the provider.",
      "Explain how a full set of slots plus a retry turns a slow dependency into failed checkouts.",
      "Change one limit, rerun the same seed, and say what the new evidence shows.",
    ],
    paragraphs: [
      "A cascading failure is not a second bug. The provider is slow, so each call holds a slot for longer. Checkout retries, and the retry requests another slot. The queue grows. New checkouts wait or time out, including ones whose own work was fine. The symptom moves outward from the slow call.",
      "One clock, one seed. In Guided, you watch the failure spread. In Practice, you change slots, retries, and the deadline. In Challenge, you bring checkout back. The prompt does not name the control. The topology lists every service and does not name the cause.",
    ],
    concepts: [
      {
        name: "Slot",
        body: "Permission for one provider call. A slow call keeps the slot.",
      },
      {
        name: "Retry",
        body: "A second attempt. It takes another slot if the first call is still running.",
      },
      {
        name: "Deadline",
        body: "When the caller stops waiting. The provider can still hold the slot.",
      },
    ],
    goal: "Watch checkout fail, change one limit, and rerun the same seed.",
    steps: [
      "Let the run go until checkout success falls and provider slots are full.",
      "Read one trace from the gateway through to the provider before you change a control.",
      "Change one thing: retries, the number of slots, or the deadline. Reset to the same seed and run again.",
      "In challenge mode, recover checkout from the evidence. The prompt does not name the control.",
    ],
    takeaways: [
      "The failure spreads because retries and a full set of slots turn one slow dependency into a queue.",
      "Shedding requests can hide the damage if you only count the calls that were allowed to finish. This lab counts timeouts and rejected checkouts in the success rate.",
      "The same seed is the comparison. A change that only looks better on a different run has not been shown.",
    ],
    reflection: [
      "Which control did you move, and which number told you it was the right one?",
      "What did the retry buy you, and what did it cost the next checkout?",
      "If the provider stayed slow, which limit would you leave in place overnight?",
    ],
    next: {
      href: "/sre-labs/capacity",
      label: "Lesson 5, the queue and the replicas",
      bridge:
        "The last lesson was a dependency that could not take more calls. This one is your own queue. Traffic arrives faster than the workers finish, and you decide whether more replicas, or a utilization rule, brings latency back without turning customers away.",
    },
  },
  {
    id: "capacity",
    index: 5,
    minutes: 15,
    title: "Hold latency while the checkout queue fills",
    outcomes: [
      "Read queue depth and latency as two views of the same shortage of workers.",
      "Compare a fixed replica count with a utilization rule on the same surge.",
      "Bring latency back without reducing the traffic you were offered.",
    ],
    paragraphs: [
      "When work arrives faster than workers finish it, the extra work waits. Latency climbs because requests sit in the queue, not because each request suddenly got harder. Adding replicas adds workers. A utilization rule adds them when the workers you have are busy, and only if you let it.",
      "Utilization is the share of worker capacity that is busy. It does not go above 100 percent. Work that does not fit waits in the queue, and the customer feels that wait. In Guided, you compare the two controls. In Challenge, you hold latency through the surge. The prompt does not name the control.",
    ],
    concepts: [
      {
        name: "Queue",
        body: "Work that has arrived and has not started. Latency follows that wait.",
      },
      {
        name: "Replica",
        body: "Another worker. More replicas finish more work at once.",
      },
      {
        name: "Utilization",
        body: "How full the workers are. It does not go above 100 percent.",
      },
    ],
    goal: "Hold latency through the surge without turning traffic away.",
    steps: [
      "Let the surge run on the starting replica count and watch the queue and the latency move together.",
      "Add replicas by hand and note how far the queue falls.",
      "Reset and try the utilization rule on the same surge.",
      "In challenge mode, hold latency without reducing demand. The prompt does not name the control.",
    ],
    takeaways: [
      "Latency during the surge is mostly time spent waiting for a worker.",
      "Utilization stops at 100 percent. The overflow is the queue, not a utilization number above the workers you have.",
      "Recovery in this lesson means the offered traffic still arrives and the latency comes back.",
    ],
    reflection: [
      "Did the hand-set replica count and the utilization rule recover the same way, or did one of them lag?",
      "What would you watch in the first minute of a sale to tell queueing from a slower dependency?",
      "What other limit would you hit if you kept adding replicas?",
    ],
    next: {
      href: "/sre-labs/deployment",
      label: "Lesson 6, a bad release",
      bridge:
        "Capacity was about work you meant to serve. The last lesson is work you did not mean to break. A share of traffic goes to a bad release, and you decide when that share has to stop.",
    },
  },
  {
    id: "deployment",
    index: 6,
    minutes: 12,
    title: "Take traffic off a bad release",
    outcomes: [
      "Read customer failures as a function of how much traffic the bad release is allowed to see.",
      "Stop or shrink that share when the impact is no longer acceptable.",
      "Say what you would want to see before you raised the share again.",
    ],
    paragraphs: [
      "You send a release to a fraction of traffic and learn from the customers who hit it. If that fraction fails, the blast radius is the fraction, not the whole site, for as long as you keep the fraction small and you are willing to take it back.",
      "A known-bad release sits beside the stable one. You choose the share. Rollback sets the share to zero. A repaired release can also pass, so rollback is not the only ending. In Challenge, you stop the damage. The prompt does not name the share.",
    ],
    concepts: [
      {
        name: "Exposure",
        body: "The share of traffic on the new release.",
      },
      {
        name: "Canary",
        body: "A small share you can watch and take back.",
      },
      {
        name: "Stop",
        body: "Take traffic off the release that is failing customers.",
      },
    ],
    goal: "Read the customer impact, then take the share back or replace the release.",
    steps: [
      "Start with a small share and read the failure rate of the customers on the new release.",
      "Raise the share and watch the same fault affect more checkouts.",
      "Roll back, or repair the release, and show the customer failures fall.",
      "In challenge mode, contain the impact. The prompt does not tell you the share.",
    ],
    takeaways: [
      "The size of the incident is the share of traffic you leave on the bad release.",
      "A canary only limits damage if someone is watching it and can take the traffic back.",
      "Rollback is one way to stop. A release that has been fixed is another. Both have to show up in the customer numbers.",
    ],
    reflection: [
      "At what failure rate did you decide the share was too large?",
      "What would you want the next ten minutes of the stable release to show before you tried again?",
      "Who is allowed to set that share to zero, and how long does it take them?",
    ],
    next: {
      href: "/sre-labs/coding",
      label: "Coding practice",
      bridge:
        "After these six lessons, the coding exercises are the same decisions as functions: fleet health, signals, retries, and delivery, in Go, TypeScript, or Python. The stage moves only when the full suite passes.",
    },
  },
];

export function lessonBeats(lesson: SreLessonCraft) {
  return [
    ...lesson.concepts.map((concept) => ({
      title: concept.name,
      body: concept.body,
    })),
    { title: "The work", body: lesson.goal },
  ];
}

export function lessonAfter(lesson: SreLessonCraft) {
  return [
    ...lesson.takeaways.map((body) => ({ title: "Takeaway", body })),
    ...lesson.reflection.map((body) => ({ title: "Reflection", body })),
  ];
}

export function sreLesson(id: SreLabKey): SreLessonCraft {
  const lesson = SRE_COURSE.find((item) => item.id === id);
  if (!lesson) throw new Error(`Unknown SRE lesson ${id}`);
  return lesson;
}

export const SRE_COURSE_TOTAL = TOTAL;
export const SRE_COURSE_NAME = COURSE;
