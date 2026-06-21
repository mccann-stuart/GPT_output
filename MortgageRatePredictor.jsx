import React, { useState, useMemo, useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// UK MORTGAGE RATE PREDICTOR
// Decomposition model:
//   Mortgage rate ≈ SONIA swap (for term) + funding spread + credit/capital cost
//                   + operating cost + profit margin + competitive adjustment
//
// Figures below are calibrated to mid-June 2026 market conditions:
//   • BoE Bank Rate held at 3.75% (18 Jun 2026)
//   • BoE OIS spot curve: 2yr ≈ 4.02%, 5yr ≈ 4.05% (18 Jun 2026)
//   • Avg 2yr fix ≈ 5.61%, 5yr fix ≈ 5.58% (Moneyfacts, mid-June)
// Spread components are illustrative lender build-ups; adjust the sliders to model.
// ─────────────────────────────────────────────────────────────────────────────

const PALETTE = {
  ink: "#15201A",        // deep forest ink — text
  paper: "#F3EFE6",      // warm parchment — background
  sage: "#5C7A6B",       // muted sage — primary accent
  brass: "#B08A4F",      // brass — secondary accent / numbers
  rust: "#A8563C",       // rust — "up" / pressure
  slate: "#6E7B82",      // slate — neutral / flat
  line: "#D6CFC0",       // hairline
  card: "#FBFAF5",       // card surface
};

const TERMS = [
  { key: "3m", label: "3 months", sub: "near-term" },
  { key: "12m", label: "12 months", sub: "one-year view" },
  { key: "5y", label: "5 years", sub: "structural" },
];

const SOURCE_URLS = {
  boeYieldCurves: "https://www.bankofengland.co.uk/statistics/yield-curves",
  boeMarketIntelligence: "https://www.bankofengland.co.uk/markets/market-intelligence#maps",
  boeMarketParticipantsResults: "https://www.bankofengland.co.uk/news?NewsTypes=ce90163e489841e0b66d06243d5cb&Taxonomies=7759a9a631ec488289fdc138151ffea3&InfiniteScrolling=False&Direction=Latest",
  boeSonia: "https://www.bankofengland.co.uk/markets/sonia-benchmark",
  boeBankRate: "https://www.bankofengland.co.uk/monetary-policy/the-interest-rate-bank-rate",
  boeDatabase: "https://www.bankofengland.co.uk/boeapps/database/",
  dmoData: "https://www.dmo.gov.uk/data/",
  iceSoniaFutures: "https://www.ice.com/products/68361266/Three-Month-SONIA-Index-Futures/data?marketId=6476274&span=3",
  blueGammaSoniaSwaps: "https://www.bluegamma.io/sonia-swap-rates-uk",
  chathamEuropeRates: "https://www.chathamfinancial.com/technology/european-market-rates",
  moneyfactsMortgages: "https://moneyfactscompare.co.uk/mortgages/",
  ukFinanceData: "https://www.ukfinance.org.uk/data-analysis/data",
  onsInflation: "https://www.ons.gov.uk/economy/inflationandpriceindices",
  praPolicy: "https://www.bankofengland.co.uk/prudential-regulation",
  boeFinancialStabilityReports: "https://www.bankofengland.co.uk/news?NewsTypes=ce90163e489841e0b66d06243d35d5cb&Taxonomies=4973ac117aea43ed91a798089845a4f5&InfiniteScrolling=False&Direction=Latest",
  bsaStats: "https://www.bsa.org.uk/statistics",
};

const LIVE_INDICATORS = [
  {
    id: "sonia-ois-forward",
    title: "SONIA OIS forward curve",
    source: "BoE latest yield curve",
    cadence: "Daily, next UK business day",
    use: "Refreshes the expected SONIA path behind fixed-rate swap funding.",
    caveat: "Estimated curve data, not an intraday trading screen.",
    links: [
      { label: "Yield curve page", url: SOURCE_URLS.boeYieldCurves },
    ],
  },
  {
    id: "boe-yield-curve",
    title: "BoE yield curve data",
    source: "BoE gilts, inflation and OIS curves",
    cadence: "Daily curve files, archive monthly",
    use: "Cross-checks gilt yields, real yields, inflation forwards and OIS rates.",
    caveat: "BoE states the yield curve data are not available through an API.",
    links: [
      { label: "Yield curve hub", url: SOURCE_URLS.boeYieldCurves },
    ],
  },
  {
    id: "mpc-dated-ois",
    title: "MPC-dated OIS pricing",
    source: "Market-implied Bank Rate path",
    cadence: "Intraday in terminals; public proxies update by release",
    use: "Tests whether the market is pricing cuts, holds or hikes around MPC dates.",
    caveat: "Exact MPC-date pricing usually needs a market-data terminal; public links are proxies.",
    links: [
      { label: "BoE Market Participants Survey", url: SOURCE_URLS.boeMarketIntelligence },
      { label: "Latest MPS results", url: SOURCE_URLS.boeMarketParticipantsResults },
      { label: "BoE Bank Rate decision", url: SOURCE_URLS.boeBankRate },
    ],
  },
  {
    id: "market-participants-survey",
    title: "Market Participants Survey",
    source: "BoE MaPS aggregate results",
    cadence: "Eight rounds per year",
    use: "Adds surveyed expectations for Bank Rate, macro risks and financial markets.",
    caveat: "Survey expectations can lag fast market repricing.",
    links: [
      { label: "BoE MaPS overview", url: SOURCE_URLS.boeMarketIntelligence },
      { label: "Latest MaPS results", url: SOURCE_URLS.boeMarketParticipantsResults },
    ],
  },
  {
    id: "sonia-futures",
    title: "Short sterling / SONIA futures",
    source: "ICE Three Month SONIA futures",
    cadence: "Exchange trading hours",
    use: "Liquid exchange-traded read on near-term sterling rate expectations.",
    caveat: "Short Sterling is historical LIBOR-era context; SONIA futures are the live RFR market.",
    links: [
      { label: "ICE 3m SONIA futures", url: SOURCE_URLS.iceSoniaFutures },
      { label: "BoE SONIA benchmark", url: SOURCE_URLS.boeSonia },
    ],
  },
  {
    id: "two-year-gilts",
    title: "2-year gilt yields",
    source: "UK DMO gilt prices and yields",
    cadence: "Daily market data",
    use: "Benchmarks the front-end risk-free rate and lender funding alternatives.",
    caveat: "Gilt yields and mortgage swap rates move together, but are not substitutes.",
    links: [
      { label: "DMO gilt data", url: SOURCE_URLS.dmoData },
      { label: "BoE nominal gilt curve", url: SOURCE_URLS.boeYieldCurves },
    ],
  },
  {
    id: "inflation-breakevens",
    title: "Inflation expectations / breakevens",
    source: "BoE implied inflation curve and index-linked gilts",
    cadence: "Daily curve files",
    use: "Flags whether inflation risk is lifting the swap and gilt curves.",
    caveat: "RPI-linked gilt breakevens are not the same as CPI expectations.",
    links: [
      { label: "BoE implied inflation curve", url: SOURCE_URLS.boeYieldCurves },
      { label: "DMO index-linked gilts", url: SOURCE_URLS.dmoData },
      { label: "ONS inflation release", url: SOURCE_URLS.onsInflation },
    ],
  },
  {
    id: "mortgage-swap-rates",
    title: "Mortgage swap rates",
    source: "SONIA swap-rate market pages",
    cadence: "Provider-dependent; often intraday or daily",
    use: "Refreshes the 2-year and 5-year swap anchors for fixed mortgage pricing.",
    caveat: "Commercial pages may require subscriptions for exports and full histories.",
    links: [
      { label: "BlueGamma SONIA swaps", url: SOURCE_URLS.blueGammaSoniaSwaps },
      { label: "Chatham European rates", url: SOURCE_URLS.chathamEuropeRates },
      { label: "BoE OIS curve", url: SOURCE_URLS.boeYieldCurves },
    ],
  },
];

const INDICATOR_BY_ID = LIVE_INDICATORS.reduce((acc, indicator) => {
  acc[indicator.id] = indicator;
  return acc;
}, {});

function indicatorLink(id, linkIndex = 0) {
  const indicator = INDICATOR_BY_ID[id];
  const link = indicator.links[linkIndex] || indicator.links[0];
  return {
    label: indicator.title,
    url: link.url,
    meta: `${indicator.source} · ${indicator.cadence}`,
  };
}

// Trend direction per lever per horizon: "down" | "flat" | "up"
// magnitude is an approximate bps move expected over that horizon (signed)
const LEVERS = [
  {
    id: "swap",
    name: "SONIA swap rate (term)",
    role: "Cost of fixed-term wholesale funding for the chosen fix length",
    base2y: 4.02,
    base5y: 4.05,
    weight: "Primary driver",
    note: "2yr swap drives 2yr fixes; 5yr swap drives 5yr fixes. Moves with Bank Rate expectations, inflation risk and gilt yields, often within days.",
    trends: {
      "3m": { dir: "flat", bps: -5, why: "Peace-deal relief is pulling against still-elevated energy and wage risk." },
      "12m": { dir: "flat", bps: 0, why: "The OIS curve is no longer clearly pricing fast easing from Bank Rate at 3.75%." },
      "5y": { dir: "up", bps: 10, why: "Longer forwards still embed inflation and term-premium risk." },
    },
    direct: [
      indicatorLink("sonia-ois-forward"),
      indicatorLink("mortgage-swap-rates"),
      indicatorLink("boe-yield-curve"),
    ],
    indirect: [
      indicatorLink("mpc-dated-ois"),
      indicatorLink("sonia-futures"),
      indicatorLink("inflation-breakevens"),
    ],
  },
  {
    id: "funding",
    name: "Lender funding spread",
    role: "Cost of retail deposits + wholesale funding above the swap, plus hedging",
    base2y: 0.50,
    base5y: 0.45,
    weight: "Secondary driver",
    note: "Reflects deposit competition, securitisation/covered-bond costs and basis risk between the swap and actual funding.",
    trends: {
      "3m": { dir: "flat", bps: 0, why: "Deposit pricing stable; wholesale markets calm." },
      "12m": { dir: "down", bps: -5, why: "Easing funding conditions if BoE signals cuts." },
      "5y": { dir: "flat", bps: 0, why: "Structurally anchored; depends on funding mix." },
    },
    direct: [
      { label: "BoE database — household and deposit rates", url: SOURCE_URLS.boeDatabase, meta: "Official database · published releases" },
      indicatorLink("two-year-gilts"),
      indicatorLink("boe-yield-curve"),
    ],
    indirect: [
      { label: "Covered bond / RMBS spreads", url: "https://www.lseg.com/en/data-analytics", meta: "Commercial market data · subscription likely" },
      indicatorLink("sonia-futures"),
    ],
  },
  {
    id: "credit",
    name: "Credit & capital cost",
    role: "Expected losses + the cost of regulatory capital held against the loan",
    base2y: 0.62,
    base5y: 0.62,
    weight: "Risk-driven",
    note: "Higher LTV and weaker affordability raise this. Sensitive to arrears, house-price outlook and capital rules.",
    trends: {
      "3m": { dir: "flat", bps: 0, why: "Arrears contained; no near-term capital change." },
      "12m": { dir: "up", bps: 8, why: "Mild rise if affordability stress and arrears tick up." },
      "5y": { dir: "up", bps: 12, why: "Basel 3.1 / capital floors gradually phase in." },
    },
    direct: [
      { label: "UK Finance — arrears & possessions", url: SOURCE_URLS.ukFinanceData, meta: "Industry data · mortgage performance" },
      { label: "BoE database — MLAR and mortgage series", url: SOURCE_URLS.boeDatabase, meta: "Official database · mortgage statistics" },
    ],
    indirect: [
      { label: "Nationwide / Halifax house price indices", url: "https://www.nationwidehousepriceindex.co.uk/" },
      { label: "PRA — capital rules (Basel 3.1)", url: SOURCE_URLS.praPolicy, meta: "Regulatory policy · capital requirements" },
    ],
  },
  {
    id: "opex",
    name: "Operating cost",
    role: "Origination, servicing and overhead allocated to the loan",
    base2y: 0.20,
    base5y: 0.20,
    weight: "Structural",
    note: "Slow-moving. Tech/automation gradually compresses it; broker and processing costs sit here.",
    trends: {
      "3m": { dir: "flat", bps: 0, why: "No material change quarter to quarter." },
      "12m": { dir: "flat", bps: -2, why: "Marginal efficiency gains." },
      "5y": { dir: "down", bps: -5, why: "Digital origination lowers unit cost over time." },
    },
    direct: [
      { label: "Lender annual reports (cost-to-income ratios)", url: "https://www.lloydsbankinggroup.com/investors.html" },
      { label: "UK Finance — household finance data", url: SOURCE_URLS.ukFinanceData, meta: "Industry data · lending conditions" },
    ],
    indirect: [
      { label: "ONS — services producer prices", url: SOURCE_URLS.onsInflation, meta: "Official statistics · input-cost pressure" },
    ],
  },
  {
    id: "margin",
    name: "Profit margin (RoE)",
    role: "Return on equity the lender targets on the product",
    base2y: 0.38,
    base5y: 0.40,
    weight: "Discretionary",
    note: "The 'plug' that solves the return-on-equity puzzle. Widens when demand is strong, compresses when chasing volume.",
    trends: {
      "3m": { dir: "down", bps: -5, why: "Lenders trimming margins to win remortgage business." },
      "12m": { dir: "flat", bps: 0, why: "Stabilises once share targets are met." },
      "5y": { dir: "flat", bps: 0, why: "Reverts toward long-run RoE target." },
    },
    direct: [
      { label: "Lender results — net interest margin (NIM)", url: "https://www.natwestgroup.com/investors.html" },
      { label: "Bank of England — Financial Stability Reports", url: SOURCE_URLS.boeFinancialStabilityReports, meta: "Official publication · banking system context" },
    ],
    indirect: [
      { label: "Building Societies Association data", url: SOURCE_URLS.bsaStats, meta: "Sector data · mutual lender conditions" },
      indicatorLink("market-participants-survey"),
    ],
  },
  {
    id: "comp",
    name: "Competitive adjustment",
    role: "Price moves driven purely by jockeying for market share",
    base2y: -0.11,
    base5y: -0.14,
    weight: "Volatile",
    note: "Negative = lenders cutting below the build-up to win share. In June 2026 several major lenders trimmed fixed rates as swap pressure eased.",
    trends: {
      "3m": { dir: "down", bps: -12, why: "Heavy remortgage maturities → aggressive rate war." },
      "12m": { dir: "flat", bps: 3, why: "Competition normalises after the maturity wave." },
      "5y": { dir: "flat", bps: 0, why: "Reverts to baseline competitive intensity." },
    },
    direct: [
      { label: "Moneyfacts — average rates & product counts", url: SOURCE_URLS.moneyfactsMortgages, meta: "Market comparison data · lender pricing" },
      { label: "BoE database — quoted household rates", url: SOURCE_URLS.boeDatabase, meta: "Official database · quoted rates" },
    ],
    indirect: [
      { label: "UK Finance — gross lending & remortgage volumes", url: SOURCE_URLS.ukFinanceData, meta: "Industry data · mortgage demand" },
      { label: "Rightmove / Zoopla — demand indicators", url: "https://www.rightmove.co.uk/house-prices.html" },
    ],
  },
];

const DIR_META = {
  up: { glyph: "▲", color: PALETTE.rust, word: "Rising" },
  down: { glyph: "▼", color: PALETTE.sage, word: "Easing" },
  flat: { glyph: "—", color: PALETTE.slate, word: "Flat" },
};

function fmtPct(v) {
  const sign = v < 0 ? "−" : "";
  return `${sign}${Math.abs(v).toFixed(2)}%`;
}
function fmtBps(v) {
  if (v === 0) return "0 bps";
  const sign = v > 0 ? "+" : "−";
  return `${sign}${Math.abs(v)} bps`;
}

// ── APRC Mathematical Helpers ──────────────────────────────────────────────────
function getMonthlyPayment(principal, annualRatePct, termYears) {
  if (annualRatePct <= 0) return principal / (termYears * 12);
  const r = (annualRatePct / 100) / 12;
  const n = termYears * 12;
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function getOutstandingBalance(principal, annualRatePct, termYears, elapsedMonths) {
  const r = (annualRatePct / 100) / 12;
  const n = termYears * 12;
  const p = getMonthlyPayment(principal, annualRatePct, termYears);
  if (r <= 0) return principal - p * elapsedMonths;
  return principal * Math.pow(1 + r, elapsedMonths) - p * (Math.pow(1 + r, elapsedMonths) - 1) / r;
}

function solveAPRC(L, F, T, N, P1, P2) {
  const getPV = (i) => {
    if (i <= 0) return P1 * T + P2 * (N - T);
    const pv1 = P1 * (1 - Math.pow(1 + i, -T)) / i;
    const pv2 = N <= T ? 0 : (P2 / Math.pow(1 + i, T)) * (1 - Math.pow(1 + i, -(N - T))) / i;
    return pv1 + pv2;
  };

  const target = L - F;
  if (getPV(0) < target) return 0;

  let low = 0.0;
  let high = 1.0;
  for (let iter = 0; iter < 40; iter++) {
    const mid = (low + high) / 2;
    if (getPV(mid) > target) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return (Math.pow(1 + low, 12) - 1) * 100;
}

export default function MortgageRatePredictor() {
  const [term, setTerm] = useState("5y"); // which fix length to model
  const [horizon, setHorizon] = useState("12m"); // which prediction horizon
  const [openLever, setOpenLever] = useState(null);

  // APRC Calculator State
  const [calcLoan, setCalcLoan] = useState(250000);
  const [calcFee, setCalcFee] = useState(999);
  const [calcFeeAdded, setCalcFeeAdded] = useState(false);
  const [calcSvr, setCalcSvr] = useState(7.50);
  const [calcTermYears, setCalcTermYears] = useState(25);
  const [customHeadlineRate, setCustomHeadlineRate] = useState(null);

  // Live Data Fetch State
  const [liveData, setLiveData] = useState(null);
  const [loadingLive, setLoadingLive] = useState(false);
  const [liveError, setLiveError] = useState(null);

  useEffect(() => {
    setLoadingLive(true);
    fetch('/api/live-indicators')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setLiveData(data);
        setLoadingLive(false);
      })
      .catch((err) => {
        console.error('Error fetching live indicators:', err);
        setLiveError(err.message);
        setLoadingLive(false);
      });
  }, []);

  // Dynamically update the levers baseline values using the live data
  const dynamicLevers = useMemo(() => {
    if (!liveData) return LEVERS;
    return LEVERS.map((l) => {
      if (l.id === "swap") {
        return {
          ...l,
          base2y: liveData.swap2y,
          base5y: liveData.swap5y,
        };
      }
      return l;
    });
  }, [liveData]);

  const isFiveYear = term === "5y";
  const selectedHorizon = TERMS.find((t) => t.key === horizon);

  // Current build-up total
  const current = useMemo(() => {
    return dynamicLevers.reduce((sum, l) => sum + (isFiveYear ? l.base5y : l.base2y), 0);
  }, [dynamicLevers, isFiveYear]);

  // Predicted total at chosen horizon = current + sum of signed bps moves
  const predicted = useMemo(() => {
    const move = dynamicLevers.reduce((s, l) => s + l.trends[horizon].bps, 0) / 100;
    return current + move;
  }, [dynamicLevers, current, horizon]);

  const netMove = (predicted - current) * 100;

  // Active headline rate in the calculator defaults to the model's predicted rate
  const activeHeadlineRate = customHeadlineRate !== null ? customHeadlineRate : predicted;
  const initialPeriodMonths = term === "5y" ? 60 : 24;
  const minTermYears = term === "5y" ? 5 : 2;
  const activeTermYears = Math.max(calcTermYears, minTermYears);

  const aprcResults = useMemo(() => {
    const principal = calcFeeAdded ? calcLoan + calcFee : calcLoan;
    const upfrontFee = calcFeeAdded ? 0 : calcFee;

    // Monthly payment during fixed term
    const p1 = getMonthlyPayment(principal, activeHeadlineRate, activeTermYears);

    // Outstanding balance after initial term
    const bT = getOutstandingBalance(principal, activeHeadlineRate, activeTermYears, initialPeriodMonths);

    // Monthly payment during SVR term
    const remainingMonths = activeTermYears * 12 - initialPeriodMonths;
    const p2 = remainingMonths > 0 ? getMonthlyPayment(bT, calcSvr, remainingMonths / 12) : 0;

    // Calculate APRC
    const aprcVal = solveAPRC(calcLoan, upfrontFee, initialPeriodMonths, activeTermYears * 12, p1, p2);

    // Total cost calculation
    const totalPayments = p1 * initialPeriodMonths + p2 * remainingMonths + upfrontFee;
    const totalInterest = totalPayments - calcLoan;

    return {
      p1,
      p2,
      aprc: aprcVal,
      outstandingAtRevert: bT,
      totalPayments,
      totalInterest,
    };
  }, [calcLoan, calcFee, calcFeeAdded, calcSvr, activeTermYears, activeHeadlineRate, initialPeriodMonths]);

  const fmtCurrency = (val) => {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div style={{ background: PALETTE.paper, minHeight: "100vh", color: PALETTE.ink, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        .fr { font-family: 'Fraunces', Georgia, serif; }
        .mono { font-family: 'IBM Plex Mono', monospace; }
        .lever-row { transition: background .15s ease, transform .15s ease; }
        .lever-row:hover { background: ${PALETTE.paper}; }
        .seg { cursor: pointer; border: none; background: transparent; transition: all .15s ease; }
        .seg:focus-visible, a:focus-visible, .lever-row:focus-visible { outline: 2px solid ${PALETTE.brass}; outline-offset: 2px; }
        a { color: ${PALETTE.sage}; text-decoration: none; border-bottom: 1px solid ${PALETTE.line}; }
        a:hover { color: ${PALETTE.ink}; border-color: ${PALETTE.brass}; }
        abbr { text-decoration: underline dotted ${PALETTE.brass}; cursor: help; text-decoration-skip-ink: none; }
        abbr:hover { color: ${PALETTE.brass}; }
        .slider { -webkit-appearance: none; width: 100%; background: ${PALETTE.line}; height: 6px; border-radius: 3px; outline: none; margin: 8px 0; }
        .slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; border-radius: 50%; background: ${PALETTE.brass}; cursor: pointer; border: 2px solid ${PALETTE.card}; box-shadow: 0 1px 3px rgba(0,0,0,0.1); transition: transform 0.1s ease; }
        .slider::-webkit-slider-thumb:hover { transform: scale(1.25); background: ${PALETTE.sage}; }
        .slider::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%; background: ${PALETTE.brass}; cursor: pointer; border: 2px solid ${PALETTE.card}; box-shadow: 0 1px 3px rgba(0,0,0,0.1); transition: transform 0.1s ease; }
        .slider::-moz-range-thumb:hover { transform: scale(1.25); background: ${PALETTE.sage}; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
      `}</style>

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "clamp(24px,5vw,56px) clamp(18px,4vw,32px)" }}>

        {/* Header */}
        <header style={{ borderBottom: `2px solid ${PALETTE.ink}`, paddingBottom: 22, marginBottom: 28 }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: PALETTE.brass, marginBottom: 12, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span>UK Mortgage Rate Predictor</span>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: liveData?.source === 'live' ? "rgba(92, 122, 107, 0.15)" : "rgba(110, 123, 130, 0.15)",
              color: liveData?.source === 'live' ? PALETTE.sage : PALETTE.slate,
              padding: "2px 6px",
              borderRadius: 4,
              fontSize: 9,
              letterSpacing: "0.05em",
              fontWeight: 600,
              textTransform: "uppercase"
            }}>
              {loadingLive ? "● Loading..." : liveData?.source === 'live' ? `● Live (BoE ${liveData.lastUpdated})` : "● Local Data"}
            </span>
          </div>
          <h1 className="fr" style={{ fontSize: 40, lineHeight: 1.05, fontWeight: 500, margin: 0, letterSpacing: 0 }}>
            Six levers behind a fixed UK mortgage rate
          </h1>
          <p style={{ marginTop: 14, maxWidth: 620, color: PALETTE.slate, lineHeight: 1.55, fontSize: 15 }}>
            A fixed mortgage rate is a stack, not a single number. Each lever moves on its own clock.
            Pick a fix length and horizon to see where the build-up is heading, then open the linked indicators used to refresh each assumption.
          </p>
        </header>

        {/* Controls */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginBottom: 30 }}>
          <ControlGroup label="Fix length">
            {[{ k: "2y", t: "2-year" }, { k: "5y", t: "5-year" }].map((o) => (
              <Seg key={o.k} active={term === o.k} onClick={() => setTerm(o.k)}>{o.t}</Seg>
            ))}
          </ControlGroup>
          <ControlGroup label="Prediction horizon">
            {TERMS.map((o) => (
              <Seg key={o.key} active={horizon === o.key} onClick={() => setHorizon(o.key)}>{o.label}</Seg>
            ))}
          </ControlGroup>
        </div>

        {/* Headline prediction */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 1, background: PALETTE.line, border: `1px solid ${PALETTE.line}`, marginBottom: 36 }}>
          <Stat label="Modelled rate today" value={fmtPct(current)} sub={`${isFiveYear ? "5" : "2"}-year fix, build-up sum`} />
          <Stat label={`Predicted · ${selectedHorizon.label}`} value={fmtPct(predicted)} sub="sum of lever trends" emphasis />
          <Stat
            label="Net move"
            value={fmtBps(Math.round(netMove))}
            sub={netMove < 0 ? "downward pressure" : netMove > 0 ? "upward pressure" : "balanced"}
            color={netMove < 0 ? PALETTE.sage : netMove > 0 ? PALETTE.rust : PALETTE.slate}
          />
        </div>

        {/* Lever table header */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
          <h2 className="fr" style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>Lever breakdown</h2>
          <span className="mono" style={{ fontSize: 11, color: PALETTE.slate }}>3m · 12m · 5y trend</span>
        </div>

        {/* Levers */}
        <div style={{ border: `1px solid ${PALETTE.line}`, background: PALETTE.card, borderRadius: 2 }}>
          {dynamicLevers.map((l, i) => {
            const val = isFiveYear ? l.base5y : l.base2y;
            const open = openLever === l.id;
            const detailId = `lever-${l.id}-detail`;
            return (
              <div key={l.id} style={{ borderTop: i === 0 ? "none" : `1px solid ${PALETTE.line}` }}>
                <div
                  className="lever-row"
                  role="button"
                  tabIndex={0}
                  aria-expanded={open}
                  aria-controls={detailId}
                  onClick={() => setOpenLever(open ? null : l.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpenLever(open ? null : l.id); } }}
                  style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, padding: "16px 18px", cursor: "pointer", alignItems: "center" }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600, fontSize: 15 }}>{l.name}</span>
                      <span className="mono" style={{ fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: PALETTE.brass, border: `1px solid ${PALETTE.line}`, padding: "2px 6px", borderRadius: 2 }}>{l.weight}</span>
                    </div>
                    <div style={{ fontSize: 13, color: PALETTE.slate, marginTop: 3 }}>{l.role}</div>
                    {/* three-horizon trend strip */}
                    <div style={{ display: "flex", gap: 14, marginTop: 10 }}>
                      {TERMS.map((t) => {
                        const tr = l.trends[t.key];
                        const m = DIR_META[tr.dir];
                        const activeH = t.key === horizon;
                        return (
                          <div key={t.key} style={{ display: "flex", alignItems: "center", gap: 5, opacity: activeH ? 1 : 0.5 }}>
                            <span className="mono" style={{ fontSize: 9, color: PALETTE.slate, width: 26 }}>{t.key}</span>
                            <span style={{ color: m.color, fontSize: 12 }}>{m.glyph}</span>
                            <span className="mono" style={{ fontSize: 11, color: m.color }}>{fmtBps(tr.bps)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <div className="mono" style={{ fontSize: 20, fontWeight: 500, color: val < 0 ? PALETTE.sage : PALETTE.ink }}>{fmtPct(val)}</div>
                    <div className="mono" style={{ fontSize: 10, color: PALETTE.slate, marginTop: 2 }}>{open ? "close −" : "detail +"}</div>
                  </div>
                </div>

                {/* Expanded detail */}
                {open && (
                  <div id={detailId} style={{ padding: "0 18px 20px 18px", background: PALETTE.paper }}>
                    <p style={{ fontSize: 13.5, lineHeight: 1.55, color: PALETTE.ink, marginTop: 4 }}>{l.note}</p>
                    <div style={{ fontSize: 13, color: PALETTE.ink, background: PALETTE.card, border: `1px solid ${PALETTE.line}`, padding: "10px 12px", borderRadius: 2, margin: "10px 0 16px" }}>
                      <span style={{ fontWeight: 600, color: DIR_META[l.trends[horizon].dir].color }}>
                        {DIR_META[l.trends[horizon].dir].word} over {selectedHorizon.label}:
                      </span>{" "}
                      {l.trends[horizon].why}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 18 }}>
                      <DataList title="Direct data" desc="feeds the lever's value directly" items={l.direct} accent={PALETTE.sage} />
                      <DataList title="Indirect data" desc="leading / explanatory signals" items={l.indirect} accent={PALETTE.brass} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Formula footer */}
        <div style={{ marginTop: 32, padding: "18px 20px", background: PALETTE.ink, color: PALETTE.paper, borderRadius: 2 }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: PALETTE.brass, marginBottom: 8 }}>The model</div>
          <div className="mono" style={{ fontSize: 13, lineHeight: 1.7 }}>
            rate ≈ <abbr title="Sterling Overnight Index Average: The key risk-free benchmark rate for sterling, representing the average interest rate banks pay to borrow overnight.">SONIA</abbr>&nbsp;swap(term) + funding&nbsp;spread + credit/capital + opex + profit&nbsp;margin + competitive&nbsp;adj.
          </div>
        </div>

        {/* Headline vs. APRC Section */}
        <section style={{ marginTop: 32, borderTop: `2px solid ${PALETTE.ink}`, paddingTop: 28 }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: PALETTE.brass, marginBottom: 12 }}>
            Regulatory Costs & Comparisons
          </div>
          <h2 className="fr" style={{ fontSize: 24, fontWeight: 500, margin: "0 0 16px" }}>
            Headline Rate vs. <abbr title="Annual Percentage Rate of Charge: The average cost of the mortgage per year over its full term, factoring in the headline rate, fees, and the SVR revert rate.">APRC</abbr> Explained
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))", gap: 28 }}>
            {/* Left Column: Educational Text */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <p style={{ fontSize: 14.5, lineHeight: 1.55, color: PALETTE.ink, margin: 0 }}>
                A mortgage advertises two different interest rates: the <strong>Headline Rate</strong> and the <strong><abbr title="Annual Percentage Rate of Charge: The average cost of the mortgage per year over its full term, factoring in the headline rate, fees, and the SVR revert rate.">APRC</abbr></strong>.
              </p>
              <div style={{ background: PALETTE.card, padding: 16, border: `1px solid ${PALETTE.line}`, borderRadius: 2 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: PALETTE.sage, marginBottom: 4 }}>Headline Interest Rate</div>
                <div style={{ fontSize: 13.5, lineHeight: 1.45, color: PALETTE.ink }}>
                  The contract rate you pay during your initial fixed or tracker period (e.g. <strong>{activeHeadlineRate.toFixed(2)}%</strong>). It determines your immediate monthly cash outflows.
                </div>
              </div>
              <div style={{ background: PALETTE.card, padding: 16, border: `1px solid ${PALETTE.line}`, borderRadius: 2 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: PALETTE.brass, marginBottom: 4 }}>
                  <abbr title="Annual Percentage Rate of Charge: The average cost of the mortgage per year over its full term, factoring in the headline rate, fees, and the SVR revert rate.">APRC</abbr> (Annual Percentage Rate of Charge)
                </div>
                <div style={{ fontSize: 13.5, lineHeight: 1.45, color: PALETTE.ink }}>
                  The overall rate calculated over the <em>entire mortgage term</em> (e.g., 25 years). It factors in (1) the headline rate, (2) any upfront fees, and (3) the <abbr title="Standard Variable Rate: The default, variable rate your mortgage reverts to after your fixed deal ends. It is set by the lender and is usually highly elevated.">SVR</abbr> you automatically fall onto when the initial term ends.
                </div>
              </div>
              <div style={{ background: PALETTE.card, padding: 16, border: `1px solid ${PALETTE.line}`, borderRadius: 2 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: PALETTE.rust, marginBottom: 4 }}>
                  Revert Rate / Standard Variable Rate (<abbr title="Standard Variable Rate: The default, variable rate your mortgage reverts to after your fixed deal ends. It is set by the lender and is usually highly elevated.">SVR</abbr>)
                </div>
                <div style={{ fontSize: 13.5, lineHeight: 1.45, color: PALETTE.ink }}>
                  The default variable rate your mortgage switches to when your fixed-rate incentive period ends. Set at the lender's discretion, <abbr title="Standard Variable Rate: The default, variable rate your mortgage reverts to after your fixed deal ends. It is set by the lender and is usually highly elevated.">SVRs</abbr> do not have a fixed limit and are usually much more expensive.
                </div>
              </div>
              <p style={{ fontSize: 13.5, lineHeight: 1.5, color: PALETTE.slate, margin: 0 }}>
                <strong>Why is <abbr title="Annual Percentage Rate of Charge: The average cost of the mortgage per year over its full term, factoring in the headline rate, fees, and the SVR revert rate.">APRC</abbr> typically much higher?</strong> In the UK, <abbr title="Standard Variable Rate: The default, variable rate your mortgage reverts to after your fixed deal ends. It is set by the lender and is usually highly elevated.">SVRs</abbr> are highly elevated (currently around 7.50%). Because the <abbr title="Annual Percentage Rate of Charge: The average cost of the mortgage per year over its full term, factoring in the headline rate, fees, and the SVR revert rate.">APRC</abbr> assumes you hold the mortgage for the full term without ever remortgaging, the higher <abbr title="Standard Variable Rate: The default, variable rate your mortgage reverts to after your fixed deal ends. It is set by the lender and is usually highly elevated.">SVR</abbr> dominates the calculation for the remaining 20+ years.
              </p>

              <div style={{ background: "rgba(176, 138, 79, 0.1)", borderLeft: `3px solid ${PALETTE.brass}`, padding: "12px 14px", borderRadius: 2 }}>
                <div className="mono" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: PALETTE.brass, marginBottom: 4 }}>
                  Solving the 4.3% <abbr title="Annual Percentage Rate of Charge: The average cost of the mortgage per year over its full term, factoring in the headline rate, fees, and the SVR revert rate.">APRC</abbr> Puzzle
                </div>
                <p style={{ fontSize: 12.5, lineHeight: 1.45, color: PALETTE.ink, margin: 0 }}>
                  If the market offers a product with an <abbr title="Annual Percentage Rate of Charge: The average cost of the mortgage per year over its full term, factoring in the headline rate, fees, and the SVR revert rate.">APRC</abbr> of <strong>4.30%</strong>, how does that add up?
                </p>
                <ul style={{ fontSize: 12.5, lineHeight: 1.45, color: PALETTE.ink, paddingLeft: 18, marginTop: 6, marginBottom: 0 }}>
                  <li><strong>Long Fixed Terms:</strong> Fixing for 10 years or the lifetime of the mortgage means you spend little or no time on the high <abbr title="Standard Variable Rate: The default, variable rate your mortgage reverts to after your fixed deal ends. It is set by the lender and is usually highly elevated.">SVR</abbr>.</li>
                  <li><strong>Lower Headline Rates:</strong> An initial rate of ~3.80% offset by low fee levels and <abbr title="Standard Variable Rate: The default, variable rate your mortgage reverts to after your fixed deal ends. It is set by the lender and is usually highly elevated.">SVR</abbr> components averages out to a 4.30% <abbr title="Annual Percentage Rate of Charge: The average cost of the mortgage per year over its full term, factoring in the headline rate, fees, and the SVR revert rate.">APRC</abbr>.</li>
                  <li><strong>Fee Minimization:</strong> Upfront fees disproportionately raise <abbr title="Annual Percentage Rate of Charge: The average cost of the mortgage per year over its term, factoring in the headline rate, fees, and the SVR revert rate.">APRCs</abbr> on smaller loan sizes.</li>
                </ul>
              </div>
            </div>

            {/* Right Column: Interactive Calculator */}
            <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.line}`, borderRadius: 2, padding: 22 }}>
              <div className="mono" style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: PALETTE.brass, marginBottom: 16, borderBottom: `1px solid ${PALETTE.line}`, paddingBottom: 8 }}>
                Live APRC Solver
              </div>

              {/* Sliders */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span style={{ fontWeight: 500 }}>Loan Amount</span>
                    <span className="mono" style={{ fontWeight: 600 }}>{fmtCurrency(calcLoan)}</span>
                  </div>
                  <input
                    type="range"
                    className="slider"
                    min="50000"
                    max="1000000"
                    step="10000"
                    value={calcLoan}
                    onChange={(e) => setCalcLoan(Number(e.target.value))}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span style={{ fontWeight: 500 }}>Headline Rate</span>
                    <span className="mono" style={{ fontWeight: 600 }}>{activeHeadlineRate.toFixed(2)}%</span>
                  </div>
                  <input
                    type="range"
                    className="slider"
                    min="1.00"
                    max="8.00"
                    step="0.05"
                    value={activeHeadlineRate}
                    onChange={(e) => setCustomHeadlineRate(Number(e.target.value))}
                  />
                  {customHeadlineRate !== null && (
                    <button
                      onClick={() => setCustomHeadlineRate(null)}
                      style={{ border: "none", background: "none", color: PALETTE.sage, fontSize: 11, cursor: "pointer", padding: 0, textDecoration: "underline" }}
                    >
                      Reset to model rate ({predicted.toFixed(2)}%)
                    </button>
                  )}
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span style={{ fontWeight: 500 }}>Product Arrangement Fee</span>
                    <span className="mono" style={{ fontWeight: 600 }}>{fmtCurrency(calcFee)}</span>
                  </div>
                  <input
                    type="range"
                    className="slider"
                    min="0"
                    max="3000"
                    step="99"
                    value={calcFee}
                    onChange={(e) => setCalcFee(Number(e.target.value))}
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <input
                      type="checkbox"
                      id="feeAdded"
                      checked={calcFeeAdded}
                      onChange={(e) => setCalcFeeAdded(e.target.checked)}
                      style={{ cursor: "pointer" }}
                    />
                    <label htmlFor="feeAdded" style={{ fontSize: 11.5, color: PALETTE.slate, cursor: "pointer", userSelect: "none" }}>
                      Add fee to the loan balance (capitalize fee)
                    </label>
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span style={{ fontWeight: 500 }}>
                      <abbr title="Revert Rate: The default variable interest rate your mortgage switches to when your initial fixed deal expires (typically the lender's SVR).">Revert Rate</abbr> (<abbr title="Standard Variable Rate: The default, variable rate your mortgage reverts to after your fixed deal ends. It is set by the lender and is usually highly elevated.">SVR</abbr>)
                    </span>
                    <span className="mono" style={{ fontWeight: 600 }}>{calcSvr.toFixed(2)}%</span>
                  </div>
                  <input
                    type="range"
                    className="slider"
                    min="3.00"
                    max="10.00"
                    step="0.05"
                    value={calcSvr}
                    onChange={(e) => setCalcSvr(Number(e.target.value))}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span style={{ fontWeight: 500 }}>Mortgage Term</span>
                    <span className="mono" style={{ fontWeight: 600 }}>{activeTermYears} Years</span>
                  </div>
                  <input
                    type="range"
                    className="slider"
                    min={minTermYears}
                    max="40"
                    step="1"
                    value={activeTermYears}
                    onChange={(e) => setCalcTermYears(Number(e.target.value))}
                  />
                  <div style={{ fontSize: 11, color: PALETTE.slate, marginTop: 2 }}>
                    Initial period set to {initialPeriodMonths / 12} years (linked to fix length above).
                  </div>
                </div>
              </div>

              {/* Solver Outputs */}
              <div style={{ marginTop: 24, paddingTop: 18, borderTop: `1px solid ${PALETTE.line}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <span className="mono" style={{ fontSize: 12, textTransform: "uppercase", color: PALETTE.slate }}>
                    Calculated <abbr title="Annual Percentage Rate of Charge: The average cost of the mortgage per year over its full term, factoring in the headline rate, fees, and the SVR revert rate.">APRC</abbr>
                  </span>
                  <span className="mono" style={{ fontSize: 26, fontWeight: 600, color: PALETTE.brass }}>
                    {aprcResults.aprc.toFixed(2)}%
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, background: PALETTE.paper, padding: 12, borderRadius: 2, border: `1px solid ${PALETTE.line}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ color: PALETTE.slate }}>Initial Payment (Months 1–{initialPeriodMonths}):</span>
                    <span className="mono" style={{ fontWeight: 600, color: PALETTE.ink }}>{fmtCurrency(aprcResults.p1)}/mo</span>
                  </div>
                  {activeTermYears * 12 > initialPeriodMonths && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ color: PALETTE.slate }}>Revert Payment (Months {initialPeriodMonths + 1}–{activeTermYears * 12}):</span>
                      <span className="mono" style={{ fontWeight: 600, color: PALETTE.ink }}>{fmtCurrency(aprcResults.p2)}/mo</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, borderTop: `1px dotted ${PALETTE.line}`, paddingTop: 6, marginTop: 2 }}>
                    <span style={{ color: PALETTE.slate }}>Total Cost (Capital + Interest):</span>
                    <span className="mono" style={{ fontWeight: 600, color: PALETTE.ink }}>{fmtCurrency(aprcResults.totalPayments)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div style={{ marginTop: 32 }}>
          <IndicatorBoard indicators={LIVE_INDICATORS} liveData={liveData} />
        </div>

        <p style={{ fontSize: 12, color: PALETTE.slate, lineHeight: 1.5, marginTop: 18 }}>
          Illustrative model for scenario thinking — not advice or a rate guarantee. A fall in the swap does not pass through one-for-one:
          spreads widen or compress independently. Component values are calibrated build-ups, not published lender figures.
          The links point to live or regularly updated sources. Daily rates are fetched in real-time from the Bank of England Statistical Interactive Database (IADB).
          Verify current numbers before relying on them. Your home may be repossessed if you do not keep up mortgage repayments.
        </p>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function ControlGroup({ label, children }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: PALETTE.slate, marginBottom: 8 }}>{label}</div>
      <div style={{ display: "inline-flex", border: `1px solid ${PALETTE.ink}`, borderRadius: 2, overflow: "hidden" }}>{children}</div>
    </div>
  );
}
function Seg({ active, onClick, children }) {
  return (
    <button type="button" className="seg" onClick={onClick} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 500, background: active ? PALETTE.ink : "transparent", color: active ? PALETTE.paper : PALETTE.ink, fontFamily: "inherit" }}>
      {children}
    </button>
  );
}
function Stat({ label, value, sub, emphasis, color }) {
  return (
    <div style={{ background: emphasis ? PALETTE.ink : PALETTE.card, padding: "18px 18px 20px", color: emphasis ? PALETTE.paper : PALETTE.ink }}>
      <div className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: emphasis ? PALETTE.brass : PALETTE.slate, marginBottom: 8 }}>{label}</div>
      <div className="fr" style={{ fontSize: 30, fontWeight: 500, lineHeight: 1, color: color || (emphasis ? PALETTE.paper : PALETTE.ink) }}>{value}</div>
      <div style={{ fontSize: 12, color: emphasis ? "#B9C2BB" : PALETTE.slate, marginTop: 6 }}>{sub}</div>
    </div>
  );
}
function IndicatorBoard({ indicators, liveData }) {
  return (
    <section style={{ marginBottom: 34 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, marginBottom: 10 }}>
        <h2 className="fr" style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>Data links to indicators</h2>
        <span className="mono" style={{ fontSize: 11, color: PALETTE.slate }}>official first · market feeds where needed</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
        {indicators.map((indicator) => {
          let liveValStr = null;
          if (liveData) {
            if (indicator.id === 'mpc-dated-ois') {
              liveValStr = `${liveData.bankRate.toFixed(2)}%`;
            } else if (indicator.id === 'sonia-ois-forward' || indicator.id === 'sonia-futures') {
              liveValStr = `${liveData.sonia.toFixed(4)}%`;
            } else if (indicator.id === 'two-year-gilts') {
              liveValStr = `${liveData.gilt2y.toFixed(2)}%`;
            } else if (indicator.id === 'mortgage-swap-rates' || indicator.id === 'boe-yield-curve') {
              liveValStr = `2y: ${liveData.swap2y.toFixed(2)}%, 5y: ${liveData.swap5y.toFixed(2)}%`;
            }
          }
          return <IndicatorCard key={indicator.id} indicator={indicator} liveValStr={liveValStr} />;
        })}
      </div>
    </section>
  );
}
function IndicatorCard({ indicator, liveValStr }) {
  return (
    <article style={{ background: PALETTE.card, border: `1px solid ${PALETTE.line}`, borderRadius: 2, padding: "12px 13px 13px", minHeight: 184, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
          <span className="mono" style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: PALETTE.brass }}>{indicator.source}</span>
          {liveValStr && (
            <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: PALETTE.sage, background: "rgba(92, 122, 107, 0.1)", padding: "1px 5px", borderRadius: 2 }}>
              {liveValStr}
            </span>
          )}
        </div>
        <h3 style={{ fontSize: 14, lineHeight: 1.25, margin: "0 0 6px", fontWeight: 700 }}>{indicator.title}</h3>
        <p style={{ fontSize: 12.5, lineHeight: 1.45, margin: "0 0 8px", color: PALETTE.ink }}>{indicator.use}</p>
        <div className="mono" style={{ fontSize: 10.5, color: PALETTE.slate, marginBottom: 9 }}>{indicator.cadence}</div>
      </div>
      <div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 9 }}>
          {indicator.links.map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, border: `1px solid ${PALETTE.line}`, borderRadius: 2, padding: "4px 6px", background: PALETTE.paper }}>
              {link.label} ↗
            </a>
          ))}
        </div>
        <p style={{ fontSize: 11.5, lineHeight: 1.4, color: PALETTE.slate, margin: 0 }}>{indicator.caveat}</p>
      </div>
    </article>
  );
}
function DataList({ title, desc, items, accent }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
        <span style={{ fontWeight: 600, fontSize: 13, color: accent }}>{title}</span>
        <span style={{ fontSize: 11, color: PALETTE.slate }}>{desc}</span>
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {items.map((it) => (
          <li key={it.url} style={{ marginBottom: 6, fontSize: 13, lineHeight: 1.4 }}>
            <a href={it.url} target="_blank" rel="noopener noreferrer">{it.label} ↗</a>
            {it.meta && (
              <div className="mono" style={{ fontSize: 10, color: PALETTE.slate, marginTop: 2 }}>{it.meta}</div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
