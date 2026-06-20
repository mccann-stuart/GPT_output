import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSimulationViewModel,
  computePreview,
  normalizeSimulationParams,
  runSimulation,
} from '../server/simulate-engine.mjs';

function createSequenceRandom(sequence) {
  let index = 0;
  return () => {
    const value = sequence[index % sequence.length];
    index += 1;
    return value;
  };
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

function hotspotKey(interval, serviceTarget) {
  const stressed = interval.avgWaitS > serviceTarget * 2 || interval.sl < 60 || interval.abandonRate > 15;
  const elevated = !stressed
    && (interval.avgWaitS > serviceTarget || interval.sl < 80 || interval.abandonRate > 5);
  const quiet = !stressed && !elevated && interval.util < 50;

  if (stressed) {
    return 'stressed';
  }
  if (elevated) {
    return 'elevated';
  }
  if (quiet) {
    return 'quiet';
  }
  return 'optimal';
}

const baseParams = {
  numAgents: 12,
  shiftStart: 8 * 60,
  shiftLength: 8 * 60,
  breakDur: 15,
  numBreaks: 2,
  expectedCalls: 120,
  aht: 4,
  serviceTarget: 20,
  abandonTime: 180,
};

test('normalizeSimulationParams rejects invalid payloads', () => {
  assert.throws(() => normalizeSimulationParams(null), /payload must be an object/i);
  assert.throws(() => normalizeSimulationParams({ ...baseParams, shiftLength: 0 }), /shiftLength/i);
  assert.throws(() => normalizeSimulationParams({ ...baseParams, abandonTime: 'x' }), /abandonTime/i);
  assert.throws(() => normalizeSimulationParams({ ...baseParams, numAgents: 1.5 }), /numAgents.*integer/i);
  assert.throws(() => normalizeSimulationParams({ ...baseParams, expectedCalls: 10001 }), /expectedCalls/i);
});

test('runSimulation is deterministic with an injected RNG', () => {
  const sequence = [0.11, 0.62, 0.27, 0.84, 0.45, 0.19, 0.73, 0.31];
  const first = runSimulation(baseParams, { random: createSequenceRandom(sequence) });
  const second = runSimulation(baseParams, { random: createSequenceRandom(sequence) });

  assert.deepEqual(second, first);
  assert.equal(first.params.expectedCalls, 120);
  assert.equal(first.intervals.length, 16);
});

test('buildSimulationViewModel is deterministic and returns playback and analysis models', () => {
  const sequence = [0.11, 0.62, 0.27, 0.84, 0.45, 0.19, 0.73, 0.31];
  const first = buildSimulationViewModel(baseParams, { random: createSequenceRandom(sequence) });
  const second = buildSimulationViewModel(baseParams, { random: createSequenceRandom(sequence) });

  assert.deepEqual(second, first);
  assert.equal(first.params.expectedCalls, 120);
  assert.ok(Array.isArray(first.playback.events));
  assert.deepEqual(first.playback.initialState.agentStatus, new Array(baseParams.numAgents).fill('idle'));
  assert.equal(first.playback.footer.agentsDisplay, '12');
  assert.equal(first.analysis.summary.calls.subtext.includes('expected'), true);
  assert.equal(first.analysis.charts.asa.refValue, baseParams.serviceTarget);
  assert.equal(first.analysis.charts.asa.refTone, 'amber');
});

test('buildSimulationViewModel hotspot and tone rules match the client thresholds', () => {
  const sequence = [0.21, 0.73, 0.15, 0.88, 0.32, 0.67, 0.44, 0.91];
  const raw = runSimulation(baseParams, { random: createSequenceRandom(sequence) });
  const view = buildSimulationViewModel(baseParams, { random: createSequenceRandom(sequence) });

  assert.equal(view.analysis.hotspots.length, raw.intervals.length);

  for (let i = 0; i < raw.intervals.length; i++) {
    const interval = raw.intervals[i];
    const hotspot = view.analysis.hotspots[i];
    assert.equal(hotspot.status.key, hotspotKey(interval, baseParams.serviceTarget));
    assert.equal(hotspot.avgWaitTone, toneForAsa(interval.avgWaitS, baseParams.serviceTarget));
    assert.equal(hotspot.slTone, toneForSl(interval.sl));
    assert.equal(hotspot.utilTone, toneForUtil(interval.util));
    assert.equal(hotspot.abandonTone, toneForAbandon(interval.abandonRate));
  }
});

test('computePreview returns draw-ready preview data including axis labels', () => {
  const preview = computePreview({
    shiftStart: baseParams.shiftStart,
    shiftLength: baseParams.shiftLength,
    numAgents: baseParams.numAgents,
    breakDur: baseParams.breakDur,
    numBreaks: baseParams.numBreaks,
  });

  assert.equal(preview.curvePoints.length, 201);
  assert.equal(preview.breakWindows.length, baseParams.numBreaks);
  assert.deepEqual(preview.axisLabels.map((label) => label.offsetMin), [
    0, 60, 120, 180, 240, 300, 360, 420, 480,
  ]);
  assert.equal(preview.axisLabels[0].label, '8');
});

test('runSimulation handles zero expected calls', () => {
  const result = runSimulation({ ...baseParams, expectedCalls: 0 }, { random: createSequenceRandom([0.2]) });

  assert.equal(result.results.length, 0);
  assert.equal(result.abandonedCalls.length, 0);
  assert.equal(result.overall.totalOffered, 0);
});

test('runSimulation handles zero agents by abandoning all offered calls', () => {
  const result = runSimulation({ ...baseParams, numAgents: 0, expectedCalls: 20 }, {
    random: createSequenceRandom([0.15, 0.3, 0.45, 0.6, 0.75]),
  });

  assert.equal(result.results.length, 0);
  assert.equal(result.abandonedCalls.length, 20);
  assert.equal(result.overall.abandoned, 20);
});

test('runSimulation skips impossible breaks for short shifts', () => {
  const result = runSimulation({ ...baseParams, shiftLength: 90, numBreaks: 2, breakDur: 15 }, {
    random: createSequenceRandom([0.4, 0.2, 0.8, 0.6]),
  });

  assert.equal(result.allBrks.every((agentBreaks) => agentBreaks.length === 0), true);
  assert.equal(result.intervals.length, 3);
});

test('runSimulation tolerates extreme abandon times', () => {
  const result = runSimulation({ ...baseParams, abandonTime: 1, expectedCalls: 30 }, {
    random: createSequenceRandom([0.01, 0.99, 0.35, 0.65, 0.2, 0.8]),
  });

  assert.equal(result.overall.totalOffered, 30);
  assert.ok(result.overall.abandoned >= 0);
  assert.ok(result.overall.abandonRate >= 0);
});
