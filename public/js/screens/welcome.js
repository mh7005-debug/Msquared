import { el, state, save, api, config, errorBox, showError, track } from '../core.js';
import { EDUCATIONAL_NOTICE, STUDY } from '../content/copy.js';

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
    maxlength: 3,
    autocomplete: 'off',
    placeholder: 'P01',
    inputmode: 'text',
    'aria-describedby': 'tester-hint',
  });
  codeInput.addEventListener('input', () => (testerCode = codeInput.value.trim().toUpperCase()));

  const adultBox = el('input', { type: 'checkbox', id: 'adult' });
  adultBox.addEventListener('change', () => ((adult = adultBox.checked), sync()));
  const consentBox = el('input', { type: 'checkbox', id: 'consent' });
  consentBox.addEventListener('change', () => ((consent = consentBox.checked), sync()));

  const form = el(
    'form',
    { novalidate: true },
    el(
      'section',
      { class: 'card', 'aria-labelledby': 'data-h' },
      el('h2', { id: 'data-h' }, 'How your information is used'),
      el(
        'ul',
        { class: 'qlist small' },
        el('li', {}, 'We save your ratings, the path you choose, short optional answers, and which parts of the map you open — linked to a random session code, not your name.'),
        el('li', {}, 'Your answers about your cycle and care history stay in this browser tab and aren’t saved. They’re gone when you close the tab.'),
        config.aiEnabled
          ? el('li', {}, 'If you type an answer in the chat, it’s sent to our AI provider (Anthropic) so it can be understood. We don’t store it.')
          : null,
        el('li', {}, 'Our hosting provider keeps standard visit logs (like IP address) for a short time, so we describe this as non-identifying rather than anonymous.'),
        el('li', {}, `Data is used only for our class research project and deleted by ${STUDY.retention}. You can stop at any time.`),
      ),
    ),
    el(
      'div',
      { class: 'field' },
      el('label', { class: 'field-label', for: 'tester-code' }, 'Study code (optional)'),
      el('p', { class: 'hint', id: 'tester-hint' }, 'Only if your study moderator gave you one, like P04.'),
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

  main.append(
    ...[
    el('h1', {}, 'Let’s make sense of what comes next in your care journey.'),
    el(
      'p',
      { class: 'lede' },
      'Msquared helps women experiencing missing or irregular periods organize what they’ve tried, understand their professional care options, and prepare for their next step.',
    ),
    el(
      'ol',
      { class: 'steps', 'aria-label': 'How it works' },
      el('li', {}, 'Tell us where you’re stuck'),
      el('li', {}, 'Explore your care map'),
      el('li', {}, 'Prepare for a conversation'),
    ),
    el('div', { class: 'notice' }, el('strong', {}, 'Educational only'), EDUCATIONAL_NOTICE),
    config.storageReady ? null : el('div', { class: 'notice warn', role: 'alert' }, 'Research storage isn’t set up yet, so this session can’t start. Let the study team know.'),
    form,
    ].filter(Boolean),
  );
}
