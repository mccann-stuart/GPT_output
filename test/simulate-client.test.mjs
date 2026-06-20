import test from 'node:test';
import assert from 'node:assert/strict';

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadSimulateModule } from './load-simulate-jsx.mjs';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const hasSimulateSource = existsSync(join(rootDir, 'simulate.jsx'));

class MockClassList {
  constructor(element) {
    this.element = element;
  }

  _set() {
    return new Set((this.element.className || '').split(/\s+/).filter(Boolean));
  }

  _write(set) {
    this.element.className = [...set].join(' ');
  }

  add(name) {
    const set = this._set();
    set.add(name);
    this._write(set);
  }

  remove(name) {
    const set = this._set();
    set.delete(name);
    this._write(set);
  }

  toggle(name, force) {
    const set = this._set();
    const shouldHave = force ?? !set.has(name);
    if (shouldHave) {
      set.add(name);
    } else {
      set.delete(name);
    }
    this._write(set);
    return shouldHave;
  }

  contains(name) {
    return this._set().has(name);
  }
}

class MockCanvasContext {
  constructor() {
    this.operations = [];
  }

  scale(...args) { this.operations.push(['scale', ...args]); }
  clearRect(...args) { this.operations.push(['clearRect', ...args]); }
  beginPath(...args) { this.operations.push(['beginPath', ...args]); }
  moveTo(...args) { this.operations.push(['moveTo', ...args]); }
  lineTo(...args) { this.operations.push(['lineTo', ...args]); }
  quadraticCurveTo(...args) { this.operations.push(['quadraticCurveTo', ...args]); }
  closePath(...args) { this.operations.push(['closePath', ...args]); }
  fill(...args) { this.operations.push(['fill', ...args]); }
  stroke(...args) { this.operations.push(['stroke', ...args]); }
  save(...args) { this.operations.push(['save', ...args]); }
  restore(...args) { this.operations.push(['restore', ...args]); }
  setLineDash(...args) { this.operations.push(['setLineDash', ...args]); }
  fillText(...args) { this.operations.push(['fillText', ...args]); }
  translate(...args) { this.operations.push(['translate', ...args]); }
  rotate(...args) { this.operations.push(['rotate', ...args]); }
  fillRect(...args) { this.operations.push(['fillRect', ...args]); }
  strokeRect(...args) { this.operations.push(['strokeRect', ...args]); }

  createLinearGradient() {
    return { addColorStop() {} };
  }
}

class MockElement {
  constructor(ownerDocument, tagName = 'div') {
    this.ownerDocument = ownerDocument;
    this.tagName = tagName.toUpperCase();
    this.className = '';
    this.classList = new MockClassList(this);
    this.children = [];
    this.parentElement = null;
    this.style = {};
    this.dataset = {};
    this.textContent = '';
    this.value = '';
    this.disabled = false;
    this.listeners = new Map();
    this.clientWidth = 0;
    this._innerHTML = '';
    this._id = '';
    this._ctx = null;
    this._queryChildren = new Map();
  }

  set id(value) {
    this._id = value;
    if (value) {
      this.ownerDocument.elements.set(value, this);
    }
  }

  get id() {
    return this._id;
  }

  set innerHTML(value) {
    this._innerHTML = value;
    this.children = [];
    this._queryChildren.clear();

    if (value.includes('class="a-icon"')) {
      const icon = new MockElement(this.ownerDocument, 'div');
      icon.className = 'a-icon';
      icon.textContent = '👤';
      icon.parentElement = this;
      this.children.push(icon);
      this._queryChildren.set('.a-icon', icon);
    }
  }

  get innerHTML() {
    return this._innerHTML;
  }

  get lastChild() {
    return this.children[this.children.length - 1] || null;
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    if (child.id) {
      this.ownerDocument.elements.set(child.id, child);
    }
    return child;
  }

