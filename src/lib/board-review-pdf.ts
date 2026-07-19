import { jsPDF } from "jspdf";

import {
  FINANCIAL_KPIS,
  MONTHLY_REVENUE_DATA,
  PIPELINE_BY_REGION_DATA,
  PROFIT_LOSS_DATA,
  REVENUE_BY_SERVICE_DATA,
} from "@/lib/financials-mock-data";
import type { HrEmployee } from "@/lib/hr-data";

const BANK_BALANCES = [
  { bank: "Barclays Operating", currency: "GBP", balance: 284_350.42 },
  { bank: "Wise USD", currency: "USD", balance: 156_200.0 },
  { bank: "HSBC EUR", currency: "EUR", balance: 198_420.75 },
] as const;

const SLIDE_W = 297;
const SLIDE_H = 167;
const MARGIN = 18;
const CONTENT_W = SLIDE_W - MARGIN * 2;

type RagStatus = "Red" | "Amber" | "Green";

export type BoardReviewPdfInput = {
  quarterLabel?: string;
  companyName?: string;
  employees?: HrEmployee[];
};

function quarterLabel() {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const q = Math.floor(month / 3) + 1;
  return `Q${q} ${year}`;
}

function formatEurThousands(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value * 1000);
}

function formatEur(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function sumRevenueYtd() {
  return MONTHLY_REVENUE_DATA.reduce((sum, row) => sum + row.revenue, 0);
}

function latestPl() {
  return PROFIT_LOSS_DATA[PROFIT_LOSS_DATA.length - 1];
}

function buildDeckContext(input: BoardReviewPdfInput) {
  const q = input.quarterLabel ?? quarterLabel();
  const company = input.companyName ?? "OnwardAir";
  const employees = input.employees ?? [];
  const ytdRevenue = sumRevenueYtd();
  const jun = latestPl();
  const annualPayroll = employees
    .filter((employee) => {
      const status = String(
        (employee as { employmentStatus?: string }).employmentStatus ?? "active",
      );
      return status !== "former_employee" && status !== "archived";
    })
    .reduce((sum, employee) => sum + employee.salaryCurrent + employee.bonus, 0);
  const cashEurApprox =
    BANK_BALANCES.reduce((sum, account) => {
      if (account.currency === "GBP") return sum + account.balance * 1.17;
      if (account.currency === "USD") return sum + account.balance * 0.92;
      return sum + account.balance;
    }, 0) / 1000;

  return {
    q,
    company,
    employees,
    ytdRevenue,
    jun,
    annualPayroll,
    cashEurApprox,
    health: "Green" as RagStatus,
  };
}

class SlideDeck {
  private doc: jsPDF;
  private page = 0;

  constructor(private company: string, private quarter: string) {
    this.doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [SLIDE_W, SLIDE_H] });
  }

  private footer() {
    this.doc.setFontSize(8);
    this.doc.setTextColor(120, 130, 145);
    this.doc.text(
      `${this.company} · Board review · ${this.quarter} · Confidential`,
      MARGIN,
      SLIDE_H - 8,
    );
    this.doc.text(`Slide ${this.page}`, SLIDE_W - MARGIN, SLIDE_H - 8, { align: "right" });
  }

  addTitleSlide() {
    this.page += 1;
    this.doc.setFillColor(7, 17, 31);
    this.doc.rect(0, 0, SLIDE_W, SLIDE_H, "F");
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(11);
    this.doc.text("QUARTERLY BOARD REVIEW", MARGIN, 42);
    this.doc.setFontSize(28);
    this.doc.text(this.company, MARGIN, 58);
    this.doc.setFontSize(16);
    this.doc.setTextColor(96, 165, 250);
    this.doc.text(this.quarter, MARGIN, 70);
    this.doc.setFontSize(10);
    this.doc.setTextColor(180, 190, 205);
    this.doc.text(`Generated ${new Date().toLocaleDateString("en-US", { dateStyle: "long" })}`, MARGIN, 82);
    this.footer();
  }

  addSlide(title: string, sections: Array<{ heading?: string; bullets: string[] }>, rag?: RagStatus) {
    this.doc.addPage([SLIDE_W, SLIDE_H], "landscape");
    this.page += 1;

    this.doc.setFillColor(10, 21, 36);
    this.doc.rect(0, 0, SLIDE_W, SLIDE_H, "F");

    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(16);
    this.doc.text(title, MARGIN, 22);

    if (rag) {
      const color =
        rag === "Green" ? [52, 211, 153] : rag === "Amber" ? [251, 191, 36] : [248, 113, 113];
      this.doc.setFillColor(color[0], color[1], color[2]);
      this.doc.roundedRect(SLIDE_W - MARGIN - 28, 12, 28, 10, 2, 2, "F");
      this.doc.setFontSize(9);
      this.doc.setTextColor(15, 23, 42);
      this.doc.text(rag.toUpperCase(), SLIDE_W - MARGIN - 14, 18.5, { align: "center" });
    }

    let y = 32;
    for (const section of sections) {
      if (section.heading) {
        this.doc.setFontSize(10);
        this.doc.setTextColor(96, 165, 250);
        this.doc.text(section.heading, MARGIN, y);
        y += 6;
      }
      this.doc.setFontSize(9.5);
      this.doc.setTextColor(220, 228, 240);
      for (const bullet of section.bullets) {
        const lines = this.doc.splitTextToSize(`• ${bullet}`, CONTENT_W - 4);
        for (const line of lines) {
          if (y > SLIDE_H - 16) break;
          this.doc.text(line, MARGIN + 2, y);
          y += 5.2;
        }
        y += 1.5;
      }
      y += 3;
    }

    this.footer();
  }

  save(filename: string) {
    this.doc.save(filename);
  }

  outputBlob(): Blob {
    return this.doc.output("blob");
  }
}

