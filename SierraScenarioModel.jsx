import React, { useState, useMemo } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// SIERRA AI — SCENARIO MODEL  (interactive)
//
// An outside-in, 10-year SaaS ARR / cash-burn model for Sierra AI, ported from
// the "sierra_model_reviewed" workbook (Dashboard · Inputs · Model · Review).
//
// Design intent of this component:
//   • The BIG LEVER is the burn scenario: Low / Medium / High / Extreme.
//     Picking one loads a complete set of assumptions; everything recalculates.
//   • A handful of headline drivers (growth ambition, retention, go-to-market /
//     product intensity) sit in the open so the main trade-offs are one click away.
//   • Every other assumption — token economics, opex leverage, working-capital,
//     starting position — is tucked into an "Advanced assumptions" foldaway.
//   • All four scenarios are independently editable; the dashboard, charts and
//     projection table reflect live edits exactly like the spreadsheet did.
//
// Engine parity: figures reproduce the workbook's Model sheet to the cent.
//   ARR bridge:  Ending = Beginning + New-logo + Expansion + Pricing − Churn
//   Revenue   ≈  average of beginning & ending ARR (mid-year convention)
//   Token COGS% = (usage × price) / 1000, both compounding annually
//   Cash      =  prior cash + FCF (operating + WC; excludes SBC & financing)
//
// Company facts (ARR, cash, pricing model) are outside-in estimates sourced from
// CNBC / Sacra / Axios / The Verge (2025–26); all figures are user-editable.
// ─────────────────────────────────────────────────────────────────────────────

const PALETTE = {
  ink: "#15201A",      // deep forest ink — text
  paper: "#F3EFE6",    // warm parchment — background
  sage: "#5C7A6B",     // muted sage — primary accent / "healthy"
  brass: "#B08A4F",    // brass — secondary accent / numbers
  amber: "#C2772B",    // amber — caution
  rust: "#A8563C",     // rust — pressure
  red: "#9E342A",      // deep red — danger / cash-out
  slate: "#6E7B82",    // slate — neutral
  line: "#D6CFC0",     // hairline
  card: "#FBFAF5",     // card surface
};

// The four burn scenarios — the headline lever. Order matters (low → extreme).
const SCENARIOS = [
  { key: "low", label: "Low", full: "Low burn", color: PALETTE.sage,
    blurb: "Disciplined growth. Bookings restrained, opex leveraged hard, cash defended." },
  { key: "medium", label: "Medium", full: "Medium burn", color: PALETTE.brass,
    blurb: "Balanced plan. Healthy new-logo growth funded by a moderate near-term burn." },
  { key: "high", label: "High", full: "High burn", color: PALETTE.amber,
    blurb: "Aggressive land-grab. Heavy S&M and R&D; cash dips below zero mid-decade." },
  { key: "extreme", label: "Extreme", full: "Extreme burn", color: PALETTE.red,
    blurb: "Hyper-growth at any cost. Fastest ARR, but runway runs out by Year 3." },
];

