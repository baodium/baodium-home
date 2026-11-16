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
    title: "Instrument a service",
    outcomes: [
      "Tell a metric, a span, and a log apart on one checkout.",
      "Turn on the record that was missing, then name the hop that holds the extra time.",
      "Say what you still could not see if you had only one of those three records.",
    ],
    paragraphs: [
      "A slow checkout is a complaint, not a diagnosis. The page waited. The wait has a place, and that place is a hop on the path from the product page to the database. Until a record names the hop, you are guessing.",
      "This lesson uses one checkout and three kinds of record. They answer different questions, and none of them replaces the others. Guided mode walks the four signals on. Practice lets you turn them yourself. Challenge starts with the page already slow and does not name the hop.",
    ],
    concepts: [
      {
        name: "Metric",
        body: "A metric is a number you can add up or plot. It tells you that checkouts got slower. It does not, by itself, tell you which call inside the checkout held the time.",
      },
      {
        name: "Span",
        body: "A span is one hop with a start and an end. When spans share a trace, you can see which hop sat inside which caller, and which one accounts for the wait.",
      },
      {
        name: "Structured log",
        body: "A structured log is an event with fields you can join to the trace. It is how you connect a decision in the code, such as a timeout or a retry, to the span that was open at the time.",
      },
    ],
    goal: "Make the slow checkout explain itself. Turn on HTTP metrics, the outbound span, trace context, and a structured log, then name the hop that holds the extra time.",
    steps: [
      "Run a checkout before the four signals are on, and notice what you cannot name.",
      "Turn on HTTP metrics, the outbound span, trace context, and a structured log.",
      "Open one trace and point at the hop whose duration accounts for the wait.",
      "In challenge mode, do the same from a slow page. The prompt does not name the hop.",
    ],
    takeaways: [
      "A metric tells you the checkout slowed. A span tells you which hop held the time. A log tells you what the code decided while that span was open.",
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
    title: "Spend an error budget",
    outcomes: [
      "Write the checkout promise as a fraction of requests that both succeed and return in time.",
      "Count a slow success as a miss when the target includes a latency line.",
      "Tell a window that meets 99.5% from one that does not.",
    ],
    paragraphs: [
      "An SLO is the promise you are willing to be held to. On this checkout the promise is 99.5 percent of requests succeeding in under 300 milliseconds. The error budget is the half a percent you are allowed to miss. Spending the budget means those misses happened in the window you are looking at.",
      "A request that returns 200 after the time limit is not a good checkout. The customer already waited. Seventeen failures in a thousand requests is 98.3 percent, and 98.3 does not meet 99.5. Guided mode spends the budget on purpose. Challenge asks you to judge a window against the target that is already on the chart.",
    ],
    concepts: [
      {
        name: "SLI",
        body: "The SLI is the measurement. Here a good event is a checkout that succeeds and returns in under 300 milliseconds. Everything else, including a slow success, is a miss.",
      },
      {
        name: "SLO",
        body: "The SLO is the line. This course uses 99.5 percent. A window meets it only when the measured good events, divided by the events in the window, reach that line.",
      },
      {
        name: "Error budget",
        body: "The budget is what the SLO leaves over. At 99.5 percent you may miss 5 events in 1,000. Once the misses pass that, the window has spent the budget, whether or not anyone has been paged yet.",
      },
    ],
    goal: "Keep the checkout SLO at 99.5 percent, count only a success under 300 milliseconds, and decide whether the window in front of you meets that target.",
    steps: [
      "Read the target on the chart before you change anything.",
      "Raise failures or latency until good events fall below 99.5 percent.",
      "Check a window of 17 misses in 1,000. That is 98.3 percent, and it does not meet the line.",
      "In challenge mode, mark the window as meeting the target or missing it. The prompt does not tell you which.",
    ],
    takeaways: [
      "The SLO in this course is 99.5 percent of checkouts that succeed in under 300 milliseconds.",
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
      label: "Lesson 3, when a page is warranted",
      bridge:
        "A spent budget is not yet a page. The next lesson is the decision to wake someone. A busy host and a short spike are on the same checkout as a failure that keeps spending the budget.",
    },
  },
  {
    id: "alert",
    index: 3,
    minutes: 15,
    title: "When a page is warranted",
    outcomes: [
      "Separate a busy host from a checkout that is failing for customers.",
      "Explain why a burn-rate page waits for both the short window and the long window.",
      "Choose the situation that should wake someone, and say why the others should not.",
    ],
    paragraphs: [
      "A page is a decision to interrupt a person. The host can be busy while customers are fine, and a single slow checkout can light a chart without being the start of an incident. The page has to describe a customer symptom that is still true after you look at more than one window.",
      "The burn-rate rule in this lab pages only when the 12-second window and the 60-second window are both spending the 99.5 percent budget at 14.4 times the allowed rate or faster, with enough requests in each window. A spike lights the short window and then fades. Both windows have to agree. Challenge gives you the telemetry and does not tell you whether to page.",
    ],
    concepts: [
      {
        name: "Symptom",
        body: "A symptom is what the customer experienced. Checkout failures and checkout latency are symptoms. CPU on a host is a clue about a machine, and it is not yet a reason to wake someone.",
      },
      {
        name: "Burn rate",
        body: "Burn rate is how fast the error budget is being spent compared with the rate that would use it up exactly on time. A high burn over a short window can be a spike. The same burn over a longer window is a customer incident.",
      },
      {
        name: "Page",
        body: "A page is the alert you are willing to act on at once. In this lab that is the sustained checkout failure, the one where both windows agree. The other scenes are worth a look later.",
      },
    ],
    goal: "Pick a rule, run it against the four scenes, and page only when you can say what the customer is experiencing and why both windows agree.",
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
      label: "Lesson 4, a failure that spreads",
      bridge:
        "You know when to wake someone. The next lesson is the shape of the failure they will find: a slow dependency holds its slots, retries ask for more, and checkout starts failing for people who never called that dependency themselves.",
    },
  },
  {
    id: "cascade",
    index: 4,
    minutes: 20,
    title: "A checkout is failing, and the failure is spreading.",
    outcomes: [
      "Follow one checkout across the gateway, checkout, payment, and the provider.",
      "Explain how a full set of slots plus a retry turns a slow dependency into failed checkouts.",
      "Change one limit, rerun the same seed, and say what the new evidence shows.",
    ],
    paragraphs: [
      "A cascading failure is not a second bug. The provider is slow, so each call holds a slot for longer. Checkout retries, which asks for another slot. The queue grows. New checkouts wait or time out, including ones whose own work was fine. The symptom moves outward from the slow call.",
      "The lab is one clock and one seed. Guided mode walks the spread. Practice lets you change slots, retries, and the deadline. Challenge asks you to restore checkout without being told which control to move. The topology lists every service. It does not tell you the cause.",
    ],
    concepts: [
      {
        name: "Slot",
        body: "A slot is permission to do the provider call. While the call is slow, the slot stays taken. When every slot is taken, the next call waits or is turned away.",
      },
      {
        name: "Retry",
        body: "A retry is another attempt at work that may already be in flight. It helps when the first attempt was lost. It hurts when the first attempt is still holding a slot, because the retry asks for a second one.",
      },
      {
        name: "Deadline",
        body: "A deadline is the time after which the caller stops waiting. A shorter deadline frees the caller. It does not, by itself, free the slot the provider is still using.",
      },
    ],
    goal: "Watch checkout success fall as the provider fills its slots, then change retries, slots, or the deadline and show that the same seed recovers.",
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
    title: "Checkout latency has to hold while the queue grows.",
    outcomes: [
      "Read queue depth and latency as two views of the same shortage of workers.",
      "Compare a fixed replica count with a utilization rule on the same surge.",
      "Bring latency back without reducing the traffic you were offered.",
    ],
    paragraphs: [
      "When work arrives faster than workers finish it, the extra work waits. Latency climbs because requests sit in the queue, not because each request suddenly got harder. Adding replicas adds workers. A utilization rule adds them when the workers you have are busy, and only if you let it.",
      "Utilization in this lab is the share of worker capacity that is busy. It does not go above 100 percent. Work that does not fit waits in the queue, and the queue is what the customer feels. Guided mode compares the two controls. Challenge asks you to hold latency through the surge without being told which control to use.",
    ],
    concepts: [
      {
        name: "Queue",
        body: "The queue is work that has arrived and has not started. Its depth is how much waiting you have stored. Latency follows that wait.",
      },
      {
        name: "Replica",
        body: "A replica is another copy of the worker. More replicas finish more work at the same time, until you run out of something else, such as the database.",
      },
      {
        name: "Utilization",
        body: "Utilization is how full the workers are. At 100 percent every worker is busy and new work queues. A scaling rule that watches utilization is trying to add workers before that queue becomes the latency.",
      },
    ],
    goal: "Hold checkout latency through a surge. Compare a fixed number of replicas with a utilization rule, and recover without sending traffic away.",
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
      label: "Lesson 6, a faulty release",
      bridge:
        "Capacity was about work you meant to serve. The last lesson is work you did not mean to break. A share of traffic goes to a bad release, and you decide when that share has to stop.",
    },
  },
  {
    id: "deployment",
    index: 6,
    minutes: 12,
    title: "A share of traffic is going to a faulty release.",
    outcomes: [
      "Read customer failures as a function of how much traffic the bad release is allowed to see.",
      "Stop or shrink that share when the impact is no longer acceptable.",
      "Say what you would want to see before you raised the share again.",
    ],
    paragraphs: [
      "A release is a hypothesis about a fraction of traffic. You learn from the customers who actually hit it. If that fraction fails, the blast radius is the fraction, not the whole site, for as long as you keep the fraction small and you are willing to take it back.",
      "This lab puts a known-bad release beside the stable one. You choose the share. Rollback sets the share to zero. A repaired release can also pass, so rollback is not the only ending. Challenge asks you to stop the damage without telling you the share to pick.",
    ],
    concepts: [
      {
        name: "Exposure",
        body: "Exposure is the share of traffic sent to the new release. Five percent is a different experiment from fifty. The customer impact scales with that share while the release is faulty.",
      },
      {
        name: "Canary",
        body: "A canary is the small share you watch before you trust the release with everyone. It is useful only if you look at the customers on it, and only if you can take it back.",
      },
      {
        name: "Stop",
        body: "Stopping means the bad release stops receiving traffic, or receives less. You stop because the customers on it are failing, not because a deploy pipeline reached the next step.",
      },
    ],
    goal: "Send a controlled share of traffic to a faulty release, read the customer impact, and decide when that share should go to zero or the release should be replaced.",
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
        "The six browser lessons are a course in reading a checkout. The coding path is the same work as functions: fleet health, signals, retries, and delivery, in Go, TypeScript, or Python, with a stage that moves only when the full suite passes.",
    },
  },
];

export function sreLesson(id: SreLabKey): SreLessonCraft {
  const lesson = SRE_COURSE.find((item) => item.id === id);
  if (!lesson) throw new Error(`Unknown SRE lesson ${id}`);
  return lesson;
}

export const SRE_COURSE_TOTAL = TOTAL;
export const SRE_COURSE_NAME = COURSE;
