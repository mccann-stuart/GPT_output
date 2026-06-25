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
  ink: "#1A1A1A",   // BCG near-black
  paper: "#F5F5F5",   // BCG off-white
  sage: "#009F6B",   // BCG green  (≈ "healthy / positive")
  brass: "#0077C8",   // BCG blue   (≈ "secondary accent")
  rust: "#E4002B",   // BCG red    (≈ "danger / pressure")
  slate: "#888888",   // BCG muted
  line: "#ECECEC",   // BCG border
  card: "#FFFFFF",   // BCG white
  amber: "#F5A623",   // BCG amber  (≈ "caution")
  violet: "#6B2D8B",   // BCG purple
};

const ACCENT = {
  sierra: "#009F6B",   // BCG green
  decagon: "#0077C8",   // BCG blue
  polyai: "#E4002B",   // BCG red
  parloa: "#6B2D8B",   // BCG purple
};



const { SierraScenarioModel, getSierraDetailedRunwayCase, SIERRA_DEFAULT_SETTINGS } = (() => {
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
    ink: "#1A1A1A",   // BCG near-black
    paper: "#F5F5F5",   // BCG off-white
    sage: "#009F6B",   // BCG green — healthy / positive
    brass: "#0077C8",   // BCG blue — secondary accent
    amber: "#F5A623",   // BCG amber — caution
    rust: "#E4002B",   // BCG red — pressure
    red: "#C00020",   // BCG deep red — danger / cash-out
    slate: "#888888",   // BCG muted
    line: "#ECECEC",   // BCG border
    card: "#FFFFFF",   // BCG white
  };

  // The four burn scenarios — the headline lever. Order matters (low → extreme).
  const SCENARIOS = [
    {
      key: "low", label: "Low", full: "Low burn", color: "#009F6B",
      blurb: "Disciplined growth. Bookings restrained, opex leveraged hard, cash defended."
    },
    {
      key: "medium", label: "Medium", full: "Medium burn", color: "#0077C8",
      blurb: "Balanced plan. Healthy new-logo growth funded by a moderate near-term burn."
    },
    {
      key: "high", label: "High", full: "High burn", color: "#F5A623",
      blurb: "Aggressive land-grab. Heavy S&M and R&D; cash dips below zero mid-decade."
    },
    {
      key: "extreme", label: "Extreme", full: "Extreme burn", color: "#E4002B",
      blurb: "Hyper-growth at any cost. Fastest ARR, but runway runs out by Year 3."
    },
  ];

  // ── Driver definitions ────────────────────────────────────────────────────────
  // `headline: true` → shown in the open. Everything else lives under Advanced.
  // Ranges/steps are in STORED units (percentages stored as decimals).
  const DRIVERS = [
    // Growth & retention
    {
      key: "newLogoY1", group: "growth", headline: true, unit: "$M",
      label: "New-logo ARR, Year 1", min: 0, max: 400, step: 5,
      note: "Brand-new ARR booked from new customers in Year 1."
    },
    {
      key: "newLogoGrowth", group: "growth", headline: true, unit: "pct",
      label: "New-logo growth (YoY)", min: -0.2, max: 1.0, step: 0.01,
      note: "Year-on-year growth in new-logo bookings before deceleration."
    },
    {
      key: "expansion", group: "growth", headline: true, unit: "pct",
      label: "Usage / seat expansion", min: 0, max: 0.5, step: 0.005,
      note: "Existing-customer expansion (more volume, seats, use-cases), % of beginning ARR."
    },
    {
      key: "grossChurn", group: "growth", headline: true, unit: "pct",
      label: "Gross revenue churn", min: 0, max: 0.3, step: 0.005,
      note: "Annual ARR lost to churn / downgrades, % of beginning ARR."
    },
    {
      key: "newLogoDecay", group: "growth", headline: false, unit: "x",
      label: "New-logo growth decay", min: 0.5, max: 1.0, step: 0.01,
      note: "Annual multiplier on the new-logo growth rate (S-curve deceleration)."
    },
    {
      key: "expansionFade", group: "growth", headline: false, unit: "x",
      label: "Expansion fade", min: 0.7, max: 1.0, step: 0.005,
      note: "Annual multiplier on the expansion rate as the base matures."
    },
    {
      key: "priceUplift", group: "growth", headline: false, unit: "pct",
      label: "Pricing power — uplift", min: -0.05, max: 0.15, step: 0.005,
      note: "Net annual price realisation. Aggressive land-grab trades price for volume."
    },

    // Token economics
    {
      key: "tokenPriceY0", group: "token", headline: false, unit: "$/1M",
      label: "Token price (Yr 0)", min: 0, max: 12, step: 0.25,
      note: "Blended $ per 1M tokens across the model mix. Heavier voice/reasoning → pricier."
    },
    {
      key: "tokenPriceChange", group: "token", headline: false, unit: "pct",
      label: "Annual token-price change", min: -0.3, max: 0.1, step: 0.005,
      note: "Negative = deflation. Inference $/token has fallen sharply; assume continued decline."
    },
    {
      key: "tokenUsageY0", group: "token", headline: false, unit: "M/$1k",
      label: "Token usage (Yr 0)", min: 0, max: 120, step: 1,
      note: "M tokens consumed per $1k of revenue. Voice + agentic features raise intensity."
    },
    {
      key: "tokenUsageChange", group: "token", headline: false, unit: "pct",
      label: "Annual usage-intensity change", min: -0.1, max: 0.3, step: 0.005,
      note: "Net of efficiency gains vs richer / more-agentic product. Positive = more tokens over time."
    },

    // Other margin drivers
    {
      key: "otherCogsY0", group: "margin", headline: false, unit: "pct",
      label: "Other COGS (Yr 0)", min: 0, max: 0.4, step: 0.005,
      note: "Non-token cost of revenue: hosting/infra, voice telephony, implementation & support."
    },
    {
      key: "otherCogsLeverage", group: "margin", headline: false, unit: "x",
      label: "Other-COGS leverage", min: 0.9, max: 1.05, step: 0.005,
      note: "Annual multiplier on the other-COGS ratio as the company scales."
    },

    // Operating expenses (the burn drivers)
    {
      key: "smPct", group: "opex", headline: true, unit: "pct",
      label: "S&M (% of revenue, Yr 0)", min: 0, max: 1.5, step: 0.01,
      note: "Sales & marketing intensity. Higher growth ambition → heavier S&M."
    },
    {
      key: "rdPct", group: "opex", headline: true, unit: "pct",
      label: "R&D (% of revenue, Yr 0)", min: 0, max: 1.2, step: 0.01,
      note: "Product & engineering investment."
    },
    {
      key: "gaPct", group: "opex", headline: false, unit: "pct",
      label: "G&A (% of revenue, Yr 0)", min: 0, max: 0.5, step: 0.005,
      note: "General & administrative."
    },
    {
      key: "opexLeverage", group: "opex", headline: false, unit: "x",
      label: "Opex leverage", min: 0.8, max: 1.05, step: 0.005,
      note: "Annual multiplier on all three opex ratios — operating leverage as revenue scales."
    },

    // Cash-flow drivers
    {
      key: "capexPct", group: "cash", headline: false, unit: "pct",
      label: "Capex (% of revenue)", min: 0, max: 0.1, step: 0.0025,
      note: "Capitalised spend (infra / build-out)."
    },
    {
      key: "wcPct", group: "cash", headline: false, unit: "pct",
      label: "Working-capital benefit", min: -0.2, max: 0.2, step: 0.005,
      note: "% of net new ARR. Usage-based billing in arrears → weak tailwind, drag in aggressive cases."
    },
  ];

  const GROUPS = [
    { key: "growth", label: "Growth & retention" },
    { key: "token", label: "Token economics" },
    { key: "margin", label: "Other margin drivers" },
    { key: "opex", label: "Operating expenses" },
    { key: "cash", label: "Cash-flow drivers" },
  ];

  const GLOBALS = [
    {
      key: "startArr", label: "Starting ARR", unit: "$M", min: 0, max: 1000, step: 10,
      note: "Current run-rate ARR. Outside-in estimate (~$200M mid-2026); Sierra reported ~$150M ARR Feb 2026."
    },
    {
      key: "startCash", label: "Starting cash", unit: "$M", min: 0, max: 5000, step: 50,
      note: ">$1B on hand after the $950M Series E (May 2026)."
    },
    {
      key: "interestRate", label: "Interest on cash", unit: "pct", min: 0, max: 0.1, step: 0.0025,
      note: "Yield earned on beginning-of-year cash. No interest credited once cash turns negative."
    },
    {
      key: "taxRate", label: "Cash tax rate", unit: "pct", min: 0, max: 0.4, step: 0.01,
      note: "Applied to positive pre-tax income only (simplified; ignores NOL timing)."
    },
  ];

  // Preset values, indexed [low, medium, high, extreme] — straight from Inputs sheet.
  const PRESET_TABLE = {
    newLogoY1: [80, 118, 150, 180],
    newLogoGrowth: [0.24, 0.33, 0.42, 0.46],
    newLogoDecay: [0.80, 0.82, 0.84, 0.86],
    grossChurn: [0.04, 0.06, 0.08, 0.10],
    expansion: [0.14, 0.18, 0.22, 0.24],
    expansionFade: [0.90, 0.91, 0.92, 0.93],
    priceUplift: [0.04, 0.03, 0.02, 0.00],
    tokenPriceY0: [4, 4, 4.5, 5],
    tokenPriceChange: [-0.12, -0.11, -0.10, -0.09],
    tokenUsageY0: [30, 32.5, 36, 42],
    tokenUsageChange: [0.05, 0.08, 0.11, 0.14],
    otherCogsY0: [0.16, 0.17, 0.18, 0.19],
    otherCogsLeverage: [0.97, 0.975, 0.98, 0.985],
    smPct: [0.54, 0.62, 0.78, 0.98],
    rdPct: [0.36, 0.42, 0.52, 0.64],
    gaPct: [0.15, 0.16, 0.19, 0.23],
    opexLeverage: [0.95, 0.925, 0.90, 0.90],
    capexPct: [0.02, 0.025, 0.03, 0.04],
    wcPct: [0.08, 0.04, 0.00, -0.06],
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
  const DEFAULT_SETTINGS = {
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
      endArr, revenue, grossProfit, grossMargin, opex, capex, wc, interest, cashTax, ebit, ebitMargin, fcf, endCash, netMargin,
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


  function getSierraDetailedRunwayCase(level, horizonYears = 5, settings = DEFAULT_SETTINGS) {
    const scenario = SCENARIOS.find((s) => s.label === level) || SCENARIOS[1];
    const normalised = normaliseSettings(settings);
    const result = computeScenario(normalised.scenarios[scenario.key], normalised.globals);
    const year = 1;
    const cashTaxPaid = Math.max(0, -(result.cashTax[year] || 0));
    const grossCashBurnAnnual =
      result.opex[year] +
      Math.abs(result.capex[year] || 0) +
      cashTaxPaid -
      (result.interest[year] || 0) -
      (result.wc[year] || 0);
    const grossProfitAnnual = result.grossProfit[year];
    const netBurnAnnual = Math.max(grossCashBurnAnnual - grossProfitAnnual, 0);
    const monthlyGrossBurnM = grossCashBurnAnnual / 12;
    const monthlyGrossProfitM = grossProfitAnnual / 12;
    const netMonthlyBurnM = netBurnAnnual / 12;
    const grossMargin = result.grossMargin[year];
    const breakevenArrM = Number.isFinite(grossMargin) && grossMargin > 0
      ? grossCashBurnAnnual / grossMargin
      : Infinity;

    let runwayMonths = Infinity;
    for (let y = 1; y <= YEARS; y++) {
      if (result.endCash[y] < 0) {
        const monthlyFcfBurn = -result.fcf[y] / 12;
        runwayMonths = monthlyFcfBurn > 0
          ? (y - 1) * 12 + (result.endCash[y - 1] / monthlyFcfBurn)
          : (y - 1) * 12;
        break;
      }
    }

    return {
      monthlyGrossBurnM,
      monthlyGrossProfitM,
      netMonthlyBurnM,
      runwayMonths,
      breakevenArrM,
      additionalArrM: Math.max(breakevenArrM - normalised.globals.startArr, 0),
      offsetPct: Math.min(monthlyGrossProfitM / monthlyGrossBurnM * 100, 999),
      horizonCash: result.endCash[Math.min(horizonYears, YEARS)],
      source: "detailed",
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
      case "$M": return fmtM(v, 0);
      case "pct": return fmtPct(v, 1);
      case "x": return `${v.toFixed(3)}×`;
      case "$/1M": return `${v.toFixed(2)}`;
      case "M/$1k": return `${v.toFixed(1)}`;
      default: return String(v);
    }
  };

  // ── Small presentational pieces ─────────────────────────────────────────────
  function Kpi({ label, value, sub, tone }) {
    const color = tone === "good" ? PALETTE.sage : tone === "bad" ? PALETTE.red : PALETTE.ink;
    return (
      <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.line}`, borderRadius: 6, borderTop: `3px solid ${color}`, padding: "12px 14px" }}>
        <div className="mono" style={{ fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: PALETTE.ink, marginBottom: 6 }}>{label}</div>
        <div className="fr" style={{ fontSize: 24, fontWeight: 500, lineHeight: 1, color }}>{value}</div>
        {sub && <div className="mono" style={{ fontSize: 10, color: "#555555", marginTop: 5 }}>{sub}</div>}
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
              <text x={padL - 8} y={sy(g) + 3} textAnchor="end" fontFamily="'Courier New', monospace" fontSize={10} fill={PALETTE.slate}>{yFormat(g)}</text>
            </g>
          ))}
          {showZero && yMin < 0 && yMax > 0 && (
            <line x1={padL} y1={sy(0)} x2={W - padR} y2={sy(0)} stroke={PALETTE.ink} strokeWidth={1.4} strokeDasharray="2 3" />
          )}
          {xTicks.map((t) => (
            <text key={t} x={sx(t)} y={H - 8} textAnchor="middle" fontFamily="'Courier New', monospace" fontSize={10} fill={PALETTE.slate}>{t}</text>
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
  function SierraScenarioModel({ initialSettings = DEFAULT_SETTINGS, onSettingsChange, embedded = false } = {}) {
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
      <div style={{ background: embedded ? "transparent" : PALETTE.paper, minHeight: embedded ? "auto" : "100vh", color: PALETTE.ink, fontFamily: "Arial, 'Helvetica Neue', sans-serif" }}>
        <style>{`
        
        * { box-sizing: border-box; }
        .fr { font-family: 'Trebuchet MS', 'Helvetica Neue', Arial, sans-serif; }
        .mono { font-family: 'Courier New', monospace; }
        .seg { cursor: pointer; border: none; background: transparent; transition: all .15s ease; font-family: inherit; }
        .seg:focus-visible, button:focus-visible, summary:focus-visible { outline: 2px solid #009F6B; outline-offset: 2px; }
        a { color: #009F6B; text-decoration: none; border-bottom: 1px solid #ECECEC; }
        a:hover { color: #1A1A1A; border-color: #0077C8; }
        .slider { -webkit-appearance: none; width: 100%; background: #ECECEC; height: 5px; border-radius: 3px; outline: none; margin: 7px 0 0; }
        .slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 15px; height: 15px; border-radius: 50%; background: #009F6B; cursor: pointer; border: 2px solid #FFFFFF; box-shadow: 0 1px 3px rgba(0,0,0,0.15); transition: transform .1s ease; }
        .slider::-webkit-slider-thumb:hover { transform: scale(1.2); background: #007A53; }
        .slider::-moz-range-thumb { width: 15px; height: 15px; border-radius: 50%; background: #009F6B; cursor: pointer; border: 2px solid #FFFFFF; box-shadow: 0 1px 3px rgba(0,0,0,0.15); }
        .scn { cursor: pointer; text-align: left; border-radius: 8px; transition: all .15s ease; font-family: inherit; }
        .ghost { background: transparent; border: 1px solid ${PALETTE.line}; color: ${PALETTE.slate}; cursor: pointer; border-radius: 4px; padding: 5px 11px; font-size: 11px; font-family: 'Courier New', monospace; transition: all .15s ease; }
        .ghost:hover { border-color: #0077C8; color: #1A1A1A; }
        table.proj { width: 100%; border-collapse: collapse; }
        table.proj th, table.proj td { text-align: right; padding: 6px 8px; font-family: 'Courier New', monospace; font-size: 11px; white-space: nowrap; border-bottom: 1px solid ${PALETTE.line}; }
        table.proj th:first-child, table.proj td:first-child { text-align: left; position: sticky; left: 0; background: #FFFFFF; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
      `}</style>

        <div style={{ maxWidth: 1080, margin: "0 auto", padding: embedded ? 0 : "clamp(20px,4vw,48px) clamp(14px,3vw,30px)" }}>

          {/* Header */}
          <header style={{ borderBottom: `2px solid ${PALETTE.ink}`, paddingBottom: 18, marginBottom: 22 }}>
            <div className="mono" style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: PALETTE.brass, marginBottom: 10 }}>
              Sierra AI · Scenario Model
            </div>
            <h1 className="fr" style={{ fontSize: "clamp(28px,5vw,38px)", lineHeight: 1.05, fontWeight: 700, margin: 0, color: "#1A1A1A" }}>
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
                      <span className="fr" style={{ fontSize: 17, fontWeight: 700, color: sel ? PALETTE.paper : PALETTE.ink }}>{s.full}</span>
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
              <h2 className="fr" style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
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
                <span className="fr" style={{ fontSize: 17, fontWeight: 700, color: PALETTE.ink }}>Advanced assumptions</span>
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
                        <div className="mono" style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: PALETTE.ink, fontWeight: 700, borderBottom: `2px solid ${PALETTE.sage}`, paddingBottom: 6, marginBottom: 12 }}>
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
              <span className="fr" style={{ fontSize: 17, fontWeight: 700, color: PALETTE.ink }}>10-year projection · {activeMeta.full}</span>
              <span className="mono" style={{ fontSize: 12, color: PALETTE.brass }}>{showTable ? "close −" : "open +"}</span>
            </button>
            {showTable && (
              <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.line}`, borderTop: "none", borderRadius: "0 0 8px 8px", padding: "4px 14px 14px", overflowX: "auto" }}>
                <table className="proj">
                  <thead>
                    <tr>
                      <th style={{ color: "#FFFFFF", background: "#1A1A1A", fontWeight: 700, padding: "8px" }}>$M unless noted</th>
                      {Array.from({ length: YEARS + 1 }, (_, y) => (
                        <th key={y} style={{ color: "#FFFFFF", background: "#1A1A1A", fontWeight: 700, padding: "8px", textAlign: "right" }}>Yr {y}</th>
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


  // Expose the Sierra model's defaults so the top-level tracker can nest them in
  // its own shareable settings contract and diff Sierra edits against them.
  return { SierraScenarioModel, getSierraDetailedRunwayCase, SIERRA_DEFAULT_SETTINGS: DEFAULT_SETTINGS };
})();

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
    benchmark: {
      revenueM: 150,
      fundingM: 635,
      valuationM: 10000,
      employees: "350+",
      thesis: "AI-native CX vendor with Agent OS, multi-model stack, outcome pricing, and an executive-led direct sales motion.",
      caveat: "Benchmark predates the May 2026 funding update used in the main tracker.",
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
    benchmark: {
      revenueM: 35,
      fundingM: 481,
      valuationM: 1500,
      employees: "~200",
      thesis: "Omnichannel AI concierge layer across voice, chat, email, and SMS with pre-built integrations and Agent Operating Procedures.",
      caveat: "Valuation benchmark reflects the Series C profile; the main tracker includes a later Series D valuation.",
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
    benchmark: {
      revenueM: 50,
      fundingM: 560,
      valuationM: 3000,
      employees: "380-400",
      thesis: "Voice-first enterprise AI Agent Management Platform with partner-led GTM and broad CCaaS, CRM, and ERP integrations.",
      caveat: "Benchmark flags backend automation gaps and potential SI dependency for heavier case-handling automation.",
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
    benchmark: {
      revenueM: 40,
      fundingM: 200,
      valuationM: 750,
      employees: "200+",
      thesis: "Voice AI specialist with Cambridge origins, enterprise deployments, proprietary Raven v2 LLM, Agent Studio, and usage-based minute pricing.",
      caveat: "Benchmark offers less detail on partnership model than the Sierra, Parloa, and Decagon profile pages.",
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

const PEER_DETAILED_PROFILES = {
  decagon: {
    marginAdj: -0.02,
    marginLeverage: 0.006,
    grossChurn: 0.07,
    expansion: 0.16,
    priceUplift: 0.02,
    growthDecay: 0.86,
    capexPct: 0.025,
    wcScale: 0.85,
    interestRate: 0.04,
    taxRate: 0.15,
    scenarios: {
      Low: { arrGrowthScale: 0.75, expansionScale: 0.9, churnScale: 0.85, marginDrag: 0.005, burnGrowthShare: 0.20, opexLeverage: 0.95, capexScale: 0.85, wcPct: 0.06 },
      Medium: { arrGrowthScale: 1.00, expansionScale: 1.0, churnScale: 1.00, marginDrag: 0.010, burnGrowthShare: 0.32, opexLeverage: 0.97, capexScale: 1.00, wcPct: 0.03 },
      High: { arrGrowthScale: 1.18, expansionScale: 1.1, churnScale: 1.12, marginDrag: 0.020, burnGrowthShare: 0.44, opexLeverage: 1.00, capexScale: 1.15, wcPct: 0.00 },
      Extreme: { arrGrowthScale: 1.32, expansionScale: 1.2, churnScale: 1.25, marginDrag: 0.035, burnGrowthShare: 0.58, opexLeverage: 1.04, capexScale: 1.35, wcPct: -0.04 },
    },
  },
  parloa: {
    marginAdj: -0.035,
    marginLeverage: 0.005,
    grossChurn: 0.06,
    expansion: 0.14,
    priceUplift: 0.025,
    growthDecay: 0.83,
    capexPct: 0.03,
    wcScale: 0.95,
    interestRate: 0.04,
    taxRate: 0.15,
    scenarios: {
      Low: { arrGrowthScale: 0.70, expansionScale: 0.85, churnScale: 0.85, marginDrag: 0.000, burnGrowthShare: 0.18, opexLeverage: 0.94, capexScale: 0.85, wcPct: 0.07 },
      Medium: { arrGrowthScale: 0.95, expansionScale: 1.0, churnScale: 1.00, marginDrag: 0.010, burnGrowthShare: 0.30, opexLeverage: 0.96, capexScale: 1.00, wcPct: 0.04 },
      High: { arrGrowthScale: 1.12, expansionScale: 1.1, churnScale: 1.12, marginDrag: 0.025, burnGrowthShare: 0.42, opexLeverage: 0.99, capexScale: 1.20, wcPct: 0.00 },
      Extreme: { arrGrowthScale: 1.25, expansionScale: 1.2, churnScale: 1.25, marginDrag: 0.040, burnGrowthShare: 0.56, opexLeverage: 1.03, capexScale: 1.40, wcPct: -0.05 },
    },
  },
  polyai: {
    marginAdj: -0.055,
    marginLeverage: 0.004,
    grossChurn: 0.045,
    expansion: 0.10,
    priceUplift: 0.02,
    growthDecay: 0.78,
    capexPct: 0.035,
    wcScale: 1.05,
    interestRate: 0.04,
    taxRate: 0.15,
    scenarios: {
      Low: { arrGrowthScale: 0.60, expansionScale: 0.85, churnScale: 0.80, marginDrag: 0.000, burnGrowthShare: 0.14, opexLeverage: 0.92, capexScale: 0.80, wcPct: 0.08 },
      Medium: { arrGrowthScale: 0.82, expansionScale: 1.0, churnScale: 0.95, marginDrag: 0.008, burnGrowthShare: 0.24, opexLeverage: 0.94, capexScale: 1.00, wcPct: 0.05 },
      High: { arrGrowthScale: 1.00, expansionScale: 1.1, churnScale: 1.08, marginDrag: 0.022, burnGrowthShare: 0.36, opexLeverage: 0.98, capexScale: 1.18, wcPct: 0.00 },
      Extreme: { arrGrowthScale: 1.15, expansionScale: 1.2, churnScale: 1.20, marginDrag: 0.038, burnGrowthShare: 0.50, opexLeverage: 1.02, capexScale: 1.35, wcPct: -0.04 },
    },
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
  if (mo < 18) return "#E4002B";   // BCG red — tight
  if (mo < 30) return "#F5A623";   // BCG amber — watch
  return "#009F6B";                // BCG green — healthy
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
  if (level === "Low") return "#009F6B";  // BCG green
  if (level === "Medium") return "#0077C8";  // BCG blue
  if (level === "Extreme") return "#E4002B";  // BCG red
  return "#F5A623";                           // BCG amber (High)
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function firstCashOutMonth(endCash, fcf) {
  for (let y = 1; y < endCash.length; y++) {
    if (endCash[y] < 0) {
      const monthlyFcfBurn = -fcf[y] / 12;
      return monthlyFcfBurn > 0 ? (y - 1) * 12 + (endCash[y - 1] / monthlyFcfBurn) : (y - 1) * 12;
    }
  }
  return Infinity;
}

function getPeerDetailedRunwayCase(company, burnCase, baseGrossMargin, baseGrowthRate, horizonYears) {
  const profile = PEER_DETAILED_PROFILES[company.id];
  const scenario = profile.scenarios[burnCase.level] || profile.scenarios.Medium;
  const modelYears = 30;
  const startArr = company.arrM;
  const endArr = [startArr];
  const endCash = [company.estCashOnHandM];
  const fcf = [0];

  let yearOne = null;

  for (let y = 1; y <= modelYears; y++) {
    const begArr = endArr[y - 1];
    const targetGrowth = baseGrowthRate * scenario.arrGrowthScale * Math.pow(profile.growthDecay, y - 1);
    const churnRate = profile.grossChurn * scenario.churnScale;
    const expansionRate = profile.expansion * scenario.expansionScale * Math.pow(profile.growthDecay, y - 1);
    const pricingRate = profile.priceUplift;
    const newLogoGrowth = baseGrowthRate === 0
      ? Math.max(0, churnRate - expansionRate - pricingRate)
      : Math.max(0, targetGrowth - expansionRate - pricingRate + churnRate);
    const newLogoArr = begArr * newLogoGrowth;
    const expansionArr = begArr * expansionRate;
    const pricingArr = begArr * pricingRate;
    const churnArr = -begArr * churnRate;
    const endingArr = Math.max(0, begArr + newLogoArr + expansionArr + pricingArr + churnArr);
    const revenue = (begArr + endingArr) / 2;
    const grossMargin = clamp(
      baseGrossMargin + profile.marginAdj + profile.marginLeverage * (y - 1) - scenario.marginDrag,
      0.45,
      0.96
    );
    const grossProfit = revenue * grossMargin;
    const opex = burnCase.monthlyGrossBurnM * 12 *
      Math.pow(1 + baseGrowthRate * scenario.burnGrowthShare, y - 1) *
      Math.pow(scenario.opexLeverage, y - 1);
    const capex = revenue * profile.capexPct * scenario.capexScale;
    const wc = Math.max(0, endingArr - begArr) * scenario.wcPct * profile.wcScale;
    const begCash = endCash[y - 1];
    const interest = Math.max(0, begCash) * profile.interestRate;
    const pretax = grossProfit - opex + interest;
    const cashTax = -Math.max(0, pretax) * profile.taxRate;
    const annualFcf = grossProfit - opex - capex + interest + cashTax + wc;
    const grossCashBurnAnnual = Math.max(0, opex + capex + Math.max(0, -cashTax) - interest - wc);

    endArr[y] = endingArr;
    fcf[y] = annualFcf;
    endCash[y] = begCash + annualFcf;

    if (y === 1) {
      yearOne = {
        monthlyGrossBurnM: grossCashBurnAnnual / 12,
        monthlyGrossProfitM: grossProfit / 12,
        netMonthlyBurnM: Math.max(-annualFcf, 0) / 12,
        breakevenArrM: grossMargin > 0 ? grossCashBurnAnnual / grossMargin : Infinity,
        offsetPct: Math.min((grossProfit / grossCashBurnAnnual) * 100, 999),
      };
    }
  }

  const runwayMonths = firstCashOutMonth(endCash, fcf);
  const horizonCash = endCash[Math.min(horizonYears, modelYears)];

  return {
    ...yearOne,
    runwayMonths,
    horizonCash,
    additionalArrM: Math.max(yearOne.breakevenArrM - startArr, 0),
    source: "abstracted",
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
        padding: "8px 20px",
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        border: "none",
        borderBottom: active ? "3px solid #009F6B" : "3px solid transparent",
        background: active ? "#E5F5EE" : "transparent",
        color: active ? "#007A53" : P.ink,
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
    <div style={{ background: P.card, border: `1px solid ${P.line}`, borderTop: `3px solid ${color || "#009F6B"}`, padding: "18px 18px 16px" }}>
      <div
        style={{ fontFamily: "'Courier New', monospace", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: P.ink, marginBottom: 8 }}
      >
        {label}
      </div>
      <div
        style={{ fontFamily: "'Courier New', monospace", fontSize: 24, fontWeight: 600, color: color || P.ink, lineHeight: 1 }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: P.slate, marginTop: 7, lineHeight: 1.4 }}>{sub}</div>}
    </div>
  );
}



// ── Runway scenario shareable defaults ───────────────────────────────────────
// The runway sliders are stepped index pickers (0–3). These defaults match the
// original starting positions: 90% margin, static ARR, 5-year horizon, Medium burn.
const RUNWAY_DEFAULTS = {
  marginIdx: 2,
  growthIdx: 0,
  horizonIdx: 1,
  sierraBurnIdx: 1,
  decagonBurnIdx: 1,
  parloaBurnIdx: 1,
  polyaiBurnIdx: 1,
};

function RunwayScenarioView({ sierraSettings, settings = RUNWAY_DEFAULTS, onChange }) {
  // Seed every slider from the (already-normalised) shared settings so a copied
  // runway link restores margin, ARR-growth, horizon and all four burn dials.
  const seed = { ...RUNWAY_DEFAULTS, ...(settings || {}) };
  const [marginIdx, setMarginIdx] = useState(seed.marginIdx);   // gross-margin slider
  const [growthIdx, setGrowthIdx] = useState(seed.growthIdx);   // ARR-growth slider
  const [horizonIdx, setHorizonIdx] = useState(seed.horizonIdx); // cash-horizon slider

  const [sierraBurnIdx, setSierraBurnIdx] = useState(seed.sierraBurnIdx);
  const [decagonBurnIdx, setDecagonBurnIdx] = useState(seed.decagonBurnIdx);
  const [parloaBurnIdx, setParloaBurnIdx] = useState(seed.parloaBurnIdx);
  const [polyaiBurnIdx, setPolyaiBurnIdx] = useState(seed.polyaiBurnIdx);

  // Lift each change to the viewer so the runway scenario becomes shareable.
  // We pass the full next state — closure values plus the just-changed patch —
  // because React state updates are async and the bare closure would lag a step.
  const share = (patch) => onChange?.({
    marginIdx, growthIdx, horizonIdx,
    sierraBurnIdx, decagonBurnIdx, parloaBurnIdx, polyaiBurnIdx,
    ...patch,
  });

  const updateMargin = (v) => { setMarginIdx(v); share({ marginIdx: v }); };
  const updateGrowth = (v) => { setGrowthIdx(v); share({ growthIdx: v }); };
  const updateHorizon = (v) => { setHorizonIdx(v); share({ horizonIdx: v }); };

  const burnState = { sierra: sierraBurnIdx, decagon: decagonBurnIdx, parloa: parloaBurnIdx, polyai: polyaiBurnIdx };
  const burnSetters = { sierra: setSierraBurnIdx, decagon: setDecagonBurnIdx, parloa: setParloaBurnIdx, polyai: setPolyaiBurnIdx };

  const marginOptions = [0.75, 0.80, 0.90, 0.95];
  const growthOptions = [0.0, 0.25, 0.50, 1.0];
  const horizonOptions = [3, 5, 7, 10];

  const grossMargin = marginOptions[marginIdx];
  const growthRate = growthOptions[growthIdx];
  const horizonYears = horizonOptions[horizonIdx];

  const getCompanyBurnIdx = (id) => burnState[id] ?? 1;

  const setCompanyBurnIdx = (id, v) => {
    burnSetters[id]?.(v);
    share({ [`${id}BurnIdx`]: v });
  };

  // Returns a setter bound to one company; keeps the call-sites below unchanged.
  const getCompanySetBurnIdx = (id) => (v) => setCompanyBurnIdx(id, v);

  // Global preset moves all four burn dials at once — share them in one update.
  const setAllBurn = (idx) => {
    setSierraBurnIdx(idx); setDecagonBurnIdx(idx); setParloaBurnIdx(idx); setPolyaiBurnIdx(idx);
    share({ sierraBurnIdx: idx, decagonBurnIdx: idx, parloaBurnIdx: idx, polyaiBurnIdx: idx });
  };

  const rows = COMPANIES.map(company => {
    const burnIdx = getCompanyBurnIdx(company.id);
    const burnCase = RUNWAY_BURN_CASES[company.id].cases[burnIdx];
    const detailed = company.id === "sierra"
      ? getSierraDetailedRunwayCase(burnCase.level, horizonYears, sierraSettings)
      : getPeerDetailedRunwayCase(company, burnCase, grossMargin, growthRate, horizonYears);

    return {
      company,
      level: burnCase.level,
      monthlyGrossBurnM: detailed.monthlyGrossBurnM,
      monthlyGrossProfitM: detailed.monthlyGrossProfitM,
      netMonthlyBurnM: detailed.netMonthlyBurnM,
      runwayMonths: detailed.runwayMonths,
      breakevenArrM: detailed.breakevenArrM,
      additionalArrM: detailed.additionalArrM,
      offsetPct: detailed.offsetPct,
      fiveYearCashPositionM: detailed.horizonCash,
      note: company.id === "sierra"
        ? `${burnCase.note} Sierra values are sourced from the Sierra Model tab's Year 1 economics and full cash bridge.`
        : `${burnCase.note} Uses the shared detailed bridge with ${company.name}-specific retention, expansion, margin, capex, working-capital, tax, and interest assumptions.`,
      burnIdx,
      source: detailed.source,
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
          Runway scenarios with a shared detailed cash bridge
        </h2>
        <p style={{ maxWidth: 760, color: P.slate, lineHeight: 1.6, fontSize: 14.5, margin: 0 }}>
          Every row now uses a detailed annual projection with ARR bridge, gross margin, opex, capex, tax, interest, working capital, and cash runway.
          Sierra uses the matching Low / Medium / High / Extreme case from the Sierra Model tab; Decagon, Parloa, and PolyAI use abstracted company-specific profiles at {Math.round(grossMargin * 100)}% base gross margin and {growthRate === 0 ? "0%" : `${Math.round(growthRate * 100)}%`} base ARR growth.
        </p>
      </section>

      {/* Control Panel Card */}
      <div style={{ background: P.card, border: `1px solid ${P.line}`, padding: "20px 24px", marginBottom: 28, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
        {/* Gross Margin Slider */}
        <div>
          <label style={{ display: "block", fontSize: 11, fontFamily: "'Courier New', monospace", textTransform: "uppercase", color: P.ink, marginBottom: 8, fontWeight: 700 }}>
            Base Gross Margin: <span style={{ color: P.ink, fontWeight: 700 }}>{Math.round(grossMargin * 100)}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="3"
            step="1"
            value={marginIdx}
            onChange={(e) => updateMargin(parseInt(e.target.value))}
            style={{ width: "100%" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: P.slate, marginTop: 4, fontFamily: "'Courier New', monospace" }}>
            <span>75%</span>
            <span>80%</span>
            <span>90%</span>
            <span>95%</span>
          </div>
        </div>

        {/* ARR Growth Slider */}
        <div>
          <label style={{ display: "block", fontSize: 11, fontFamily: "'Courier New', monospace", textTransform: "uppercase", color: P.ink, marginBottom: 8, fontWeight: 700 }}>
            Base ARR Growth: <span style={{ color: P.ink, fontWeight: 700 }}>{growthRate === 0 ? "Static (0%)" : `${Math.round(growthRate * 100)}%/yr`}</span>
          </label>
          <input
            type="range"
            min="0"
            max="3"
            step="1"
            value={growthIdx}
            onChange={(e) => updateGrowth(parseInt(e.target.value))}
            style={{ width: "100%" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: P.slate, marginTop: 4, fontFamily: "'Courier New', monospace" }}>
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Horizon Years Slider */}
        <div>
          <label style={{ display: "block", fontSize: 11, fontFamily: "'Courier New', monospace", textTransform: "uppercase", color: P.ink, marginBottom: 8, fontWeight: 700 }}>
            Cash Horizon: <span style={{ color: P.ink, fontWeight: 700 }}>{horizonYears} Years</span>
          </label>
          <input
            type="range"
            min="0"
            max="3"
            step="1"
            value={horizonIdx}
            onChange={(e) => updateHorizon(parseInt(e.target.value))}
            style={{ width: "100%" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: P.slate, marginTop: 4, fontFamily: "'Courier New', monospace" }}>
            <span>3 yrs</span>
            <span>5 yrs</span>
            <span>7 yrs</span>
            <span>10 yrs</span>
          </div>
        </div>

        {/* Global Preset Control */}
        <div>
          <label style={{ display: "block", fontSize: 11, fontFamily: "'Courier New', monospace", textTransform: "uppercase", color: P.ink, marginBottom: 8, fontWeight: 700 }}>
            Global Burn Preset
          </label>
          <div style={{ display: "flex", gap: 6 }}>
            {["Low", "Medium", "High", "Extreme"].map((level, idx) => (
              <button
                key={level}
                type="button"
                onClick={() => setAllBurn(idx)}
                style={{
                  flex: 1,
                  padding: "6px 4px",
                  fontSize: 10,
                  fontFamily: "'Courier New', monospace",
                  fontWeight: 600,
                  border: `1px solid ${P.line}`,
                  background: (sierraBurnIdx === idx && decagonBurnIdx === idx && parloaBurnIdx === idx && polyaiBurnIdx === idx) ? P.ink : P.card,
                  color: (sierraBurnIdx === idx && decagonBurnIdx === idx && parloaBurnIdx === idx && polyaiBurnIdx === idx) ? P.paper : P.ink,
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
          label="Base Gross Margin"
          value={`${Math.round(grossMargin * 100)}%`}
          sub="feeds abstracted peer profiles"
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
          sub="Detailed model Year 1 gross profit"
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
          <h2 className="fr" style={{ fontSize: 22, fontWeight: 700, margin: 0, paddingBottom: 8, borderBottom: "2px solid #009F6B" }}>Scenario Matrix</h2>
          <span className="mono" style={{ fontSize: 11, color: P.slate }}>Sierra = editable tab model · peers = abstracted detailed profiles</span>
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
                            {row.source === "detailed" ? "Sierra tab" : "Abstracted"}
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
            {horizonYears}-year cash position now comes from each company's detailed annual cash bridge.
            Peer profiles use the base margin and ARR-growth sliders, then adjust retention, expansion, opex leverage, capex, and working capital by company and burn case.
            Positive values mean current cash plus durable ARR covers the burn case for {horizonYears} years; negative values indicate the funding or ARR gap.
          </div>
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 className="fr" style={{ fontSize: 22, fontWeight: 700, margin: "0 0 14px", paddingBottom: 8, borderBottom: "2px solid #009F6B" }}>Company Burn Cases</h2>
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
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: P.slate, marginTop: 4, fontFamily: "'Courier New', monospace" }}>
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
                        <div className="mono" style={{ fontSize: 9.5, color: P.ink, fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>ARR coverage</div>
                        <strong className="mono">{fmtPct(row.offsetPct)}</strong>
                      </div>
                      <div>
                        <div className="mono" style={{ fontSize: 9.5, color: P.ink, fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>Breakeven ARR</div>
                        <strong className="mono">{fmtM(row.breakevenArrM)}</strong>
                      </div>
                      <div>
                        <div className="mono" style={{ fontSize: 9.5, color: P.ink, fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>Runway</div>
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
          A high gross burn rate can still produce moderate net burn if ARR is already large, durable, and high-margin. The Sierra
          {` ${sierraRow.level} `}case, for example, uses detailed Year 1 gross profit of {` ${fmtMonthlyBurn(sierraRow.monthlyGrossProfitM)} `}
          against detailed cash outflows of {` ${fmtMonthlyBurn(sierraRow.monthlyGrossBurnM)} `}, leaving
          {` ${fmtMonthlyBurn(sierraRow.netMonthlyBurnM)} `} of net monthly cash burn.
          The same logic is now applied to Decagon, Parloa, and PolyAI through abstracted company profiles, so the strategic question is not only runway, but whether ARR quality, retention, margin, and opex leverage justify treating gross profit as a {horizonYears}-year funding source.
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
      <div style={{ fontFamily: "'Courier New', monospace", fontSize: 12, color, minWidth: 62, textAlign: "right", fontWeight: 600 }}>
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
      <div style={{ fontFamily: "'Courier New', monospace", fontSize: 13, fontWeight: 600, color: P.ink, minWidth: 56, textAlign: "right" }}>
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
          <span style={{ fontFamily: "'Courier New', monospace", color: P.brass }}>⁽¹⁾⁽²⁾</span>
          &nbsp;Burn Rate &amp; Runway Estimation Methodology
        </span>
        <span style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: P.slate }}>{open ? "close −" : "expand +"}</span>
      </div>
      {open && (
        <div style={{ padding: "16px 18px 18px", background: P.paper, fontSize: 13, lineHeight: 1.65, color: P.ink, borderTop: `1px solid ${P.line}` }}>
          <p style={{ margin: "0 0 12px", fontWeight: 600, color: P.rust }}>
            ⚠ None of these companies publicly disclose burn rates, cash balances, or runway.
          </p>
          <p style={{ margin: "0 0 10px" }}>Estimates are derived from available public data using the following methodology:</p>
          <p style={{ margin: "0 0 10px", color: P.slate }}>
            In Runway Scenarios, all companies now use a detailed annual cash bridge. Sierra is sourced from the Sierra Model tab's current assumptions; Decagon, Parloa, and PolyAI use abstracted company-specific profiles built from the same logic.
          </p>
          <ul style={{ margin: "0 0 12px", paddingLeft: 20 }}>
            <li style={{ marginBottom: 6 }}>
              <strong>Gross burn case</strong> = selected Low / Medium / High / Extreme operating-cost anchor, informed by headcount, AI infrastructure, delivery intensity, and company scale.
            </li>
            <li style={{ marginBottom: 6 }}>
              <strong>ARR bridge</strong> = beginning ARR plus new-logo growth, expansion, pricing, and churn. Peer profiles use the base ARR-growth slider, then adjust by company and burn case.
            </li>
            <li style={{ marginBottom: 6 }}>
              <strong>Net burn ⁽¹⁾</strong> = detailed gross profit minus opex, capex, taxes, interest, and working-capital movement. Larger durable ARR bases can offset high gross burn.
            </li>
            <li>
              <strong>Runway ⁽²⁾</strong> = first cash-out point in the annual bridge, measured from estimated June 2026 cash on hand.
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

// ── BCG Wordmark ──────────────────────────────────────────────────────────────
const BCGMark = () => (
  <span style={{ fontFamily: "'Trebuchet MS', 'Helvetica Neue', Arial, sans-serif", fontWeight: 700, fontSize: 17, color: "#FFFFFF", letterSpacing: "0.02em" }}>
    BCG<span style={{ color: "#009F6B", marginLeft: 2 }}>●</span>
  </span>
);

// ─────────────────────────────────────────────────────────────────────────────
// Shareable settings contract
//
// The viewer (viewer-shared.mjs) mounts this component with `initialSettings`,
// reads the exported `DEFAULT_SETTINGS`, and diffs the two to encode only what
// changed into a copyable URL. Shareable state = the active tab, the selected
// company, every Runway-scenario slider, and the nested Sierra model settings.
// Transient UI (open accordions, the burn-method foldaway) stays local and is
// deliberately never written to the URL.
// ─────────────────────────────────────────────────────────────────────────────
const VIEW_KEYS = ["compare", "runway", "sierra", "detail"];
const COMPANY_IDS = COMPANIES.map((c) => c.id);
const RUNWAY_INDEX_KEYS = Object.keys(RUNWAY_DEFAULTS);

export const DEFAULT_SETTINGS = {
  view: "compare",
  selected: "sierra",
  runway: { ...RUNWAY_DEFAULTS },
  sierra: SIERRA_DEFAULT_SETTINGS,
};

// Restored settings arrive from an untrusted base64url URL value: validate the
// tab/company against known keys, clamp every runway dial into its 0–3 slider
// range, and pass the Sierra block through (the Sierra model re-validates it),
// so a hand-crafted or stale link can never break rendering.
function clampRunwayIndex(value, fallback) {
  const n = Math.round(typeof value === "number" ? value : Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(3, Math.max(0, n));
}

function normaliseSettings(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const view = VIEW_KEYS.includes(r.view) ? r.view : DEFAULT_SETTINGS.view;
  const selected = COMPANY_IDS.includes(r.selected) ? r.selected : DEFAULT_SETTINGS.selected;

  const rr = r.runway && typeof r.runway === "object" ? r.runway : {};
  const runway = {};
  RUNWAY_INDEX_KEYS.forEach((k) => { runway[k] = clampRunwayIndex(rr[k], RUNWAY_DEFAULTS[k]); });

  const sierra = r.sierra && typeof r.sierra === "object" ? r.sierra : SIERRA_DEFAULT_SETTINGS;

  return { view, selected, runway, sierra };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function ConversationalAIFunding({ initialSettings = DEFAULT_SETTINGS, onSettingsChange } = {}) {
  const restored = useMemo(() => normaliseSettings(initialSettings), [initialSettings]);
  const [view, setView] = useState(restored.view);             // shared: active tab
  const [selected, setSelected] = useState(restored.selected); // shared: company detail
  const [runway, setRunway] = useState(restored.runway);       // shared: runway sliders
  const [sierraSettings, setSierraSettings] = useState(restored.sierra); // shared: Sierra model
  // Transient UI — intentionally local, never written to the copied URL.
  const [openRound, setOpenRound] = useState(null);
  const [burnOpen, setBurnOpen] = useState(false);

  // Tell the viewer the full shareable state after any change; it diffs against
  // DEFAULT_SETTINGS and encodes only what differs.
  const share = (next) => onSettingsChange?.({
    view: next.view ?? view,
    selected: next.selected ?? selected,
    runway: next.runway ?? runway,
    sierra: next.sierra ?? sierraSettings,
  });

  const selectView = (v) => { setView(v); share({ view: v }); };
  const selectCompany = (id) => { setSelected(id); setOpenRound(null); share({ selected: id }); };
  const handleRunwayChange = (nextRunway) => { setRunway(nextRunway); share({ runway: nextRunway }); };
  const handleSierraChange = (nextSierra) => { setSierraSettings(nextSierra); share({ sierra: nextSierra }); };

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
    { key: "Revenue Benchmark", vals: COMPANIES.map(c => fmtM(c.benchmark.revenueM)), mono: true },
    { key: "Funding Benchmark", vals: COMPANIES.map(c => fmtM(c.benchmark.fundingM)), mono: true },
    { key: "Valuation Benchmark", vals: COMPANIES.map(c => fmtM(c.benchmark.valuationM)), mono: true },
  ];

  return (
    <div style={{ background: P.paper, minHeight: "100vh", color: P.ink, fontFamily: "Arial, 'Helvetica Neue', sans-serif" }}>
      <style>{`
        
        * { box-sizing: border-box; }
        .fr  { font-family: 'Trebuchet MS', 'Helvetica Neue', Arial, sans-serif; }
        .mono { font-family: 'Courier New', monospace; }
        .hover-row { transition: background .12s; }
        .hover-row:hover { background: #F5F5F5 !important; }
        a { color: #009F6B; text-decoration: none; border-bottom: 1px solid #ECECEC; }
        a:hover { color: #1A1A1A; border-color: #0077C8; }
        button { font-family: inherit; }
        :focus-visible { outline: 2px solid #009F6B; outline-offset: 2px; }
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
            border: 1px solid #ECECEC !important;
            background: #FFFFFF !important;
          }
          .scenario-matrix-table td {
            display: flex;
            min-width: 0;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 9px 10px !important;
            border-top: 1px solid #ECECEC;
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
            color: #888888;
            font-family: 'Courier New', monospace;
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
          background: #ECECEC;
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
          background: #009F6B;
          cursor: pointer;
          border: 2px solid #FFFFFF;
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
          background: #009F6B;
          cursor: pointer;
          border: 2px solid #FFFFFF;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
          transition: transform 0.1s ease;
        }
        input[type="range"]::-moz-range-thumb:hover {
          transform: scale(1.2);
        }
      `}</style>

      {/* ── BCG TOP BAR ──────────────────────────────────────────────────── */}
      <div style={{ background: "#1A1A1A", color: "#FFFFFF", padding: "0 32px", height: 50, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 4px rgba(0,0,0,0.18)" }}>
        <BCGMark />
        <span style={{ fontSize: 11, color: "#AAAAAA", fontFamily: "Arial, 'Helvetica Neue', sans-serif", letterSpacing: "0.05em" }}>
          Conversational AI · Funding &amp; Diligence Tracker · June 2026
        </span>
      </div>

      <div style={{ maxWidth: 1020, margin: "0 auto", padding: "clamp(24px,5vw,48px) clamp(18px,4vw,32px)" }}>

        {/* ── HEADER ───────────────────────────────────────────────────── */}
        <header style={{ borderBottom: `2px solid ${P.ink}`, paddingBottom: 22, marginBottom: 32 }}>
          <div
            style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: P.brass, marginBottom: 12, fontFamily: "Arial, 'Helvetica Neue', sans-serif" }}
          >
            Conversational AI · Funding, Market Context &amp; Diligence Tracker
          </div>
          <h1 className="fr" style={{ fontSize: 36, lineHeight: 1.05, fontWeight: 700, margin: "0 0 14px", color: "#1A1A1A" }}>
            Sierra · Decagon · Parloa · PolyAI
          </h1>
          <p style={{ maxWidth: 680, color: P.slate, lineHeight: 1.55, fontSize: 14, margin: 0 }}>
            Capital raised, private valuations, reported ARR, and estimated burn rates &amp; runway for four
            enterprise conversational AI platforms, cross-referenced against industry benchmarks.
            Burn and runway figures remain analyst estimates — none of these companies disclose financial statements.
          </p>
        </header>

        {/* ── CONTROLS ─────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 14, marginBottom: 28 }}>
          <div style={{ display: "inline-flex", border: `1px solid ${P.line}`, borderRadius: 4, overflow: "hidden", background: "#FFFFFF" }}>
            <ViewSeg active={view === "compare"} onClick={() => selectView("compare")}>Side-by-Side</ViewSeg>
            <ViewSeg active={view === "runway"} onClick={() => selectView("runway")}>Runway Scenarios</ViewSeg>
            <ViewSeg active={view === "sierra"} onClick={() => selectView("sierra")}>Sierra Model</ViewSeg>
            <ViewSeg active={view === "detail"} onClick={() => selectView("detail")}>Company Detail</ViewSeg>
          </div>
          {view === "detail" && (
            <div style={{ display: "inline-flex", border: `1px solid ${P.line}`, borderRadius: 2, overflow: "hidden", gap: 1, background: P.line }}>
              {COMPANIES.map(c => (
                <CompanySeg key={c.id} c={c} active={selected === c.id} onClick={() => selectCompany(c.id)} />
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
                <div key={c.id} style={{ background: P.card, padding: "18px 16px 20px", borderLeft: `4px solid ${ACCENT[c.id]}` }}>
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
                  <tr style={{ background: "#1A1A1A" }}>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontFamily: "'Courier New', monospace", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#AAAAAA", fontWeight: 600 }}>
                      Metric
                    </th>
                    {COMPANIES.map(c => (
                      <th key={c.id} style={{ padding: "12px 16px", textAlign: "right", fontFamily: "'Courier New', monospace", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#FFFFFF", fontWeight: 700, borderLeft: "1px solid #333333" }}>
                        {c.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row, i) => (
                    <tr key={row.key} style={{ borderTop: `1px solid ${P.line}`, background: i % 2 === 0 ? P.card : P.paper }}>
                      <td style={{ padding: "11px 16px", color: P.ink, fontFamily: "'Courier New', monospace", fontSize: 11, fontWeight: 500, whiteSpace: "nowrap" }}>
                        {row.key}
                      </td>
                      {COMPANIES.map((c, ci) => (
                        <td key={c.id} style={{
                          padding: "11px 16px",
                          textAlign: "right",
                          fontFamily: row.mono ? "'Courier New', monospace" : "inherit",
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
                <span style={{ fontSize: 11.5, color: "#555555" }}>* Projected ARR figure, not company-confirmed. ⁽¹⁾⁽²⁾ See burn methodology note below.</span>
              </div>
            </div>

            {/* ARR comparison bars */}
            <section style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
                <h2 className="fr" style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#1A1A1A", paddingBottom: 8, borderBottom: "2px solid #009F6B" }}>ARR Comparison</h2>
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
                <h2 className="fr" style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#1A1A1A", paddingBottom: 8, borderBottom: "2px solid #009F6B" }}>Estimated Runway</h2>
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
              <h2 className="fr" style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px", color: "#1A1A1A", paddingBottom: 8, borderBottom: "2px solid #009F6B" }}>Capital Efficiency</h2>
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
            sierraSettings={sierraSettings}
            settings={runway}
            onChange={handleRunwayChange}
          />
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* SIERRA SCENARIO MODEL                                          */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {view === "sierra" && (
          <SierraScenarioModel
            embedded
            initialSettings={sierraSettings || undefined}
            onSettingsChange={handleSierraChange}
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
                    Industry benchmark
                  </div>
                  <div className="fr" style={{ fontSize: 22, lineHeight: 1.15, fontWeight: 500 }}>{company.benchmark.thesis}</div>
                </div>
              </div>
              <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: P.line, border: `1px solid ${P.line}`, marginBottom: 12 }}>
                <KpiCard label="Benchmark Revenue" value={fmtM(company.benchmark.revenueM)} sub="2025 estimate" color={ACCENT[company.id]} />
                <KpiCard label="Benchmark Funding" value={fmtM(company.benchmark.fundingM)} sub="estimated funding" />
                <KpiCard label="Benchmark Valuation" value={fmtM(company.benchmark.valuationM)} sub="estimated valuation" />
                <KpiCard label="Benchmark FTEs" value={company.benchmark.employees} sub="estimated team size" />
              </div>
              <p style={{ margin: 0, fontSize: 12.5, color: P.slate, lineHeight: 1.55 }}>
                {company.benchmark.caveat}
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
                              <div className="mono" style={{ fontSize: 10, color: P.ink, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Amount Raised</div>
                              <div className="mono" style={{ fontWeight: 700, fontSize: 16 }}>{fmtM(round.amount)}</div>
                            </div>
                            <div>
                              <div className="mono" style={{ fontSize: 10, color: P.ink, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Post-Money Valuation</div>
                              <div className="mono" style={{ fontWeight: 700, fontSize: 16 }}>{round.postValM ? fmtM(round.postValM) : "Not disclosed"}</div>
                            </div>
                            <div>
                              <div className="mono" style={{ fontSize: 10, color: P.ink, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Lead Investor(s)</div>
                              <div style={{ fontSize: 14, fontWeight: 500 }}>{round.lead || "Not disclosed"}</div>
                            </div>
                            {round.postValM && i > 0 && company.rounds[i - 1].postValM && (
                              <div>
                                <div className="mono" style={{ fontSize: 10, color: P.ink, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Valuation Step-up</div>
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
                <h2 className="fr" style={{ fontSize: 22, fontWeight: 700, margin: "0 0 14px", color: "#1A1A1A", paddingBottom: 8, borderBottom: "2px solid #009F6B" }}>ARR Progression</h2>
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
                        <div className="mono" style={{ fontSize: 10, color: P.ink, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>ARR Growth</div>
                        <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: P.sage }}>
                          {(company.arrHistory[company.arrHistory.length - 1].arrM / company.arrHistory[0].arrM).toFixed(1)}×
                        </div>
                        <div style={{ fontSize: 12, color: P.slate }}>
                          {company.arrHistory[0].period} → {company.arrHistory[company.arrHistory.length - 1].period}
                        </div>
                      </div>
                      <div>
                        <div className="mono" style={{ fontSize: 10, color: P.ink, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Current ARR</div>
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
