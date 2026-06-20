'use strict';

function fmt12(min) {
  const h = Math.floor(min / 60) % 24;
  const m = Math.floor(min % 60);
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h - 1 + 12) % 12) + 1;
  return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
}

function fmtSec(seconds) {
  const rounded = Math.round(seconds);
  if (rounded < 60) {
    return `${rounded}s`;
  }
  return `${Math.floor(rounded / 60)}m ${rounded % 60}s`;
}

function formatPreviewAxisLabel(min) {
  return fmt12(min)
    .replace(':00', '')
    .replace(' AM', ' ')
    .replace(' PM', ' ')
    .trim();
}

function toFiniteNumber(raw, name) {
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
  return value;
}

function assertInRange(value, name, min, max) {
  if (value < min || value > max) {
    throw new RangeError(`${name} must be between ${min} and ${max}`);
  }
}

function assertInteger(value, name) {
  if (!Number.isInteger(value)) {
    throw new TypeError(`${name} must be an integer`);
  }
}

function toneForAsa(value, serviceTarget) {
  if (value <= serviceTarget) {
    return 'green';
  }
  if (value <= serviceTarget * 2) {
    return 'amber';
  }
  return 'red';
}

function toneForSl(value) {
  if (value >= 80) {
    return 'green';
  }
  if (value >= 60) {
    return 'amber';
  }
  return 'red';
}

function toneForUtil(value) {
  if (value > 100) {
    return 'red';
  }
  if (value >= 90) {
    return 'amber';
  }
  if (value >= 50) {
    return 'green';
  }
  return 'blue';
}

function toneForAbandon(value) {
  if (value < 5) {
    return 'green';
  }
  if (value < 15) {
    return 'amber';
  }
  return 'red';
}

function classifyHotspot(interval, serviceTarget) {
  const stressed = interval.avgWaitS > serviceTarget * 2 || interval.sl < 60 || interval.abandonRate > 15;
  const elevated = !stressed
    && (interval.avgWaitS > serviceTarget || interval.sl < 80 || interval.abandonRate > 5);
  const quiet = !stressed && !elevated && interval.util < 50;

  if (stressed) {
    return { key: 'stressed', label: '⚠ Stressed', badgeClass: 'badge-stressed' };
  }
  if (elevated) {
    return { key: 'elevated', label: '↑ Elevated', badgeClass: 'badge-elevated' };
  }
  if (quiet) {
    return { key: 'quiet', label: '↓ Under-utilised', badgeClass: 'badge-quiet' };
  }
  return { key: 'optimal', label: '✓ Optimal', badgeClass: 'badge-optimal' };
}

function makeChart(labels, values, tones, options = {}) {
  const maxValue = values.length > 0 ? Math.max(...values) : 0;
  const fallbackMax = options.minYMax ?? 0;
  const derivedMax = options.yMax ?? Math.max(maxValue, fallbackMax);

  return {
    labels,
    values,
    tones,
    yMax: derivedMax,
    refValue: options.refValue,
    refTone: options.refTone,
  };
}

function buildSummary(overall, params) {
  return {
    calls: {
      value: overall.total,
      display: String(overall.total),
      subtext: `of ${params.expectedCalls} expected · ${overall.abandoned} abandoned`,
      tone: 'text',
    },
    asa: {
      value: overall.asa,
      display: fmtSec(overall.asa),
      subtext: `Target: ${params.serviceTarget}s`,
      tone: toneForAsa(overall.asa, params.serviceTarget),
    },
    sl: {
      value: overall.sl,
      display: `${overall.sl.toFixed(1)}%`,
      subtext: `Calls answered within ${params.serviceTarget}s`,
      tone: toneForSl(overall.sl),
    },
    util: {
      value: overall.util,
      display: `${overall.util.toFixed(1)}%`,
      subtext: 'Time on calls vs available',
      tone: toneForUtil(overall.util),
    },
    abandon: {
      value: overall.abandonRate,
      display: `${overall.abandonRate.toFixed(1)}%`,
      subtext: `${overall.abandoned} of ${overall.totalOffered} offered calls`,
      tone: toneForAbandon(overall.abandonRate),
    },
  };
}

