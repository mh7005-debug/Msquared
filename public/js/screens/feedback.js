import { el, state, save, saveFields, track, flush, likert, textField, radioTiles, errorBox, showError } from '../core.js';
import { FREE_TEXT_REMINDER } from '../content/copy.js';

const HELPFUL = [
  { value: 'role_comparison', label: 'Role comparison' },
  { value: 'explanations_sources', label: 'Explanations and sources' },
  { value: 'journey_summary', label: 'Journey summary' },
  { value: 'appointment_questions', label: 'Appointment questions' },
  { value: 'none', label: 'None of these' },
];

export function renderFeedback(main, { navigate }) {
  const f = (state.feedback = state.feedback || {
    clarity: null,
    trust: null,
    relevance: null,
    nextStep: '',
    trustReason: '',
    helpful: null,
    confusing: '',
    prefers: '',
    safety: null,
    safetyText: '',
    quoteOk: false,
    quote: '',
  });
  const set = (k) => (v) => ((f[k] = v), save());
  const err = errorBox();
  const submit = el('button', { class: 'btn btn-primary', type: 'submit' }, 'Submit feedback');

  const safetyDetail = el(
    'div',
    { hidden: f.safety !== 'yes' },
    textField({ label: 'What seemed misleading, too certain, or unsafe? (optional)', hint: FREE_TEXT_REMINDER, value: f.safetyText, onInput: set('safetyText') }),
  );
  const quoteBox = el(
    'div',
    { hidden: !f.quoteOk },
    textField({ label: 'Anything you’d like us to quote? (optional)', hint: 'Shared without your name. ' + FREE_TEXT_REMINDER, value: f.quote, onInput: set('quote') }),
  );
  const quoteCheck = el('input', { type: 'checkbox', id: 'quote-ok', checked: f.quoteOk });
  quoteCheck.addEventListener('change', () => {
    f.quoteOk = quoteCheck.checked;
    quoteBox.hidden = !f.quoteOk;
    save();
  });

  const form = el(
    'form',
    { novalidate: true },
    likert({ name: 'clarity_post', legend: 'How clear are you now about what to do next?', low: 'Not at all clear', high: 'Completely clear', value: f.clarity, onChange: set('clarity') }),
    likert({ name: 'trust_post', legend: 'How much do you trust the care options Msquared presented?', low: 'Not at all', high: 'Completely', value: f.trust, onChange: set('trust') }),
    likert({ name: 'relevance_post', legend: 'How relevant was the care map to your situation?', low: 'Not at all', high: 'Very relevant', value: f.relevance, onChange: set('relevance') }),
    textField({ label: 'Can you name one next professional-care discussion step, and why? (optional)', hint: FREE_TEXT_REMINDER, value: f.nextStep, onInput: set('nextStep') }),
    textField({ label: 'What made you trust or question the options shown? (optional)', hint: 'For example, a source, an explanation, or something missing. ' + FREE_TEXT_REMINDER, value: f.trustReason, onInput: set('trustReason') }),
    radioTiles({ name: 'helpful', legend: 'Which part helped most?', options: HELPFUL, value: f.helpful, onChange: set('helpful') }),
    textField({ label: 'What was confusing or missing? (optional)', hint: FREE_TEXT_REMINDER, value: f.confusing, onInput: set('confusing') }),
    textField({ label: 'Would you use Msquared instead of your usual research method for a similar question? Why? (optional)', hint: FREE_TEXT_REMINDER, value: f.prefers, onInput: set('prefers') }),
    radioTiles({
      name: 'safety',
      legend: 'Did anything seem misleading, too certain, or unsafe?',
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
    el('label', { class: 'check', for: 'quote-ok' }, quoteCheck, el('span', {}, 'You may quote my feedback (without my name) in our class presentation. Optional.')),
    quoteBox,
    el('div', { class: 'actions' }, submit),
    err,
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!f.clarity || !f.trust || !f.relevance) return showError(err, 'Choose a number from 1 to 7 for each of the first three questions.');
    if (!f.safety) return showError(err, 'Answer the question about anything misleading or unsafe.');
    showError(err, '');
    submit.disabled = true;
    try {
      await saveFields({
        clarity_post: f.clarity,
        trust_post: f.trust,
        relevance_post: f.relevance,
        next_step_response: f.nextStep || null,
        trust_reason: f.trustReason || null,
        most_helpful_feature: f.helpful || null,
        missing_or_confusing: f.confusing || null,
        prefers_msquared_stated: f.prefers || null,
        safety_flag: f.safety,
        safety_description: f.safety === 'yes' ? f.safetyText || null : null,
        quote_permission: f.quoteOk,
        quote_text: f.quoteOk ? f.quote || null : null,
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

  main.append(el('h1', {}, 'How did that go?'), el('p', { class: 'lede' }, 'A few questions about the care map. Honest answers help most — including critical ones.'), form);
}
