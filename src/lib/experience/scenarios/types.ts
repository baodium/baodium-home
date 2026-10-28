import type {
  ChallengeCriteria,
  GuidedStepId,
} from "@/lib/experience/types";

export type ExperienceChapterMeta = {
  id: string;
  slug: string;
  number: number;
  title: string;
  subtitle: string;
  bookHref: string;
  status: "ready" | "soon";
  durationMin: number;
};

export type GuidedStepDef = {
  id: GuidedStepId;
  /** Stage letter A–H for progress chrome. */
  letter: string;
  title: string;
  body: string;
  /** Prediction prompt shown before advancing when set. */
  prediction?: string;
  /** What the Continue button requires before enabling. */
  require?:
    | "toggle_preview"
    | "deploy_zero"
    | "trace_request"
    | "exposure_5"
    | "exposure_25"
    | "see_waiters"
    | "decision"
    | "none";
};

export type ChallengeBrief = {
  title: string;
  objective: string;
  criteria: ChallengeCriteria;
  success: string;
  gettingStarted: string;
};

export type ChapterScenario = {
  meta: ExperienceChapterMeta;
  brief: string;
  assumptions: string[];
  codeLines: string[];
  steps: GuidedStepDef[];
  debriefTemplates: {
    pause_exposure: string;
    disable_feature: string;
    investigate: string;
  };
  challenge: ChallengeBrief;
};
