var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../../../../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");

// ../../../../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  static {
    __name(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
  static {
    __name(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance = class {
  static {
    __name(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver = class {
  static {
    __name(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// ../../../../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// ../../../../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// ../../../../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// ../../../../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream = class {
  static {
    __name(this, "ReadStream");
  }
  fd;
  isRaw = false;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
};

// ../../../../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream = class {
  static {
    __name(this, "WriteStream");
  }
  fd;
  columns = 80;
  rows = 24;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  clearLine(dir, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  write(str, encoding, cb) {
    if (str instanceof Uint8Array) {
      str = new TextDecoder().decode(str);
    }
    try {
      console.log(str);
    } catch {
    }
    cb && typeof cb === "function" && cb();
    return false;
  }
};

// ../../../../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION = "22.14.0";

// ../../../../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class _Process extends EventEmitter {
  static {
    __name(this, "Process");
  }
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  // --- event emitter ---
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  // --- stdio (lazy initializers) ---
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  // --- cwd ---
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  // --- dummy props and getters ---
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return `v${NODE_VERSION}`;
  }
  get versions() {
    return { node: NODE_VERSION };
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  // --- noop methods ---
  ref() {
  }
  unref() {
  }
  // --- unimplemented methods ---
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  // --- attached interfaces ---
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
  // --- undefined props ---
  mainModule = void 0;
  domain = void 0;
  // optional
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  // internals
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};

// ../../../../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule("node:process");
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess.nextTick
});
var { exit, features, platform } = workerdProcess;
var {
  _channel,
  _debugEnd,
  _debugProcess,
  _disconnect,
  _events,
  _eventsCount,
  _exiting,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _handleQueue,
  _kill,
  _linkedBinding,
  _maxListeners,
  _pendingMessage,
  _preload_modules,
  _rawDebug,
  _send,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  arch,
  argv,
  argv0,
  assert,
  availableMemory,
  binding,
  channel,
  chdir,
  config,
  connected,
  constrainedMemory,
  cpuUsage,
  cwd,
  debugPort,
  disconnect,
  dlopen,
  domain,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exitCode,
  finalization,
  getActiveResourcesInfo,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getMaxListeners,
  getuid,
  hasUncaughtExceptionCaptureCallback,
  hrtime: hrtime3,
  initgroups,
  kill,
  listenerCount,
  listeners,
  loadEnvFile,
  mainModule,
  memoryUsage,
  moduleLoadList,
  nextTick,
  off,
  on,
  once,
  openStdin,
  permission,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  reallyExit,
  ref,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  send,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setMaxListeners,
  setSourceMapsEnabled,
  setuid,
  setUncaughtExceptionCaptureCallback,
  sourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  throwDeprecation,
  title,
  traceDeprecation,
  umask,
  unref,
  uptime,
  version,
  versions
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// ../../../../../../../../opt/homebrew/lib/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// server/simulate-engine.mjs
function fmt12(min) {
  const h = Math.floor(min / 60) % 24;
  const m = Math.floor(min % 60);
  const ap = h >= 12 ? "PM" : "AM";
  const h12 = (h - 1 + 12) % 12 + 1;
  return `${h12}:${String(m).padStart(2, "0")} ${ap}`;
}
__name(fmt12, "fmt12");
function fmtSec(seconds) {
  const rounded = Math.round(seconds);
  if (rounded < 60) {
    return `${rounded}s`;
  }
  return `${Math.floor(rounded / 60)}m ${rounded % 60}s`;
}
__name(fmtSec, "fmtSec");
function formatPreviewAxisLabel(min) {
  return fmt12(min).replace(":00", "").replace(" AM", " ").replace(" PM", " ").trim();
}
__name(formatPreviewAxisLabel, "formatPreviewAxisLabel");
function toFiniteNumber(raw, name) {
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
  return value;
}
__name(toFiniteNumber, "toFiniteNumber");
function assertInRange(value, name, min, max) {
  if (value < min || value > max) {
    throw new RangeError(`${name} must be between ${min} and ${max}`);
  }
}
__name(assertInRange, "assertInRange");
function assertInteger(value, name) {
  if (!Number.isInteger(value)) {
    throw new TypeError(`${name} must be an integer`);
  }
}
__name(assertInteger, "assertInteger");
function toneForAsa(value, serviceTarget) {
  if (value <= serviceTarget) {
    return "green";
  }
  if (value <= serviceTarget * 2) {
    return "amber";
  }
  return "red";
}
__name(toneForAsa, "toneForAsa");
function toneForSl(value) {
  if (value >= 80) {
    return "green";
  }
  if (value >= 60) {
    return "amber";
  }
  return "red";
}
__name(toneForSl, "toneForSl");
function toneForUtil(value) {
  if (value > 100) {
    return "red";
  }
  if (value >= 90) {
    return "amber";
  }
  if (value >= 50) {
    return "green";
  }
  return "blue";
}
__name(toneForUtil, "toneForUtil");
function toneForAbandon(value) {
  if (value < 5) {
    return "green";
  }
  if (value < 15) {
    return "amber";
  }
  return "red";
}
__name(toneForAbandon, "toneForAbandon");
function classifyHotspot(interval, serviceTarget) {
  const stressed = interval.avgWaitS > serviceTarget * 2 || interval.sl < 60 || interval.abandonRate > 15;
  const elevated = !stressed && (interval.avgWaitS > serviceTarget || interval.sl < 80 || interval.abandonRate > 5);
  const quiet = !stressed && !elevated && interval.util < 50;
  if (stressed) {
    return { key: "stressed", label: "\u26A0 Stressed", badgeClass: "badge-stressed" };
  }
  if (elevated) {
    return { key: "elevated", label: "\u2191 Elevated", badgeClass: "badge-elevated" };
  }
  if (quiet) {
    return { key: "quiet", label: "\u2193 Under-utilised", badgeClass: "badge-quiet" };
  }
  return { key: "optimal", label: "\u2713 Optimal", badgeClass: "badge-optimal" };
}
__name(classifyHotspot, "classifyHotspot");
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
    refTone: options.refTone
  };
}
__name(makeChart, "makeChart");
function buildSummary(overall, params) {
  return {
    calls: {
      value: overall.total,
      display: String(overall.total),
      subtext: `of ${params.expectedCalls} expected \xB7 ${overall.abandoned} abandoned`,
      tone: "text"
    },
    asa: {
      value: overall.asa,
      display: fmtSec(overall.asa),
      subtext: `Target: ${params.serviceTarget}s`,
      tone: toneForAsa(overall.asa, params.serviceTarget)
    },
    sl: {
      value: overall.sl,
      display: `${overall.sl.toFixed(1)}%`,
      subtext: `Calls answered within ${params.serviceTarget}s`,
      tone: toneForSl(overall.sl)
    },
    util: {
      value: overall.util,
      display: `${overall.util.toFixed(1)}%`,
      subtext: "Time on calls vs available",
      tone: toneForUtil(overall.util)
    },
    abandon: {
      value: overall.abandonRate,
      display: `${overall.abandonRate.toFixed(1)}%`,
      subtext: `${overall.abandoned} of ${overall.totalOffered} offered calls`,
      tone: toneForAbandon(overall.abandonRate)
    }
  };
}
__name(buildSummary, "buildSummary");
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
    status: classifyHotspot(interval, serviceTarget)
  }));
}
__name(buildHotspots, "buildHotspots");
function buildAnalysis(intervals, overall, params) {
  return {
    summary: buildSummary(overall, params),
    hotspots: buildHotspots(intervals, params.serviceTarget),
    charts: {
      volume: makeChart(
        intervals.map((interval) => interval.label),
        intervals.map((interval) => interval.numCalls),
        intervals.map(() => "blue")
      ),
      asa: makeChart(
        intervals.map((interval) => interval.label),
        intervals.map((interval) => interval.avgWaitS),
        intervals.map((interval) => toneForAsa(interval.avgWaitS, params.serviceTarget)),
        {
          yMax: Math.max(...intervals.map((interval) => interval.avgWaitS), params.serviceTarget * 2.5, 30),
          refValue: params.serviceTarget,
          refTone: "amber"
        }
      ),
      util: makeChart(
        intervals.map((interval) => interval.label),
        intervals.map((interval) => interval.util),
        intervals.map((interval) => toneForUtil(interval.util)),
        {
          yMax: Math.max(...intervals.map((interval) => interval.util), 100)
        }
      ),
      abandon: makeChart(
        intervals.map((interval) => interval.label),
        intervals.map((interval) => interval.abandonRate),
        intervals.map((interval) => toneForAbandon(interval.abandonRate)),
        {
          yMax: Math.max(...intervals.map((interval) => interval.abandonRate), 20)
        }
      )
    }
  };
}
__name(buildAnalysis, "buildAnalysis");
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
      agentStatus: new Array(params.numAgents).fill("idle")
    },
    footer: {
      callsDisplay: String(overall.total),
      agentsDisplay: String(params.numAgents),
      targetDisplay: `${params.serviceTarget}s`
    }
  };
}
__name(buildPlayback, "buildPlayback");
function normalizeSimulationParams(raw = {}) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new TypeError("Simulation payload must be an object");
  }
  const params = {
    numAgents: toFiniteNumber(raw.numAgents, "numAgents"),
    shiftStart: toFiniteNumber(raw.shiftStart, "shiftStart"),
    shiftLength: toFiniteNumber(raw.shiftLength, "shiftLength"),
    breakDur: toFiniteNumber(raw.breakDur, "breakDur"),
    numBreaks: toFiniteNumber(raw.numBreaks, "numBreaks"),
    expectedCalls: toFiniteNumber(raw.expectedCalls, "expectedCalls"),
    aht: toFiniteNumber(raw.aht, "aht"),
    serviceTarget: toFiniteNumber(raw.serviceTarget, "serviceTarget"),
    abandonTime: toFiniteNumber(raw.abandonTime, "abandonTime")
  };
  assertInteger(params.numAgents, "numAgents");
  assertInteger(params.numBreaks, "numBreaks");
  assertInteger(params.expectedCalls, "expectedCalls");
  assertInRange(params.numAgents, "numAgents", 0, 100);
  assertInRange(params.shiftStart, "shiftStart", 0, 24 * 60);
  assertInRange(params.shiftLength, "shiftLength", 1, 24 * 60);
  assertInRange(params.breakDur, "breakDur", 0, 240);
  assertInRange(params.numBreaks, "numBreaks", 0, 10);
  assertInRange(params.expectedCalls, "expectedCalls", 0, 1e4);
  assertInRange(params.aht, "aht", 0.1, 24 * 60);
  assertInRange(params.serviceTarget, "serviceTarget", 0, 3600);
  assertInRange(params.abandonTime, "abandonTime", 1, 24 * 60 * 60);
  return params;
}
__name(normalizeSimulationParams, "normalizeSimulationParams");
function callRate(t) {
  const G = /* @__PURE__ */ __name((x, mu, s) => Math.exp(-((x - mu) ** 2) / (2 * s * s)), "G");
  return Math.max(
    0,
    0.18 + 0.82 * G(t, 0.27, 0.115) + 0.55 * G(t, 0.72, 0.1) - 0.16 * G(t, 0.5, 0.055)
  );
}
__name(callRate, "callRate");
function buildCDF(shiftLength) {
  const bins = Math.ceil(shiftLength);
  const rates = Array.from({ length: bins }, (_, i) => callRate((i + 0.5) / bins));
  const total = rates.reduce((a, b) => a + b, 0);
  let cum = 0;
  return rates.map((rate) => cum += rate / total);
}
__name(buildCDF, "buildCDF");
function generateCalls(n, shiftStart, shiftLength, ahtMin, cdf, abandonTimeSec, random) {
  const calls = [];
  for (let i = 0; i < n; i++) {
    const u = random();
    let lo = 0;
    let hi = cdf.length - 1;
    while (lo < hi) {
      const mid = lo + hi >> 1;
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
__name(generateCalls, "generateCalls");
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
__name(makeBreaks, "makeBreaks");
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
__name(nextAvail, "nextAvail");
function runSimulation(rawParams, { random = Math.random } = {}) {
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
    abandonTime
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
        events.push({ t: brk.s, type: "brk_s", a });
        events.push({ t: Math.min(brk.e, shiftEnd), type: "brk_e", a });
      }
    }
  }
  for (const call of calls) {
    if (call.arrival >= shiftEnd) {
      break;
    }
    const id = callId++;
    events.push({ t: call.arrival, type: "arrive", id });
    if (numAgents === 0) {
      const abandonAt = call.arrival + call.patience / 60;
      events.push({ t: abandonAt, type: "abandon", id });
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
      events.push({ t: abandonAt, type: "abandon", id });
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
      ok: waitMin * 60 <= serviceTarget
    });
    events.push({ t: bestAt, type: "answer", id, a: bestA, wait: waitMin });
    events.push({ t: endAt, type: "end", id, a: bestA });
  }
  const order = { arrive: 0, brk_e: 1, answer: 2, brk_s: 3, end: 4, abandon: 5 };
  events.sort((a, b) => a.t - b.t || order[a.type] - order[b.type]);
  const intLen = 30;
  const numInts = Math.ceil(shiftLength / intLen);
  const intervals = [];
  for (let i = 0; i < numInts; i++) {
    const is = shiftStart + i * intLen;
    const ie = is + intLen;
    const arriving = results.filter((result) => result.arrival >= is && result.arrival < ie);
    const abandonedInInt = abandonedCalls.filter((call) => call.arrival >= is && call.arrival < ie);
    const totalOffered2 = arriving.length + abandonedInInt.length;
    const numAbandoned = abandonedInInt.length;
    const abandonRate = totalOffered2 > 0 ? numAbandoned / totalOffered2 * 100 : 0;
    const avgWaitS = arriving.length ? arriving.reduce((sum, result) => sum + result.wait, 0) / arriving.length * 60 : 0;
    const sl = arriving.length ? arriving.filter((result) => result.ok).length / arriving.length * 100 : 100;
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
      numCalls: totalOffered2,
      numAnswered: arriving.length,
      numAbandoned,
      abandonRate,
      avgWaitS,
      sl,
      util: avail > 0 ? busy / avail * 100 : 0
    });
  }
  const totalWait = results.reduce((sum, result) => sum + result.wait, 0);
  const asa = results.length ? totalWait / results.length * 60 : 0;
  const slOv = results.length ? results.filter((result) => result.ok).length / results.length * 100 : 0;
  const totalOffered = results.length + abandonedCalls.length;
  const abandonRateOv = totalOffered > 0 ? abandonedCalls.length / totalOffered * 100 : 0;
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
      util: tAvail > 0 ? tBusy / tAvail * 100 : 0,
      total: results.length,
      abandoned: abandonedCalls.length,
      totalOffered,
      abandonRate: abandonRateOv
    }
  };
}
__name(runSimulation, "runSimulation");
function buildSimulationViewModel(rawParams, options = {}) {
  const simulation = runSimulation(rawParams, options);
  return {
    params: simulation.params,
    playback: buildPlayback(simulation.params, simulation.overall, simulation.events),
    analysis: buildAnalysis(simulation.intervals, simulation.overall, simulation.params)
  };
}
__name(buildSimulationViewModel, "buildSimulationViewModel");
function computePreview(raw = {}) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new TypeError("Preview payload must be an object");
  }
  const shiftStart = toFiniteNumber(raw.shiftStart, "shiftStart");
  const shiftLength = toFiniteNumber(raw.shiftLength, "shiftLength");
  const numAgents = toFiniteNumber(raw.numAgents, "numAgents");
  const breakDur = toFiniteNumber(raw.breakDur, "breakDur");
  const numBreaks = toFiniteNumber(raw.numBreaks, "numBreaks");
  assertInteger(numAgents, "numAgents");
  assertInteger(numBreaks, "numBreaks");
  assertInRange(shiftStart, "shiftStart", 0, 24 * 60);
  assertInRange(shiftLength, "shiftLength", 1, 24 * 60);
  assertInRange(numAgents, "numAgents", 0, 100);
  assertInRange(breakDur, "breakDur", 0, 240);
  assertInRange(numBreaks, "numBreaks", 0, 10);
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
            label: `Break ${b + 1}`
          });
        }
      }
    }
  }
  const axisLabels = [];
  for (let hour = 0; hour <= shiftLength / 60; hour += 1) {
    axisLabels.push({
      offsetMin: hour * 60,
      label: formatPreviewAxisLabel(shiftStart + hour * 60)
    });
  }
  return { curvePoints, breakWindows, axisLabels };
}
__name(computePreview, "computePreview");

