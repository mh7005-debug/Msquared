import { el, state, save, saveFields, likert, textField, radioTiles, errorBox, showError } from '../core.js';
import { MEASURES } from '../content/copy.js';

export function renderBaseline(main, { navigate }) {
  const b = (state.baseline = state.baseline || { screener: null, clarity: null, trust: null, nextStep: '' });
  const err = errorBox();
  const next = el('button', { class: 'btn btn-primary', type: 'submit' }, 'Continue');

  const form = el(
    'form',
    { class: 'sheet', novalidate: true },
    radioTiles({
      name: 'screener',
      legend: 'Are you trying to figure out missing or irregular periods?',
      options: [
        { value: 'current', label: 'Yes, right now' },
        { value: 'past', label: 'I did in the past' },
        { value: 'other', label: 'No' },
      ],
      value: b.screener,
      onChange: (v) => ((b.screener = v), save()),
    }),
    el('div', { class: 'actions' }, next),
    err,
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!b.screener) {
      showError(err, 'Choose one answer to continue.');
      return;
    }
    showError(err, '');
    next.disabled = true;
    try {
      await saveFields({ screener: b.screener, last_screen: 'baseline' });
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
    el('p', { class: 'lede' }, 'One tap to start.'),
    form,
  );
}
