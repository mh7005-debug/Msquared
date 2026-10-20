import { el, state, save, api, config, errorBox, showError, track, icon } from '../core.js';
import { STUDY } from '../content/copy.js';

export function renderWelcome(main, { navigate }) {
  let adult = false;
  let consent = false;
  let testerCode = '';

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
    el('p', { class: 'muted small' }, 'How your information is used'),
    el(
      'ul',
      { class: 'data-list' },
      dataPoint('We save your ratings, the path you choose, short optional answers, and which parts of the map you open. They’re linked to a random session code, not your name.'),
      dataPoint('Your answers about your cycle and care history stay on this device and aren’t saved. They’re cleared when you close the tab.'),
      config.aiEnabled
        ? dataPoint('If you type an answer instead of choosing one, it’s sent to our AI provider (Anthropic) to be understood, then discarded.')
        : null,
      dataPoint('Our hosting provider keeps standard visit logs, such as IP address, for a short time. That’s why we call this non-identifying rather than anonymous.'),
      dataPoint(`Data is used only for our class research project and deleted by ${STUDY.retention}. You can stop at any time.`),
    ),
    el('hr', { class: 'divider' }),
    el(
      'div',
      { class: 'field' },
      el('label', { class: 'field-label', for: 'tester-code' }, 'Study code (optional)'),
      el('p', { class: 'hint', id: 'tester-hint' }, 'Only if your study moderator gave you one.'),
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

  const trust = (iconName, title, text) =>
    el('li', {}, el('span', { class: 'trust-icon' }, icon(iconName)), el('div', {}, el('strong', {}, title), el('span', {}, text)));

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
          { class: 'trust-list', 'aria-label': 'About Msquared' },
          trust('book', 'Grounded in published guidance', 'Explanations cite guidance from professional medical societies.'),
          trust('lock', 'Private by design', 'No account. Your health answers stay on your device.'),
          trust('shield', 'Educational, not a diagnosis', 'It helps you prepare for a conversation with a clinician.'),
        ),
      ),
      el(
        'section',
        { class: 'how', 'aria-labelledby': 'how-h' },
        el('h2', { id: 'how-h' }, 'How it works'),
        el(
          'ol',
          { class: 'timeline' },
          el('li', {}, el('strong', {}, 'Tell us where you’re stuck'), 'Up to 6 short questions, about 2 minutes.'),
          el('li', {}, el('strong', {}, 'Explore your care map'), 'Professional roles, sources, and questions to ask.'),
          el('li', {}, el('strong', {}, 'Prepare for a conversation'), 'Take a summary to your next appointment.'),
        ),
      ),
      config.storageReady
        ? null
        : el('div', { class: 'notice warn', role: 'alert' }, icon('alert'), el('div', {}, 'Research storage isn’t set up yet, so this session can’t start. Let the study team know.')),
      form,
    ].filter(Boolean),
  );
}
