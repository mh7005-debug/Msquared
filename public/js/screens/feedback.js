import { el, state, save, saveFields, track, flush, likert, textField, radioTiles, errorBox, showError, promiseTag } from '../core.js';
import { MEASURES } from '../content/copy.js';

/**
 * Final feedback, cut to four items after testers said it was too long.
 * H1: clarity, same wording as before the map. H2: trust in information, same wording as before
 * (the per-suggestion before/after evidence rating on the map is the main H2 measure).
 */
export function renderFeedback(main, { navigate }) {
  const f = (state.feedback = state.feedback || { clarity: null, trustInfo: null, confusing: '', safety: null, safetyText: '' });
  const set = (k) => (v) => ((f[k] = v), save());
  const err = errorBox();
  const submit = el('button', { class: 'btn btn-primary', type: 'submit' }, 'Finish');

  const safetyDetail = el(
    'div',
    { hidden: f.safety !== 'yes' },
    textField({ label: 'What seemed misleading or unsafe? (optional)', key: 'safety_description', value: f.safetyText, onInput: set('safetyText') }),
  );

  const form = el(
    'form',
    { class: 'sheet', novalidate: true },
    el('div', { class: 'form-section' }, promiseTag('clarity', 'Clarity'), likert({ name: 'clarity_post', ...MEASURES.clarity, value: f.clarity, onChange: set('clarity') })),
    el('div', { class: 'form-section' }, promiseTag('evidence', 'Evidence'), likert({ name: 'trust_info_post', ...MEASURES.trustInfo, value: f.trustInfo, onChange: set('trustInfo') })),
    el(
      'div',
      { class: 'form-section' },
      textField({ label: 'Anything confusing or missing? (optional)', key: 'missing_or_confusing', value: f.confusing, onInput: set('confusing') }),
      radioTiles({
        name: 'safety',
        legend: 'Did anything seem misleading or unsafe?',
        options: [
          { value: 'no', label: 'No' },
          { value: 'yes', label: 'Yes' },
        ],
        value: f.safety,
        onChange: (v) => {
          f.safety = v;
          safetyDetail.hidden = v !== 'yes';
          save();
        },
      }),
      safetyDetail,
      el('div', { class: 'actions' }, submit),
      err,
    ),
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!f.clarity || !f.trustInfo) return showError(err, 'Choose a number from 1 to 7 for both ratings.');
    if (!f.safety) return showError(err, 'Answer the last question.');
    showError(err, '');
    submit.disabled = true;
    try {
      await saveFields({
        clarity_post: f.clarity,
        trust_info_post: f.trustInfo,
        missing_or_confusing: f.confusing || null,
        safety_flag: f.safety,
        safety_description: f.safety === 'yes' ? f.safetyText || null : null,
        last_screen: 'feedback',
      });
      track('feedback_submitted');
      track('session_completed');
      await flush();
      state.completed = true;
      save();
      navigate('/complete');
    } catch (ex) {
      showError(err, ex.message);
      submit.disabled = false;
    }
  });

  main.append(el('h1', {}, 'One last check'), el('p', { class: 'lede' }, 'Two ratings, the same as at the start, so we can see what changed. About 20 seconds.'), form);
}
