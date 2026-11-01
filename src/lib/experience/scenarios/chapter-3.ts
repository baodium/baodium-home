import {
  CLIENT_TIMEOUT_MS,
  IDEMPOTENCY_LIMIT_MS,
  IDEMPOTENCY_RETRY_GAP_MS,
  IDEMPOTENCY_WINDOW,
  SLOW_PROVIDER_MS,
} from "@/lib/experience/idempotency/engine";
import type { ExperienceChapterMeta } from "@/lib/experience/scenarios/types";

const slowSec = SLOW_PROVIDER_MS / 1000;
const timeoutSec = CLIENT_TIMEOUT_MS / 1000;
const gapSec = IDEMPOTENCY_RETRY_GAP_MS / 1000;
const limitSec = IDEMPOTENCY_LIMIT_MS / 1000;

export const chapter3Meta: ExperienceChapterMeta = {
  id: "chapter-3",
  slug: "chapter-3",
  number: 3,
  title: "State, Identity, and the Cost of Uncertainty",
  subtitle: "One charge when the provider answers after the client has given up",
  bookHref: "/system-design/chapter-3",
  status: "ready",
  durationMin: 12,
};

export const chapter3Steps = [
  {
    id: "inspect",
    letter: "A",
    title: "Follow one checkout",
    body: "A checkout is about to leave the client. Follow it so the ledger row and the path stay on the same charge.",
  },
  {
    id: "fit",
    letter: "B",
    title: "Watch it finish",
    body: "The provider answers before the client gives up. One charge lands, and the client sees it.",
  },
  {
    id: "slow",
    letter: "C",
    title: "Slow the provider",
    body: `Set the provider to ${slowSec} seconds. The client still waits ${timeoutSec} second. A checkout already sent keeps the provider time it started with. Wait until a client stops waiting.`,
  },
  {
    id: "duplicate",
    letter: "D",
    title: "See the second charge",
    body: "The retry leaves with a new operation id. Wait until the provider settles it. That settlement is a second charge, and the first timeout stays unresolved.",
  },
  {
    id: "decide",
    letter: "E",
    title: "Choose the identity on the retry",
    body: "A retry that has not left yet can still carry the original operation id. A retry that has already left keeps the id it went out with.",
  },
  {
    id: "identity",
    letter: "F",
    title: "Let the stored charge come back",
    body: "Wait for a checkout whose retry carried the original operation id. The provider returns the stored charge. Duplicate charges stop rising.",
  },
  {
    id: "record",
    letter: "G",
    title: "Write the notification with the charge",
    body: "The notification is chosen when the charge is created. Write it in that same transaction, then wait for a charge that records it. Lost notifications stop rising.",
  },
  {
    id: "review",
    letter: "H",
    title: "Read the ledger",
    body: "The live counts, the ledger, and the path are the same run. Charges that already landed stay on the ledger. Practice starts a fresh run with the slow provider.",
  },
] as const;

export type Chapter3StepId = (typeof chapter3Steps)[number]["id"];

export const chapter3Copy = {
  h1: "Can you charge the card once when the provider answers late?",
  situation:
    "A customer gave up on checkout before the card provider answered. The charge may have landed. A second try with a new identity took the money again, and the receipt never left because the client had not seen success.",
  objective:
    "Finish the guided path so you can say what the client knew after the timeout, which retry created a second charge, and where the notification has to be written.",
  terms:
    "Unresolved is a checkout whose client timed out and never received the result for the original operation. Duplicate charges are extra settlements on that checkout. Lost notifications are charges created with no receipt stored beside them. Unique charges count every settlement.",
  explore:
    "The provider time, the client timeout, the operation id on the retry, and the notification written with the charge.",
  gettingStarted:
    "Guided walks one incident. Pause holds the clock, and the next event stays next. Step runs that one event. Reset rebuilds this seed. Practice and the challenge open after you choose the identity on the retry.",
  approximation: `This is a simulation of one retry. It does not call a payment provider. The guided slowdown and the challenge use a ${slowSec} second provider and a ${timeoutSec} second client timeout. The retry goes out ${gapSec} seconds after the timeout, and it is still waiting when a ${slowSec} second charge settles. A repeated operation id returns that stored charge. A new operation id starts another provider call.`,
  review: [
    "The client timeout left the outcome unknown. The provider still settled the first charge.",
    "A retry with a new operation id settled a second charge. A retry with the original operation id received the stored charge, and the duplicate count stopped rising.",
    "The receipt stayed with the charge only when it was written at settlement. A charge already on the ledger kept the notification it had.",
  ],
  challenge: {
    title: "Eight clean checkouts",
    situation:
      "A customer was charged twice after the app gave up and tried again. The provider is slower than the client is willing to wait. Checkouts keep leaving on their own.",
    objective: `Finish ${IDEMPOTENCY_WINDOW} checkouts in a row with no duplicate charge, no unresolved timeout, and no lost notification.`,
    success: `${IDEMPOTENCY_WINDOW} checkouts in a row with no duplicate charge, no unresolved timeout, and no lost notification, inside ${limitSec} seconds.`,
    gettingStarted:
      "Provider time and the client timeout stay fixed for this wave. Charges that already landed stay on the ledger. Reset starts a clean wave on the same seed. The score is the clean streak in the live metrics.",
  },
};