// ── Driver definitions ────────────────────────────────────────────────────────
// `headline: true` → shown in the open. Everything else lives under Advanced.
// Ranges/steps are in STORED units (percentages stored as decimals).
const DRIVERS = [
  // Growth & retention
  { key: "newLogoY1",        group: "growth", headline: true,  unit: "$M",
    label: "New-logo ARR, Year 1",        min: 0,    max: 400, step: 5,
    note: "Brand-new ARR booked from new customers in Year 1." },
  { key: "newLogoGrowth",    group: "growth", headline: true,  unit: "pct",
    label: "New-logo growth (YoY)",       min: -0.2, max: 1.0, step: 0.01,
    note: "Year-on-year growth in new-logo bookings before deceleration." },
  { key: "expansion",        group: "growth", headline: true,  unit: "pct",
    label: "Usage / seat expansion",      min: 0,    max: 0.5, step: 0.005,
    note: "Existing-customer expansion (more volume, seats, use-cases), % of beginning ARR." },
  { key: "grossChurn",       group: "growth", headline: true,  unit: "pct",
    label: "Gross revenue churn",         min: 0,    max: 0.3, step: 0.005,
    note: "Annual ARR lost to churn / downgrades, % of beginning ARR." },
  { key: "newLogoDecay",     group: "growth", headline: false, unit: "x",
    label: "New-logo growth decay",       min: 0.5,  max: 1.0, step: 0.01,
    note: "Annual multiplier on the new-logo growth rate (S-curve deceleration)." },
  { key: "expansionFade",    group: "growth", headline: false, unit: "x",
    label: "Expansion fade",              min: 0.7,  max: 1.0, step: 0.005,
    note: "Annual multiplier on the expansion rate as the base matures." },
  { key: "priceUplift",      group: "growth", headline: false, unit: "pct",
    label: "Pricing power — uplift",      min: -0.05,max: 0.15,step: 0.005,
    note: "Net annual price realisation. Aggressive land-grab trades price for volume." },

  // Token economics
  { key: "tokenPriceY0",     group: "token",  headline: false, unit: "$/1M",
    label: "Token price (Yr 0)",          min: 0,    max: 12,  step: 0.25,
    note: "Blended $ per 1M tokens across the model mix. Heavier voice/reasoning → pricier." },
  { key: "tokenPriceChange", group: "token",  headline: false, unit: "pct",
    label: "Annual token-price change",   min: -0.3, max: 0.1, step: 0.005,
    note: "Negative = deflation. Inference $/token has fallen sharply; assume continued decline." },
  { key: "tokenUsageY0",     group: "token",  headline: false, unit: "M/$1k",
    label: "Token usage (Yr 0)",          min: 0,    max: 120, step: 1,
    note: "M tokens consumed per $1k of revenue. Voice + agentic features raise intensity." },
  { key: "tokenUsageChange", group: "token",  headline: false, unit: "pct",
    label: "Annual usage-intensity change",min: -0.1,max: 0.3, step: 0.005,
    note: "Net of efficiency gains vs richer / more-agentic product. Positive = more tokens over time." },

  // Other margin drivers
  { key: "otherCogsY0",      group: "margin", headline: false, unit: "pct",
    label: "Other COGS (Yr 0)",           min: 0,    max: 0.4, step: 0.005,
    note: "Non-token cost of revenue: hosting/infra, voice telephony, implementation & support." },
  { key: "otherCogsLeverage",group: "margin", headline: false, unit: "x",
    label: "Other-COGS leverage",         min: 0.9,  max: 1.05,step: 0.005,
    note: "Annual multiplier on the other-COGS ratio as the company scales." },

  // Operating expenses (the burn drivers)
  { key: "smPct",            group: "opex",   headline: true,  unit: "pct",
    label: "S&M (% of revenue, Yr 0)",    min: 0,    max: 1.5, step: 0.01,
    note: "Sales & marketing intensity. Higher growth ambition → heavier S&M." },
  { key: "rdPct",            group: "opex",   headline: true,  unit: "pct",
    label: "R&D (% of revenue, Yr 0)",    min: 0,    max: 1.2, step: 0.01,
    note: "Product & engineering investment." },
  { key: "gaPct",            group: "opex",   headline: false, unit: "pct",
    label: "G&A (% of revenue, Yr 0)",    min: 0,    max: 0.5, step: 0.005,
    note: "General & administrative." },
  { key: "opexLeverage",     group: "opex",   headline: false, unit: "x",
    label: "Opex leverage",               min: 0.8,  max: 1.05,step: 0.005,
    note: "Annual multiplier on all three opex ratios — operating leverage as revenue scales." },

  // Cash-flow drivers
  { key: "capexPct",         group: "cash",   headline: false, unit: "pct",
    label: "Capex (% of revenue)",        min: 0,    max: 0.1, step: 0.0025,
    note: "Capitalised spend (infra / build-out)." },
  { key: "wcPct",            group: "cash",   headline: false, unit: "pct",
    label: "Working-capital benefit",     min: -0.2, max: 0.2, step: 0.005,
    note: "% of net new ARR. Usage-based billing in arrears → weak tailwind, drag in aggressive cases." },
];

const GROUPS = [
  { key: "growth", label: "Growth & retention" },
  { key: "token",  label: "Token economics" },
  { key: "margin", label: "Other margin drivers" },
  { key: "opex",   label: "Operating expenses" },
  { key: "cash",   label: "Cash-flow drivers" },
];

const GLOBALS = [
  { key: "startArr",     label: "Starting ARR",        unit: "$M",  min: 0, max: 1000, step: 10,
    note: "Current run-rate ARR. Outside-in estimate (~$200M mid-2026); Sierra reported ~$150M ARR Feb 2026." },
  { key: "startCash",    label: "Starting cash",       unit: "$M",  min: 0, max: 5000, step: 50,
    note: ">$1B on hand after the $950M Series E (May 2026)." },
  { key: "interestRate", label: "Interest on cash",    unit: "pct", min: 0, max: 0.1,  step: 0.0025,
    note: "Yield earned on beginning-of-year cash. No interest credited once cash turns negative." },
  { key: "taxRate",      label: "Cash tax rate",       unit: "pct", min: 0, max: 0.4,  step: 0.01,
    note: "Applied to positive pre-tax income only (simplified; ignores NOL timing)." },
];

// Preset values, indexed [low, medium, high, extreme] — straight from Inputs sheet.
const PRESET_TABLE = {
  newLogoY1:        [80, 118, 150, 180],
  newLogoGrowth:    [0.24, 0.33, 0.42, 0.46],
  newLogoDecay:     [0.80, 0.82, 0.84, 0.86],
  grossChurn:       [0.04, 0.06, 0.08, 0.10],
  expansion:        [0.14, 0.18, 0.22, 0.24],
  expansionFade:    [0.90, 0.91, 0.92, 0.93],
  priceUplift:      [0.04, 0.03, 0.02, 0.00],
  tokenPriceY0:     [4, 4, 4.5, 5],
  tokenPriceChange: [-0.12, -0.11, -0.10, -0.09],
  tokenUsageY0:     [30, 32.5, 36, 42],
  tokenUsageChange: [0.05, 0.08, 0.11, 0.14],
  otherCogsY0:      [0.16, 0.17, 0.18, 0.19],
  otherCogsLeverage:[0.97, 0.975, 0.98, 0.985],
  smPct:            [0.54, 0.62, 0.78, 0.98],
  rdPct:            [0.36, 0.42, 0.52, 0.64],
  gaPct:            [0.15, 0.16, 0.19, 0.23],
  opexLeverage:     [0.95, 0.925, 0.90, 0.90],
  capexPct:         [0.02, 0.025, 0.03, 0.04],
  wcPct:            [0.08, 0.04, 0.00, -0.06],
};