// supported-modules.mjs
var SUPPORTED_BROWSER_MODULES = Object.freeze([
  {
    specifier: "react",
    vendorFile: "react.mjs",
    bundleExternal: []
  },
  {
    specifier: "react/jsx-runtime",
    vendorFile: "react-jsx-runtime.mjs",
    bundleExternal: []
  },
  {
    specifier: "react-dom/client",
    vendorFile: "react-dom-client.mjs",
    bundleExternal: ["react"]
  },
  {
    specifier: "recharts",
    vendorFile: "recharts.mjs",
    bundleExternal: ["react"]
  },
  {
    specifier: "lucide-react",
    vendorFile: "lucide-react.mjs",
    bundleExternal: ["react"]
  },
  {
    specifier: "lodash",
    vendorFile: "lodash.mjs",
    bundleExternal: []
  },
  {
    specifier: "d3",
    vendorFile: "d3.mjs",
    bundleExternal: []
  },
  {
    specifier: "papaparse",
    vendorFile: "papaparse.mjs",
    bundleExternal: []
  },
  {
    specifier: "mathjs",
    vendorFile: "mathjs.mjs",
    bundleExternal: []
  },
  {
    specifier: "chart.js",
    vendorFile: "chart-js.mjs",
    bundleExternal: []
  },
  {
    specifier: "tone",
    vendorFile: "tone.mjs",
    bundleExternal: []
  },
  {
    specifier: "mammoth",
    vendorFile: "mammoth.mjs",
    bundleExternal: []
  },
  {
    specifier: "shadcn/ui",
    vendorFile: "shadcn-ui.mjs",
    bundleExternal: ["react"]
  }
]);
var SUPPORTED_BROWSER_MODULE_SPECIFIERS = Object.freeze(
  SUPPORTED_BROWSER_MODULES.map((module) => module.specifier)
);
function supportedModuleSpecifierSet() {
  return new Set(SUPPORTED_BROWSER_MODULE_SPECIFIERS);
}
__name(supportedModuleSpecifierSet, "supportedModuleSpecifierSet");
function supportedModulesDescription() {
  return SUPPORTED_BROWSER_MODULE_SPECIFIERS.join(", ");
}
__name(supportedModulesDescription, "supportedModulesDescription");

