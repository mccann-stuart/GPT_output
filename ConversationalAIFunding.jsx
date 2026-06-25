import React, { useState, useMemo } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// CONVERSATIONAL AI FUNDING TRACKER
// Tracks: capital raised, private valuations, reported ARR, estimated burn
// rates, and estimated runway for Sierra, Decagon, Parloa, and PolyAI.
//
// Data sources: company press releases, TechCrunch, Bloomberg, CNBC, Sacra,
// PitchBook, and company blogs. As of June 2026.
//
// ⚠ Burn rates, cash on hand, and runway are analyst estimates.
//   None of these companies publicly disclose these figures.
// ─────────────────────────────────────────────────────────────────────────────

const P = {
  ink: "#15201A",
  paper: "#F3EFE6",
  sage: "#5C7A6B",
  brass: "#B08A4F",
  rust: "#A8563C",
  slate: "#6E7B82",
  line: "#D6CFC0",
  card: "#FBFAF5",
  amber: "#C4850A",
  violet: "#6B4F8E",
};

const ACCENT = {
  sierra: "#5C7A6B",
  decagon: "#B08A4F",
  polyai: "#A8563C",
  parloa: "#6B4F8E",
};



const RUNWAY_GROSS_MARGIN = 0.9;
const RUNWAY_HORIZON_YEARS = 5;
const VIEW_KEYS = ["compare", "runway", "detail"];
const COMPANY_IDS = ["sierra", "decagon", "parloa", "polyai"];

const DEFAULT_RUNWAY_SCENARIO = {
  marginIdx: 2,
  growthIdx: 0,
  horizonIdx: 1,
  burnIdxByCompany: {
    sierra: 1,
    decagon: 1,
    parloa: 1,
    polyai: 1,
  },
};

export const DEFAULT_SETTINGS = {
  view: "compare",
  selected: "sierra",
  runwayScenario: DEFAULT_RUNWAY_SCENARIO,
};

function clampOptionIndex(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.max(0, Math.min(3, parsed));
}

function normalizeRunwayScenario(value = {}) {
  const burnIdxByCompany = {};
  for (const companyId of COMPANY_IDS) {
    burnIdxByCompany[companyId] = clampOptionIndex(
      value?.burnIdxByCompany?.[companyId],
      DEFAULT_RUNWAY_SCENARIO.burnIdxByCompany[companyId],
    );
  }

  return {
    marginIdx: clampOptionIndex(value?.marginIdx, DEFAULT_RUNWAY_SCENARIO.marginIdx),
    growthIdx: clampOptionIndex(value?.growthIdx, DEFAULT_RUNWAY_SCENARIO.growthIdx),
    horizonIdx: clampOptionIndex(value?.horizonIdx, DEFAULT_RUNWAY_SCENARIO.horizonIdx),
    burnIdxByCompany,
  };
}

