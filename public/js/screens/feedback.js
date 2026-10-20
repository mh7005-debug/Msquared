import { el, state, save, saveFields, track, flush, likert, textField, radioTiles, errorBox, showError, stableOrder } from '../core.js';
import { FREE_TEXT_REMINDER, MEASURES } from '../content/copy.js';

// Short codes are used to log the (randomized) display order.
const HELPFUL = {
  rc: { value: 'role_comparison', label: 'Role comparison' },
  es: { value: 'explanations_sources', label: 'Explanations and sources' },
  js: { value: 'journey_summary', label: 'Journey summary' },
  aq: { value: 'appointment_questions', label: 'Appointment questions' },
};

export function renderFeedback(main, { navigate }) {
  const f = (state.feedback = state.feedback || {
    clarity: null,
    trustInfo: null,
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

  // "None of these" always stays last; the four features are shown in a random order.
  const helpfulOptions = [...stableOrder('helpful', Object.keys(HELPFUL)).map((c) => HELPFUL[c]), { value: 'none', label: 'None of these' }];

  const form = el(
    'form',
    { class: 'sheet', novalidate: true },
    el(
      'div',
      { class: 'form-section' },
      el('h2', {}, 'Where you are now'),
      // Same wording as before the care map, so answers can be compared.
      likert({ name: 'clarity_post', ...MEASURES.clarity, value: f.clarity, onChange: set('clarity') }),
      likert({ name: 'trust_info_post', ...MEASURES.trustInfo, value: f.trustInfo, onChange: set('trustInfo') }),
      textField({ ...MEASURES.nextStep, value: f.nextStep, onInput: set('nextStep') }),
    ),
    el(
      'div',
      { class: 'form-section' },
      el('h2', {}, 'About the care map'),
      likert({ name: 'trust_post', legend: 'How much do you trust the care options Msquared showed you?', low: 'Not at all', high: 'Completely', value: f.trust, onChange: set('trust') }),
      likert({ name: 'relevance_post', legend: 'How relevant was the care map to your situation?', low: 'Not at all relevant', high: 'Completely relevant', value: f.relevance, onChange: set('relevance') }),
      textField({ label: 'What, if anything, affected how much you trusted the options shown? (optional)', hint: FREE_TEXT_REMINDER, value: f.trustReason, onInput: set('trustReason') }),
      radioTiles({ name: 'helpful', legend: 'Which part, if any, was most useful?', options: helpfulOptions, value: f.helpful, onChange: set('helpful') }),
      textField({ label: 'What, if anything, was confusing or missing? (optional)', hint: FREE_TEXT_REMINDER, value: f.confusing, onInput: set('confusing') }),
      textField({
        label: 'For a similar question in the future, would you use Msquared, your usual way of looking for information, or both? Why? (optional)',
        hint: FREE_TEXT_REMINDER,
        value: f.prefers,
        onInput: set('prefers'),
      }),
    ),
    el(
      'div',
      { class: 'form-section' },
      el('h2', {}, 'Safety check'),
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
    ),
    el(
      'div',
      { class: 'form-section' },
      el('label', { class: 'check', for: 'quote-ok' }, quoteCheck, el('span', {}, 'You may quote my feedback, without my name, in our class presentation. Optional.')),
      quoteBox,
      el('div', { class: 'actions' }, submit),
      err,
    ),
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!f.clarity || !f.trustInfo || !f.trust || !f.relevance) return showError(err, 'Choose a number from 1 to 7 for each of the four ratings.');
    if (!f.safety) return showError(err, 'Answer the safety check question.');
    showError(err, '');
    submit.disabled = true;
    try {
      await saveFields({
        clarity_post: f.clarity,
        trust_info_post: f.trustInfo,
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

  main.append(
    el('h1', {}, 'How did that go?'),
    el('p', { class: 'lede' }, 'There are no right answers. Critical feedback is just as useful to us as positive feedback.'),
    form,
  );
}
