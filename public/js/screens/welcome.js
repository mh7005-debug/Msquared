import { el, state, save, api, config, errorBox, showError, track, icon, voiceSupported } from '../core.js';
import { STUDY } from '../content/copy.js';
import { aboutSection } from './trust.js';
import { VALUE_PROPS } from '../content/valueProps.js';

export function renderWelcome(main, { navigate }) {
  let adult = false;
  let consent = false;
  // Personal tester links carry the study code: https://…/?code=P07
  const fromLink = (new URLSearchParams(location.search).get('code') || '').trim().toUpperCase();
  let testerCode = /^P\d{2}$/.test(fromLink) ? fromLink : '';

  const start = el('button', { class: 'btn btn-primary', type: 'submit', disabled: true }, 'Get started');
  const why = el('p', { class: 'small muted', id: 'start-why' }, 'Check both boxes to continue.');
  const err = errorBox();
  const sync = () => {
    start.disabled = !(adult && consent);
    why.hidden = adult && consent;
  };

  const codeInput = el('input', {
    type: 'text',
    id: 'tester-code',
    class: 'code-input',
    maxlength: 3,
    autocomplete: 'off',
    autocapitalize: 'characters',
    placeholder: 'P01',
    'aria-describedby': 'tester-hint',
  });
  codeInput.value = testerCode;
  codeInput.addEventListener('input', () => (testerCode = codeInput.value.trim().toUpperCase()));

  const adultBox = el('input', { type: 'checkbox', id: 'adult' });
  adultBox.addEventListener('change', () => ((adult = adultBox.checked), sync()));
  const consentBox = el('input', { type: 'checkbox', id: 'consent' });
  consentBox.addEventListener('change', () => ((consent = consentBox.checked), sync()));

  const dataPoint = (text) => el('li', {}, icon('check'), el('span', {}, text));

  const form = el(
    'form',
    { class: 'sheet', novalidate: true, 'aria-labelledby': 'begin-h' },
    el('h2', { id: 'begin-h' }, 'Before you begin'),
    el('p', { class: 'muted small' }, 'How we use your information'),
    el(
      'ul',
      { class: 'data-list' },
      dataPoint('We save your ratings and anything you write or say, linked to a random code. Never your name. Answers you tap about your cycle stay on this device.'),
      voiceSupported ? dataPoint('Speak uses your browser’s speech service (Apple or Google). We get text only.') : null,
      config.aiEnabled ? dataPoint('Typed chat answers go to our AI provider (Anthropic) to be understood, then are discarded.') : null,
      dataPoint(`Class research only. Our host keeps short visit logs, so it’s non-identifying, not anonymous. Deleted by ${STUDY.retention}. Stop anytime.`),
    ),
    el('hr', { class: 'divider' }),
    testerCode
      ? el('p', { class: 'small muted', id: 'tester-hint' }, `Study code: ${testerCode}`)
      : el(
          'div',
          { class: 'field' },
          el('label', { class: 'field-label', for: 'tester-code' }, 'Study code (optional)'),
          el('p', { class: 'hint', id: 'tester-hint' }, 'From your moderator, if you have one.'),
          codeInput,
        ),
    el('label', { class: 'check', for: 'adult' }, adultBox, el('span', {}, 'I’m 18 or older.')),
    el('label', { class: 'check', for: 'consent' }, consentBox, el('span', {}, 'I agree to take part and to the data use described above.')),
    el('div', { class: 'actions' }, start, why),
    err,
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!(adult && consent)) return;
    if (testerCode && !/^P\d{2}$/.test(testerCode)) {
      showError(err, 'Study codes look like P04. Leave it blank if you don’t have one.');
      return;
    }
    showError(err, '');
    start.disabled = true;
    start.textContent = 'Starting…';
    try {
      const { session_id } = await api('/api/session', 'POST', { adult: true, consent: true, tester_code: testerCode || null });
      state.sessionId = session_id;
      state.startedAt = Date.now();
      save();
      track('screen_viewed', 'consent');
      navigate('/start');
    } catch (ex) {
      showError(err, ex.message);
      start.disabled = false;
      start.textContent = 'Get started';
    }
  });

  const trust = (iconName, title, text, key = '') =>
    el('li', { class: key }, el('span', { class: 'trust-icon' }, icon(iconName)), el('div', {}, el('strong', {}, title), el('span', {}, text)));

  main.append(
    ...[
      el(
        'section',
        { class: 'hero' },
        el('p', { class: 'hero-kicker' }, 'For missing or irregular periods'),
        el('h1', {}, 'Let’s make sense of what comes next in your care journey.'),
        el(
          'p',
          { class: 'lede' },
          'Msquared helps women experiencing missing or irregular periods organize what they’ve tried, understand their professional care options, and prepare for their next step.',
        ),
        el(
          'ul',
          { class: 'trust-list promises', 'aria-label': 'What you get' },
          Object.entries(VALUE_PROPS).map(([k, v]) => trust(v.icon, v.label, v.promise, k)),
        ),
      ),
      el(
        'section',
        { class: 'how', 'aria-labelledby': 'how-h' },
        el('h2', { id: 'how-h' }, 'How it works'),
        el(
          'ol',
          { class: 'timeline' },
          el('li', {}, el('strong', {}, 'Tap, don’t retell'), 'About a minute. No long story needed.'),
          el('li', {}, el('strong', {}, 'Explore your care map'), 'Roles, sources, questions.'),
          el('li', {}, el('strong', {}, 'Leave ready to book'), 'Who to see, what to say, and a brief to hand over.'),
        ),
      ),
      aboutSection(),
      config.storageReady
        ? null
        : el('div', { class: 'notice warn', role: 'alert' }, icon('alert'), el('div', {}, 'Research storage isn’t set up yet, so this session can’t start. Let the study team know.')),
      form,
    ].filter(Boolean),
  );
}