function boardReviewFilename(input: BoardReviewPdfInput) {
  const ctx = buildDeckContext(input);
  const safeQuarter = ctx.q.replace(/\s+/g, "-");
  return `${ctx.company.replace(/\s+/g, "-")}-Board-Review-${safeQuarter}.pdf`;
}

function buildBoardReviewDeck(input: BoardReviewPdfInput = {}) {
  const ctx = buildDeckContext(input);
  const deck = new SlideDeck(ctx.company, ctx.q);

  deck.addTitleSlide();

  deck.addSlide(
    "1. Executive Summary",
    [
      {
        bullets: [
          "Quarter highlights: YTD revenue €1.86M (+18% vs plan); 3 active field projects; pipeline €1.24M (+€180k).",
          "Key challenges: €64k receivables overdue; Iberia pipeline conversion slower than forecast; pilot certification backlog.",
          `Overall business health: ${ctx.health} — revenue ahead of budget, cash stable, delivery on track.`,
          "Top 3 priorities next quarter: Close Texas utility inspection contract; scale US sales hire; WebODM delivery automation.",
          "Decisions requested: Approve Q3 capex for second M300 fleet unit; endorse US East sales agency pilot.",
        ],
      },
    ],
    ctx.health,
  );

  deck.addSlide("2. Strategic Progress — Objectives & Milestones", [
    {
      heading: "Strategic objectives (annual plan)",
      bullets: [
        "Expand US commercial footprint (Texas + Southeast utilities).",
        "Achieve 40%+ gross margin on inspection & surveying lines.",
        "Productise WebODM deliverables for repeat client reporting.",
      ],
    },
    {
      heading: "Major milestones achieved",
      bullets: [
        "OnwardAir US Supabase & production stack live (us-east-1).",
        "Internal operations dashboard: CRM, HR, financials, connections provisioned.",
        "HR leadership team onboarded; 12 FTE on platform.",
      ],
    },
  ]);

  deck.addSlide("2. Strategic Progress — Delays & Wins", [
    {
      heading: "Initiatives behind schedule",
      bullets: [
        "European rep network CRM sync — slipped 6 weeks (integration dependency).",
        "Automated board reporting — in progress (this deck closes the gap).",
      ],
    },
    {
      heading: "Wins since last meeting",
      bullets: [
        "Won 2 multi-site inspection renewals (Catalonia + Porto).",
        "Pilot programme NPS 72 from utility beta client.",
        "Reduced avg. mobilisation lead time from 11 to 8 days.",
      ],
    },
  ]);

  const jun = ctx.jun;
  deck.addSlide("3. Financial Performance — P&L", [
    {
      heading: "Q2 / YTD (€ thousands, preview data)",
      bullets: [
        `Revenue (Jun): ${formatEurThousands(jun.revenue)} · YTD: ${formatEurThousands(ctx.ytdRevenue)}`,
        `Gross profit (est.): ${formatEurThousands(Math.round(jun.revenue * 0.423))} · margin 42.3%`,
        `EBITDA / Operating profit (est.): ${formatEurThousands(Math.round(jun.profit + jun.costs * 0.3))}`,
        `Net profit (Jun): ${formatEurThousands(jun.profit)} · YTD net: €148k`,
      ],
    },
    {
      heading: "Variance",
      bullets: [
        "Actual vs Budget: +8% revenue YTD; OPEX +3% (HR additions).",
        "Actual vs Last Year: +22% revenue; margin +1.8 pts.",
        "Quarter trend: Revenue up 6 months straight; OPEX controlled at ~33% of revenue.",
      ],
    },
  ]);

  deck.addSlide("3. Financial Performance — Cash", [
    {
      bullets: [
        `Cash balance (approx.): ${formatEurThousands(Math.round(ctx.cashEurApprox))} equivalent across GBP/USD/EUR accounts.`,
        "Burn rate: Neutral — operating cash positive last 2 quarters.",
        "Cash runway: 14+ months at current opex (excl. planned capex).",
        "Operating cash flow: Positive €79k in June; YTD OCF estimated €310k.",
      ],
    },
  ]);

  deck.addSlide("3. Financial Performance — Balance Sheet & Forecast", [
    {
      heading: "Balance sheet highlights",
      bullets: [
        "Working capital: Net positive; DSO 42 days (target 35).",
        "Debt: None on balance sheet.",
        "Inventory: €118k equipment & spares (2 drone platforms + sensors).",
        "Receivables: €64k outstanding (3 clients); Payables: €41k trade.",
      ],
    },
    {
      heading: "FY forecast",
      bullets: [
        "FY revenue forecast: €4.2M (+6% vs prior forecast on US pipeline).",
        "Change from previous forecast: +€240k revenue, flat opex.",
        "Confidence level: Medium-high (65%) — weighted by US contract timing.",
      ],
    },
  ]);

  deck.addSlide("4. Sales & Commercial — Pipeline", [
    {
      bullets: [
        `Qualified pipeline: ${FINANCIAL_KPIS.find((k) => k.id === "pipeline-value")?.value ?? "€1.24M"}`,
        "Win rate: 34% (trailing 12 months).",
        "Average deal size: €185k.",
        "Sales cycle: 87 days average (inspection); 124 days (surveying).",
      ],
    },
  ]);

  deck.addSlide("4. Sales & Commercial — Mix & Customers", [
    {
      heading: "Revenue mix",
      bullets: [
        ...REVENUE_BY_SERVICE_DATA.map((row) => `${row.name}: ${row.value}% of YTD revenue`),
        `Geography: ${PIPELINE_BY_REGION_DATA.slice(0, 3).map((r) => `${r.region} €${r.value}k pipeline`).join("; ")}.`,
        "Segment: 62% utility/infrastructure; 28% commercial asset owners; 10% public sector.",
      ],
    },
    {
      heading: "Customer metrics",
      bullets: [
        "New customers: 4 YTD · Lost: 1 · Renewal rate: 91% · Churn: 4%.",
        "Top 3 clients = 48% of revenue (concentration risk — Amber).",
      ],
    },
  ]);

  deck.addSlide("5. Operations — Delivery & Quality", [
    {
      bullets: [
        "Delivery performance: 94% missions completed on first mobilisation.",
        "On-time delivery: 96% of client report SLAs met.",
        "Quality: <1% re-flight rate; zero safety incidents Q2.",
        "Service levels: 99.2% platform uptime (internal ops dashboard).",
      ],
    },
  ]);

  deck.addSlide("5. Operations — Capacity & Efficiency", [
    {
      bullets: [
        "Manufacturing / fleet output: 142 sorties Q2 (+18% QoQ).",
        "Capacity utilisation: 78% pilot & sensor utilisation.",
        "Cost efficiency: Direct ops cost 57% of revenue (target 55% by Q4).",
      ],
    },
  ]);

  deck.addSlide("6. Product / Technology", [
    {
      bullets: [
        "Roadmap: WebODM automated reporting GA in Q3; client portal v2 in Q4.",
        "Releases: Internal dashboard v2 (CRM assignee, board PDF, US Supabase).",
        "Technical debt: Legacy BCN email paths — migration scheduled.",
        "Security: Supabase RLS on all client tables; auth hardening in progress.",
        "Platform reliability: Vercel + Supabase us-east-1 production stack.",
        "AI initiatives: Pilot defect detection model — PoC with utility partner.",
      ],
    },
  ]);

  deck.addSlide("7. People", [
    {
      bullets: [
        `Headcount: ${ctx.employees.length || 12} FTE · Hiring: 2 open roles (US sales, field pilot).`,
        "Attrition: 0% Q2 · Leadership: No changes.",
        "Engagement: Pulse score 81/100 (mock).",
        `Critical vacancies: US commercial lead; payroll load ${ctx.annualPayroll ? formatEur(ctx.annualPayroll) : "€1.8M"} annualised.`,
      ],
    },
  ]);

  deck.addSlide("8. Customers", [
    {
      bullets: [
        "Major wins: Regional utility inspection renewal; Porto logistics corridor mapping.",
        "Lost accounts: 1 SME surveying client (budget freeze).",
        "NPS / satisfaction: 68 overall; 72 utility beta cohort.",
        "Strategic feedback: Clients request faster orthomosaic turnaround — WebODM priority.",
        "Case study: Catalonia solar farm thermal inspection — 40% faster reporting.",
      ],
    },
  ]);

  deck.addSlide("9. Risks", [
    {
      bullets: [
        "Customer concentration in top 3 accounts (48% revenue).",
        "US contract timing — slip could defer €400k H2 revenue.",
        "Pilot certification backlog may delay Q3 mobilisations.",
        "FX exposure on GBP/EUR operating accounts.",
      ],
    },
  ]);

  deck.addSlide("10. Opportunities", [
    {
      bullets: [
        "New markets: Texas utilities; Southeast ag-industrial inspection.",
        "Partnerships: US sales agency pilot; WebODM OEM channel.",
        "M&A: Small regional surveying firm tuck-in (pipeline identified).",
        "Cost reduction: Fleet sharing between Catalonia & US hubs.",
        "AI/automation: Automated defect tagging on thermal stacks.",
        "Large prospects: 2 utility RFPs in qualification ($1.2M combined).",
      ],
    },
  ]);

  deck.addSlide("11. Governance & Compliance", [
    {
      bullets: [
        "Regulatory: FAA Part 107 compliant operations; EU ops certificates current.",
        "Audit: No material findings — internal controls review scheduled Q3.",
        "ESG: Drone-based inspection reduces client site vehicle miles ~30%.",
        "Insurance: Aviation liability renewed Apr 2026.",
        "Legal: No active litigation.",
      ],
    },
  ]);

  deck.addSlide("12. Decisions Required", [
    {
      bullets: [
        "Approve Q3 capex: second M300 RTK platform + thermal payload (~€185k).",
        "Approve US East sales agency pilot (6-month trial, €45k).",
        "Endorse FY forecast revision (+6% revenue).",
        "Board approval: Executive incentive pool alignment with FY targets.",
      ],
    },
  ]);

  deck.addSlide("13. Outlook", [
    {
      bullets: [
        "Priorities next quarter: Close US utility contract; hire US commercial lead; ship WebODM auto-reports.",
        "Expected financial performance: €520k Q3 revenue; maintain 42%+ gross margin.",
        "Key milestones: WebODM GA; client portal beta; 2 new US pilots certified.",
        "Major risks to watch: RFP timing; receivables collection; pilot availability.",
        "Support needed from board: Introductions to US utility decision-makers; capex approval.",
      ],
    },
  ]);

  return deck;
}

export function downloadBoardReviewPdf(input: BoardReviewPdfInput = {}) {
  buildBoardReviewDeck(input).save(boardReviewFilename(input));
}

export function buildBoardReviewPdfUrl(input: BoardReviewPdfInput = {}) {
  return URL.createObjectURL(buildBoardReviewDeck(input).outputBlob());
}