function buildHotspots(intervals, serviceTarget) {
  return intervals.map((interval) => ({
    label: interval.label,
    numCalls: interval.numCalls,
    numCallsDisplay: String(interval.numCalls),
    avgWaitS: interval.avgWaitS,
    avgWaitDisplay: fmtSec(interval.avgWaitS),
    avgWaitTone: toneForAsa(interval.avgWaitS, serviceTarget),
    sl: interval.sl,
    slDisplay: `${interval.sl.toFixed(0)}%`,
    slTone: toneForSl(interval.sl),
    abandonRate: interval.abandonRate,
    abandonDisplay: `${interval.abandonRate.toFixed(0)}%`,
    abandonTone: toneForAbandon(interval.abandonRate),
    util: interval.util,
    utilDisplay: `${interval.util.toFixed(0)}%`,
    utilTone: toneForUtil(interval.util),
    status: classifyHotspot(interval, serviceTarget),
  }));
}

function buildAnalysis(intervals, overall, params) {
  return {
    summary: buildSummary(overall, params),
    hotspots: buildHotspots(intervals, params.serviceTarget),
    charts: {
      volume: makeChart(
        intervals.map((interval) => interval.label),
        intervals.map((interval) => interval.numCalls),
        intervals.map(() => 'blue'),
      ),
      asa: makeChart(
        intervals.map((interval) => interval.label),
        intervals.map((interval) => interval.avgWaitS),
        intervals.map((interval) => toneForAsa(interval.avgWaitS, params.serviceTarget)),
        {
          yMax: Math.max(...intervals.map((interval) => interval.avgWaitS), params.serviceTarget * 2.5, 30),
          refValue: params.serviceTarget,
          refTone: 'amber',
        },
      ),
      util: makeChart(
        intervals.map((interval) => interval.label),
        intervals.map((interval) => interval.util),
        intervals.map((interval) => toneForUtil(interval.util)),
        {
          yMax: Math.max(...intervals.map((interval) => interval.util), 100),
        },
      ),
      abandon: makeChart(
        intervals.map((interval) => interval.label),
        intervals.map((interval) => interval.abandonRate),
        intervals.map((interval) => toneForAbandon(interval.abandonRate)),
        {
          yMax: Math.max(...intervals.map((interval) => interval.abandonRate), 20),
        },
      ),
    },
  };
}

function buildPlayback(params, overall, events) {
  return {
    events,
    initialState: {
      simTime: params.shiftStart,
      queue: 0,
      arrived: 0,
      answered: 0,
      abandoned: 0,
      totalWaitMin: 0,
      withinTarget: 0,
      agentStatus: new Array(params.numAgents).fill('idle'),
    },
    footer: {
      callsDisplay: String(overall.total),
      agentsDisplay: String(params.numAgents),
      targetDisplay: `${params.serviceTarget}s`,
    },
  };
}

export function normalizeSimulationParams(raw = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new TypeError('Simulation payload must be an object');
  }

  const params = {
    numAgents: toFiniteNumber(raw.numAgents, 'numAgents'),
    shiftStart: toFiniteNumber(raw.shiftStart, 'shiftStart'),
    shiftLength: toFiniteNumber(raw.shiftLength, 'shiftLength'),
    breakDur: toFiniteNumber(raw.breakDur, 'breakDur'),
    numBreaks: toFiniteNumber(raw.numBreaks, 'numBreaks'),
    expectedCalls: toFiniteNumber(raw.expectedCalls, 'expectedCalls'),
    aht: toFiniteNumber(raw.aht, 'aht'),
    serviceTarget: toFiniteNumber(raw.serviceTarget, 'serviceTarget'),
    abandonTime: toFiniteNumber(raw.abandonTime, 'abandonTime'),
  };

  assertInteger(params.numAgents, 'numAgents');
  assertInteger(params.numBreaks, 'numBreaks');
  assertInteger(params.expectedCalls, 'expectedCalls');

  assertInRange(params.numAgents, 'numAgents', 0, 100);
  assertInRange(params.shiftStart, 'shiftStart', 0, 24 * 60);
  assertInRange(params.shiftLength, 'shiftLength', 1, 24 * 60);
  assertInRange(params.breakDur, 'breakDur', 0, 240);
  assertInRange(params.numBreaks, 'numBreaks', 0, 10);
  assertInRange(params.expectedCalls, 'expectedCalls', 0, 10000);
  assertInRange(params.aht, 'aht', 0.1, 24 * 60);
  assertInRange(params.serviceTarget, 'serviceTarget', 0, 3600);
  assertInRange(params.abandonTime, 'abandonTime', 1, 24 * 60 * 60);

  return params;
}

