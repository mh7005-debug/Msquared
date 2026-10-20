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

/** Optional short free-text field with counter and privacy reminder. */
export function textField({ label, hint, value, onInput, multiline = true, max = 240 }) {
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
  return el(
    'div',
    { class: 'field' },
    el('label', { class: 'field-label', for: id }, label),
    el('p', { class: 'hint', id: hintId }, hint),
    input,
    counter,
  );
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