  remove() {
    if (!this.parentElement) {
      return;
    }
    const siblings = this.parentElement.children;
    const idx = siblings.indexOf(this);
    if (idx >= 0) {
      siblings.splice(idx, 1);
    }
    if (this.id) {
      this.ownerDocument.elements.delete(this.id);
    }
    this.parentElement = null;
  }

  addEventListener(type, handler) {
    const handlers = this.listeners.get(type) || [];
    handlers.push(handler);
    this.listeners.set(type, handlers);
  }

  querySelector(selector) {
    if (this._queryChildren.has(selector)) {
      return this._queryChildren.get(selector);
    }

    if (selector.startsWith('.')) {
      return this.children.find((child) => child.classList.contains(selector.slice(1))) || null;
    }

    return null;
  }

  getContext() {
    if (!this._ctx) {
      this._ctx = new MockCanvasContext();
    }
    return this._ctx;
  }
}

class MockDocument {
  constructor() {
    this.elements = new Map();
    this.roots = [];
  }

  createElement(tagName) {
    return new MockElement(this, tagName);
  }

  register(element) {
    this.roots.push(element);
    if (element.id) {
      this.elements.set(element.id, element);
    }
    return element;
  }

  getElementById(id) {
    return this.elements.get(id) || null;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const all = [...this.roots];
    if (selector.startsWith('.')) {
      const className = selector.slice(1);
      return all.filter((element) => element.classList.contains(className));
    }
    return [];
  }
}

function createElement(document, { id, className = '', textContent = '', value = '', tagName = 'div' } = {}) {
  const element = document.createElement(tagName);
  if (id) {
    element.id = id;
  }
  element.className = className;
  element.textContent = textContent;
  element.value = value;
  document.register(element);
  return element;
}

function createCanvas(document, id) {
  const container = createElement(document, { id: `${id}-parent` });
  container.clientWidth = 680;
  const canvas = createElement(document, { id, tagName: 'canvas' });
  container.appendChild(canvas);
  return canvas;
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return JSON.parse(JSON.stringify(body));
    },
  };
}