function callRate(t) {
  const G = (x, mu, s) => Math.exp(-((x - mu) ** 2) / (2 * s * s));
  return Math.max(
    0,
    0.18
      + 0.82 * G(t, 0.27, 0.115)
      + 0.55 * G(t, 0.72, 0.10)
      - 0.16 * G(t, 0.50, 0.055),
  );
}

function buildCDF(shiftLength) {
  const bins = Math.ceil(shiftLength);
  const rates = Array.from({ length: bins }, (_, i) => callRate((i + 0.5) / bins));
  const total = rates.reduce((a, b) => a + b, 0);
  let cum = 0;
  return rates.map((rate) => (cum += rate / total));
}

function generateCalls(n, shiftStart, shiftLength, ahtMin, cdf, abandonTimeSec, random) {
  const calls = [];
  for (let i = 0; i < n; i++) {
    const u = random();
    let lo = 0;
    let hi = cdf.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] < u) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    const arrival = shiftStart + lo + random();
    const handle = Math.max(0.5, -ahtMin * Math.log(random() + 1e-12));
    const patience = Math.max(1, -abandonTimeSec * Math.log(random() + 1e-12));
    calls.push({ arrival, handle, patience });
  }
  calls.sort((a, b) => a.arrival - b.arrival);
  return calls;
}

function makeBreaks(numAgents, shiftStart, shiftLength, breakDur, numBreaks) {
  const result = Array.from({ length: numAgents }, () => []);
  if (numBreaks === 0 || numAgents === 0 || breakDur <= 0) {
    return result;
  }

  const shiftEnd = shiftStart + shiftLength;
  const windowStart = shiftStart + 60;
  const windowEnd = shiftEnd - 60;
  const usable = windowEnd - windowStart;

  if (usable <= 0) {
    return result;
  }

  for (let b = 0; b < numBreaks; b++) {
    const subW = usable / numBreaks;
    const subStart = windowStart + b * subW;
    const earliestStart = subStart;
    const latestStart = subStart + subW - breakDur;
    const spread = Math.max(0, latestStart - earliestStart);

    for (let a = 0; a < numAgents; a++) {
      const frac = numAgents > 1 ? a / (numAgents - 1) : 0;
      const t = earliestStart + frac * spread;
      result[a].push({ s: t, e: Math.min(t + breakDur, shiftEnd) });
    }
  }

  for (const brks of result) {
    brks.sort((a, b) => a.s - b.s);
  }
  return result;
}

function nextAvail(at, busyUntil, brks) {
  let t = Math.max(at, busyUntil);
  let changed = true;
  while (changed) {
    changed = false;
    for (const brk of brks) {
      if (t >= brk.s && t < brk.e) {
        t = brk.e;
        changed = true;
      }
    }
  }
  return t;
}

