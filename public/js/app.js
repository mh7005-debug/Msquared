import { state, config, loadConfig, track, el, icon } from './core.js';
import { renderWelcome } from './screens/welcome.js';
import { renderBaseline } from './screens/baseline.js';
import { renderIntake } from './screens/intake.js';
import { renderHelp } from './screens/help.js';
import { renderFeedback } from './screens/feedback.js';
import { renderComplete } from './screens/complete.js';
import { renderFollowup } from './screens/followup.js';

const ROUTES = {
  '/': { render: renderWelcome, title: 'Welcome', screen: 'consent' },
  '/start': { render: renderBaseline, title: 'Before you start', screen: 'baseline', needs: 'session', step: 0 },
  '/intake': { render: renderIntake, title: 'Tell us where you’re stuck', screen: 'intake', needs: 'baseline', step: 1, back: '/start' },
  '/help': { render: renderHelp, title: 'How we can help', screen: 'map', needs: 'intake', step: 2, back: '/intake' },
  '/feedback': { render: renderFeedback, title: 'Your feedback', screen: 'feedback', needs: 'decision', step: 3, back: '/help' },
  '/complete': { render: renderComplete, title: 'Thank you', screen: 'complete', needs: 'completed' },
  '/followup': { render: renderFollowup, title: 'Check-in', screen: 'followup', standalone: true },
};

/** Sends people back to the furthest screen they're allowed to see. */
function allowedPath(path) {
  const r = ROUTES[path];
  if (!r) return '/';
  if (r.standalone) return path;
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
  if (has.intake) return '/help';
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
  if (route.step !== undefined) main.append(stepper(route));
  route.render(main, { navigate });
  window.scrollTo(0, 0);
  main.focus({ preventScroll: true });
}

const STEPS = ['Start', 'Your situation', 'Book', 'Finish'];

/** Progress across the four screens after consent, with a Back link where going back makes sense. */
function stepper(route) {
  const list = el(
    'ol',
    { class: 'stepper', 'aria-label': `Step ${route.step + 1} of ${STEPS.length}` },
    STEPS.map((label, i) =>
      el(
        'li',
        { class: i < route.step ? 'done' : null, 'aria-current': i === route.step ? 'step' : null },
        el('span', {}, label),
      ),
    ),
  );
  const back = route.back
    ? el('button', { class: 'btn-link back-link', type: 'button', onclick: () => navigate(route.back) }, icon('chevronLeft'), 'Back')
    : null;
  return el('div', { class: 'stepper-row' }, list, back);
}

export function updateChrome() {
  document.getElementById('demo-banner').hidden = config.clinicallyReviewed;
  const chip = document.getElementById('session-chip');
  if (state.sessionId) {
    chip.hidden = false;
    chip.textContent = `Session code: ${state.sessionId.slice(0, 4)}-${state.sessionId.slice(4, 8)}-${state.sessionId.slice(8)}`;
  } else chip.hidden = true;
}

addEventListener('popstate', render);
await loadConfig();
render();
