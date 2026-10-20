import { el, state, save, saveFields, api, config, track, errorBox, showError, icon, stableOrder, textField } from '../core.js';
import { INTAKE_STEPS, activeSteps, pruneAnswers, pathIdFromOption, optionLabel } from '../shared/intake.js';
import { URGENT_NOTICE, CRISIS_NOTICE, OWN_WORDS } from '../content/copy.js';

const qIndex = (stepId) => INTAKE_STEPS.findIndex((s) => s.id === stepId) + 1;
const isAnswered = (v) => (Array.isArray(v) ? v.length > 0 : Boolean(v));

/**
 * Guided intake in a conversational, one-question-at-a-time format.
 * Answered questions stay above as a transcript with Edit links; the current question sits in a card.
 */
export function renderIntake(main, { navigate }) {
  state.answers = state.answers || {};
  if (!state.intakeMode) {
    state.intakeMode = config.aiEnabled ? 'ai' : 'scripted';
    track('intake_started', state.intakeMode);
    save();
  }
  const typingOn = () => config.aiEnabled && !state.aiOff;

  // Transient (not persisted): AI acknowledgements, typed lines awaiting clarification, safety notices.
  const acks = {};
  const notices = []; // { after: stepId, kind }
  let pending = []; // [{ who: 'you' | 'reply', text } | { kind }]
  let multiDraft = null;
  let busy = false;
  let focusQuestion = false;

  const progressFill = el('div', { class: 'progress-fill' });
  const progressLabel = el('div', { class: 'progress-label', 'aria-live': 'polite' });
  const transcript = el('ol', { class: 'transcript', 'aria-label': 'Your answers so far' });
  const card = el('section', { class: 'card question-card', 'aria-labelledby': 'q-title' });
  const err = errorBox();

  main.append(
    el('h1', {}, 'Tell us about your situation'),
    el(
      'p',
      { class: 'lede' },
      'Up to 6 quick taps. You can change any answer.',
    ),
    el('div', { class: 'progress' }, el('div', { class: 'progress-bar', 'aria-hidden': 'true' }, progressFill), progressLabel),
    transcript,
    card,
    err,
  );

  function currentStep() {
    const steps = activeSteps(state.answers);
    if (state.editing && steps.some((s) => s.id === state.editing)) return steps.find((s) => s.id === state.editing);
    return steps.find((s) => !isAnswered(state.answers[s.id])) || null;
  }

  /** Path options are shown in a random order per session to avoid order bias. */
  function optionsFor(step) {
    if (step.id !== 'path') return step.options;
    return stableOrder('path', step.options.map((o) => o.id)).map((id) => step.options.find((o) => o.id === id));
  }

  function answerLabels(step) {
    const v = state.answers[step.id];
    return (Array.isArray(v) ? v : [v]).map((id) => optionLabel(step.id, id)).join(', ');
  }

  function noticeEl(kind) {
    const n = kind === 'crisis' ? CRISIS_NOTICE : URGENT_NOTICE;
    return el(
      'div',
      { class: `notice ${kind === 'crisis' ? 'crisis' : 'warn'}`, role: 'note' },
      icon(kind === 'crisis' ? 'heart' : 'alert'),
      el('div', {}, el('strong', {}, n.title), n.body),
    );
  }

  function render() {
    const steps = activeSteps(state.answers);
    const current = currentStep();
    const answeredCount = steps.filter((s) => isAnswered(state.answers[s.id]) && s.id !== state.editing).length;
    progressFill.style.width = `${Math.round((answeredCount / steps.length) * 100)}%`;
    progressLabel.textContent = current
      ? `Question ${steps.indexOf(current) + 1} of ${steps.length}`
      : `All ${steps.length} questions answered`;

    transcript.replaceChildren();
    for (const step of steps) {
      if (step === current) break;
      if (!isAnswered(state.answers[step.id])) continue;
      transcript.append(
        el(
          'li',
          { class: 'qa' },
          el('p', { class: 'qa-q' }, step.question),
          el(
            'div',
            { class: 'qa-row' },
            el('p', { class: 'qa-a' }, answerLabels(step)),
            el(
              'button',
              {
                class: 'btn-link qa-edit',
                type: 'button',
                'aria-label': `Edit your answer to: ${step.question}`,
                onclick: () => {
                  track('intake_step_revisited', `q${qIndex(step.id)}`);
                  state.editing = step.id;
                  multiDraft = null;
                  pending = [];
                  focusQuestion = true;
                  save();
                  render();
                },
              },
              'Edit',
            ),
          ),
          acks[step.id] ? el('p', { class: 'qa-note' }, acks[step.id]) : null,
          notices.filter((x) => x.after === step.id).map((n) => noticeEl(n.kind)),
        ),
      );
    }
    transcript.hidden = transcript.children.length === 0;

    if (current) renderQuestion(current);
    else renderDone();

    if (focusQuestion) {
      focusQuestion = false;
      const t = card.querySelector('#q-title');
      if (t) t.focus({ preventScroll: true });
      card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  function renderQuestion(step) {
    const multi = step.type === 'multi';
    const group = el('div', { class: 'options', role: 'group', 'aria-labelledby': 'q-title' });
    if (multi && !multiDraft) multiDraft = new Set(state.answers[step.id] || []);

    for (const o of optionsFor(step)) {
      const pressed = multi ? multiDraft.has(o.id) : state.answers[step.id] === o.id;
      const b = el(
        'button',
        { class: `option${multi ? ' multi' : ''}`, type: 'button', 'aria-pressed': pressed ? 'true' : 'false', disabled: busy },
        el('span', { class: 'opt-mark' }, icon('check')),
        el('span', {}, o.label),
      );
      b.addEventListener('click', () => {
        if (!multi) return answer(step, [o.id], 'tap');
        multiDraft.has(o.id) ? multiDraft.delete(o.id) : multiDraft.add(o.id);
        b.setAttribute('aria-pressed', multiDraft.has(o.id) ? 'true' : 'false');
        showError(err, '');
      });
      group.append(b);
    }

    let cont = null;
    if (multi) {
      cont = el('button', { class: 'btn btn-primary', type: 'button', disabled: busy }, 'Continue');
      cont.addEventListener('click', () => {
        if (!multiDraft.size) return showError(err, 'Choose at least one option, or “Prefer not to say”.');
        answer(step, [...multiDraft], 'tap');
      });
    }

    let typing = null;
    if (typingOn()) {
      const input = el('input', {
        type: 'text',
        id: 'typed-answer',
        maxlength: 300,
        placeholder: 'Type your answer',
        'aria-label': 'Type your answer in your own words',
        autocomplete: 'off',
        disabled: busy,
      });
      const form = el('form', { class: 'typebox' }, input, el('button', { class: 'btn', type: 'submit', disabled: busy }, 'Send'));
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return showError(err, 'Type an answer first, or choose an option above.');
        typed(step, text);
      });
      typing = el(
        'div',
        {},
        el('p', { class: 'typebox-label' }, 'or answer in your own words'),
        form,
        el('p', { class: 'composer-note' }, 'Typed answers are sent to our AI provider to be understood, then discarded. Please leave out names.'),
      );
    }

    card.replaceChildren(
      ...[
        el('h2', { class: 'q-title', id: 'q-title', tabindex: '-1' }, step.question),
        multi ? el('p', { class: 'hint' }, 'Choose all that apply.') : null,
        pending.length || busy
          ? el(
              'div',
              { class: 'typed', 'aria-live': 'polite' },
              pending.map((p) =>
                p.kind ? noticeEl(p.kind) : el('p', { class: p.who === 'you' ? 'typed-you' : 'typed-reply' }, p.text),
              ),
              busy ? el('p', { class: 'typed-reply' }, 'Reading your answer…') : null,
            )
          : null,
        group,
        cont ? el('div', { class: 'actions' }, cont) : null,
        typing,
      ].filter(Boolean),
    );
  }

  function renderDone() {
    const go = el('button', { class: 'btn btn-primary', type: 'button' }, 'See my care map');
    go.addEventListener('click', async () => {
      go.disabled = true;
      showError(err, '');
      try {
        await saveFields({ path_id: state.pathId, intake_mode: state.intakeMode, own_words: state.ownWords || null, last_screen: 'intake' });
        navigate('/map');
      } catch (ex) {
        showError(err, ex.message);
        go.disabled = false;
      }
    });
    card.replaceChildren(
      el('h2', { class: 'q-title', id: 'q-title', tabindex: '-1' }, 'That’s everything we need'),
      textField({ ...OWN_WORDS, key: 'own_words', value: state.ownWords, onInput: (v) => ((state.ownWords = v), save()) }),
      el('div', { class: 'actions' }, go),
    );
  }

  function answer(step, ids, method) {
    showError(err, '');
    state.answers[step.id] = step.type === 'single' ? ids[0] : ids;
    state.answers = pruneAnswers(state.answers);
    if (step.id === 'path') {
      state.pathId = pathIdFromOption(ids[0]);
      track('path_selected', `p${state.pathId}`);
    }
    track('chat_step_answered', `q${qIndex(step.id)}:${method}`);
    state.editing = null;
    multiDraft = null;
    pending = [];
    focusQuestion = true;
    save();
    render();
  }

  async function typed(step, text) {
    showError(err, '');
    busy = true;
    pending.push({ who: 'you', text });
    render();
    let result;
    try {
      result = await api('/api/chat', 'POST', { session_id: state.sessionId, step_id: step.id, text });
    } catch {
      result = { ok: false };
    }
    busy = false;
    if (!result.ok) {
      state.aiOff = true;
      save();
      track('chat_ai_unavailable', `q${qIndex(step.id)}`);
      pending.push({ who: 'reply', text: 'Typing isn’t available right now. Choose the option that fits best.' });
      return render();
    }
    if (result.safety && result.safety !== 'none') {
      track('safety_notice_shown', result.safety);
      state.safetyShown = true;
      save();
    }
    if (result.understood) {
      acks[step.id] = result.acknowledgement;
      if (result.safety !== 'none') notices.push({ after: step.id, kind: result.safety });
      return answer(step, result.option_ids, 'typed');
    }
    track('chat_clarification_needed', `q${qIndex(step.id)}`);
    if (result.safety !== 'none') pending.push({ kind: result.safety });
    pending.push({ who: 'reply', text: result.acknowledgement });
    render();
  }

  render();
}
