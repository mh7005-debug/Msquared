import { state, config, loadConfig, track } from './core.js';
import { renderWelcome } from './screens/welcome.js';
import { renderBaseline } from './screens/baseline.js';
import { renderIntake } from './screens/intake.js';
import { renderMap } from './screens/map.js';
import { renderFeedback } from './screens/feedback.js';
import { renderComplete } from './screens/complete.js';

const ROUTES = {
  '/': { render: renderWelcome, title: 'Welcome', screen: 'consent' },
  '/start': { render: renderBaseline, title: 'Before you start', screen: 'baseline', needs: 'session' },
  '/intake': { render: renderIntake, title: 'Tell us where you’re stuck', screen: 'intake', needs: 'baseline' },
  '/map': { render: renderMap, title: 'Your next-step care map', screen: 'map', needs: 'intake' },
  '/feedback': { render: renderFeedback, title: 'Your feedback', screen: 'feedback', needs: 'decision' },
  '/complete': { render: renderComplete, title: 'Thank you', screen: 'complete', needs: 'completed' },
};

/** Sends people back to the furthest screen they're allowed to see. */
function allowedPath(path) {
  const r = ROUTES[path];
  if (!r) return '/';
  if (state.completed && path !== '/complete') return '/complete';
  const has = {
    session: Boolean(state.sessionId),
    baseline: Boolean(state.sessionId && state.baselineDone),
    intake: Boolean(state.sessionId && state.baselineDone && state.pathId),
    decision: Boolean(state.sessionId && state.pathId && state.mapDecision),
    completed: Boolean(state.completed),
  };
  if (!r.needs || has[r.needs]) return path;
  if (has.decision) return '/feedback';
  if (has.intake) return '/map';
  if (has.baseline) return '/intake';
  if (has.session) return '/start';
  return '/';
}

export function navigate(path, { replace = false } = {}) {
  const target = allowedPath(path);
  if (replace) history.replaceState({}, '', target);
  else history.pushState({}, '', target);
  render();
}

function render() {
  const path = allowedPath(location.pathname);
  if (path !== location.pathname) history.replaceState({}, '', path);
  const route = ROUTES[path];
  document.title = `${route.title} · Msquared`;
  const main = document.getElementById('main');
  main.replaceChildren();
  main.className = 'wrap';
  updateChrome();
  track('screen_viewed', route.screen);
  route.render(main, { navigate });
  window.scrollTo(0, 0);
  main.focus({ preventScroll: true });
}

export function updateChrome() {
  document.getElementById('demo-banner').hidden = config.clinicallyReviewed;
  const chip = document.getElementById('session-chip');
  if (state.sessionId) {
    chip.hidden = false;
    chip.textContent = `Session ${state.sessionId.slice(0, 4)}-${state.sessionId.slice(4, 8)}-${state.sessionId.slice(8)}`;
  } else chip.hidden = true;
}

addEventListener('popstate', render);
await loadConfig();
render();