export function runSimulation(rawParams, { random = Math.random } = {}) {
  const params = normalizeSimulationParams(rawParams);
  const {
    numAgents,
    shiftStart,
    shiftLength,
    breakDur,
    numBreaks,
    expectedCalls,
    aht,
    serviceTarget,
    abandonTime,
  } = params;

  const shiftEnd = shiftStart + shiftLength;
  const cdf = buildCDF(shiftLength);
  const calls = generateCalls(expectedCalls, shiftStart, shiftLength, aht, cdf, abandonTime, random);
  const allBrks = makeBreaks(numAgents, shiftStart, shiftLength, breakDur, numBreaks);
  const busyUntil = new Array(numAgents).fill(shiftStart);

  const events = [];
  const results = [];
  const abandonedCalls = [];
  let callId = 0;

  for (let a = 0; a < numAgents; a++) {
    for (const brk of allBrks[a]) {
      if (brk.s < shiftEnd) {
        events.push({ t: brk.s, type: 'brk_s', a });
        events.push({ t: Math.min(brk.e, shiftEnd), type: 'brk_e', a });
      }
    }
  }

  for (const call of calls) {
    if (call.arrival >= shiftEnd) {
      break;
    }

    const id = callId++;
    events.push({ t: call.arrival, type: 'arrive', id });

    if (numAgents === 0) {
      const abandonAt = call.arrival + call.patience / 60;
      events.push({ t: abandonAt, type: 'abandon', id });
      abandonedCalls.push({ arrival: call.arrival, abandonAt });
      continue;
    }

    let bestA = 0;
    let bestAt = nextAvail(call.arrival, busyUntil[0], allBrks[0]);
    for (let a = 1; a < numAgents; a++) {
      const at = nextAvail(call.arrival, busyUntil[a], allBrks[a]);
      if (at < bestAt) {
        bestAt = at;
        bestA = a;
      }
    }

    if (bestAt >= shiftEnd) {
      continue;
    }

    const waitMin = bestAt - call.arrival;
    if (waitMin * 60 > call.patience) {
      const abandonAt = call.arrival + call.patience / 60;
      events.push({ t: abandonAt, type: 'abandon', id });
      abandonedCalls.push({ arrival: call.arrival, abandonAt });
      continue;
    }

    const endAt = Math.min(bestAt + call.handle, shiftEnd);
    busyUntil[bestA] = endAt;

    results.push({
      id,
      arrival: call.arrival,
      answer: bestAt,
      end: endAt,
      wait: waitMin,
      handle: call.handle,
      agent: bestA,
      ok: waitMin * 60 <= serviceTarget,
    });
    events.push({ t: bestAt, type: 'answer', id, a: bestA, wait: waitMin });
    events.push({ t: endAt, type: 'end', id, a: bestA });
  }

  const order = { arrive: 0, brk_e: 1, answer: 2, brk_s: 3, end: 4, abandon: 5 };
  events.sort((a, b) => (a.t - b.t) || (order[a.type] - order[b.type]));

  const intLen = 30;
  const numInts = Math.ceil(shiftLength / intLen);
  const intervals = [];

  for (let i = 0; i < numInts; i++) {
    const is = shiftStart + i * intLen;
    const ie = is + intLen;

    const arriving = results.filter((result) => result.arrival >= is && result.arrival < ie);
    const abandonedInInt = abandonedCalls.filter((call) => call.arrival >= is && call.arrival < ie);
    const totalOffered = arriving.length + abandonedInInt.length;
    const numAbandoned = abandonedInInt.length;
    const abandonRate = totalOffered > 0 ? (numAbandoned / totalOffered) * 100 : 0;

    const avgWaitS = arriving.length
      ? (arriving.reduce((sum, result) => sum + result.wait, 0) / arriving.length) * 60
      : 0;
    const sl = arriving.length
      ? (arriving.filter((result) => result.ok).length / arriving.length) * 100
      : 100;

    let avail = 0;
    let busy = 0;

    for (let a = 0; a < numAgents; a++) {
      let brkInInt = 0;
      for (const brk of allBrks[a]) {
        const overlapStart = Math.max(brk.s, is);
        const overlapEnd = Math.min(brk.e, ie);
        if (overlapEnd > overlapStart) {
          brkInInt += overlapEnd - overlapStart;
        }
      }

      avail += Math.min(intLen, shiftEnd - is) - brkInInt;

      for (const result of results) {
        if (result.agent !== a) {
          continue;
        }
        const overlapStart = Math.max(result.answer, is);
        const overlapEnd = Math.min(result.end, ie);
        if (overlapEnd <= overlapStart) {
          continue;
        }
        let callTime = overlapEnd - overlapStart;
        for (const brk of allBrks[a]) {
          const brkOverlapStart = Math.max(brk.s, overlapStart);
          const brkOverlapEnd = Math.min(brk.e, overlapEnd);
          if (brkOverlapEnd > brkOverlapStart) {
            callTime -= brkOverlapEnd - brkOverlapStart;
          }
        }
        busy += Math.max(0, callTime);
      }
    }

    intervals.push({
      label: fmt12(is),
      numCalls: totalOffered,
      numAnswered: arriving.length,
      numAbandoned,
      abandonRate,
      avgWaitS,
      sl,
      util: avail > 0 ? (busy / avail) * 100 : 0,
    });
  }

  const totalWait = results.reduce((sum, result) => sum + result.wait, 0);
  const asa = results.length ? (totalWait / results.length) * 60 : 0;
  const slOv = results.length ? (results.filter((result) => result.ok).length / results.length) * 100 : 0;
  const totalOffered = results.length + abandonedCalls.length;
  const abandonRateOv = totalOffered > 0 ? (abandonedCalls.length / totalOffered) * 100 : 0;

  let tAvail = 0;
  let tBusy = 0;
  for (let a = 0; a < numAgents; a++) {
    const brkT = allBrks[a].reduce((sum, brk) => sum + (Math.min(brk.e, shiftEnd) - brk.s), 0);
    tAvail += shiftLength - Math.max(0, brkT);
    for (const result of results.filter((item) => item.agent === a)) {
      let callTime = result.end - result.answer;
      for (const brk of allBrks[a]) {
        const overlapStart = Math.max(brk.s, result.answer);
        const overlapEnd = Math.min(brk.e, result.end);
        if (overlapEnd > overlapStart) {
          callTime -= overlapEnd - overlapStart;
        }
      }
      tBusy += Math.max(0, callTime);
    }
  }

  return {
    params,
    events,
    results,
    intervals,
    allBrks,
    abandonedCalls,
    overall: {
      asa,
      sl: slOv,
      util: tAvail > 0 ? (tBusy / tAvail) * 100 : 0,
      total: results.length,
      abandoned: abandonedCalls.length,
      totalOffered,
      abandonRate: abandonRateOv,
    },
  };
}