// jsx-import-validator.mjs
var IMPORT_SPECIFIER_PATTERN = /\bimport\s+(?:[^'"]*?\s+from\s*)?['"]([^'"]+)['"]|\bexport\s+[^'"]*?\s+from\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
function isBareSpecifier(specifier) {
  return !specifier.startsWith(".") && !specifier.startsWith("/") && !specifier.includes("://") && !specifier.startsWith("#");
}
__name(isBareSpecifier, "isBareSpecifier");
function findJsxImportSpecifiers(source) {
  return [...source.matchAll(IMPORT_SPECIFIER_PATTERN)].map((match) => match[1] || match[2] || match[3]);
}
__name(findJsxImportSpecifiers, "findJsxImportSpecifiers");
function findUnsupportedJsxImports(source, { allowedModules } = {}) {
  const modules = allowedModules ?? supportedModuleSpecifierSet();
  const unsupported = /* @__PURE__ */ new Set();
  for (const specifier of findJsxImportSpecifiers(source)) {
    if (isBareSpecifier(specifier) && !modules.has(specifier)) {
      unsupported.add(specifier);
    }
  }
  return [...unsupported].sort();
}
__name(findUnsupportedJsxImports, "findUnsupportedJsxImports");
function assertSupportedJsxImports(source, { file = "uploaded JSX", allowedModules } = {}) {
  const unsupported = findUnsupportedJsxImports(source, { allowedModules });
  if (unsupported.length === 0) return;
  const plural = unsupported.length === 1 ? "import" : "imports";
  throw new Error(
    `${file} uses unsupported bare ${plural}: ${unsupported.join(", ")}. Supported modules: ${supportedModulesDescription()}. Use a relative ./file.mjs import for local logic.`
  );
}
__name(assertSupportedJsxImports, "assertSupportedJsxImports");

// src/worker.mjs
var MAX_JSON_BODY_BYTES = 4096;
var MAX_UPLOAD_BODY_BYTES = 2 * 1024 * 1024;
var MAX_UPLOAD_FILE_BYTES = 512 * 1024;
var SAFE_DELIVERABLE_FILE = /^[A-Za-z0-9][A-Za-z0-9._-]*\.(jsx|mjs)$/;
var LOCAL_IMPORT_PATTERN = /\b(?:import\s+[^'"]*?from|export\s+[^'"]*?from|import\s*\()\s*['"](\.[^'"]+)['"]/g;
var R2_UPLOAD_PREFIX = "jsxupload/Files/";
var R2_ROUTE_PREFIX = "/jsxupload/Files/";
var ApiRequestError = class extends Error {
  static {
    __name(this, "ApiRequestError");
  }
  constructor(status, message) {
    super(message);
    this.status = status;
  }
};
function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...init.headers || {}
    }
  });
}
__name(json, "json");
function errorResponse(status, message) {
  return json({ error: message }, { status });
}
__name(errorResponse, "errorResponse");
function isSafeDeliverableFile(value) {
  return typeof value === "string" && SAFE_DELIVERABLE_FILE.test(value);
}
__name(isSafeDeliverableFile, "isSafeDeliverableFile");
function getUploadBucket(env2) {
  if (!env2.JSX_UPLOADS) {
    throw new ApiRequestError(500, "JSX_UPLOADS R2 binding is not configured");
  }
  return env2.JSX_UPLOADS;
}
__name(getUploadBucket, "getUploadBucket");
function uploadObjectKey(file) {
  return `${R2_UPLOAD_PREFIX}${file}`;
}
__name(uploadObjectKey, "uploadObjectKey");
function contentTypeForFile(file) {
  if (file.endsWith(".mjs")) return "text/javascript; charset=utf-8";
  if (file.endsWith(".jsx")) return "text/jsx; charset=utf-8";
  return "application/octet-stream";
}
__name(contentTypeForFile, "contentTypeForFile");
function objectVersion(object) {
  return object?.etag || object?.version || object?.uploaded?.getTime?.().toString() || Date.now().toString(36);
}
__name(objectVersion, "objectVersion");
function openUrlForUploadedJsx(file, version2) {
  return `/?file=${encodeURIComponent(file)}&source=r2&version=${encodeURIComponent(version2)}`;
}
__name(openUrlForUploadedJsx, "openUrlForUploadedJsx");
function normalizeLocalImport(specifier) {
  if (!specifier.startsWith("./")) return null;
  const withoutPrefix = specifier.slice(2);
  if (!withoutPrefix || withoutPrefix.includes("/") || withoutPrefix.includes("\\") || withoutPrefix.startsWith(".")) {
    throw new ApiRequestError(400, `Uploaded JSX imports must be flat local files: ${specifier}`);
  }
  if (!withoutPrefix.endsWith(".mjs")) {
    throw new ApiRequestError(400, `Uploaded JSX may only import flat local .mjs files: ${specifier}`);
  }
  if (!isSafeDeliverableFile(withoutPrefix)) {
    throw new ApiRequestError(400, `Uploaded JSX imports an unsafe file name: ${specifier}`);
  }
  return withoutPrefix;
}
__name(normalizeLocalImport, "normalizeLocalImport");
function findRequiredMjsImports(jsxText) {
  const required = /* @__PURE__ */ new Set();
  for (const match of jsxText.matchAll(LOCAL_IMPORT_PATTERN)) {
    const normalized = normalizeLocalImport(match[1]);
    if (normalized) required.add(normalized);
  }
  return required;
}
__name(findRequiredMjsImports, "findRequiredMjsImports");
async function readUploadFiles(request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    throw new ApiRequestError(415, "Request content-type must be multipart/form-data");
  }
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_UPLOAD_BODY_BYTES) {
    throw new ApiRequestError(413, `Upload body must be ${MAX_UPLOAD_BODY_BYTES} bytes or less`);
  }
  const form = await request.formData();
  const files = [];
  for (const value of form.values()) {
    if (typeof value === "string") {
      throw new ApiRequestError(400, "Upload form fields must be files");
    }
    files.push(value);
  }
  if (files.length === 0) {
    throw new ApiRequestError(400, "Upload must include one .jsx file and optional .mjs files");
  }
  const seen = /* @__PURE__ */ new Set();
  const uploads = [];
  let totalBytes = 0;
  for (const file of files) {
    const name = file.name || "";
    if (!isSafeDeliverableFile(name)) {
      throw new ApiRequestError(400, `Unsafe or unsupported file name: ${name || "(unnamed file)"}`);
    }
    if (seen.has(name)) {
      throw new ApiRequestError(400, `Duplicate uploaded file name: ${name}`);
    }
    seen.add(name);
    if (file.size > MAX_UPLOAD_FILE_BYTES) {
      throw new ApiRequestError(413, `${name} must be ${MAX_UPLOAD_FILE_BYTES} bytes or less`);
    }
    totalBytes += file.size;
    if (totalBytes > MAX_UPLOAD_BODY_BYTES) {
      throw new ApiRequestError(413, `Upload body must be ${MAX_UPLOAD_BODY_BYTES} bytes or less`);
    }
    uploads.push({ name, text: await file.text() });
  }
  const jsxFiles = uploads.filter((file) => file.name.endsWith(".jsx"));
  if (jsxFiles.length !== 1) {
    throw new ApiRequestError(400, "Upload must include exactly one .jsx file");
  }
  const jsxFile = jsxFiles[0];
  try {
    assertSupportedJsxImports(jsxFile.text, { file: jsxFile.name });
  } catch (error) {
    throw new ApiRequestError(400, error instanceof Error ? error.message : "Uploaded JSX contains unsupported imports");
  }
  const uploadedNames = new Set(uploads.map((file) => file.name));
  const requiredImports = findRequiredMjsImports(jsxFile.text);
  for (const importedFile of requiredImports) {
    if (!uploadedNames.has(importedFile)) {
      throw new ApiRequestError(400, `Uploaded JSX imports missing file: ${importedFile}`);
    }
  }
  return { uploads, jsxFile: jsxFiles[0].name };
}
__name(readUploadFiles, "readUploadFiles");
async function storeUploadedFiles(env2, uploads) {
  const bucket = getUploadBucket(env2);
  const storedFiles = [];
  for (const upload of uploads) {
    const key = uploadObjectKey(upload.name);
    const object = await bucket.put(key, upload.text, {
      httpMetadata: {
        contentType: contentTypeForFile(upload.name),
        cacheControl: "no-cache"
      },
      customMetadata: {
        uploadedBy: "gpt-outputs-viewer"
      }
    });
    storedFiles.push({
      file: upload.name,
      key,
      version: objectVersion(object)
    });
  }
  return storedFiles;
}
__name(storeUploadedFiles, "storeUploadedFiles");
async function listUploadedJsxFiles(env2) {
  const bucket = getUploadBucket(env2);
  const files = /* @__PURE__ */ new Set();
  let cursor;
  do {
    const result = await bucket.list({
      prefix: R2_UPLOAD_PREFIX,
      cursor
    });
    for (const object of result.objects || []) {
      const file = object.key?.slice(R2_UPLOAD_PREFIX.length);
      if (isSafeDeliverableFile(file) && file.endsWith(".jsx")) {
        files.add(file);
      }
    }
    cursor = result.truncated ? result.cursor : void 0;
  } while (cursor);
  return [...files].sort();
}
__name(listUploadedJsxFiles, "listUploadedJsxFiles");
function fileFromR2Route(pathname) {
  if (!pathname.startsWith(R2_ROUTE_PREFIX)) {
    return null;
  }
  const encodedFile = pathname.slice(R2_ROUTE_PREFIX.length);
  let file;
  try {
    file = decodeURIComponent(encodedFile);
  } catch {
    throw new ApiRequestError(400, "Uploaded file path is invalid");
  }
  if (!isSafeDeliverableFile(file)) {
    throw new ApiRequestError(400, "Uploaded file path must be a safe .jsx or .mjs file name");
  }
  return file;
}
__name(fileFromR2Route, "fileFromR2Route");
async function serveUploadedFile(request, env2) {
  const url = new URL(request.url);
  const file = fileFromR2Route(url.pathname);
  if (!file) return null;
  if (request.method !== "GET" && request.method !== "HEAD") {
    return errorResponse(405, "Method not allowed");
  }
  const object = await getUploadBucket(env2).get(uploadObjectKey(file));
  if (!object) {
    return errorResponse(404, "Uploaded file not found");
  }
  const headers = new Headers({
    "content-type": contentTypeForFile(file),
    "cache-control": "no-cache"
  });
  if (object.httpEtag) {
    headers.set("etag", object.httpEtag);
  }
  if (typeof object.writeHttpMetadata === "function") {
    object.writeHttpMetadata(headers);
  }
  return new Response(request.method === "HEAD" ? null : object.body, { headers });
}
__name(serveUploadedFile, "serveUploadedFile");
async function handleUploadDeliverable(request, env2) {
  if (request.method !== "POST") {
    return errorResponse(405, "Method not allowed");
  }
  const { uploads, jsxFile } = await readUploadFiles(request);
  const storedFiles = await storeUploadedFiles(env2, uploads);
  const jsxObject = storedFiles.find((file) => file.file === jsxFile);
  const version2 = jsxObject?.version || Date.now().toString(36);
  const openUrl = openUrlForUploadedJsx(jsxFile, version2);
  return json({
    jsxFile,
    storedFiles,
    version: version2,
    openUrl
  });
}
__name(handleUploadDeliverable, "handleUploadDeliverable");
async function handleUploadManifest(request, env2) {
  if (request.method !== "GET") {
    return errorResponse(405, "Method not allowed");
  }
  return json({ files: await listUploadedJsxFiles(env2) });
}
__name(handleUploadManifest, "handleUploadManifest");
async function readJsonPayload(request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new ApiRequestError(415, "Request content-type must be application/json");
  }
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_JSON_BODY_BYTES) {
    throw new ApiRequestError(413, `Request body must be ${MAX_JSON_BODY_BYTES} bytes or less`);
  }
  const bodyText = await request.text();
  const bodyBytes = new TextEncoder().encode(bodyText).length;
  if (bodyBytes > MAX_JSON_BODY_BYTES) {
    throw new ApiRequestError(413, `Request body must be ${MAX_JSON_BODY_BYTES} bytes or less`);
  }
  try {
    return JSON.parse(bodyText);
  } catch {
    throw new ApiRequestError(400, "Request body must be valid JSON");
  }
}
__name(readJsonPayload, "readJsonPayload");
var worker_default = {
  async fetch(request, env2) {
    const url = new URL(request.url);
    try {
      const uploadedFileResponse = await serveUploadedFile(request, env2);
      if (uploadedFileResponse) {
        return uploadedFileResponse;
      }
      if (url.pathname === "/api/upload-deliverable") {
        return await handleUploadDeliverable(request, env2);
      }
      if (url.pathname === "/api/upload-manifest") {
        return await handleUploadManifest(request, env2);
      }
    } catch (error) {
      if (error instanceof ApiRequestError) {
        return errorResponse(error.status, error.message);
      }
      return errorResponse(500, error instanceof Error ? error.message : "Upload request failed");
    }
    if (url.pathname === "/api/simulate") {
      if (request.method !== "POST") {
        return errorResponse(405, "Method not allowed");
      }
      let payload;
      try {
        payload = await readJsonPayload(request);
      } catch (error) {
        if (error instanceof ApiRequestError) {
          return errorResponse(error.status, error.message);
        }
        return errorResponse(400, "Request body must be valid JSON");
      }
      try {
        return json(buildSimulationViewModel(payload));
      } catch (error) {
        return errorResponse(400, error instanceof Error ? error.message : "Invalid simulation payload");
      }
    }
    if (url.pathname === "/api/preview") {
      if (request.method !== "POST") {
        return errorResponse(405, "Method not allowed");
      }
      let payload;
      try {
        payload = await readJsonPayload(request);
      } catch (error) {
        if (error instanceof ApiRequestError) {
          return errorResponse(error.status, error.message);
        }
        return errorResponse(400, "Request body must be valid JSON");
      }
      try {
        const result = computePreview(payload);
        return json(result);
      } catch (error) {
        return errorResponse(400, error instanceof Error ? error.message : "Invalid preview payload");
      }
    }
    return env2.ASSETS.fetch(request);
  }
};

// ../../../../../../../../opt/homebrew/lib/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../../../../../opt/homebrew/lib/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-Py5AyU/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// ../../../../../../../../opt/homebrew/lib/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env2, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env2, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env2, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env2, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-Py5AyU/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env2, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env2, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env2, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env2, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env2, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env2, ctx) => {
      this.env = env2;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker.js.map
