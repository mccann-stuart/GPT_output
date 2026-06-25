import React, { useState, useMemo } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// CONVERSATIONAL AI FUNDING TRACKER
// Tracks: capital raised, private valuations, reported ARR, estimated burn
// rates, and estimated runway for Sierra, Decagon, PolyAI, and Parloa.
//
// Data sources: company press releases, TechCrunch, Bloomberg, CNBC, Sacra,
// PitchBook, and company blogs. As of June 2026.
//
// ⚠ Burn rates, cash on hand, and runway are analyst estimates.
//   None of these companies publicly disclose these figures.
// ─────────────────────────────────────────────────────────────────────────────

const P = {
  ink:    "#15201A",
  paper:  "#F3EFE6",
  sage:   "#5C7A6B",
  brass:  "#B08A4F",
  rust:   "#A8563C",
  slate:  "#6E7B82",
  line:   "#D6CFC0",
  card:   "#FBFAF5",
  amber:  "#C4850A",
  violet: "#6B4F8E",
};

const ACCENT = {
  sierra:  "#5C7A6B",
  decagon: "#B08A4F",
  polyai:  "#A8563C",
  parloa:  "#6B4F8E",
};

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
      { label: "Seed",     amount: 110,  date: "Feb 2024", postValM: 550,   lead: "Sequoia Capital, Benchmark" },
      { label: "Series A", amount: 175,  date: "Oct 2024", postValM: 4500,  lead: "Greenoaks Capital" },
      { label: "Series D", amount: 350,  date: "Sep 2025", postValM: 10000, lead: "Greenoaks Capital" },
      { label: "Series E", amount: 950,  date: "May 2026", postValM: 15800, lead: "Tiger Global, GV (Google Ventures)" },
    ],
    arrHistory: [
      { period: "End 2024",  arrM: 26 },
      { period: "Nov 2025",  arrM: 100 },
      { period: "Feb 2026",  arrM: 150 },
      { period: "May 2026",  arrM: 200 },
    ],
    keyInvestors: ["Sequoia Capital", "Benchmark", "Greenoaks Capital", "Tiger Global", "GV (Google Ventures)"],
    notableCustomers: ["Prudential", "Cigna", "Blue Cross Blue Shield", "Rocket Mortgage"],
    headline: "Reached $100M ARR in 7 quarters — fastest on record; $950M Series E closed May 2026 at $15.8B",
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
      { label: "Seed",     amount: 5,   date: "2023",     postValM: null, lead: "a16z" },
      { label: "Series A", amount: 35,  date: "Jul 2024", postValM: null, lead: "Accel" },
      { label: "Series B", amount: 65,  date: "Oct 2024", postValM: 650,  lead: "Bain Capital Ventures" },
      { label: "Series C", amount: 131, date: "Jun 2025", postValM: 1500, lead: "Accel, a16z Growth Fund" },
      { label: "Series D", amount: 250, date: "Jan 2026", postValM: 4500, lead: "Coatue, Index Ventures" },
    ],
    arrHistory: [
      { period: "2025", arrM: 35 },
    ],
    keyInvestors: ["a16z", "Accel", "Bain Capital Ventures", "Coatue", "Index Ventures"],
    notableCustomers: ["Avis Budget Group", "Block (Cash App)", "Deutsche Telekom", "Mercado Libre"],
    headline: "Valuation tripled from $1.5B to $4.5B in 8 months; 100+ enterprise customers added in 2025; first tender offer Mar 2026",
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
      { label: "Series A", amount: 14,  date: "Mar 2019", postValM: null, lead: "Point72 Ventures, Sands Capital" },
      { label: "Series B", amount: 40,  date: "Sep 2021", postValM: null, lead: "Khosla Ventures, Georgian" },
      { label: "Series C", amount: 50,  date: "May 2024", postValM: null, lead: "Hedosophia, NVIDIA Ventures" },
      { label: "Series D", amount: 86,  date: "Dec 2025", postValM: 750,  lead: "Georgian, Hedosophia, Khosla" },
    ],
    arrHistory: [
      { period: "FY Jan 2024", arrM: 8.9 },
      { period: "FY Jan 2025", arrM: 15 },
      { period: "2026 proj.",  arrM: 40 },
    ],
    keyInvestors: ["Khosla Ventures", "Georgian", "Hedosophia", "NVentures (NVIDIA)", "Citi Ventures"],
    notableCustomers: ["Marriott", "Caesars Entertainment", "PG&E", "UniCredit", "Foot Locker"],
    headline: "Most mature (founded 2017); 2,000+ live deployments across 45 languages; est. runway tightest of the four — next raise likely 2027",
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
      { label: "Seed",     amount: 4.2,  date: "May 2022", postValM: null, lead: "—" },
      { label: "Series A", amount: 22,   date: "Mar 2023", postValM: null, lead: "EQT Ventures" },
      { label: "Series B", amount: 66,   date: "Apr 2024", postValM: null, lead: "Altimeter Capital, Mosaic Ventures" },
      { label: "Series C", amount: 120,  date: "May 2025", postValM: 1000, lead: "Multiple investors" },
      { label: "Series D", amount: 350,  date: "Jan 2026", postValM: 3000, lead: "General Catalyst" },
    ],
    arrHistory: [
      { period: "2024", arrM: 16 },
      { period: "2025", arrM: 50 },
    ],
    keyInvestors: ["EQT Ventures", "General Catalyst", "Altimeter Capital", "Mosaic Ventures", "Durable Capital"],
    notableCustomers: ["Allianz", "Booking.com", "HealthEquity", "SAP", "Swiss Life"],
    headline: "3× ARR growth in 2025 ($16M → $50M); valuation tripled to $3B in 8 months; Europe's leading conversational AI unicorn",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function fmtM(v) {
  if (v === null || v === undefined) return "—";
  if (v >= 10000) return `$${(v / 1000).toFixed(1)}B`;
  if (v >= 1000)  return `$${(v / 1000).toFixed(2).replace(/\.?0+$/, "")}B`;
  if (v >= 100)   return `$${Math.round(v)}M`;
  return `$${v}M`;
}