function setupEnvironment() {
  const document = new MockDocument();
  const previewCalls = [];
  const simulateCalls = [];
  const alerts = [];
  const cancelledRafs = [];

  const screens = [
    createElement(document, { id: 'screen-input', className: 'screen active' }),
    createElement(document, { id: 'screen-simulation', className: 'screen' }),
    createElement(document, { id: 'screen-analysis', className: 'screen' }),
  ];

  const speedButtons = [
    createElement(document, { className: 'speed-btn', textContent: '1x' }),
    createElement(document, { className: 'speed-btn active', textContent: '2x' }),
    createElement(document, { className: 'speed-btn', textContent: '5x' }),
    createElement(document, { className: 'speed-btn', textContent: '10x' }),
    createElement(document, { className: 'speed-btn', textContent: '⚡' }),
  ];

  createElement(document, { id: 'run-btn', className: 'run-btn', textContent: 'Run Simulation' });
  createElement(document, { id: 'rerun-btn', className: 'rerun-btn', textContent: 'Re-run' });
  createElement(document, { id: 'view-btn', className: 'view-btn', textContent: 'View Analysis' });
  createElement(document, { id: 'progress-label', textContent: 'Shift in progress…' });
  createElement(document, { id: 'agent-grid' });
  createElement(document, { id: 'sim-clock', textContent: '08:00' });
  createElement(document, { id: 'sim-bar' });
  createElement(document, { id: 'stat-queue', textContent: '0' });
  createElement(document, { id: 'stat-arrived', textContent: '0' });
  createElement(document, { id: 'stat-answered', textContent: '0' });
  createElement(document, { id: 'stat-abandoned', textContent: '0' });
  createElement(document, { id: 'stat-asa', textContent: '—' });
  createElement(document, { id: 'stat-sl', textContent: '—' });
  createElement(document, { id: 'stat-util', textContent: '—' });
  createElement(document, { id: 'queue-dots' });
  createElement(document, { id: 'activity-list' });
  createElement(document, { id: 'footer-calls', textContent: '—' });
  createElement(document, { id: 'footer-agents', textContent: '—' });
  createElement(document, { id: 'footer-target', textContent: '—' });
  createElement(document, { id: 'sum-calls', textContent: '—' });
  createElement(document, { id: 'sum-calls-sub' });
  createElement(document, { id: 'sum-asa', textContent: '—' });
  createElement(document, { id: 'sum-asa-sub' });
  createElement(document, { id: 'sum-sl', textContent: '—' });
  createElement(document, { id: 'sum-sl-sub' });
  createElement(document, { id: 'sum-util', textContent: '—' });
  createElement(document, { id: 'sum-abandon', textContent: '—' });
  createElement(document, { id: 'sum-abandon-sub' });

  const hotspotTable = createElement(document, { id: 'hotspot-table' });
  hotspotTable.appendChild(document.createElement('div'));

  createCanvas(document, 'call-preview');
  createCanvas(document, 'chart-volume');
  createCanvas(document, 'chart-asa');
  createCanvas(document, 'chart-util');
  createCanvas(document, 'chart-abandon');

  const inputs = {
    agents: '15',
    start: '8',
    shift: '8',
    'num-breaks': '2',
    'break-dur': '15',
    calls: '480',
    aht: '4',
    target: '20',
    abandon: '180',
  };

  for (const [id, value] of Object.entries(inputs)) {
    createElement(document, { id: `inp-${id}`, tagName: 'input', value });
    createElement(document, { id: `val-${id}` });
  }

  const previewResponse = {
    curvePoints: [0.2, 0.5, 1, 0.4],
    breakWindows: [{ s: 540, e: 570, label: 'Break 1' }],
    axisLabels: [
      { offsetMin: 0, label: '8' },
      { offsetMin: 240, label: '12' },
      { offsetMin: 480, label: '4' },
    ],
  };

  const simulateResponse = {
    params: {
      numAgents: 15,
      shiftStart: 480,
      shiftLength: 480,
      breakDur: 15,
      numBreaks: 2,
      expectedCalls: 480,
      aht: 4,
      serviceTarget: 20,
      abandonTime: 180,
    },
    playback: {
      events: [
        { t: 481, type: 'arrive', id: 0 },
        { t: 482, type: 'answer', id: 0, a: 0, wait: 1 / 60 },
      ],
      initialState: {
        simTime: 480,
        queue: 0,
        arrived: 0,
        answered: 0,
        abandoned: 0,
        totalWaitMin: 0,
        withinTarget: 0,
        agentStatus: new Array(15).fill('idle'),
      },
      footer: {
        callsDisplay: '450',
        agentsDisplay: '15',
        targetDisplay: '20s',
      },
    },
    analysis: {
      summary: {
        calls: { display: '450', subtext: 'of 480 expected · 30 abandoned', tone: 'text' },
        asa: { display: '18s', subtext: 'Target: 20s', tone: 'green' },
        sl: { display: '82.5%', subtext: 'Calls answered within 20s', tone: 'green' },
        util: { display: '74.2%', subtext: 'Time on calls vs available', tone: 'green' },
        abandon: { display: '6.3%', subtext: '30 of 480 offered calls', tone: 'amber' },
      },
      hotspots: [
        {
          label: '8:00 AM',
          numCallsDisplay: '40',
          avgWaitDisplay: '18s',
          avgWaitTone: 'green',
          slDisplay: '83%',
          slTone: 'green',
          abandonDisplay: '6%',
          abandonTone: 'amber',
          utilDisplay: '74%',
          utilTone: 'green',
          status: { key: 'elevated', label: '↑ Elevated', badgeClass: 'badge-elevated' },
        },
      ],
      charts: {
        volume: { labels: ['8:00 AM', '8:30 AM'], values: [40, 35], tones: ['blue', 'blue'], yMax: 40 },
        asa: {
          labels: ['8:00 AM', '8:30 AM'],
          values: [18, 22],
          tones: ['green', 'amber'],
          yMax: 50,
          refValue: 20,
          refTone: 'amber',
        },
        util: { labels: ['8:00 AM', '8:30 AM'], values: [74, 68], tones: ['green', 'green'], yMax: 100 },
        abandon: { labels: ['8:00 AM', '8:30 AM'], values: [6, 4], tones: ['amber', 'green'], yMax: 20 },
      },
    },
  };

  const timers = new Map();
  let nextTimerId = 1;
  async function flushTimers() {
    const pending = [...timers.values()];
    timers.clear();
    for (const timer of pending) {
      if (!timer.cancelled) {
        await timer.callback();
      }
    }
  }

  const rafs = new Map();
  let nextRafId = 1;

  const globals = {
    document,
    window: {
      devicePixelRatio: 1,
      alert: (message) => alerts.push(message),
    },
    fetch: async (url) => {
      if (url === '/api/preview') {
        previewCalls.push(url);
        return jsonResponse(previewResponse);
      }
      if (url === '/api/simulate') {
        simulateCalls.push(url);
        return jsonResponse(simulateResponse);
      }
      throw new Error(`Unexpected fetch: ${url}`);
    },
    setTimeout: (callback) => {
      const id = nextTimerId++;
      timers.set(id, { id, callback, cancelled: false });
      return id;
    },
    clearTimeout: (id) => {
      const timer = timers.get(id);
      if (timer) {
        timer.cancelled = true;
      }
    },
    requestAnimationFrame: (callback) => {
      const id = nextRafId++;
      rafs.set(id, callback);
      return id;
    },
    cancelAnimationFrame: (id) => {
      cancelledRafs.push(id);
      rafs.delete(id);
    },
    Path2D: class {
      moveTo() {}
      lineTo() {}
      closePath() {}
    },
    performance: {
      now: () => 1000,
    },
  };

  return {
    document,
    screens,
    speedButtons,
    previewCalls,
    simulateCalls,
    alerts,
    cancelledRafs,
    flushTimers,
    globals,
  };
}

