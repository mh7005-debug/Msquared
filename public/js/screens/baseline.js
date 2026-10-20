import { el, state, save, saveFields, likert, textField, errorBox, showError } from '../core.js';
import { MEASURES } from '../content/copy.js';

export function renderBaseline(main, { navigate }) {
  const b = (state.baseline = state.baseline || { clarity: null, trust: null, nextStep: '' });
  const err = errorBox();
  const next = el('button', { class: 'btn btn-primary', type: 'submit' }, 'Continue');

  const form = el(
    'form',
    { class: 'sheet', novalidate: true },
    likert({ name: 'clarity_pre', ...MEASURES.clarity, value: b.clarity, onChange: (v) => ((b.clarity = v), save()) }),
    likert({ name: 'trust_pre', ...MEASURES.trustInfo, value: b.trust, onChange: (v) => ((b.trust = v), save()) }),
    textField({ ...MEASURES.nextStep, key: 'next_step_pre', value: b.nextStep, onInput: (v) => ((b.nextStep = v), save()) }),
    el('div', { class: 'actions' }, next),
    err,
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!b.clarity || !b.trust) {
      showError(err, 'Choose a number from 1 to 7 for both ratings.');
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
    el('h1', {}, 'Where are you right now?'),
    el('p', { class: 'lede' }, 'Three quick questions, so we can compare before and after. No right answers.'),
    form,
  );
}