function normalizeSettings(value = {}) {
  const view = VIEW_KEYS.includes(value?.view) ? value.view : DEFAULT_SETTINGS.view;
  const selected = COMPANY_IDS.includes(value?.selected)
    ? value.selected
    : DEFAULT_SETTINGS.selected;

  return {
    view,
    selected,
    runwayScenario: normalizeRunwayScenario(value?.runwayScenario),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Company data
// ARR figures: company-reported unless marked arrStatus: "projected"
// Burn / runway: analyst estimates — see methodology note below
// Cash on hand: approximated as (latest round) − (months since × est. net burn)
// ─────────────────────────────────────────────────────────────────────────────
const COMPANIES = [
  {
    id: "sierra",
    name: "Sierra",
    tagline: "AI agents for enterprise customer service",
    hq: "San Francisco, CA · USA",
    founded: 2024,
    founders: "Bret Taylor & Clay Bavor",
    website: "sierra.ai",
    employees: 600,
    totalRaisedM: 1585,
    latestValuationM: 15800,
    valuationDate: "May 2026",
    arrM: 200,
    arrDate: "May 2026",
    arrStatus: "confirmed",
    // Burn estimates: ~600 staff × $22K loaded + $5M/mo infra = ~$18M gross;
    // minus $16.7M/mo revenue → net burn ~$10M/mo
    estNetBurnM: 10,
    estCashOnHandM: 940,   // ~$950M raised May 2026, 1 mo elapsed
    estRunwayMonths: 94,
    burnConfidence: "est.",
    rounds: [
      { label: "Seed", amount: 110, date: "Feb 2024", postValM: 550, lead: "Sequoia Capital, Benchmark" },
      { label: "Series A", amount: 175, date: "Oct 2024", postValM: 4500, lead: "Greenoaks Capital" },
      { label: "Series D", amount: 350, date: "Sep 2025", postValM: 10000, lead: "Greenoaks Capital" },
      { label: "Series E", amount: 950, date: "May 2026", postValM: 15800, lead: "Tiger Global, GV (Google Ventures)" },
    ],
    arrHistory: [
      { period: "End 2024", arrM: 26 },
      { period: "Nov 2025", arrM: 100 },
      { period: "Feb 2026", arrM: 150 },
      { period: "May 2026", arrM: 200 },
    ],
    keyInvestors: ["Sequoia Capital", "Benchmark", "Greenoaks Capital", "Tiger Global", "GV (Google Ventures)"],
    notableCustomers: ["SoFi", "Ramp", "Brex", "ADT", "SiriusXM", "Sonos", "Wayfair", "Cigna"],
    headline: "Reached $100M ARR in 7 quarters — fastest on record; $950M Series E closed May 2026 at $15.8B",
    pdfSnapshot: {
      source: "CX-AI Landscape, pp. 14-15",
      revenueM: 150,
      fundingM: 635,
      valuationM: 10000,
      employees: "350+",
      thesis: "AI-native CX vendor with Agent OS, multi-model stack, outcome pricing, and an executive-led direct sales motion.",
      caveat: "PDF benchmark predates the May 2026 funding update used in the main tracker.",
    },
  },
  {
    id: "decagon",
    name: "Decagon",
    tagline: "AI customer concierge for enterprise support",
    hq: "San Francisco, CA · USA",
    founded: 2023,
    founders: "Jesse Zhang & Ashwin Sreenivas",
    website: "decagon.ai",
    employees: 420,
    totalRaisedM: 486,
    latestValuationM: 4500,
    valuationDate: "Jan 2026",
    arrM: 35,
    arrDate: "2025 annual",
    arrStatus: "confirmed",
    // ~420 staff × $22K + $2M infra = ~$11M gross; minus $2.9M/mo → net ~$8M
    estNetBurnM: 8,
    estCashOnHandM: 200,   // ~$250M raised Jan 2026, 5 mo elapsed × $8M
    estRunwayMonths: 25,
    burnConfidence: "est.",
    rounds: [
      { label: "Seed", amount: 5, date: "2023", postValM: null, lead: "a16z" },
      { label: "Series A", amount: 35, date: "Jul 2024", postValM: null, lead: "Accel" },
      { label: "Series B", amount: 65, date: "Oct 2024", postValM: 650, lead: "Bain Capital Ventures" },
      { label: "Series C", amount: 131, date: "Jun 2025", postValM: 1500, lead: "Accel, a16z Growth Fund" },
      { label: "Series D", amount: 250, date: "Jan 2026", postValM: 4500, lead: "Coatue, Index Ventures" },
    ],
    arrHistory: [
      { period: "2025", arrM: 35 },
    ],
    keyInvestors: ["a16z", "Accel", "Bain Capital Ventures", "Coatue", "Index Ventures"],
    notableCustomers: ["Hertz", "Eventbrite", "Duolingo", "Oura", "Notion", "Rippling", "Chime"],
    headline: "Valuation tripled from $1.5B to $4.5B in 8 months; 100+ enterprise customers added in 2025; first tender offer Mar 2026",
    pdfSnapshot: {
      source: "CX-AI Landscape, pp. 14, 17",
      revenueM: 35,
      fundingM: 481,
      valuationM: 1500,
      employees: "~200",
      thesis: "Omnichannel AI concierge layer across voice, chat, email, and SMS with pre-built integrations and Agent Operating Procedures.",
      caveat: "PDF valuation benchmark reflects the Series C profile; the main tracker includes a later Series D valuation.",
    },
  },
  {
    id: "parloa",
    name: "Parloa",
    tagline: "Agentic AI platform for customer experience",
    hq: "Berlin, Germany",
    founded: 2022,
    founders: "Malte Kosub & Stefan Ostwald",
    website: "parloa.com",
    employees: 475,
    totalRaisedM: 562,
    latestValuationM: 3000,
    valuationDate: "Jan 2026",
    arrM: 50,
    arrDate: "Jan 2026",
    arrStatus: "confirmed",
    // ~475 staff × $20K + $2.5M infra = ~$12M gross; minus $4.2M/mo → net ~$7M
    // European headcount carries lower loaded cost vs US peers
    estNetBurnM: 7,
    estCashOnHandM: 315,   // ~$350M raised Jan 2026, 5 mo elapsed × $7M
    estRunwayMonths: 45,
    burnConfidence: "est.",
    rounds: [
      { label: "Seed", amount: 4.2, date: "May 2022", postValM: null, lead: "—" },
      { label: "Series A", amount: 22, date: "Mar 2023", postValM: null, lead: "EQT Ventures" },
      { label: "Series B", amount: 66, date: "Apr 2024", postValM: null, lead: "Altimeter Capital, Mosaic Ventures" },
      { label: "Series C", amount: 120, date: "May 2025", postValM: 1000, lead: "Multiple investors" },
      { label: "Series D", amount: 350, date: "Jan 2026", postValM: 3000, lead: "General Catalyst" },
    ],
    arrHistory: [
      { period: "2024", arrM: 16 },
      { period: "2025", arrM: 50 },
    ],
    keyInvestors: ["EQT Ventures", "General Catalyst", "Altimeter Capital", "Mosaic Ventures", "Durable Capital"],
    notableCustomers: ["Allianz", "Booking.com", "HealthEquity", "SAP", "Swiss Life", "Decathlon"],
    headline: "3× ARR growth in 2025 ($16M → $50M); valuation tripled to $3B in 8 months; Europe's leading conversational AI unicorn",
    pdfSnapshot: {
      source: "CX-AI Landscape, pp. 14, 16, 34",
      revenueM: 50,
      fundingM: 560,
      valuationM: 3000,
      employees: "380-400",
      thesis: "Voice-first enterprise AI Agent Management Platform with partner-led GTM and broad CCaaS, CRM, and ERP integrations.",
      caveat: "PDF flags backend automation gaps and potential SI dependency for heavier case-handling automation.",
    },
  },
  {
    id: "polyai",
    name: "PolyAI",
    tagline: "Voice AI agents for enterprise call centres",
    hq: "London, UK",
    founded: 2017,
    founders: "Nikola Mrkšić, Pei-Hao Su & Tsung-Hsien Wen",
    website: "poly.ai",
    employees: 360,
    totalRaisedM: 205,
    latestValuationM: 750,
    valuationDate: "Dec 2025",
    arrM: 40,
    arrDate: "2026 projection",
    arrStatus: "projected",
    // ~360 staff × $20K + $2.5M infra = ~$9.7M gross; minus $3.3M/mo → net ~$3.5M
    // Higher revenue offset due to more mature ARR base
    estNetBurnM: 3.5,
    estCashOnHandM: 65,    // ~$86M raised Dec 2025, 6 mo elapsed × $3.5M
    estRunwayMonths: 19,
    burnConfidence: "est.",
    rounds: [
      { label: "Series A", amount: 14, date: "Mar 2019", postValM: null, lead: "Point72 Ventures, Sands Capital" },
      { label: "Series B", amount: 40, date: "Sep 2021", postValM: null, lead: "Khosla Ventures, Georgian" },
      { label: "Series C", amount: 50, date: "May 2024", postValM: null, lead: "Hedosophia, NVIDIA Ventures" },
      { label: "Series D", amount: 86, date: "Dec 2025", postValM: 750, lead: "Georgian, Hedosophia, Khosla" },
    ],
    arrHistory: [
      { period: "FY Jan 2024", arrM: 8.9 },
      { period: "FY Jan 2025", arrM: 15 },
      { period: "2026 proj.", arrM: 40 },
    ],
    keyInvestors: ["Khosla Ventures", "Georgian", "Hedosophia", "NVentures (NVIDIA)", "Citi Ventures"],
    notableCustomers: ["Marriott", "Caesars Entertainment", "PG&E", "UniCredit", "FedEx", "Hilton"],
    headline: "Most mature (founded 2017); 2,000+ live deployments across 45 languages; est. runway tightest of the four — next raise likely 2027",
    pdfSnapshot: {
      source: "CX-AI Landscape, p. 14",
      revenueM: 40,
      fundingM: 200,
      valuationM: 750,
      employees: "200+",
      thesis: "Voice AI specialist with Cambridge origins, enterprise deployments, proprietary Raven v2 LLM, Agent Studio, and usage-based minute pricing.",
      caveat: "PDF offers less detail on partnership model than the Sierra, Parloa, and Decagon profile pages.",
    },
  },
];

const RUNWAY_BURN_CASES = {
  sierra: {
    anchor: "$640M burned over 24 months implies ~$26.7M/mo gross cash burn before ARR gross profit offset.",
    cases: [
      { level: "Low", monthlyGrossBurnM: 22, note: "Slower hiring and model/voice infrastructure discipline." },
      { level: "Medium", monthlyGrossBurnM: 26.7, note: "Anchored to the $640M / 24-month burn observation." },
      { level: "High", monthlyGrossBurnM: 35, note: "Aggressive enterprise GTM, implementation capacity, and inference scale-up." },
      { level: "Extreme", monthlyGrossBurnM: 45, note: "Hyper-scale expansion, aggressive global headcount, and peak compute spend." }
    ],
  },
  decagon: {
    anchor: "Gross-burn range brackets a rapid US enterprise GTM build on top of a smaller reported ARR base.",
    cases: [
      { level: "Low", monthlyGrossBurnM: 10, note: "Tighter hiring, limited infrastructure expansion." },
      { level: "Medium", monthlyGrossBurnM: 14, note: "Scaled enterprise sales, support, and product investment." },
      { level: "High", monthlyGrossBurnM: 20, note: "Faster headcount growth plus heavier voice and integration costs." },
      { level: "Extreme", monthlyGrossBurnM: 28, note: "Intense market land grab, full omnichannel sales force, and custom integrations." }
    ],
  },
  polyai: {
    anchor: "Voice-heavy deployments carry implementation and telephony/inference costs, but the company is more mature.",
    cases: [
      { level: "Low", monthlyGrossBurnM: 7, note: "More mature operating cadence with constrained hiring." },
      { level: "Medium", monthlyGrossBurnM: 10, note: "Current-scale enterprise voice platform and delivery investment." },
      { level: "High", monthlyGrossBurnM: 14, note: "Accelerated US expansion and larger model/voice infrastructure load." },
      { level: "Extreme", monthlyGrossBurnM: 18, note: "Hyper-growth voice-agent deployments, proprietary Raven LLM scaling, and global call center capture." }
    ],
  },
  parloa: {
    anchor: "Scenario range reflects voice-first enterprise delivery, US expansion, and partner-enabled implementation costs.",
    cases: [
      { level: "Low", monthlyGrossBurnM: 10, note: "Efficient European cost base with controlled expansion." },
      { level: "Medium", monthlyGrossBurnM: 14, note: "US expansion and enterprise delivery scale-up." },
      { level: "High", monthlyGrossBurnM: 20, note: "Heavier SI support, integration depth, and R&D acceleration." },
      { level: "Extreme", monthlyGrossBurnM: 28, note: "Maximized US marketing push, massive SI partner enablement, and rapid R&D scaling." }
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function fmtM(v) {
  if (v === null || v === undefined) return "—";
  if (v >= 10000) return `$${(v / 1000).toFixed(1)}B`;
  if (v >= 1000) return `$${(v / 1000).toFixed(2).replace(/\.?0+$/, "")}B`;
  if (v >= 100) return `$${Math.round(v)}M`;
  if (v >= 1) return `$${v.toFixed(1).replace(/\.0$/, "")}M`;
  return `$${v.toFixed(2).replace(/\.?0+$/, "")}M`;
}

function fmtBurn(v) { return `~$${v}M/mo`; }

function fmtMonthlyBurn(v) {
  return `$${v.toFixed(v % 1 === 0 ? 0 : 1)}M/mo`;
}

function fmtSignedM(v) {
  const sign = v > 0 ? "+" : v < 0 ? "-" : "";
  return `${sign}${fmtM(Math.abs(v))}`;
}

function fmtPct(v) {
  return `${Math.round(v)}%`;
}

function runwayColor(mo) {
  if (mo < 18) return P.rust;
  if (mo < 30) return P.amber;
  return P.sage;
}

function runwayLabel(mo) {
  if (mo >= 60) return `${Math.floor(mo / 12)}+ yrs`;
  if (mo >= 24) return `~${(mo / 12).toFixed(1)} yrs`;
  return `~${mo} mo`;
}

function scenarioRunwayLabel(mo) {
  if (!Number.isFinite(mo)) return "self-funding";
  if (mo >= 120) return "10+ yrs";
  if (mo >= 60) return `${Math.floor(mo / 12)}+ yrs`;
  if (mo >= 24) return `~${(mo / 12).toFixed(1)} yrs`;
  return `~${Math.round(mo)} mo`;
}

function valArrMult(c) {
  return (c.latestValuationM / c.arrM).toFixed(1);
}

function scenarioLevelColor(level) {
  if (level === "Low") return P.sage;
  if (level === "Medium") return P.amber;
  if (level === "Extreme") return P.violet;
  return P.rust;
}

function simulateScenario(company, monthlyGrossBurnM, grossMargin, growthRate, horizonYears) {
  const startCash = company.estCashOnHandM;
  let cash = startCash;
  let runwayMonths = Infinity;
  const totalMonths = horizonYears * 12;

  for (let m = 1; m <= 360; m++) {
    const arr = company.arrM * Math.pow(1 + growthRate, (m - 1) / 12);
    const monthlyGrossProfit = arr * grossMargin / 12;
    const netBurn = monthlyGrossBurnM - monthlyGrossProfit;

    if (cash > 0) {
      if (cash >= netBurn) {
        cash -= netBurn;
      } else {
        runwayMonths = (m - 1) + (cash / netBurn);
        cash -= netBurn;
      }
    } else {
      cash -= netBurn;
    }
  }

  let horizonCash = startCash;
  for (let m = 1; m <= totalMonths; m++) {
    const arr = company.arrM * Math.pow(1 + growthRate, (m - 1) / 12);
    const monthlyGrossProfit = arr * grossMargin / 12;
    const netBurn = monthlyGrossBurnM - monthlyGrossProfit;
    horizonCash -= netBurn;
  }

  return {
    runwayMonths,
    horizonCash,
  };
}

function calcRunwayScenario(company, burnCase) {
  const monthlyGrossProfitM = company.arrM * RUNWAY_GROSS_MARGIN / 12;
  const netMonthlyBurnM = Math.max(burnCase.monthlyGrossBurnM - monthlyGrossProfitM, 0);
  const runwayMonths = netMonthlyBurnM === 0 ? Infinity : company.estCashOnHandM / netMonthlyBurnM;
  const breakevenArrM = burnCase.monthlyGrossBurnM * 12 / RUNWAY_GROSS_MARGIN;
  const additionalArrM = Math.max(breakevenArrM - company.arrM, 0);
  const offsetPct = Math.min(monthlyGrossProfitM / burnCase.monthlyGrossBurnM * 100, 999);
  const fiveYearGrossProfitM = company.arrM * RUNWAY_GROSS_MARGIN * RUNWAY_HORIZON_YEARS;
  const fiveYearGrossBurnM = burnCase.monthlyGrossBurnM * 12 * RUNWAY_HORIZON_YEARS;
  const fiveYearCashPositionM = company.estCashOnHandM + fiveYearGrossProfitM - fiveYearGrossBurnM;

  return {
    ...burnCase,
    company,
    monthlyGrossProfitM,
    netMonthlyBurnM,
    runwayMonths,
    breakevenArrM,
    additionalArrM,
    offsetPct,
    fiveYearGrossProfitM,
    fiveYearGrossBurnM,
    fiveYearCashPositionM,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────
function ViewSeg({ active, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={{
        padding: "9px 20px",
        fontSize: 13,
        fontWeight: 500,
        border: "none",
        background: active ? P.ink : "transparent",
        color: active ? P.paper : P.ink,
        fontFamily: "inherit",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function CompanySeg({ c, active, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={`Show ${c.name} detail`}
      onClick={onClick}
      style={{
        padding: "8px 18px",
        fontSize: 13,
        fontWeight: 600,
        border: "none",
        background: active ? ACCENT[c.id] : P.card,
        color: active ? "#fff" : P.ink,
        fontFamily: "inherit",
        cursor: "pointer",
        transition: "background .12s",
      }}
    >
      {c.name}
    </button>
  );
}

function KpiCard({ label, value, sub, color }) {
  return (
    <div style={{ background: P.card, border: `1px solid ${P.line}`, padding: "18px 18px 16px" }}>
      <div
        style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: P.slate, marginBottom: 8 }}
      >
        {label}
      </div>
      <div
        style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 24, fontWeight: 600, color: color || P.ink, lineHeight: 1 }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: P.slate, marginTop: 7, lineHeight: 1.4 }}>{sub}</div>}
    </div>
  );
}



function RunwayScenarioView({ scenarioSettings, onScenarioChange }) {
  const {
    marginIdx,
    growthIdx,
    horizonIdx,
    burnIdxByCompany,
  } = normalizeRunwayScenario(scenarioSettings);
  const marginOptions = [0.75, 0.80, 0.90, 0.95];
  const growthOptions = [0.0, 0.25, 0.50, 1.0];
  const horizonOptions = [3, 5, 7, 10];

  const grossMargin = marginOptions[marginIdx];
  const growthRate = growthOptions[growthIdx];
  const horizonYears = horizonOptions[horizonIdx];

  const getCompanyBurnIdx = (id) => {
    return burnIdxByCompany[id] ?? DEFAULT_RUNWAY_SCENARIO.burnIdxByCompany[id] ?? 1;
  };

  const getCompanySetBurnIdx = (id) => {
    return (nextValue) => {
      onScenarioChange({
        marginIdx,
        growthIdx,
        horizonIdx,
        burnIdxByCompany: {
          ...burnIdxByCompany,
          [id]: clampOptionIndex(nextValue, getCompanyBurnIdx(id)),
        },
      });
    };
  };

  const updateScenarioOption = (key, nextValue) => {
    onScenarioChange({
      marginIdx,
      growthIdx,
      horizonIdx,
      burnIdxByCompany,
      [key]: clampOptionIndex(nextValue, scenarioSettings?.[key] ?? 0),
    });
  };

  const applyGlobalBurnPreset = (idx) => {
    const nextIdx = clampOptionIndex(idx, 1);
    onScenarioChange({
      marginIdx,
      growthIdx,
      horizonIdx,
      burnIdxByCompany: Object.fromEntries(COMPANY_IDS.map((id) => [id, nextIdx])),
    });
  };

  const rows = COMPANIES.map(company => {
    const burnIdx = getCompanyBurnIdx(company.id);
    const burnCase = RUNWAY_BURN_CASES[company.id].cases[burnIdx];

    const sim = simulateScenario(company, burnCase.monthlyGrossBurnM, grossMargin, growthRate, horizonYears);

    const monthlyGrossProfitM = company.arrM * grossMargin / 12;
    const netMonthlyBurnM = Math.max(burnCase.monthlyGrossBurnM - monthlyGrossProfitM, 0);
    const breakevenArrM = burnCase.monthlyGrossBurnM * 12 / grossMargin;
    const additionalArrM = Math.max(breakevenArrM - company.arrM, 0);
    const offsetPct = Math.min(monthlyGrossProfitM / burnCase.monthlyGrossBurnM * 100, 999);

    return {
      company,
      level: burnCase.level,
      monthlyGrossBurnM: burnCase.monthlyGrossBurnM,
      monthlyGrossProfitM,
      netMonthlyBurnM,
      runwayMonths: sim.runwayMonths,
      breakevenArrM,
      additionalArrM,
      offsetPct,
      fiveYearCashPositionM: sim.horizonCash,
      note: burnCase.note,
      burnIdx,
    };
  });

  const sierraRow = rows.find(row => row.company.id === "sierra");
  const maxBreakevenArr = Math.max(...rows.map(row => row.breakevenArrM));

  return (
    <>
      <section style={{ borderBottom: `1px solid ${P.line}`, paddingBottom: 22, marginBottom: 28 }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: P.brass, marginBottom: 10 }}>
          Estimated Runway · Gross burn scenarios
        </div>
        <h2 className="fr" style={{ fontSize: 32, lineHeight: 1.08, fontWeight: 500, margin: "0 0 12px" }}>
          Revenue offset model at {Math.round(grossMargin * 100)}% gross margin
        </h2>
        <p style={{ maxWidth: 760, color: P.slate, lineHeight: 1.6, fontSize: 14.5, margin: 0 }}>
          This view separates gross monthly cash burn from net cash burn after ARR gross profit. Breakeven ARR is
          the annual recurring revenue required for {Math.round(grossMargin * 100)}% gross profit to cover the selected monthly burn rate.
          The {horizonYears}-year view assumes the current ARR base grows at {growthRate === 0 ? "0%" : `${Math.round(growthRate * 100)}%`} per year and no new funding arrives.
        </p>
      </section>

      {/* Control Panel Card */}
      <div style={{ background: P.card, border: `1px solid ${P.line}`, padding: "20px 24px", marginBottom: 28, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
        {/* Gross Margin Slider */}
        <div>
          <label style={{ display: "block", fontSize: 11, fontFamily: "IBM Plex Mono, monospace", textTransform: "uppercase", color: P.brass, marginBottom: 8, fontWeight: 600 }}>
            Gross Margin: <span style={{ color: P.ink, fontWeight: 700 }}>{Math.round(grossMargin * 100)}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="3"
            step="1"
            value={marginIdx}
            onChange={(e) => updateScenarioOption("marginIdx", e.target.value)}
            style={{ width: "100%" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: P.slate, marginTop: 4, fontFamily: "IBM Plex Mono, monospace" }}>
            <span>75%</span>
            <span>80%</span>
            <span>90%</span>
            <span>95%</span>
          </div>
        </div>

        {/* ARR Growth Slider */}
        <div>
          <label style={{ display: "block", fontSize: 11, fontFamily: "IBM Plex Mono, monospace", textTransform: "uppercase", color: P.brass, marginBottom: 8, fontWeight: 600 }}>
            ARR Growth Rate: <span style={{ color: P.ink, fontWeight: 700 }}>{growthRate === 0 ? "Static (0%)" : `${Math.round(growthRate * 100)}%/yr`}</span>
          </label>
          <input
            type="range"
            min="0"
            max="3"
            step="1"
            value={growthIdx}
            onChange={(e) => updateScenarioOption("growthIdx", e.target.value)}
            style={{ width: "100%" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: P.slate, marginTop: 4, fontFamily: "IBM Plex Mono, monospace" }}>
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Horizon Years Slider */}
        <div>
          <label style={{ display: "block", fontSize: 11, fontFamily: "IBM Plex Mono, monospace", textTransform: "uppercase", color: P.brass, marginBottom: 8, fontWeight: 600 }}>
            Cash Horizon: <span style={{ color: P.ink, fontWeight: 700 }}>{horizonYears} Years</span>
          </label>
          <input
            type="range"
            min="0"
            max="3"
            step="1"
            value={horizonIdx}
            onChange={(e) => updateScenarioOption("horizonIdx", e.target.value)}
            style={{ width: "100%" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: P.slate, marginTop: 4, fontFamily: "IBM Plex Mono, monospace" }}>
            <span>3 yrs</span>
            <span>5 yrs</span>
            <span>7 yrs</span>
            <span>10 yrs</span>
          </div>
        </div>

        {/* Global Preset Control */}
        <div>
          <label style={{ display: "block", fontSize: 11, fontFamily: "IBM Plex Mono, monospace", textTransform: "uppercase", color: P.brass, marginBottom: 8, fontWeight: 600 }}>
            Global Burn Preset
          </label>
          <div style={{ display: "flex", gap: 6 }}>
            {["Low", "Medium", "High", "Extreme"].map((level, idx) => (
              <button
                key={level}
                type="button"
                onClick={() => applyGlobalBurnPreset(idx)}
                style={{
                  flex: 1,
                  padding: "6px 4px",
                  fontSize: 10,
                  fontFamily: "IBM Plex Mono, monospace",
                  fontWeight: 600,
                  border: `1px solid ${P.line}`,
                  background: COMPANY_IDS.every((companyId) => getCompanyBurnIdx(companyId) === idx) ? P.ink : P.card,
                  color: COMPANY_IDS.every((companyId) => getCompanyBurnIdx(companyId) === idx) ? P.paper : P.ink,
                  cursor: "pointer",
                  borderRadius: 2,
                  transition: "all 0.12s",
                }}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="runway-summary-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: P.line, border: `1px solid ${P.line}`, marginBottom: 28 }}>
        <KpiCard
          label="Gross Margin Assumption"
          value={`${Math.round(grossMargin * 100)}%`}
          sub="ARR gross profit available to offset cash burn"
          color={P.sage}
        />
        <KpiCard
          label="Sierra Gross Burn"
          value={fmtMonthlyBurn(sierraRow.monthlyGrossBurnM)}
          sub={`Selected level: ${sierraRow.level}`}
          color={P.brass}
        />
        <KpiCard
          label="Sierra ARR Gross Profit"
          value={fmtMonthlyBurn(sierraRow.monthlyGrossProfitM)}
          sub={`${fmtM(sierraRow.company.arrM)} ARR × ${Math.round(grossMargin * 100)}% ÷ 12`}
          color={ACCENT.sierra}
        />
        <KpiCard
          label="Sierra Breakeven ARR"
          value={fmtM(sierraRow.breakevenArrM)}
          sub="for selected burn case"
          color={P.rust}
        />
      </div>

      <section style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <h2 className="fr" style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Scenario Matrix</h2>
          <span className="mono" style={{ fontSize: 11, color: P.slate }}>net burn = gross burn - ARR × {Math.round(grossMargin * 100)}% ÷ 12</span>
        </div>
        <div style={{ border: `1px solid ${P.line}`, background: P.card, overflow: "hidden" }}>
          <table className="scenario-matrix-table" style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: 11.5 }}>
            <colgroup>
              <col style={{ width: "10%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "11%" }} />
            </colgroup>
            <thead>
              <tr style={{ borderBottom: `2px solid ${P.ink}` }}>
                {["Company", "Scenario", "Gross burn", "ARR GP / mo", "Net burn", "Runway", "Breakeven ARR", "More ARR needed", `${horizonYears}y cash position`].map(label => (
                  <th key={label} className="mono" style={{ padding: "10px 8px", textAlign: label === "Company" ? "left" : "right", fontSize: 8.5, lineHeight: 1.25, letterSpacing: "0.06em", textTransform: "uppercase", color: P.slate, fontWeight: 600, whiteSpace: "normal", overflowWrap: "anywhere" }}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const runwayColour = row.netMonthlyBurnM <= 0 ? P.sage : runwayColor(row.runwayMonths);
                const fiveYearColour = row.fiveYearCashPositionM >= 0 ? P.sage : P.rust;
                const setBurnIdx = getCompanySetBurnIdx(row.company.id);
                return (
                  <tr key={row.company.id} style={{ borderTop: `1px solid ${P.line}`, background: P.card }} className="hover-row">
                    <td data-label="Company" style={{ padding: "10px 8px", textAlign: "left", fontWeight: 700, color: ACCENT[row.company.id], whiteSpace: "nowrap" }}>{row.company.name}</td>
                    <td data-label="Scenario" style={{ padding: "10px 8px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                          <span className="mono" style={{ fontSize: 11, color: scenarioLevelColor(row.level), fontWeight: 700 }}>
                            {row.level}
                          </span>
                          <span className="mono" style={{ fontSize: 10, color: P.slate }}>
                            Step {row.burnIdx + 1}/4
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="3"
                          step="1"
                          value={row.burnIdx}
                          onChange={(e) => setBurnIdx(parseInt(e.target.value))}
                          style={{
                            width: "100%",
                            height: 6,
                            borderRadius: 3,
                            background: P.line,
                            outline: "none",
                            accentColor: ACCENT[row.company.id],
                            cursor: "pointer",
                          }}
                        />
                      </div>
                    </td>
                    <td data-label="Gross burn" className="mono" style={{ padding: "10px 8px", textAlign: "right", fontWeight: 700, whiteSpace: "nowrap" }}>{fmtMonthlyBurn(row.monthlyGrossBurnM)}</td>
                    <td data-label="ARR GP / mo" className="mono" style={{ padding: "10px 8px", textAlign: "right", whiteSpace: "nowrap" }}>{fmtMonthlyBurn(row.monthlyGrossProfitM)}</td>
                    <td data-label="Net burn" className="mono" style={{ padding: "10px 8px", textAlign: "right", color: row.netMonthlyBurnM > 0 ? P.rust : P.sage, fontWeight: 700, whiteSpace: "nowrap" }}>
                      {fmtMonthlyBurn(row.netMonthlyBurnM)}
                    </td>
                    <td data-label="Runway" className="mono" style={{ padding: "10px 8px", textAlign: "right", color: runwayColour, fontWeight: 700, whiteSpace: "nowrap" }}>{scenarioRunwayLabel(row.runwayMonths)}</td>
                    <td data-label="Breakeven ARR" className="mono" style={{ padding: "10px 8px", textAlign: "right", whiteSpace: "nowrap" }}>{fmtM(row.breakevenArrM)}</td>
                    <td data-label="More ARR needed" className="mono" style={{ padding: "10px 8px", textAlign: "right", color: row.additionalArrM > 0 ? P.rust : P.sage, fontWeight: 700, whiteSpace: "nowrap" }}>{fmtM(row.additionalArrM)}</td>
                    <td data-label={`${horizonYears}y cash position`} className="mono" style={{ padding: "10px 8px", textAlign: "right", color: fiveYearColour, fontWeight: 700, whiteSpace: "nowrap" }}>{fmtSignedM(row.fiveYearCashPositionM)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ padding: "10px 14px", borderTop: `1px solid ${P.line}`, background: P.paper, color: P.slate, fontSize: 11.5, lineHeight: 1.5 }}>
            {horizonYears}-year cash position = estimated cash on hand + {horizonYears} years of current ARR gross profit - {horizonYears} years of gross burn (adjusted for ARR growth rate of {Math.round(growthRate * 100)}%).
            Positive values mean current cash plus durable growing ARR covers the burn case for {horizonYears} years; negative values indicate the funding or ARR gap.
          </div>
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 className="fr" style={{ fontSize: 22, fontWeight: 500, margin: "0 0 14px" }}>Company Burn Cases</h2>
        <div className="scenario-card-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          {rows.map(row => {
            const company = row.company;
            const setBurnIdx = getCompanySetBurnIdx(company.id);
            return (
              <div key={company.id} style={{ border: `1px solid ${P.line}`, background: P.card, padding: "18px 18px 20px" }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                  <h3 className="fr" style={{ margin: 0, fontSize: 24, fontWeight: 500, color: ACCENT[company.id] }}>{company.name}</h3>
                  <span className="mono" style={{ fontSize: 11, color: P.slate }}>{fmtM(company.arrM)} ARR</span>
                </div>
                <p style={{ margin: "0 0 14px", color: P.slate, fontSize: 12.5, lineHeight: 1.5 }}>
                  {RUNWAY_BURN_CASES[company.id].anchor}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ borderTop: `1px solid ${P.line}`, paddingTop: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8, alignItems: "baseline" }}>
                      <span className="mono" style={{ fontSize: 11, color: scenarioLevelColor(row.level), fontWeight: 700 }}>
                        {row.level} burn case
                      </span>
                      <span className="mono" style={{ fontSize: 12, fontWeight: 700 }}>
                        {fmtMonthlyBurn(row.monthlyGrossBurnM)} gross
                      </span>
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <input
                        type="range"
                        min="0"
                        max="3"
                        step="1"
                        value={row.burnIdx}
                        onChange={(e) => setBurnIdx(parseInt(e.target.value))}
                        style={{
                          width: "100%",
                          height: 6,
                          borderRadius: 3,
                          background: P.line,
                          outline: "none",
                          accentColor: ACCENT[company.id],
                          cursor: "pointer",
                        }}
                      />
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: P.slate, marginTop: 4, fontFamily: "IBM Plex Mono, monospace" }}>
                        <span>Low</span>
                        <span>Medium</span>
                        <span>High</span>
                        <span>Extreme</span>
                      </div>
                    </div>

                    <div style={{ height: 8, background: P.line, borderRadius: 4, overflow: "hidden", marginBottom: 12 }}>
                      <div style={{ width: `${Math.min(row.breakevenArrM / maxBreakevenArr * 100, 100)}%`, height: "100%", background: scenarioLevelColor(row.level), borderRadius: 4, transition: "width 0.3s ease" }} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, fontSize: 12 }}>
                      <div>
                        <div className="mono" style={{ fontSize: 9.5, color: P.slate, textTransform: "uppercase", marginBottom: 3 }}>ARR coverage</div>
                        <strong className="mono">{fmtPct(row.offsetPct)}</strong>
                      </div>
                      <div>
                        <div className="mono" style={{ fontSize: 9.5, color: P.slate, textTransform: "uppercase", marginBottom: 3 }}>Breakeven ARR</div>
                        <strong className="mono">{fmtM(row.breakevenArrM)}</strong>
                      </div>
                      <div>
                        <div className="mono" style={{ fontSize: 9.5, color: P.slate, textTransform: "uppercase", marginBottom: 3 }}>Runway</div>
                        <strong className="mono" style={{ color: row.netMonthlyBurnM <= 0 ? P.sage : runwayColor(row.runwayMonths) }}>
                          {scenarioRunwayLabel(row.runwayMonths)}
                        </strong>
                      </div>
                    </div>
                    <p style={{ margin: "12px 0 0", fontSize: 11.5, color: P.slate, lineHeight: 1.45 }}>{row.note}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section style={{ border: `1px solid ${P.line}`, background: P.paper, padding: "16px 18px", marginBottom: 32 }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: P.brass, marginBottom: 8 }}>
          Reading the model
        </div>
        <p style={{ margin: 0, color: P.slate, fontSize: 13, lineHeight: 1.6 }}>
          A high gross burn rate can still produce moderate net burn if ARR is already large and durable. In Sierra's case,
          {` ${fmtM(sierraRow.company.arrM)} ARR`} produces {` ${fmtMonthlyBurn(sierraRow.monthlyGrossProfitM)} `}
          of monthly gross profit at {Math.round(grossMargin * 100)}% margin against {` ${fmtMonthlyBurn(sierraRow.monthlyGrossBurnM)} `}
          of gross burn, leaving {` ${fmtMonthlyBurn(sierraRow.netMonthlyBurnM)} `} of net monthly cash burn.
          The strategic question is therefore not only runway, but whether current ARR quality and retention justify treating that gross profit as a {horizonYears}-year funding source.
        </p>
      </section>
    </>
  );
}

function RunwayBar({ months, maxMonths }) {
  const pct = Math.min(months / maxMonths * 100, 100);
  const color = runwayColor(months);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ flex: 1, height: 10, background: P.line, borderRadius: 5, overflow: "hidden" }}>
        <div
          style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 5, transition: "width 0.35s ease" }}
        />
      </div>
      <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 12, color, minWidth: 62, textAlign: "right", fontWeight: 600 }}>
        {runwayLabel(months)}
      </div>
    </div>
  );
}

function ArrBar({ arr, maxArr, color }) {
  const pct = (arr / maxArr * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ flex: 1, height: 8, background: P.line, borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.35s ease" }} />
      </div>
      <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 13, fontWeight: 600, color: P.ink, minWidth: 56, textAlign: "right" }}>
        {fmtM(arr)}
      </div>
    </div>
  );
}