test('simulate.jsx preserves the browser adapter flows with server-side view-model responses', {
  skip: hasSimulateSource ? false : 'simulate.jsx is not present in this checkout',
}, async () => {
  const env = setupEnvironment();
  const previous = {};

  for (const [key, value] of Object.entries(env.globals)) {
    previous[key] = globalThis[key];
    globalThis[key] = value;
  }

  try {
    const client = await loadSimulateModule();

    client.initInputs();
    await env.flushTimers();

    assert.equal(env.document.getElementById('val-start').textContent, '8:00 AM');
    assert.equal(env.previewCalls.length, 1);

    client.drawPreview();
    await env.flushTimers();
    assert.equal(env.previewCalls.length, 2);

    await client.startSimulation();
    assert.equal(env.simulateCalls.length, 1);
    assert.equal(env.document.getElementById('screen-simulation').classList.contains('active'), true);
    assert.equal(env.document.getElementById('footer-calls').textContent, '450');
    assert.equal(env.document.getElementById('footer-target').textContent, '20s');

    client.setSpeed(600);
    assert.equal(env.speedButtons[3].classList.contains('active'), true);
    assert.equal(env.speedButtons[1].classList.contains('active'), false);

    client.showAnalysis();
    await env.flushTimers();
    assert.equal(env.document.getElementById('screen-analysis').classList.contains('active'), true);
    assert.equal(env.document.getElementById('sum-asa').textContent, '18s');
    assert.equal(env.document.getElementById('hotspot-table').children.length, 2);

    client.showScreen('screen-input');
    client.drawPreview();
    await env.flushTimers();
    assert.equal(env.document.getElementById('screen-input').classList.contains('active'), true);
    assert.equal(env.previewCalls.length, 3);

    await client.startSimulation();
    assert.equal(env.simulateCalls.length, 2);
    assert.deepEqual(env.cancelledRafs, [1]);
    assert.equal(env.alerts.length, 0);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      globalThis[key] = value;
    }
  }
});
