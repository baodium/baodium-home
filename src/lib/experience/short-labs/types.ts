export type LabMode = "guided" | "practice" | "challenge";

export type Tone = "idle" | "active" | "pressure" | "dim";

export type ControlValues = Record<string, number | boolean | string>;

export type RangeControl = {
  id: string;
  kind: "range";
  label: string;
  explain: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  /** Digits shown beside the slider. */
  digits?: number;
};

export type ToggleControl = {
  id: string;
  kind: "toggle";
  label: string;
  explain: string;
};

export type ChoiceControl = {
  id: string;
  kind: "choice";
  label: string;
  explain: string;
  options: { value: string; label: string }[];
};

export type LabControl = RangeControl | ToggleControl | ChoiceControl;

export type SeriesPoint = { t: number } & Record<string, number>;

export type NodeView = { detail: string; tone: Tone };

export type EdgeView = { hot: boolean; dashed?: boolean };

export type LabSnapshot = {
  tick: number;
  elapsedSec: number;
  controls: ControlValues;
  metrics: Record<string, number>;
  series: SeriesPoint[];
  nodes: Record<string, NodeView>;
  edges: Record<string, EdgeView>;
  narration: string;
  gates: Record<string, boolean>;
  challengePassed: boolean;
  challengeDetail: string;
  memory: Record<string, number>;
};

export type LabSim = {
  initialControls: ControlValues;
  /** Values fixed while Challenge is selected. */
  challengeLocks: ControlValues;
  step: (prev: LabSnapshot | null, controls: ControlValues, dt: number) => LabSnapshot;
};

export type GraphNodeSpec = {
  id: string;
  label: string;
  x: number;
  y: number;
  target?: "left" | "top";
  sourceRight?: boolean;
  sourceBottom?: boolean;
};

export type GraphEdgeSpec = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: "out" | "down";
  targetHandle?: "in";
};

export type ShortLab = {
  slug: string;
  number: number;
  title: string;
  durationMin: number;
  h1: string;
  situation: string[];
  objective: string;
  terms: { term: string; explain: string }[];
  explore: string[];
  gettingStarted: string;
  keepInMind: string;
  challengeSituation: string;
  challengeObjective: string;
  challengeSuccess: string;
  metrics: { id: string; label: string; unit: string; explain: string; digits?: number }[];
  controls: LabControl[];
  stages: { id: string; letter: string; title: string; body: string; gate: string }[];
  graphLabel: string;
  graph: { nodes: GraphNodeSpec[]; edges: GraphEdgeSpec[] };
  chart: {
    title: string;
    caption: string;
    yUnit: string;
    series: { key: string; label: string; swatch: string }[];
    guide?: { value: number; label: string };
  };
  sim: LabSim;
};
