// T-2.1 / T-2.2 spike content script. Writes its measurements to a DOM attribute (spike only).
const rec = {
  t0: performance.now(),
  readyStateAtStart: document.readyState,
  mode: null,
  tStorage: null,
  tApplied: null,
  fcp: null,
  bodyAtApply: null,
  hasNavigationApi: typeof self.navigation !== 'undefined',
  hasUrlPattern: typeof self.URLPattern !== 'undefined',
  events: [],
  checks: [],
};
const save = () => document.documentElement?.setAttribute('data-rk-spike', JSON.stringify(rec));
save();

new PerformanceObserver((list) => {
  for (const e of list.getEntries()) {
    if (e.name === 'first-contentful-paint') {
      rec.fcp = e.startTime;
      save();
    }
  }
}).observe({ type: 'paint', buffered: true });

let sheet = null;
let styleEl = null;
function apply(mode, css) {
  if (mode === 'adopted') {
    sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  } else if (mode === 'style') {
    styleEl = document.createElement('style');
    styleEl.textContent = css;
    (document.head || document.documentElement).append(styleEl);
  }
  rec.tApplied = performance.now();
  rec.bodyAtApply = Boolean(document.body);
  save();
}

chrome.storage.local.get(['mode', 'css']).then(({ mode, css }) => {
  rec.tStorage = performance.now();
  rec.mode = mode;
  if (mode === 'adopted' || mode === 'style') apply(mode, css);
  save();
});

setInterval(() => {
  if (rec.mode !== 'adopted' && rec.mode !== 'style') return;
  const present =
    rec.mode === 'adopted'
      ? document.adoptedStyleSheets.includes(sheet)
      : Boolean(styleEl?.isConnected);
  const last = rec.mode === 'style' ? styleEl?.parentNode?.lastElementChild === styleEl : null;
  const m = document.querySelector('ytd-masthead');
  rec.checks.push({
    t: Math.round(performance.now()),
    present,
    last,
    bg: m ? getComputedStyle(m).backgroundColor : null,
    path: location.pathname,
  });
  if (rec.checks.length > 120) rec.checks.shift();
  save();
}, 500);

const ev = (name) => (e) => {
  rec.events.push({
    name,
    t: performance.now(),
    url: location.pathname + location.search,
    persisted: e?.persisted ?? null,
  });
  save();
};
if (rec.hasNavigationApi)
  self.navigation.addEventListener('currententrychange', ev('currententrychange'));
document.addEventListener('yt-navigate-start', ev('yt-navigate-start'));
document.addEventListener('yt-navigate-finish', ev('yt-navigate-finish'));
addEventListener('popstate', ev('popstate'));
addEventListener('pageshow', ev('pageshow'));
let lastHref = location.href;
setInterval(() => {
  if (location.href !== lastHref) {
    lastHref = location.href;
    ev('poll-250ms')({});
  }
}, 250);