function BurnMethodNote({ open, toggle }) {
  return (
    <div style={{ border: `1px solid ${P.line}`, marginBottom: 24 }}>
      <div
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }}
        style={{ display: "flex", justifyContent: "space-between", padding: "13px 16px", cursor: "pointer", background: P.card, alignItems: "center" }}
      >
        <span style={{ fontSize: 13, fontWeight: 600 }}>
          <span style={{ fontFamily: "IBM Plex Mono, monospace", color: P.brass }}>⁽¹⁾⁽²⁾</span>
          &nbsp;Burn Rate &amp; Runway Estimation Methodology
        </span>
        <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11, color: P.slate }}>{open ? "close −" : "expand +"}</span>
      </div>
      {open && (
        <div style={{ padding: "16px 18px 18px", background: P.paper, fontSize: 13, lineHeight: 1.65, color: P.ink, borderTop: `1px solid ${P.line}` }}>
          <p style={{ margin: "0 0 12px", fontWeight: 600, color: P.rust }}>
            ⚠ None of these companies publicly disclose burn rates, cash balances, or runway.
          </p>
          <p style={{ margin: "0 0 10px" }}>Estimates are derived from available public data using the following methodology:</p>
          <ul style={{ margin: "0 0 12px", paddingLeft: 20 }}>
            <li style={{ marginBottom: 6 }}>
              <strong>Gross monthly opex</strong> = headcount × $20–25K (fully-loaded: salary, benefits, equity) + AI infrastructure &amp; cloud compute costs (estimated separately per company scale)
            </li>
            <li style={{ marginBottom: 6 }}>
              <strong>Net burn ⁽¹⁾</strong> = Gross opex − monthly revenue (ARR ÷ 12). Revenue partially offsets operating costs; more mature ARR bases (Parloa, PolyAI) carry lower net burn relative to gross.
            </li>
            <li style={{ marginBottom: 6 }}>
              <strong>Cash on hand</strong> = Most recent round size − (months elapsed since close × est. net burn)
            </li>
            <li>
              <strong>Runway ⁽²⁾</strong> = Cash on hand ÷ net monthly burn, measured from June 2026
            </li>
          </ul>
          <p style={{ margin: 0, color: P.slate, fontSize: 12.5 }}>
            Actual figures depend on gross margin, infrastructure spend, headcount growth trajectory, and sales efficiency — all non-public.
            These estimates are directional indicators only. Treat with appropriate scepticism.
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function ConversationalAIFunding({ initialSettings = DEFAULT_SETTINGS, onSettingsChange } = {}) {
  const normalizedInitialSettings = normalizeSettings(initialSettings);
  const [view, setViewState] = useState(normalizedInitialSettings.view);
  const [selected, setSelectedState] = useState(normalizedInitialSettings.selected);
  const [runwayScenario, setRunwayScenarioState] = useState(normalizedInitialSettings.runwayScenario);
  const [openRound, setOpenRound] = useState(null);
  const [burnOpen, setBurnOpen] = useState(false);

  const company = COMPANIES.find(c => c.id === selected);
  const maxArr = Math.max(...COMPANIES.map(c => c.arrM));
  const maxRunway = Math.max(...COMPANIES.map(c => c.estRunwayMonths));

  const efficiencyRows = useMemo(() =>
    COMPANIES.map(c => ({
      ...c,
      arrPerCent: (c.arrM / c.totalRaisedM * 100).toFixed(1),
      valArrMult: valArrMult(c),
      raisedPct: (c.totalRaisedM / c.latestValuationM * 100).toFixed(1),
    })),
    []);

  const publishSettings = (nextSettings) => {
    if (typeof onSettingsChange === "function") {
      onSettingsChange(normalizeSettings(nextSettings));
    }
  };

  const setView = (nextView) => {
    const safeView = VIEW_KEYS.includes(nextView) ? nextView : DEFAULT_SETTINGS.view;
    setViewState(safeView);
    publishSettings({
      view: safeView,
      selected,
      runwayScenario,
    });
  };

  const setSelected = (nextSelected) => {
    const safeSelected = COMPANY_IDS.includes(nextSelected)
      ? nextSelected
      : DEFAULT_SETTINGS.selected;
    setSelectedState(safeSelected);
    publishSettings({
      view,
      selected: safeSelected,
      runwayScenario,
    });
  };

  const setRunwayScenario = (nextRunwayScenario) => {
    const normalizedRunwayScenario = normalizeRunwayScenario(nextRunwayScenario);
    setRunwayScenarioState(normalizedRunwayScenario);
    publishSettings({
      view,
      selected,
      runwayScenario: normalizedRunwayScenario,
    });
  };

  const tableRows = [
    { key: "Founded", vals: COMPANIES.map(c => c.founded.toString()), mono: true },
    { key: "HQ", vals: COMPANIES.map(c => c.hq), mono: false },
    { key: "Total Raised", vals: COMPANIES.map(c => fmtM(c.totalRaisedM)), mono: true },
    { key: "Latest Valuation", vals: COMPANIES.map(c => fmtM(c.latestValuationM)), mono: true, bold: true },
    { key: "Valuation Date", vals: COMPANIES.map(c => c.valuationDate), mono: false },
    { key: "Reported ARR", vals: COMPANIES.map(c => fmtM(c.arrM) + (c.arrStatus === "projected" ? "*" : "")), mono: true },
    { key: "ARR Period", vals: COMPANIES.map(c => c.arrDate), mono: false },
    { key: "Val / ARR Multiple", vals: COMPANIES.map(c => `${valArrMult(c)}×`), mono: true },
    { key: "Employees (est.)", vals: COMPANIES.map(c => `~${c.employees.toLocaleString()}`), mono: true },
    { key: "Est. Net Burn ⁽¹⁾", vals: COMPANIES.map(c => fmtBurn(c.estNetBurnM)), mono: true },
    { key: "Est. Cash on Hand", vals: COMPANIES.map(c => fmtM(c.estCashOnHandM)), mono: true },
    { key: "Est. Runway ⁽²⁾", vals: COMPANIES.map(c => runwayLabel(c.estRunwayMonths)), mono: true, runway: true },
    { key: "PDF Revenue Benchmark", vals: COMPANIES.map(c => fmtM(c.pdfSnapshot.revenueM)), mono: true },
    { key: "PDF Funding Benchmark", vals: COMPANIES.map(c => fmtM(c.pdfSnapshot.fundingM)), mono: true },
    { key: "PDF Valuation Benchmark", vals: COMPANIES.map(c => fmtM(c.pdfSnapshot.valuationM)), mono: true },
  ];

  return (
    <div style={{ background: P.paper, minHeight: "100vh", color: P.ink, fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        .fr  { font-family: 'Fraunces', Georgia, serif; }
        .mono { font-family: 'IBM Plex Mono', monospace; }
        .hover-row { transition: background .12s; }
        .hover-row:hover { background: ${P.paper} !important; }
        a { color: ${P.sage}; text-decoration: none; border-bottom: 1px solid ${P.line}; }
        a:hover { color: ${P.ink}; border-color: ${P.brass}; }
        button { font-family: inherit; }
        :focus-visible { outline: 2px solid ${P.brass}; outline-offset: 2px; }
        .scenario-matrix-table td,
        .scenario-matrix-table th {
          vertical-align: middle;
        }
        .scenario-matrix-table input[type="range"] {
          min-width: 0;
        }
        @media (max-width: 880px) {
          .scenario-matrix-table {
            display: block;
            font-size: 12px !important;
          }
          .scenario-matrix-table colgroup,
          .scenario-matrix-table thead {
            display: none;
          }
          .scenario-matrix-table tbody {
            display: grid;
            gap: 12px;
            padding: 12px;
          }
          .scenario-matrix-table tr {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0;
            border: 1px solid ${P.line} !important;
            background: ${P.card} !important;
          }
          .scenario-matrix-table td {
            display: flex;
            min-width: 0;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 9px 10px !important;
            border-top: 1px solid ${P.line};
            text-align: right !important;
          }
          .scenario-matrix-table td:nth-child(1),
          .scenario-matrix-table td:nth-child(2) {
            grid-column: 1 / -1;
          }
          .scenario-matrix-table td:nth-child(1) {
            border-top: none;
            font-size: 14px;
          }
          .scenario-matrix-table td::before {
            content: attr(data-label);
            flex: 0 1 auto;
            color: ${P.slate};
            font-family: 'IBM Plex Mono', monospace;
            font-size: 9px;
            font-weight: 500;
            letter-spacing: 0.06em;
            line-height: 1.2;
            text-align: left;
            text-transform: uppercase;
          }
          .scenario-matrix-table td:nth-child(2) {
            display: block;
            text-align: left !important;
          }
          .scenario-matrix-table td:nth-child(2)::before {
            display: block;
            margin-bottom: 6px;
          }
        }
        @media (max-width: 520px) {
          .scenario-matrix-table tbody {
            padding: 10px;
          }
          .scenario-matrix-table tr {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 680px) {
          .hero-grid { grid-template-columns: 1fr 1fr !important; }
          .kpi-grid  { grid-template-columns: 1fr 1fr !important; }
          .eff-grid  { grid-template-columns: 1fr 1fr !important; }
          .runway-summary-grid { grid-template-columns: 1fr 1fr !important; }
          .scenario-card-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 440px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .kpi-grid  { grid-template-columns: 1fr !important; }
          .eff-grid  { grid-template-columns: 1fr !important; }
          .runway-summary-grid { grid-template-columns: 1fr !important; }
        }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          background: ${P.line};
          height: 6px;
          border-radius: 3px;
          outline: none;
          transition: background 0.15s ease;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: ${P.brass};
          cursor: pointer;
          border: 2px solid ${P.card};
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
          transition: transform 0.1s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: ${P.brass};
          cursor: pointer;
          border: 2px solid ${P.card};
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
          transition: transform 0.1s ease;
        }
        input[type="range"]::-moz-range-thumb:hover {
          transform: scale(1.2);
        }
      `}</style>

      <div style={{ maxWidth: 1020, margin: "0 auto", padding: "clamp(24px,5vw,56px) clamp(18px,4vw,32px)" }}>

        {/* ── HEADER ───────────────────────────────────────────────────── */}
        <header style={{ borderBottom: `2px solid ${P.ink}`, paddingBottom: 22, marginBottom: 32 }}>
          <div
            className="mono"
            style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: P.brass, marginBottom: 12 }}
          >
            Conversational AI · Funding, Market Context &amp; Diligence Tracker · June 2026
          </div>
          <h1 className="fr" style={{ fontSize: 38, lineHeight: 1.05, fontWeight: 500, margin: "0 0 14px" }}>
            Sierra · Decagon · Parloa · PolyAI
          </h1>
          <p style={{ maxWidth: 680, color: P.slate, lineHeight: 1.55, fontSize: 15, margin: 0 }}>
            Capital raised, private valuations, reported ARR, and estimated burn rates &amp; runway for four
            enterprise conversational AI platforms, now cross-referenced against the CX-AI Landscape PDF.
            Burn and runway figures remain analyst estimates because these companies do not disclose financial statements publicly.
          </p>
        </header>

        {/* ── CONTROLS ─────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 14, marginBottom: 28 }}>
          <div style={{ display: "inline-flex", border: `1px solid ${P.ink}`, borderRadius: 2, overflow: "hidden" }}>
            <ViewSeg active={view === "compare"} onClick={() => setView("compare")}>Side-by-Side</ViewSeg>
            <ViewSeg active={view === "runway"} onClick={() => setView("runway")}>Runway Scenarios</ViewSeg>
            <ViewSeg active={view === "detail"} onClick={() => setView("detail")}>Company Detail</ViewSeg>
          </div>
          {view === "detail" && (
            <div style={{ display: "inline-flex", border: `1px solid ${P.line}`, borderRadius: 2, overflow: "hidden", gap: 1, background: P.line }}>
              {COMPANIES.map(c => (
                <CompanySeg key={c.id} c={c} active={selected === c.id} onClick={() => { setSelected(c.id); setOpenRound(null); }} />
              ))}
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* COMPARE VIEW                                                   */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {view === "compare" && (
          <>
            {/* Hero valuation tiles */}
            <div
              className="hero-grid"
              style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: P.line, border: `1px solid ${P.line}`, marginBottom: 32 }}
            >
              {COMPANIES.map(c => (
                <div key={c.id} style={{ background: P.card, padding: "18px 16px 20px" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: ACCENT[c.id], marginBottom: 10 }} />
                  <div className="fr" style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: P.slate, lineHeight: 1.4, marginBottom: 16, minHeight: 32 }}>{c.tagline}</div>
                  <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: ACCENT[c.id], lineHeight: 1 }}>
                    {fmtM(c.latestValuationM)}
                  </div>
                  <div className="mono" style={{ fontSize: 10, color: P.slate, marginTop: 4 }}>valuation · {c.valuationDate}</div>
                </div>
              ))}
            </div>

            {/* Full comparison table */}
            <div style={{ border: `1px solid ${P.line}`, background: P.card, marginBottom: 32, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${P.ink}` }}>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontFamily: "IBM Plex Mono, monospace", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: P.slate, fontWeight: 500 }}>
                      Metric
                    </th>
                    {COMPANIES.map(c => (
                      <th key={c.id} style={{ padding: "12px 16px", textAlign: "right", fontFamily: "IBM Plex Mono, monospace", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: ACCENT[c.id], fontWeight: 700 }}>
                        {c.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row, i) => (
                    <tr key={row.key} style={{ borderTop: `1px solid ${P.line}`, background: i % 2 === 0 ? P.card : P.paper }}>
                      <td style={{ padding: "11px 16px", color: P.slate, fontFamily: "IBM Plex Mono, monospace", fontSize: 11, whiteSpace: "nowrap" }}>
                        {row.key}
                      </td>
                      {COMPANIES.map((c, ci) => (
                        <td key={c.id} style={{
                          padding: "11px 16px",
                          textAlign: "right",
                          fontFamily: row.mono ? "IBM Plex Mono, monospace" : "inherit",
                          fontWeight: row.bold ? 700 : row.runway ? 600 : 400,
                          color: row.runway ? runwayColor(c.estRunwayMonths) : P.ink,
                          whiteSpace: "nowrap",
                        }}>
                          {row.vals[ci]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding: "8px 16px", borderTop: `1px solid ${P.line}`, background: P.paper }}>
                <span style={{ fontSize: 11.5, color: P.slate }}>* Projected ARR figure, not company-confirmed. ⁽¹⁾⁽²⁾ See burn methodology note below.</span>
              </div>
            </div>

            {/* ARR comparison bars */}
            <section style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
                <h2 className="fr" style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>ARR Comparison</h2>
                <span className="mono" style={{ fontSize: 11, color: P.slate }}>reported or projected · June 2026</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[...COMPANIES].sort((a, b) => b.arrM - a.arrM).map(c => (
                  <div key={c.id} style={{ display: "grid", gridTemplateColumns: "90px 1fr", alignItems: "center", gap: 14 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: ACCENT[c.id] }}>{c.name}</div>
                    <ArrBar arr={c.arrM} maxArr={maxArr} color={ACCENT[c.id]} />
                  </div>
                ))}
              </div>
            </section>

            {/* Runway visualization */}
            <section style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
                <h2 className="fr" style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Estimated Runway</h2>
                <span className="mono" style={{ fontSize: 11, color: P.slate }}>from June 2026 · est. only</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[...COMPANIES].sort((a, b) => b.estRunwayMonths - a.estRunwayMonths).map(c => (
                  <div key={c.id} style={{ display: "grid", gridTemplateColumns: "90px 1fr", alignItems: "center", gap: 14 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                    <RunwayBar months={c.estRunwayMonths} maxMonths={maxRunway + 18} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: P.slate, display: "flex", gap: 16, flexWrap: "wrap" }}>
                <span><span style={{ color: P.sage, fontWeight: 700 }}>■</span> 30+ months</span>
                <span><span style={{ color: P.amber, fontWeight: 700 }}>■</span> 18–30 months</span>
                <span><span style={{ color: P.rust, fontWeight: 700 }}>■</span> &lt;18 months</span>
              </div>
            </section>

            {/* Capital efficiency */}
            <section style={{ marginBottom: 32 }}>
              <h2 className="fr" style={{ fontSize: 22, fontWeight: 500, margin: "0 0 6px" }}>Capital Efficiency</h2>
              <p style={{ fontSize: 13, color: P.slate, margin: "0 0 16px" }}>
                How much ARR each company generates per dollar of capital raised, and their revenue multiple
              </p>
              <div
                className="eff-grid"
                style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}
              >
                {efficiencyRows.map(c => (
                  <div key={c.id} style={{ background: P.card, border: `1px solid ${P.line}`, padding: "16px 16px 18px" }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: ACCENT[c.id], marginBottom: 14 }}>{c.name}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${P.line}` }}>
                      <span style={{ fontSize: 12, color: P.slate }}>ARR per $1 raised</span>
                      <span className="mono" style={{ fontSize: 13, fontWeight: 700 }}>{c.arrPerCent}¢</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${P.line}` }}>
                      <span style={{ fontSize: 12, color: P.slate }}>Val / ARR multiple</span>
                      <span className="mono" style={{ fontSize: 13, fontWeight: 700 }}>{c.valArrMult}×</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, color: P.slate }}>Raised / valuation</span>
                      <span className="mono" style={{ fontSize: 13, fontWeight: 700 }}>{c.raisedPct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <BurnMethodNote open={burnOpen} toggle={() => setBurnOpen(o => !o)} />
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* RUNWAY SCENARIOS                                               */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {view === "runway" && (
          <RunwayScenarioView
            scenarioSettings={runwayScenario}
            onScenarioChange={setRunwayScenario}
          />
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* DETAIL VIEW                                                    */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {view === "detail" && company && (
          <>
            {/* Company header */}
            <div style={{ borderBottom: `1px solid ${P.line}`, paddingBottom: 20, marginBottom: 28 }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: ACCENT[company.id] }} />
                    <h2 className="fr" style={{ fontSize: 34, fontWeight: 500, margin: 0 }}>{company.name}</h2>
                    <span
                      className="mono"
                      style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: P.slate, border: `1px solid ${P.line}`, padding: "3px 8px", borderRadius: 2 }}
                    >
                      {company.website}
                    </span>
                  </div>
                  <p style={{ fontSize: 14, color: P.slate, margin: "8px 0 0", lineHeight: 1.45 }}>{company.tagline}</p>
                </div>
                <div className="mono" style={{ fontSize: 11, color: P.slate, lineHeight: 1.9, textAlign: "right" }}>
                  <div>Founded {company.founded}</div>
                  <div>{company.hq}</div>
                  <div>~{company.employees.toLocaleString()} employees</div>
                </div>
              </div>
              <div style={{ marginTop: 16, padding: "10px 16px", background: P.ink, color: P.paper, borderRadius: 2, fontSize: 13, lineHeight: 1.5 }}>
                <span className="mono" style={{ color: P.brass, marginRight: 8, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>Headline:</span>
                {company.headline}
              </div>
            </div>

            <section style={{ border: `1px solid ${P.line}`, background: P.card, padding: "16px 18px 18px", marginBottom: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 12 }}>
                <div>
                  <div className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: P.brass, marginBottom: 6 }}>
                    PDF-backed benchmark
                  </div>
                  <div className="fr" style={{ fontSize: 22, lineHeight: 1.15, fontWeight: 500 }}>{company.pdfSnapshot.thesis}</div>
                </div>
                <span className="mono" style={{ fontSize: 11, color: P.slate, alignSelf: "flex-start" }}>{company.pdfSnapshot.source}</span>
              </div>
              <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: P.line, border: `1px solid ${P.line}`, marginBottom: 12 }}>
                <KpiCard label="PDF Revenue" value={fmtM(company.pdfSnapshot.revenueM)} sub="2025 estimate in PDF" color={ACCENT[company.id]} />
                <KpiCard label="PDF Funding" value={fmtM(company.pdfSnapshot.fundingM)} sub="PDF benchmark" />
                <KpiCard label="PDF Valuation" value={fmtM(company.pdfSnapshot.valuationM)} sub="latest PDF valuation" />
                <KpiCard label="PDF FTEs" value={company.pdfSnapshot.employees} sub="estimated team size" />
              </div>
              <p style={{ margin: 0, fontSize: 12.5, color: P.slate, lineHeight: 1.55 }}>
                {company.pdfSnapshot.caveat}
              </p>
            </section>

            {/* KPI grid */}
            <div
              className="kpi-grid"
              style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: P.line, border: `1px solid ${P.line}`, marginBottom: 32 }}
            >
              <KpiCard
                label="Total Capital Raised"
                value={fmtM(company.totalRaisedM)}
                sub={`${company.rounds.length} rounds · ${company.rounds[0].date} – ${company.rounds[company.rounds.length - 1].date}`}
              />
              <KpiCard
                label="Latest Valuation"
                value={fmtM(company.latestValuationM)}
                sub={company.valuationDate}
                color={ACCENT[company.id]}
              />
              <KpiCard
                label="Reported ARR"
                value={fmtM(company.arrM)}
                sub={`${company.arrDate} · ${company.arrStatus}`}
              />
              <KpiCard
                label="Val / ARR Multiple"
                value={`${valArrMult(company)}×`}
                sub="implied revenue multiple on latest valuation"
              />
              <KpiCard
                label="Est. Net Burn ⁽¹⁾"
                value={fmtBurn(company.estNetBurnM)}
                sub={`${company.burnConfidence} · not publicly disclosed`}
                color={P.brass}
              />
              <KpiCard
                label="Est. Runway ⁽²⁾"
                value={runwayLabel(company.estRunwayMonths)}
                sub={`from June 2026 · est. cash on hand ${fmtM(company.estCashOnHandM)}`}
                color={runwayColor(company.estRunwayMonths)}
              />
            </div>

            {/* Funding rounds */}
            <section style={{ marginBottom: 32 }}>
              <h2 className="fr" style={{ fontSize: 22, fontWeight: 500, margin: "0 0 14px" }}>Funding History</h2>
              <div style={{ border: `1px solid ${P.line}`, background: P.card }}>
                {company.rounds.map((round, i) => {
                  const key = `${company.id}-${round.label}-${round.date}`;
                  const isOpen = openRound === key;
                  return (
                    <div key={key} style={{ borderTop: i === 0 ? "none" : `1px solid ${P.line}` }}>
                      <div
                        className="hover-row"
                        role="button"
                        tabIndex={0}
                        aria-expanded={isOpen}
                        onClick={() => setOpenRound(isOpen ? null : key)}
                        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpenRound(isOpen ? null : key); } }}
                        style={{ display: "grid", gridTemplateColumns: "100px 1fr auto auto", gap: 14, padding: "15px 18px", cursor: "pointer", alignItems: "center", background: P.card }}
                      >
                        <span
                          className="mono"
                          style={{ fontSize: 10, background: ACCENT[company.id], color: "#fff", padding: "4px 8px", borderRadius: 2, textAlign: "center", letterSpacing: "0.05em" }}
                        >
                          {round.label}
                        </span>
                        <span style={{ fontSize: 13, color: P.slate }}>{round.date}</span>
                        <span className="mono" style={{ fontSize: 18, fontWeight: 700 }}>{fmtM(round.amount)}</span>
                        <span className="mono" style={{ fontSize: 11, color: P.slate, minWidth: 20, textAlign: "right" }}>{isOpen ? "−" : "+"}</span>
                      </div>
                      {isOpen && (
                        <div style={{ padding: "6px 18px 18px", background: P.paper, borderTop: `1px solid ${P.line}` }}>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginTop: 10 }}>
                            <div>
                              <div className="mono" style={{ fontSize: 10, color: P.slate, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Amount Raised</div>
                              <div className="mono" style={{ fontWeight: 700, fontSize: 16 }}>{fmtM(round.amount)}</div>
                            </div>
                            <div>
                              <div className="mono" style={{ fontSize: 10, color: P.slate, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Post-Money Valuation</div>
                              <div className="mono" style={{ fontWeight: 700, fontSize: 16 }}>{round.postValM ? fmtM(round.postValM) : "Not disclosed"}</div>
                            </div>
                            <div>
                              <div className="mono" style={{ fontSize: 10, color: P.slate, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Lead Investor(s)</div>
                              <div style={{ fontSize: 14, fontWeight: 500 }}>{round.lead || "Not disclosed"}</div>
                            </div>
                            {round.postValM && i > 0 && company.rounds[i - 1].postValM && (
                              <div>
                                <div className="mono" style={{ fontSize: 10, color: P.slate, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Valuation Step-up</div>
                                <div className="mono" style={{ fontWeight: 700, fontSize: 16, color: P.sage }}>
                                  {(round.postValM / company.rounds[i - 1].postValM).toFixed(1)}×
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Total row */}
                <div style={{ borderTop: `2px solid ${P.ink}`, padding: "14px 18px", display: "grid", gridTemplateColumns: "100px 1fr auto auto", gap: 14, background: P.ink, color: P.paper, alignItems: "center" }}>
                  <span className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: P.brass }}>Total</span>
                  <span style={{ fontSize: 13, color: "#B9C2BB" }}>{company.rounds.length} rounds</span>
                  <span className="mono" style={{ fontSize: 22, fontWeight: 700 }}>{fmtM(company.totalRaisedM)}</span>
                  <span />
                </div>
              </div>
            </section>

            {/* ARR progression */}
            {company.arrHistory.length >= 2 && (
              <section style={{ marginBottom: 32 }}>
                <h2 className="fr" style={{ fontSize: 22, fontWeight: 500, margin: "0 0 14px" }}>ARR Progression</h2>
                <div style={{ border: `1px solid ${P.line}`, background: P.card, padding: "20px 20px 22px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {company.arrHistory.map((pt, i) => {
                      const maxPt = company.arrHistory[company.arrHistory.length - 1].arrM;
                      return (
                        <div key={`${company.id}-${pt.period}`} style={{ display: "grid", gridTemplateColumns: "100px 1fr 64px", alignItems: "center", gap: 14 }}>
                          <span className="mono" style={{ fontSize: 11, color: P.slate }}>{pt.period}</span>
                          <div style={{ height: 8, background: P.line, borderRadius: 4, overflow: "hidden" }}>
                            <div style={{
                              width: `${pt.arrM / maxPt * 100}%`,
                              height: "100%",
                              background: ACCENT[company.id],
                              borderRadius: 4,
                              transition: "width 0.4s ease",
                              opacity: 0.6 + (i / (company.arrHistory.length - 1)) * 0.4,
                            }} />
                          </div>
                          <span className="mono" style={{ fontSize: 13, fontWeight: 700, textAlign: "right" }}>{fmtM(pt.arrM)}</span>
                        </div>
                      );
                    })}
                  </div>
                  {company.arrHistory.length >= 2 && (
                    <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${P.line}`, display: "flex", gap: 28, flexWrap: "wrap" }}>
                      <div>
                        <div className="mono" style={{ fontSize: 10, color: P.slate, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>ARR Growth</div>
                        <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: P.sage }}>
                          {(company.arrHistory[company.arrHistory.length - 1].arrM / company.arrHistory[0].arrM).toFixed(1)}×
                        </div>
                        <div style={{ fontSize: 12, color: P.slate }}>
                          {company.arrHistory[0].period} → {company.arrHistory[company.arrHistory.length - 1].period}
                        </div>
                      </div>
                      <div>
                        <div className="mono" style={{ fontSize: 10, color: P.slate, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Current ARR</div>
                        <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: ACCENT[company.id] }}>
                          {fmtM(company.arrM)}
                        </div>
                        <div style={{ fontSize: 12, color: P.slate }}>{company.arrDate}</div>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Investors & Customers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, marginBottom: 32 }}>
              <div style={{ background: P.card, border: `1px solid ${P.line}`, padding: "18px 18px 20px" }}>
                <div className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: P.brass, marginBottom: 14 }}>
                  Key Investors
                </div>
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {company.keyInvestors.map((inv, i) => (
                    <li
                      key={inv}
                      style={{ fontSize: 13.5, padding: "6px 0", borderBottom: i < company.keyInvestors.length - 1 ? `1px dotted ${P.line}` : "none" }}
                    >
                      {inv}
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ background: P.card, border: `1px solid ${P.line}`, padding: "18px 18px 20px" }}>
                <div className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: P.sage, marginBottom: 14 }}>
                  Notable Customers
                </div>
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {company.notableCustomers.map((cust, i) => (
                    <li
                      key={cust}
                      style={{ fontSize: 13.5, padding: "6px 0", borderBottom: i < company.notableCustomers.length - 1 ? `1px dotted ${P.line}` : "none" }}
                    >
                      {cust}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <BurnMethodNote open={burnOpen} toggle={() => setBurnOpen(o => !o)} />
          </>
        )}

        {/* ── FOOTER ───────────────────────────────────────────────────── */}
        <p style={{ fontSize: 12, color: P.slate, lineHeight: 1.6, marginTop: 24 }}>
          Data sourced from company press releases, TechCrunch, Bloomberg, CNBC, Sacra Research, PitchBook, and company blogs.
          Valuation and funding figures reflect publicly announced rounds; post-money valuations shown where disclosed.
          ARR figures are company-reported unless marked as projected.
          Burn rates, cash on hand, and runway are analyst estimates derived from publicly available headcount,
          funding, and ARR data — none of these companies disclose these figures. As of June 2026.
        </p>
      </div>
    </div>
  );
}
