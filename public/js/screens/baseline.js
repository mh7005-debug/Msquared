import { el, state, save, saveFields, likert, textField, errorBox, showError } from '../core.js';
import { FREE_TEXT_REMINDER } from '../content/copy.js';

export function renderBaseline(main, { navigate }) {
  const b = (state.baseline = state.baseline || { clarity: null, trust: null, nextStep: '' });
  const err = errorBox();
  const next = el('button', { class: 'btn btn-primary', type: 'submit' }, 'Continue');

  const form = el(
    'form',
    { novalidate: true },
    likert({
      name: 'clarity_pre',
      legend: 'How clear are you about what to do next?',
      low: 'Not at all clear',
      high: 'Completely clear',
      value: b.clarity,
      onChange: (v) => ((b.clarity = v), save()),
    }),
    likert({
      name: 'trust_pre',
      legend: 'How much do you trust the information you currently have about your care options?',
      low: 'Not at all',
      high: 'Completely',
      value: b.trust,
      onChange: (v) => ((b.trust = v), save()),
    }),
    textField({
      label: 'Can you name a professional-care next step right now? (optional)',
      hint: FREE_TEXT_REMINDER,
      value: b.nextStep,
      onInput: (v) => ((b.nextStep = v), save()),
    }),
    el('div', { class: 'actions' }, next),
    err,
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!b.clarity || !b.trust) {
      showError(err, 'Choose a number from 1 to 7 for both questions.');
      return;
    }
    showError(err, '');
    next.disabled = true;
    try {
      await saveFields({ clarity_pre: b.clarity, trust_pre: b.trust, next_step_pre: b.nextStep || null, last_screen: 'baseline' });
      state.baselineDone = true;
      save();
      navigate('/intake');
    } catch (ex) {
      showError(err, ex.message);
      next.disabled = false;
    }
  });

  main.append(
    el('p', { class: 'eyebrow' }, 'Before you start'),
    el('h1', {}, 'Where are you right now?'),
    el('p', { class: 'lede' }, 'Two quick ratings so we can compare before and after. There are no right answers.'),
    form,
  );
}