const GLOBAL_PRESET = { startArr: 200, startCash: 1000, interestRate: 0.04, taxRate: 0.15 };

function buildPresets() {
  const out = {};
  SCENARIOS.forEach((s, i) => {
    const d = {};
    for (const key in PRESET_TABLE) d[key] = PRESET_TABLE[key][i];
    out[s.key] = d;
  });
  return out;
}
const PRESETS = buildPresets();

// ── Shareable settings contract ───────────────────────────────────────────────
// The viewer copies a URL that encodes only the settings that differ from these
// defaults. Shareable state = the burn scenario in focus, every driver edit and
// the global starting position. Transient UI (which foldaways are open) is kept
// in local state and is deliberately never written to the URL.
export const DEFAULT_SETTINGS = {
  active: "medium",
  globals: { ...GLOBAL_PRESET },
  scenarios: buildPresets(),
};

const SCENARIO_KEYS = SCENARIOS.map((s) => s.key);

// Restored settings come from an untrusted base64url URL value: clamp every
// number into its slider range, drop unknown keys, and fall back to presets so a
// hand-crafted or stale link can never break rendering.
function clampNumber(value, min, max, fallback) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function normaliseSettings(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const active = SCENARIO_KEYS.includes(r.active) ? r.active : DEFAULT_SETTINGS.active;

  const rg = r.globals && typeof r.globals === "object" ? r.globals : {};
  const globals = {};
  GLOBALS.forEach((g) => { globals[g.key] = clampNumber(rg[g.key], g.min, g.max, GLOBAL_PRESET[g.key]); });

  const rs = r.scenarios && typeof r.scenarios === "object" ? r.scenarios : {};
  const scenarios = {};
  SCENARIOS.forEach((s) => {
    const src = rs[s.key] && typeof rs[s.key] === "object" ? rs[s.key] : {};
    const d = {};
    DRIVERS.forEach((dr) => { d[dr.key] = clampNumber(src[dr.key], dr.min, dr.max, PRESETS[s.key][dr.key]); });
    scenarios[s.key] = d;
  });

  return { active, globals, scenarios };
}

const YEARS = 10;
const MILESTONES = [3, 5, 10];

// ── Engine ──────────────────────────────────────────────────────────────────
// Reproduces one scenario column of the Model sheet across Years 0–10.
function computeScenario(d, g) {
  const begArr = [], newLogo = [], expansion = [], pricing = [], churn = [], endArr = [];
  const revenue = [], tokenPct = [], otherPct = [], grossProfit = [], grossMargin = [];
  const sm = [], rd = [], ga = [], opex = [], ebit = [], ebitMargin = [];
  const interest = [], pretax = [], cashTax = [], netIncome = [], netMargin = [];
  const capex = [], wc = [], fcf = [], begCash = [], endCash = [];

  // Year 0 seeds (only ending ARR & cash are defined).
  endArr[0] = g.startArr;
  endCash[0] = g.startCash;

  for (let y = 1; y <= YEARS; y++) {
    begArr[y] = endArr[y - 1];

    newLogo[y] = y === 1
      ? d.newLogoY1
      : newLogo[y - 1] * (1 + d.newLogoGrowth * Math.pow(d.newLogoDecay, y - 2));
    expansion[y] = begArr[y] * d.expansion * Math.pow(d.expansionFade, y - 1);
    pricing[y] = begArr[y] * d.priceUplift;
    churn[y] = -begArr[y] * d.grossChurn;
    endArr[y] = begArr[y] + newLogo[y] + expansion[y] + pricing[y] + churn[y];

    revenue[y] = (begArr[y] + endArr[y]) / 2;

    tokenPct[y] = (d.tokenUsageY0 * Math.pow(1 + d.tokenUsageChange, y))
                * (d.tokenPriceY0 * Math.pow(1 + d.tokenPriceChange, y)) / 1000;
    otherPct[y] = d.otherCogsY0 * Math.pow(d.otherCogsLeverage, y);
    const tokenCogs = revenue[y] * tokenPct[y];
    const otherCogs = revenue[y] * otherPct[y];
    grossProfit[y] = revenue[y] - tokenCogs - otherCogs;
    grossMargin[y] = grossProfit[y] / revenue[y];

    sm[y] = revenue[y] * d.smPct * Math.pow(d.opexLeverage, y);
    rd[y] = revenue[y] * d.rdPct * Math.pow(d.opexLeverage, y);
    ga[y] = revenue[y] * d.gaPct * Math.pow(d.opexLeverage, y);
    opex[y] = sm[y] + rd[y] + ga[y];
    ebit[y] = grossProfit[y] - opex[y];
    ebitMargin[y] = ebit[y] / revenue[y];

    begCash[y] = endCash[y - 1];
    interest[y] = Math.max(0, begCash[y]) * g.interestRate;
    pretax[y] = ebit[y] + interest[y];
    cashTax[y] = -Math.max(0, pretax[y]) * g.taxRate;
    netIncome[y] = pretax[y] + cashTax[y];
    netMargin[y] = netIncome[y] / revenue[y];

    capex[y] = -revenue[y] * d.capexPct;
    wc[y] = Math.max(0, endArr[y] - begArr[y]) * d.wcPct;
    fcf[y] = ebit[y] + capex[y] + cashTax[y] + interest[y] + wc[y];
    endCash[y] = begCash[y] + fcf[y];
  }

  const firstYear = (arr, test) => {
    for (let y = 1; y <= YEARS; y++) if (test(arr[y])) return y;
    return null;
  };

  const minCash = Math.min(endCash[0], ...endCash.slice(1));

  return {
    endArr, revenue, grossMargin, ebit, ebitMargin, fcf, endCash, netMargin,
    arrY3: endArr[3], arrY5: endArr[5], arrY10: endArr[10],
    cashY3: endCash[3], cashY5: endCash[5], cashY10: endCash[10],
    revY10: revenue[10],
    gmY10: grossMargin[10], ebitMY10: ebitMargin[10], netMY10: netMargin[10],
    minCash, cumCash: endCash[10] - g.startCash,
    firstEbit: firstYear(ebit, (v) => v > 0),
    firstFcf: firstYear(fcf, (v) => v > 0),
    cashOut: firstYear(endCash, (v) => v < 0),
  };
}

