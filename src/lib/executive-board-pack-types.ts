import type { BoardPackCategory } from "@/lib/board-pack-data";

export type ExecutiveSlideLayout =
  | "executive-dashboard"
  | "financial-waterfall"
  | "customer-analysis"
  | "sales-recovery"
  | "engineering-roadmap"
  | "operations-dashboard"
  | "risk-register"
  | "strategy-matrix"
  | "board-decisions";

export type SlideTone = "good" | "warn" | "bad" | "neutral";

export type ExecutiveAnalysisBlock = {
  whatHappened: string;
  whyItHappened: string;
  businessImpact: string;
  recommendedAction: string;
};

export type KpiMetric = {
  label: string;
  value: string;
  delta?: string;
  tone?: SlideTone;
};

export type ExecutiveDashboardSlide = {
  layout: "executive-dashboard";
  health: "green" | "amber" | "red";
  healthLabel: string;
  headline: string;
  kpis: KpiMetric[];
  findings: string[];
  alerts: { text: string; tone: SlideTone }[];
  commentary: string;
  analysis: ExecutiveAnalysisBlock;
};

export type FinancialWaterfallSlide = {
  layout: "financial-waterfall";
  waterfall: { label: string; value: number; type: "start" | "loss" | "gain" | "end" }[];
  revenueTrend: { month: string; value: number }[];
  cashflow: { month: string; inflow: number; outflow: number }[];
  kpis: KpiMetric[];
  variance: { line: string; budget: string; actual: string; var: string }[];
  commentary: string;
  analysis: ExecutiveAnalysisBlock;
};

export type CustomerAnalysisSlide = {
  layout: "customer-analysis";
  topCustomers: { name: string; arr: string; share: string; health: SlideTone }[];
  concentration: { label: string; pct: number }[];
  segments: { name: string; arr: string; count: number }[];
  renewals: { customer: string; date: string; risk: SlideTone }[];
  heatmap: { account: string; scores: SlideTone[] }[];
  commentary: string;
  analysis: ExecutiveAnalysisBlock;
};

export type SalesRecoverySlide = {
  layout: "sales-recovery";
  funnel: { stage: string; value: number; count: number }[];
  pipeline: { quarter: string; weighted: number; total: number }[];
  forecast: { month: string; base: number; upside: number }[];
  opportunities: { account: string; value: string; probability: number; close: string }[];
  commentary: string;
  analysis: ExecutiveAnalysisBlock;
};

export type EngineeringRoadmapSlide = {
  layout: "engineering-roadmap";
  roadmap: { initiative: string; start: number; duration: number; status: SlideTone }[];
  delivery: { squad: string; committed: number; delivered: number }[];
  burndown: number[];
  debt: KpiMetric[];
  platform: KpiMetric[];
  commentary: string;
  analysis: ExecutiveAnalysisBlock;
};

export type OperationsDashboardSlide = {
  layout: "operations-dashboard";
  kpis: KpiMetric[];
  support: { metric: string; value: string; target: string; tone: SlideTone }[];
  sla: { name: string; pct: number }[];
  inventory: { item: string; level: number; status: SlideTone }[];
  workflows: { step: string; throughput: string }[];
  commentary: string;
  analysis: ExecutiveAnalysisBlock;
};

export type RiskRegisterSlide = {
  layout: "risk-register";
  heatmap: { likelihood: number; impact: number; label: string }[];
  topRisks: { rank: number; risk: string; owner: string; trend: "up" | "down" | "flat"; tone: SlideTone }[];
  matrix: { likelihood: string; impact: string; count: number }[];
  commentary: string;
  analysis: ExecutiveAnalysisBlock;
};

export type StrategyMatrixSlide = {
  layout: "strategy-matrix";
  roadmap: { horizon: string; initiatives: string[] }[];
  investments: { name: string; capex: string; roi: string; priority: SlideTone }[];
  actions90: { action: string; owner: string; due: string }[];
  matrix: { initiative: string; impact: number; effort: number }[];
  commentary: string;
  analysis: ExecutiveAnalysisBlock;
};

export type BoardDecisionsSlide = {
  layout: "board-decisions";
  decisions: {
    title: string;
    implication: string;
    resolution: string;
    status: "recommended" | "approved" | "deferred";
    outcome: string;
  }[];
  commentary: string;
  analysis: ExecutiveAnalysisBlock;
};

export type ExecutiveSlideContent =
  | ExecutiveDashboardSlide
  | FinancialWaterfallSlide
  | CustomerAnalysisSlide
  | SalesRecoverySlide
  | EngineeringRoadmapSlide
  | OperationsDashboardSlide
  | RiskRegisterSlide
  | StrategyMatrixSlide
  | BoardDecisionsSlide;

export type ExecutiveSlide = {
  id: string;
  title: string;
  category: BoardPackCategory;
  summary: string;
  /** Legacy PDF fallback */
  bodyText: string;
  graphType: "none";
  layout: ExecutiveSlideLayout;
  content: ExecutiveSlideContent;
};

export function layoutLabel(layout: ExecutiveSlideLayout): string {
  switch (layout) {
    case "executive-dashboard":
      return "Executive dashboard";
    case "financial-waterfall":
      return "Financial impact";
    case "customer-analysis":
      return "Customer analysis";
    case "sales-recovery":
      return "Sales recovery";
    case "engineering-roadmap":
      return "Engineering roadmap";
    case "operations-dashboard":
      return "Operations";
    case "risk-register":
      return "Risk register";
    case "strategy-matrix":
      return "Strategy";
    case "board-decisions":
      return "Board decisions";
  }
}