function fmtBurn(v) { return `~$${v}M/mo`; }

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

function valArrMult(c) {
  return (c.latestValuationM / c.arrM).toFixed(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────
function ViewSeg({ active, onClick, children }) {
  return (
    <button
      type="button"
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
              <strong>Net burn ⁽¹⁾</strong> = Gross opex − monthly revenue (ARR ÷ 12). Revenue partially offsets operating costs; more mature ARR bases (PolyAI, Parloa) carry lower net burn relative to gross.
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
export default function ConversationalAIFunding() {
  const [view, setView] = useState("compare");   // "compare" | "detail"
  const [selected, setSelected] = useState("sierra");
  const [openRound, setOpenRound] = useState(null);
  const [burnOpen, setBurnOpen] = useState(false);

  const company = COMPANIES.find(c => c.id === selected);
  const maxArr     = Math.max(...COMPANIES.map(c => c.arrM));
  const maxRunway  = Math.max(...COMPANIES.map(c => c.estRunwayMonths));

  const efficiencyRows = useMemo(() =>
    COMPANIES.map(c => ({
      ...c,
      arrPerCent:    (c.arrM / c.totalRaisedM * 100).toFixed(1),
      valArrMult:    valArrMult(c),
      raisedPct:     (c.totalRaisedM / c.latestValuationM * 100).toFixed(1),
    })),
  []);

  const tableRows = [
    { key: "Founded",               vals: COMPANIES.map(c => c.founded.toString()),        mono: true },
    { key: "HQ",                    vals: COMPANIES.map(c => c.hq),                         mono: false },
    { key: "Total Raised",          vals: COMPANIES.map(c => fmtM(c.totalRaisedM)),          mono: true },
    { key: "Latest Valuation",      vals: COMPANIES.map(c => fmtM(c.latestValuationM)),      mono: true, bold: true },
    { key: "Valuation Date",        vals: COMPANIES.map(c => c.valuationDate),               mono: false },
    { key: "Reported ARR",          vals: COMPANIES.map(c => fmtM(c.arrM) + (c.arrStatus === "projected" ? "*" : "")), mono: true },
    { key: "ARR Period",            vals: COMPANIES.map(c => c.arrDate),                     mono: false },
    { key: "Val / ARR Multiple",    vals: COMPANIES.map(c => `${valArrMult(c)}×`),           mono: true },
    { key: "Employees (est.)",      vals: COMPANIES.map(c => `~${c.employees.toLocaleString()}`), mono: true },
    { key: "Est. Net Burn ⁽¹⁾",    vals: COMPANIES.map(c => fmtBurn(c.estNetBurnM)),        mono: true },
    { key: "Est. Cash on Hand",     vals: COMPANIES.map(c => fmtM(c.estCashOnHandM)),        mono: true },
    { key: "Est. Runway ⁽²⁾",      vals: COMPANIES.map(c => runwayLabel(c.estRunwayMonths)), mono: true, runway: true },
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
        @media (max-width: 680px) {
          .hero-grid { grid-template-columns: 1fr 1fr !important; }
          .kpi-grid  { grid-template-columns: 1fr 1fr !important; }
          .eff-grid  { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 440px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .kpi-grid  { grid-template-columns: 1fr !important; }
          .eff-grid  { grid-template-columns: 1fr !important; }
        }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
      `}</style>

      <div style={{ maxWidth: 1020, margin: "0 auto", padding: "clamp(24px,5vw,56px) clamp(18px,4vw,32px)" }}>

        {/* ── HEADER ───────────────────────────────────────────────────── */}
        <header style={{ borderBottom: `2px solid ${P.ink}`, paddingBottom: 22, marginBottom: 32 }}>
          <div
            className="mono"
            style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: P.brass, marginBottom: 12 }}
          >
            Conversational AI · Funding &amp; Financial Tracker · June 2026
          </div>
          <h1 className="fr" style={{ fontSize: 38, lineHeight: 1.05, fontWeight: 500, margin: "0 0 14px" }}>
            Sierra · Decagon · PolyAI · Parloa
          </h1>
          <p style={{ maxWidth: 680, color: P.slate, lineHeight: 1.55, fontSize: 15, margin: 0 }}>
            Capital raised, private valuations, reported ARR, and estimated burn rates &amp; runway for the four
            leading enterprise conversational AI platforms. Burn and runway figures are analyst estimates —
            none of these companies disclose financial statements publicly.
          </p>
        </header>

        {/* ── CONTROLS ─────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 14, marginBottom: 28 }}>
          <div style={{ display: "inline-flex", border: `1px solid ${P.ink}`, borderRadius: 2, overflow: "hidden" }}>
            <ViewSeg active={view === "compare"} onClick={() => setView("compare")}>Side-by-Side</ViewSeg>
            <ViewSeg active={view === "detail"}  onClick={() => setView("detail")}>Company Detail</ViewSeg>
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
                  const key = `${company.id}-${i}`;
                  const isOpen = openRound === key;
                  return (
                    <div key={i} style={{ borderTop: i === 0 ? "none" : `1px solid ${P.line}` }}>
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
                        <div key={i} style={{ display: "grid", gridTemplateColumns: "100px 1fr 64px", alignItems: "center", gap: 14 }}>
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
                      key={i}
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
                      key={i}
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
