// Shared browser utilities: state, API calls, event logging, DOM helpers.

const KEY = 'msquared:v1';

/** Session state lives in sessionStorage: it disappears when the tab closes. */
export const state = load();

function load() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}
export function save() {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage blocked: app still works for this page view */
  }
}
export function clearState() {
  for (const k of Object.keys(state)) delete state[k];
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}

export const config = { aiEnabled: false, clinicallyReviewed: false, storageReady: true };
export async function loadConfig() {
  try {
    const r = await fetch('/api/config');
    if (r.ok) Object.assign(config, await r.json());
  } catch {}
}

export async function api(path, method, body) {
  let r;
  try {
    r = await fetch(path, {
      method,
      headers: { 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('We couldn’t reach the server. Check your connection and try again.');
  }
  let data = {};
  try {
    data = await r.json();
  } catch {}
  if (!r.ok) throw new Error(data.error || 'Something went wrong. Try again.');
  return data;
}

export function saveFields(fields) {
  if (!state.sessionId) return Promise.resolve();
  return api('/api/session', 'PATCH', { session_id: state.sessionId, fields });
}

// ---- Event logging: anonymous, batched, only after consent ----
const queue = [];
let flushTimer = null;

export function elapsed() {
  return state.startedAt ? Date.now() - state.startedAt : 0;
}

export function track(event_name, component_id = null) {
  if (!state.sessionId) return; // no consent, no session, no data
  queue.push({ event_name, component_id, elapsed_ms: elapsed(), path_id: state.pathId || null });
  if (queue.length >= 10) flush();
  else if (!flushTimer) flushTimer = setTimeout(flush, 1500);
}

export async function flush(useBeacon = false) {
  clearTimeout(flushTimer);
  flushTimer = null;
  if (!queue.length || !state.sessionId) return;
  const events = queue.splice(0, 50);
  const payload = JSON.stringify({ session_id: state.sessionId, events });
  if (useBeacon && navigator.sendBeacon) {
    navigator.sendBeacon('/api/events', new Blob([payload], { type: 'application/json' }));
    return;
  }
  try {
    await fetch('/api/events', { method: 'POST', headers: { 'content-type': 'application/json' }, body: payload, keepalive: true });
  } catch {
    queue.unshift(...events); // retry on next flush
  }
}

addEventListener('pagehide', () => flush(true));
addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flush(true);
});

// ---- DOM helpers (textContent only; never inject user text as HTML) ----
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (v === true) node.setAttribute(k, '');
    else node.setAttribute(k, String(v));
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

let uid = 0;
export const nextId = (p = 'f') => `${p}-${++uid}`;

// ---- Icons: small inline SVGs (no icon font, no third-party requests) ----
const SVGNS = 'http://www.w3.org/2000/svg';
const ICONS = {
  lock: ['rect 5 11 14 9 2', 'M8 11V8a4 4 0 0 1 8 0v3'],
  book: ['M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2z', 'M4 20a2 2 0 0 0 2 2h13v-4', 'M8 7h7'],
  shield: ['M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z', 'M9 12l2 2 4-4'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  info: ['circle 12 12 9', 'M12 11v5', 'M12 7.6v.01'],
  alert: ['M12 4l9 16H3z', 'M12 10v4', 'M12 17v.01'],
  external: ['M14 4h6v6', 'M20 4l-9 9', 'M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5'],
  copy: ['rect 9 9 11 11 2', 'M5 15V5a1 1 0 0 1 1-1h10'],
  chevronDown: ['M6 9l6 6 6-6'],
  chevronLeft: ['M15 6l-6 6 6 6'],
  mic: ['rect 9 3 6 11 3', 'M5 11a7 7 0 0 0 14 0', 'M12 18v3'],
  pin: ['M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z', 'circle 12 10 2.2'],
  flag: ['M6 21V4', 'M6 4h11l-2 4 2 4H6'],
  user: ['circle 12 8 4', 'M4 21a8 8 0 0 1 16 0'],
  heart: ['M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z'],
};

export function icon(name, cls = 'icon') {
  const svg = document.createElementNS(SVGNS, 'svg');
  for (const [k, v] of Object.entries({
    class: cls,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '1.75',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
    focusable: 'false',
  }))
    svg.setAttribute(k, v);
  for (const d of ICONS[name] || []) {
    const [kind, ...n] = d.split(' ');
    let node;
    if (kind === 'circle') {
      node = document.createElementNS(SVGNS, 'circle');
      node.setAttribute('cx', n[0]);
      node.setAttribute('cy', n[1]);
      node.setAttribute('r', n[2]);
    } else if (kind === 'rect') {
      node = document.createElementNS(SVGNS, 'rect');
      ['x', 'y', 'width', 'height', 'rx'].forEach((a, i) => node.setAttribute(a, n[i]));
    } else {
      node = document.createElementNS(SVGNS, 'path');
      node.setAttribute('d', d);
    }
    svg.append(node);
  }
  return svg;
}

/**
 * Randomized option order, fixed for the rest of the session, to avoid order (primacy) bias.
 * The order shown is logged as an `options_shown` event so the team can check for order effects.
 * `codes` must be short ids ([a-z0-9_]).
 */
export function stableOrder(key, codes) {
  state.orders = state.orders || {};
  let order = state.orders[key];
  const valid = order && order.length === codes.length && codes.every((c) => order.includes(c));
  if (!valid) {
    order = [...codes];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    state.orders[key] = order;
    save();
    track('options_shown', `${key}:${order.join('-')}`);
  }
  return order;
}

/** 1–7 rating as a radio group. */
export function likert({ name, legend, low, high, value, onChange }) {
  const scale = el('div', { class: 'likert-scale' });
  for (let i = 1; i <= 7; i++) {
    const input = el('input', { type: 'radio', name, value: i, 'aria-label': `${i} of 7`, checked: value === i });
    input.addEventListener('change', () => onChange(i));
    scale.append(el('label', {}, input, el('span', { 'aria-hidden': 'true' }, String(i))));
  }
  return el(
    'fieldset',
    { class: 'likert' },
    el('legend', {}, legend),
    scale,
    el('div', { class: 'likert-anchors', 'aria-hidden': 'true' }, el('span', {}, `1 = ${low}`), el('span', {}, `7 = ${high}`)),
  );
}

// ---- Voice input: the browser's own speech-to-text (Chrome, Edge, Safari 14.5+). ----
// Audio is handled by the browser's speech service (Apple or Google). Msquared only receives text.
const SpeechRec = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
export const voiceSupported = Boolean(SpeechRec);
let activeRecognition = null;

function voiceControls(input, key, max) {
  const status = el('p', { class: 'voice-status', 'aria-live': 'polite' });
  if (!voiceSupported) {
    status.textContent = 'Prefer to talk? Use the microphone on your phone’s keyboard.';
    return { button: null, status };
  }
  const label = el('span', {}, 'Speak');
  const button = el('button', { class: 'btn btn-mic', type: 'button', 'aria-pressed': 'false' }, icon('mic'), label);
  let rec = null;
  let problem = false;

  button.addEventListener('click', () => {
    if (rec) return rec.stop();
    if (activeRecognition) activeRecognition.stop();
    problem = false;
    rec = new SpeechRec();
    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = true;
    const base = input.value.trim() ? `${input.value.trim()} ` : '';
    rec.onresult = (e) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      input.value = (base + text.trim()).slice(0, max);
      input.dispatchEvent(new Event('input'));
    };
    rec.onerror = (e) => {
      problem = true;
      status.textContent =
        e.error === 'not-allowed' || e.error === 'service-not-allowed'
          ? 'Microphone access is blocked. You can type instead, or allow the microphone in your browser settings.'
          : 'We couldn’t catch that. Try again, or type your answer.';
    };
    rec.onend = () => {
      rec = null;
      activeRecognition = null;
      button.setAttribute('aria-pressed', 'false');
      label.textContent = 'Speak';
      if (!problem) status.textContent = input.value ? 'Done. You can edit the text before continuing.' : '';
    };
    try {
      rec.start();
    } catch {
      rec = null;
      status.textContent = 'Voice input isn’t available right now. You can type instead.';
      return;
    }
    activeRecognition = rec;
    button.setAttribute('aria-pressed', 'true');
    label.textContent = 'Stop';
    status.textContent = 'Listening. Speak naturally, then tap Stop.';
    if (key) track('voice_input_used', key);
  });
  return { button, status };
}

/** Optional free-text field with counter, privacy reminder and (where supported) a Speak button. */
export function textField({ label, hint, value, onInput, multiline = true, max = 1000, key = null, voice = true }) {
  const id = nextId('t');
  const hintId = `${id}-hint`;
  const counter = el('div', { class: 'counter', 'aria-live': 'polite' }, `${(value || '').length}/${max}`);
  const input = el(multiline ? 'textarea' : 'input', {
    id,
    maxlength: max,
    'aria-describedby': hintId,
    ...(multiline ? {} : { type: 'text' }),
  });
  input.value = value || '';
  input.addEventListener('input', () => {
    counter.textContent = `${input.value.length}/${max}`;
    onInput(input.value);
  });
  const v = voice ? voiceControls(input, key, max) : { button: null, status: null };
  return el(
    'div',
    { class: 'field' },
    el('label', { class: 'field-label', for: id }, label),
    hint ? el('p', { class: 'hint', id: hintId }, hint) : null,
    input,
    el('div', { class: 'field-tools' }, v.button || el('span'), counter),
    v.status,
  );
}

/** Shows a follow-up field only after the rating above it has been answered. */
export function revealAfter(fieldEl, answered) {
  const wrap = el('div', { class: 'follow-up', hidden: !answered }, fieldEl);
  return { el: wrap, show: () => (wrap.hidden = false) };
}

export function radioTiles({ name, legend, options, value, onChange, hint }) {
  const fs = el('fieldset', {}, el('legend', {}, legend), hint ? el('p', { class: 'hint' }, hint) : null);
  const wrap = el('div', { class: 'tiles' });
  for (const o of options) {
    const input = el('input', { type: 'radio', name, value: o.value, checked: value === o.value });
    input.addEventListener('change', () => onChange(o.value));
    wrap.append(el('label', { class: 'tile' }, input, el('span', {}, o.label)));
  }
  fs.append(wrap);
  return fs;
}

export function errorBox() {
  return el('p', { class: 'error', role: 'alert', hidden: true });
}
export function showError(box, msg) {
  box.textContent = msg;
  box.hidden = !msg;
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = el('textarea', { class: 'sr-only', 'aria-hidden': 'true' });
    ta.value = text;
    document.body.append(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {}
    ta.remove();
    return ok;
  }
}