export function buildSimulationViewModel(rawParams, options = {}) {
  const simulation = runSimulation(rawParams, options);
  return {
    params: simulation.params,
    playback: buildPlayback(simulation.params, simulation.overall, simulation.events),
    analysis: buildAnalysis(simulation.intervals, simulation.overall, simulation.params),
  };
}

export function computePreview(raw = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new TypeError('Preview payload must be an object');
  }

  const shiftStart = toFiniteNumber(raw.shiftStart, 'shiftStart');
  const shiftLength = toFiniteNumber(raw.shiftLength, 'shiftLength');
  const numAgents = toFiniteNumber(raw.numAgents, 'numAgents');
  const breakDur = toFiniteNumber(raw.breakDur, 'breakDur');
  const numBreaks = toFiniteNumber(raw.numBreaks, 'numBreaks');

  assertInteger(numAgents, 'numAgents');
  assertInteger(numBreaks, 'numBreaks');

  assertInRange(shiftStart, 'shiftStart', 0, 24 * 60);
  assertInRange(shiftLength, 'shiftLength', 1, 24 * 60);
  assertInRange(numAgents, 'numAgents', 0, 100);
  assertInRange(breakDur, 'breakDur', 0, 240);
  assertInRange(numBreaks, 'numBreaks', 0, 10);

  const N = 200;
  const curvePoints = Array.from({ length: N + 1 }, (_, i) => callRate(i / N));

  const breakWindows = [];
  if (numBreaks > 0 && numAgents > 0 && breakDur > 0) {
    const allBrks = makeBreaks(numAgents, shiftStart, shiftLength, breakDur, numBreaks);
    if (allBrks.length > 0) {
      const first = allBrks[0];
      const last = allBrks[allBrks.length - 1];
      for (let b = 0; b < numBreaks; b++) {
        if (first[b] && last[b]) {
          breakWindows.push({
            s: first[b].s,
            e: last[b].e,
            label: `Break ${b + 1}`,
          });
        }
      }
    }
  }

  const axisLabels = [];
  for (let hour = 0; hour <= shiftLength / 60; hour += 1) {
    axisLabels.push({
      offsetMin: hour * 60,
      label: formatPreviewAxisLabel(shiftStart + hour * 60),
    });
  }

  return { curvePoints, breakWindows, axisLabels };
}