// ── Formatting ────────────────────────────────────────────────────────────────
const fmtM = (v, dp = 0) => {
  if (v == null || !isFinite(v)) return "—";
  const sign = v < 0 ? "−" : "";
  const n = Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
  return `${sign}$${n}M`;
};
const fmtPct = (v, dp = 1) => (v == null || !isFinite(v)) ? "—" : `${(v * 100).toFixed(dp)}%`;
const fmtYear = (y) => y == null ? "Never" : `Year ${y}`;
const fmtDriver = (unit, v) => {
  switch (unit) {
    case "$M":    return fmtM(v, 0);
    case "pct":   return fmtPct(v, 1);
    case "x":     return `${v.toFixed(3)}×`;
    case "$/1M":  return `$${v.toFixed(2)}`;
    case "M/$1k": return `${v.toFixed(1)}`;
    default:      return String(v);
  }
};

// ── Small presentational pieces ─────────────────────────────────────────────
function Kpi({ label, value, sub, tone }) {
  const color = tone === "good" ? PALETTE.sage : tone === "bad" ? PALETTE.red : PALETTE.ink;
  return (
    <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.line}`, borderRadius: 6, padding: "12px 14px" }}>
      <div className="mono" style={{ fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: PALETTE.slate, marginBottom: 6 }}>{label}</div>
      <div className="fr" style={{ fontSize: 24, fontWeight: 500, lineHeight: 1, color }}>{value}</div>
      {sub && <div className="mono" style={{ fontSize: 10, color: PALETTE.slate, marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

function DriverControl({ driver, value, preset, onChange }) {
  const modified = Math.abs(value - preset) > 1e-9;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <label className="mono" title={driver.note} style={{ fontSize: 11.5, color: PALETTE.ink, cursor: "help" }}>
          {driver.label}
          {modified && <span style={{ color: PALETTE.brass, marginLeft: 5 }} title={`Preset: ${fmtDriver(driver.unit, preset)}`}>•</span>}
        </label>
        <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: modified ? PALETTE.brass : PALETTE.ink, whiteSpace: "nowrap" }}>
          {fmtDriver(driver.unit, value)}
        </span>
      </div>
      <input
        type="range" className="slider"
        min={driver.min} max={driver.max} step={driver.step} value={value}
        aria-label={driver.label}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

// Hand-drawn multi-series line chart (SVG). points: [{label,color,emphasis,data:[[x,y],…]}]
function LineChart({ title, series, yFormat, showZero, xTicks }) {
  const W = 760, H = 300;
  const padL = 56, padR = 18, padT = 14, padB = 30;
  const plotW = W - padL - padR, plotH = H - padT - padB;

  const xs = [], ys = [];
  series.forEach((s) => s.data.forEach(([x, y]) => { xs.push(x); if (isFinite(y)) ys.push(y); }));
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  let yMin = Math.min(...ys), yMax = Math.max(...ys);
  if (showZero) { yMin = Math.min(yMin, 0); yMax = Math.max(yMax, 0); }
  const pad = (yMax - yMin) * 0.08 || 1;
  yMin -= pad; yMax += pad;

  const sx = (x) => padL + ((x - xMin) / (xMax - xMin || 1)) * plotW;
  const sy = (y) => padT + ((yMax - y) / (yMax - yMin || 1)) * plotH;

  const ticks = 5;
  const yGrid = Array.from({ length: ticks }, (_, i) => yMin + (i / (ticks - 1)) * (yMax - yMin));

  return (
    <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.line}`, borderRadius: 6, padding: "14px 16px", flex: "1 1 340px", minWidth: 300 }}>
      <div className="mono" style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: PALETTE.brass, marginBottom: 6 }}>{title}</div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }} role="img" aria-label={title}>
        {yGrid.map((g, i) => (
          <g key={i}>
            <line x1={padL} y1={sy(g)} x2={W - padR} y2={sy(g)} stroke={PALETTE.line} strokeWidth={1} />
            <text x={padL - 8} y={sy(g) + 3} textAnchor="end" fontFamily="'IBM Plex Mono', monospace" fontSize={10} fill={PALETTE.slate}>{yFormat(g)}</text>
          </g>
        ))}
        {showZero && yMin < 0 && yMax > 0 && (
          <line x1={padL} y1={sy(0)} x2={W - padR} y2={sy(0)} stroke={PALETTE.ink} strokeWidth={1.4} strokeDasharray="2 3" />
        )}
        {xTicks.map((t) => (
          <text key={t} x={sx(t)} y={H - 8} textAnchor="middle" fontFamily="'IBM Plex Mono', monospace" fontSize={10} fill={PALETTE.slate}>{t}</text>
        ))}
        {series.map((s) => {
          const pts = s.data.filter(([, y]) => isFinite(y));
          const dPath = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${sx(x).toFixed(1)},${sy(y).toFixed(1)}`).join(" ");
          return (
            <g key={s.label}>
              <path d={dPath} fill="none" stroke={s.color} strokeWidth={s.emphasis ? 2.6 : 1.2} strokeOpacity={s.emphasis ? 1 : 0.5} strokeLinejoin="round" />
              {s.emphasis && MILESTONES.map((m) => {
                const found = pts.find(([x]) => x === m);
                return found ? <circle key={m} cx={sx(found[0])} cy={sy(found[1])} r={3.4} fill={s.color} stroke={PALETTE.card} strokeWidth={1.2} /> : null;
              })}
            </g>
          );
        })}
      </svg>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", marginTop: 6 }}>
        {series.map((s) => (
          <span key={s.label} className="mono" style={{ fontSize: 10, color: s.emphasis ? PALETTE.ink : PALETTE.slate, display: "inline-flex", alignItems: "center", gap: 5, fontWeight: s.emphasis ? 600 : 400 }}>
            <span style={{ width: 14, height: 0, borderTop: `${s.emphasis ? 3 : 2}px solid ${s.color}`, opacity: s.emphasis ? 1 : 0.6 }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SierraScenarioModel({ initialSettings = DEFAULT_SETTINGS, onSettingsChange } = {}) {
  const restored = useMemo(() => normaliseSettings(initialSettings), [initialSettings]);
  const [active, setActive] = useState(restored.active);
  const [scenarios, setScenarios] = useState(restored.scenarios);
  const [globals, setGlobals] = useState(restored.globals);
  // Transient UI — intentionally local, never shared in the copied URL.
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showTable, setShowTable] = useState(false);

  // Tell the viewer the full shareable state after any change; it diffs against
  // DEFAULT_SETTINGS and encodes only what differs.
  const share = (next) => onSettingsChange?.({
    active: next.active ?? active,
    scenarios: next.scenarios ?? scenarios,
    globals: next.globals ?? globals,
  });

  const results = useMemo(() => {
    const o = {};
    SCENARIOS.forEach((s) => { o[s.key] = computeScenario(scenarios[s.key], globals); });
    return o;
  }, [scenarios, globals]);

  const activeMeta = SCENARIOS.find((s) => s.key === active);
  const r = results[active];
  const d = scenarios[active];

  const selectScenario = (key) => { setActive(key); share({ active: key }); };
  const setDriver = (key, val) => {
    const nextScenarios = { ...scenarios, [active]: { ...scenarios[active], [key]: val } };
    setScenarios(nextScenarios);
    share({ scenarios: nextScenarios });
  };
  const setGlobal = (key, val) => {
    const nextGlobals = { ...globals, [key]: val };
    setGlobals(nextGlobals);
    share({ globals: nextGlobals });
  };

  const scenarioModified = DRIVERS.some((dr) => Math.abs(d[dr.key] - PRESETS[active][dr.key]) > 1e-9);
  const globalsModified = GLOBALS.some((gl) => Math.abs(globals[gl.key] - GLOBAL_PRESET[gl.key]) > 1e-9);

  const resetScenario = () => {
    const nextScenarios = { ...scenarios, [active]: { ...PRESETS[active] } };
    setScenarios(nextScenarios);
    share({ scenarios: nextScenarios });
  };
  const resetAll = () => {
    const nextScenarios = buildPresets();
    const nextGlobals = { ...GLOBAL_PRESET };
    setScenarios(nextScenarios);
    setGlobals(nextGlobals);
    share({ scenarios: nextScenarios, globals: nextGlobals });
  };

  // Chart series builders — all scenarios overlaid, active emphasised.
  const seriesFor = (selector, fromYear = 0) => SCENARIOS.map((s) => ({
    label: s.full, color: s.color, emphasis: s.key === active,
    data: Array.from({ length: YEARS - fromYear + 1 }, (_, i) => {
      const y = fromYear + i;
      return [y, selector(results[s.key], y)];
    }),
  }));

  const cashSeries = seriesFor((res, y) => res.endCash[y], 0);
  const arrSeries = seriesFor((res, y) => res.endArr[y], 0);
  const marginSeries = seriesFor((res, y) => res.ebitMargin[y], 1);

  const headlineDrivers = DRIVERS.filter((dr) => dr.headline);

  const tableRows = [
    { label: "Ending ARR", fmt: (y) => fmtM(r.endArr[y]) },
    { label: "Revenue", fmt: (y) => fmtM(r.revenue[y]) },
    { label: "Gross margin", fmt: (y) => y === 0 ? "—" : fmtPct(r.grossMargin[y]) },
    { label: "EBIT", fmt: (y) => y === 0 ? "—" : fmtM(r.ebit[y]) },
    { label: "EBIT margin", fmt: (y) => y === 0 ? "—" : fmtPct(r.ebitMargin[y]) },
    { label: "Free cash flow", fmt: (y) => y === 0 ? "—" : fmtM(r.fcf[y]) },
    { label: "Ending cash", fmt: (y) => fmtM(r.endCash[y]), strong: true },
  ];

  return (
    <div style={{ background: PALETTE.paper, minHeight: "100vh", color: PALETTE.ink, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        .fr { font-family: 'Fraunces', Georgia, serif; }
        .mono { font-family: 'IBM Plex Mono', monospace; }
        .seg { cursor: pointer; border: none; background: transparent; transition: all .15s ease; font-family: inherit; }
        .seg:focus-visible, button:focus-visible, summary:focus-visible { outline: 2px solid ${PALETTE.brass}; outline-offset: 2px; }
        a { color: ${PALETTE.sage}; text-decoration: none; border-bottom: 1px solid ${PALETTE.line}; }
        a:hover { color: ${PALETTE.ink}; border-color: ${PALETTE.brass}; }
        .slider { -webkit-appearance: none; width: 100%; background: ${PALETTE.line}; height: 5px; border-radius: 3px; outline: none; margin: 7px 0 0; }
        .slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 15px; height: 15px; border-radius: 50%; background: ${PALETTE.brass}; cursor: pointer; border: 2px solid ${PALETTE.card}; box-shadow: 0 1px 3px rgba(0,0,0,0.15); transition: transform .1s ease; }
        .slider::-webkit-slider-thumb:hover { transform: scale(1.2); background: ${PALETTE.sage}; }
        .slider::-moz-range-thumb { width: 15px; height: 15px; border-radius: 50%; background: ${PALETTE.brass}; cursor: pointer; border: 2px solid ${PALETTE.card}; box-shadow: 0 1px 3px rgba(0,0,0,0.15); }
        .scn { cursor: pointer; text-align: left; border-radius: 8px; transition: all .15s ease; font-family: inherit; }
        .ghost { background: transparent; border: 1px solid ${PALETTE.line}; color: ${PALETTE.slate}; cursor: pointer; border-radius: 4px; padding: 5px 11px; font-size: 11px; font-family: 'IBM Plex Mono', monospace; transition: all .15s ease; }
        .ghost:hover { border-color: ${PALETTE.brass}; color: ${PALETTE.ink}; }
        table.proj { width: 100%; border-collapse: collapse; }
        table.proj th, table.proj td { text-align: right; padding: 6px 8px; font-family: 'IBM Plex Mono', monospace; font-size: 11px; white-space: nowrap; border-bottom: 1px solid ${PALETTE.line}; }
        table.proj th:first-child, table.proj td:first-child { text-align: left; position: sticky; left: 0; background: ${PALETTE.card}; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
      `}</style>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "clamp(20px,4vw,48px) clamp(14px,3vw,30px)" }}>

        {/* Header */}
        <header style={{ borderBottom: `2px solid ${PALETTE.ink}`, paddingBottom: 18, marginBottom: 22 }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: PALETTE.brass, marginBottom: 10 }}>
            Sierra AI · Scenario Model
          </div>
          <h1 className="fr" style={{ fontSize: "clamp(28px,5vw,40px)", lineHeight: 1.05, fontWeight: 500, margin: 0 }}>
            Four cash-burn scenarios, one live engine
          </h1>
          <p style={{ fontSize: 14, color: PALETTE.slate, margin: "12px 0 0", maxWidth: 720, lineHeight: 1.55 }}>
            Pick a burn scenario — the big lever — then tune the headline drivers in the open or open
            <strong style={{ color: PALETTE.ink, fontWeight: 600 }}> Advanced assumptions</strong> for the full set.
            ARR, margin and cash recalculate the way the workbook did, across a 10-year horizon.
          </p>
        </header>

        {/* Scenario selector — the headline lever */}
        <section style={{ marginBottom: 22 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
            {SCENARIOS.map((s) => {
              const sel = s.key === active;
              const res = results[s.key];
              return (
                <button
                  key={s.key} type="button" className="scn" onClick={() => selectScenario(s.key)}
                  aria-pressed={sel}
                  style={{
                    padding: "14px 16px",
                    background: sel ? PALETTE.ink : PALETTE.card,
                    border: `1px solid ${sel ? PALETTE.ink : PALETTE.line}`,
                    borderTop: `4px solid ${s.color}`,
                    boxShadow: sel ? "0 6px 18px rgba(21,32,26,0.18)" : "none",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span className="fr" style={{ fontSize: 19, fontWeight: 500, color: sel ? PALETTE.paper : PALETTE.ink }}>{s.full}</span>
                    <span className="mono" style={{ fontSize: 10, color: s.color, fontWeight: 600 }}>{s.label}</span>
                  </div>
                  <div className="mono" style={{ fontSize: 10.5, color: sel ? "rgba(243,239,230,0.75)" : PALETTE.slate, marginTop: 8, lineHeight: 1.5, minHeight: 46 }}>
                    {s.blurb}
                  </div>
                  <div style={{ marginTop: 10, paddingTop: 9, borderTop: `1px solid ${sel ? "rgba(243,239,230,0.2)" : PALETTE.line}`, display: "flex", justifyContent: "space-between" }}>
                    <span className="mono" style={{ fontSize: 10, color: sel ? "rgba(243,239,230,0.7)" : PALETTE.slate }}>Cash Yr 10</span>
                    <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: res.cashY10 < 0 ? (sel ? "#E89B8C" : PALETTE.red) : (sel ? PALETTE.paper : PALETTE.sage) }}>
                      {fmtM(res.cashY10)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* KPI dashboard for the active scenario */}
        <section style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
            <h2 className="fr" style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>
              <span style={{ color: activeMeta.color }}>{activeMeta.full}</span> · 10-year outcome
            </h2>
            {scenarioModified && <span className="mono" style={{ fontSize: 10, color: PALETTE.brass, border: `1px solid ${PALETTE.brass}`, borderRadius: 3, padding: "1px 6px" }}>customised</span>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            <Kpi label="Ending ARR · Yr 3" value={fmtM(r.arrY3)} />
            <Kpi label="Ending ARR · Yr 5" value={fmtM(r.arrY5)} />
            <Kpi label="Ending ARR · Yr 10" value={fmtM(r.arrY10)} />
            <Kpi label="Gross margin · Yr 10" value={fmtPct(r.gmY10)} sub={`EBIT ${fmtPct(r.ebitMY10)} · Net ${fmtPct(r.netMY10)}`} />
            <Kpi label="Cash · Yr 3" value={fmtM(r.cashY3)} tone={r.cashY3 < 0 ? "bad" : undefined} />
            <Kpi label="Cash · Yr 5" value={fmtM(r.cashY5)} tone={r.cashY5 < 0 ? "bad" : undefined} />
            <Kpi label="Cash · Yr 10" value={fmtM(r.cashY10)} tone={r.cashY10 < 0 ? "bad" : "good"} />
            <Kpi label="Minimum cash" value={fmtM(r.minCash)} tone={r.minCash < 0 ? "bad" : undefined} sub={`Cumulative ${fmtM(r.cumCash)}`} />
            <Kpi label="First EBIT-positive" value={fmtYear(r.firstEbit)} tone={r.firstEbit ? "good" : "bad"} />
            <Kpi label="First FCF-positive" value={fmtYear(r.firstFcf)} tone={r.firstFcf ? "good" : "bad"} />
            <Kpi label="Cash-out year" value={r.cashOut == null ? "Never" : fmtYear(r.cashOut)} tone={r.cashOut == null ? "good" : "bad"} sub={r.cashOut == null ? "stays funded" : "cash < 0"} />
            <Kpi label="Revenue · Yr 10" value={fmtM(r.revY10)} />
          </div>
        </section>

        {/* Charts */}
        <section style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 22 }}>
          <LineChart title="Cash position ($M)" series={cashSeries} yFormat={(v) => fmtM(v)} showZero xTicks={[0, 2, 4, 6, 8, 10]} />
          <LineChart title="Ending ARR ($M)" series={arrSeries} yFormat={(v) => fmtM(v)} xTicks={[0, 2, 4, 6, 8, 10]} />
          <LineChart title="EBIT margin (%)" series={marginSeries} yFormat={(v) => fmtPct(v, 0)} showZero xTicks={[2, 4, 6, 8, 10]} />
        </section>

        {/* Headline levers + global starting position */}
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 16 }}>
          <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.line}`, borderRadius: 8, padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 className="mono" style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: PALETTE.brass, margin: 0 }}>
                Big levers · {activeMeta.full}
              </h3>
              {scenarioModified && <button className="ghost" type="button" onClick={resetScenario}>reset scenario</button>}
            </div>
            {headlineDrivers.map((dr) => (
              <DriverControl key={dr.key} driver={dr} value={d[dr.key]} preset={PRESETS[active][dr.key]} onChange={(v) => setDriver(dr.key, v)} />
            ))}
          </div>

          <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.line}`, borderRadius: 8, padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 className="mono" style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: PALETTE.brass, margin: 0 }}>
                Starting position · all scenarios
              </h3>
              {globalsModified && <span className="mono" style={{ fontSize: 10, color: PALETTE.brass }}>customised</span>}
            </div>
            {GLOBALS.map((gl) => (
              <DriverControl key={gl.key} driver={gl} value={globals[gl.key]} preset={GLOBAL_PRESET[gl.key]} onChange={(v) => setGlobal(gl.key, v)} />
            ))}
            <p className="mono" style={{ fontSize: 10, color: PALETTE.slate, margin: "4px 0 0", lineHeight: 1.5 }}>
              Shared across all four scenarios — the company's run-rate ARR, balance-sheet cash, yield on cash and cash-tax rate.
            </p>
          </div>
        </section>

        {/* Advanced foldaway — every other assumption */}
        <section style={{ marginBottom: 16 }}>
          <button
            type="button" className="seg"
            onClick={() => setShowAdvanced((v) => !v)}
            aria-expanded={showAdvanced}
            style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: PALETTE.card, border: `1px solid ${PALETTE.line}`, borderRadius: 8 }}
          >
            <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3 }}>
              <span className="fr" style={{ fontSize: 17, fontWeight: 500, color: PALETTE.ink }}>Advanced assumptions</span>
              <span className="mono" style={{ fontSize: 10.5, color: PALETTE.slate }}>
                Token economics · margin · opex leverage · cash-flow drivers — {activeMeta.full}
              </span>
            </span>
            <span className="mono" style={{ fontSize: 12, color: PALETTE.brass }}>{showAdvanced ? "close −" : "open +"}</span>
          </button>

          {showAdvanced && (
            <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.line}`, borderTop: "none", borderRadius: "0 0 8px 8px", padding: "4px 18px 18px", marginTop: -4 }}>
              <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 0" }}>
                {scenarioModified && <button className="ghost" type="button" onClick={resetScenario} style={{ marginRight: 8 }}>reset scenario</button>}
                <button className="ghost" type="button" onClick={resetAll}>reset all to presets</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "8px 28px" }}>
                {GROUPS.map((grp) => {
                  const items = DRIVERS.filter((dr) => dr.group === grp.key && !dr.headline);
                  if (items.length === 0) return null;
                  return (
                    <div key={grp.key} style={{ paddingTop: 6 }}>
                      <div className="mono" style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: PALETTE.slate, borderBottom: `1px solid ${PALETTE.line}`, paddingBottom: 6, marginBottom: 12 }}>
                        {grp.label}
                      </div>
                      {items.map((dr) => (
                        <DriverControl key={dr.key} driver={dr} value={d[dr.key]} preset={PRESETS[active][dr.key]} onChange={(v) => setDriver(dr.key, v)} />
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Full projection table */}
        <section style={{ marginBottom: 22 }}>
          <button
            type="button" className="seg"
            onClick={() => setShowTable((v) => !v)}
            aria-expanded={showTable}
            style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: PALETTE.card, border: `1px solid ${PALETTE.line}`, borderRadius: showTable ? "8px 8px 0 0" : 8 }}
          >
            <span className="fr" style={{ fontSize: 17, fontWeight: 500, color: PALETTE.ink }}>10-year projection · {activeMeta.full}</span>
            <span className="mono" style={{ fontSize: 12, color: PALETTE.brass }}>{showTable ? "close −" : "open +"}</span>
          </button>
          {showTable && (
            <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.line}`, borderTop: "none", borderRadius: "0 0 8px 8px", padding: "4px 14px 14px", overflowX: "auto" }}>
              <table className="proj">
                <thead>
                  <tr>
                    <th style={{ color: PALETTE.slate }}>$M unless noted</th>
                    {Array.from({ length: YEARS + 1 }, (_, y) => (
                      <th key={y} style={{ color: PALETTE.slate }}>Yr {y}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row) => (
                    <tr key={row.label}>
                      <td style={{ fontWeight: row.strong ? 600 : 400, color: PALETTE.ink }}>{row.label}</td>
                      {Array.from({ length: YEARS + 1 }, (_, y) => {
                        const txt = row.fmt(y);
                        const neg = txt.startsWith("−");
                        return (
                          <td key={y} style={{ fontWeight: row.strong ? 600 : 400, color: neg ? PALETTE.red : PALETTE.ink }}>{txt}</td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Method & sources */}
        <footer style={{ borderTop: `1px solid ${PALETTE.line}`, paddingTop: 18 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: PALETTE.brass, marginBottom: 10 }}>Method & sources</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.7, color: PALETTE.slate }}>
            <li>ARR bridge: Ending = Beginning + New-logo + Expansion + Pricing uplift − Churn. Revenue ≈ average of beginning &amp; ending ARR (mid-year convention).</li>
            <li>Token COGS% = (M tokens per $1k revenue) × ($ per 1M tokens) ÷ 1000, both compounding annually — the AI-margin lever.</li>
            <li>Cash burn is operating + working-capital cash only; it excludes stock-based comp and any future financing rounds. Interest accrues on positive beginning-of-year cash.</li>
            <li>Cash taxes apply to positive pre-tax income only (no NOL carry-forward) — a known simplification that overstates later-year taxes, flagged in the workbook review.</li>
            <li>Outside-in estimates only. Company facts sourced from{" "}
              <a href="https://www.cnbc.com/" target="_blank" rel="noreferrer">CNBC</a>,{" "}
              <a href="https://sacra.com/" target="_blank" rel="noreferrer">Sacra</a>,{" "}
              <a href="https://www.axios.com/newsletters/axios-pro-rata-dcefb62b-d63c-4b4a-9c2f-9b9ad9556a7a" target="_blank" rel="noreferrer">Axios</a>{" "}and{" "}
              <a href="https://www.theverge.com/column/826172/ai-startup-arr-numbers-sierra-bret-taylor" target="_blank" rel="noreferrer">The Verge</a>{" "}
              (2025–26). Directional scenario model — not investment advice.</li>
          </ul>
        </footer>

      </div>
    </div>
  );
}
