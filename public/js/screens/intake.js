import { el, state, save, saveFields, api, config, track, errorBox, showError } from '../core.js';
import { INTAKE_STEPS, activeSteps, pruneAnswers, pathIdFromOption, optionLabel } from '../shared/intake.js';
import { URGENT_NOTICE, CRISIS_NOTICE } from '../content/copy.js';

const qIndex = (stepId) => INTAKE_STEPS.findIndex((s) => s.id === stepId) + 1;
const isAnswered = (v) => (Array.isArray(v) ? v.length > 0 : Boolean(v));

export function renderIntake(main, { navigate }) {
  state.answers = state.answers || {};
  if (!state.intakeMode) {
    state.intakeMode = config.aiEnabled ? 'ai' : 'scripted';
    track('intake_started', state.intakeMode);
    save();
  }
  // Transient (not persisted): AI acknowledgements, typed messages awaiting clarification, safety notices.
  const acks = {};
  const notices = []; // {after: stepId, kind}
  let pending = []; // [{who, text}] for the current step only
  let multiDraft = null;
  let busy = false;

  const progressFill = el('div', { class: 'progress-fill' });
  const progressLabel = el('div', { class: 'progress-label', 'aria-live': 'polite' });
  const chat = el('div', { class: 'chat', 'aria-live': 'polite', 'aria-relevant': 'additions' });
  const composer = el('div', { class: 'composer' });
  const err = errorBox();

  main.append(
    el('h1', {}, 'Tell us where you’re stuck'),
    el('div', { class: 'progress' }, el('div', { class: 'progress-bar', 'aria-hidden': 'true' }, progressFill), progressLabel),
    chat,
    composer,
    err,
  );

  function currentStep() {
    const steps = activeSteps(state.answers);
    if (state.editing && steps.some((s) => s.id === state.editing)) return steps.find((s) => s.id === state.editing);
    return steps.find((s) => !isAnswered(state.answers[s.id])) || null;
  }

  function answerLabels(step) {
    const v = state.answers[step.id];
    return (Array.isArray(v) ? v : [v]).map((id) => optionLabel(step.id, id)).join(', ');
  }

  function render() {
    const steps = activeSteps(state.answers);
    const current = currentStep();
    const answeredCount = steps.filter((s) => isAnswered(state.answers[s.id]) && s.id !== state.editing).length;
    progressFill.style.width = `${Math.round((answeredCount / steps.length) * 100)}%`;
    progressLabel.textContent = current
      ? `Question ${steps.indexOf(current) + 1} of ${steps.length}`
      : `All ${steps.length} questions answered`;

    chat.replaceChildren(
      el(
        'div',
        { class: 'bubble bot' },
        config.aiEnabled && !state.aiOff
          ? 'I’ll ask up to 6 quick questions. Tap an answer or type it in your own words. Please leave out names and anything you’d rather keep private — your answers stay in this browser.'
          : 'I’ll ask up to 6 quick questions. Tap the answer that fits best. Your answers stay in this browser.',
      ),
    );

    for (const step of steps) {
      chat.append(el('div', { class: 'bubble bot' }, step.question));
      if (step === current) break;
      if (!isAnswered(state.answers[step.id])) continue;
      chat.append(el('div', { class: 'bubble user' }, answerLabels(step)));
      chat.append(
        el(
          'button',
          {
            class: 'btn-link bubble-edit',
            type: 'button',
            'aria-label': `Edit your answer to: ${step.question}`,
            onclick: () => {
              track('intake_step_revisited', `q${qIndex(step.id)}`);
              state.editing = step.id;
              multiDraft = null;
              pending = [];
              save();
              render();
            },
          },
          'Edit',
        ),
      );
      if (acks[step.id]) chat.append(el('div', { class: 'bubble bot' }, acks[step.id]));
      for (const n of notices.filter((x) => x.after === step.id)) chat.append(noticeEl(n.kind));
    }
    if (current) {
      for (const p of pending) chat.append(p.kind ? noticeEl(p.kind) : el('div', { class: `bubble ${p.who}` }, p.text));
      if (busy) chat.append(el('div', { class: 'bubble bot typing' }, 'Reading your answer…'));
      renderComposer(current);
    } else {
      chat.append(el('div', { class: 'bubble bot' }, 'Thanks — that’s everything I need. Your care map is ready.'));
      renderDone();
    }
    composer.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function noticeEl(kind) {
    const n = kind === 'crisis' ? CRISIS_NOTICE : URGENT_NOTICE;
    return el('div', { class: `notice ${kind === 'crisis' ? 'crisis' : 'warn'}`, role: 'note' }, el('strong', {}, n.title), n.body);
  }

  function renderComposer(step) {
    composer.replaceChildren();
    const chips = el('div', { class: 'chips', role: 'group', 'aria-label': 'Answer options' });
    if (step.type === 'single') {
      for (const o of step.options) {
        chips.append(
          el(
            'button',
            {
              class: 'chip',
              type: 'button',
              'aria-pressed': state.answers[step.id] === o.id ? 'true' : 'false',
              disabled: busy,
              onclick: () => answer(step, [o.id], 'tap'),
            },
            o.label,
          ),
        );
      }
      composer.append(chips);
    } else {
      if (!multiDraft) multiDraft = new Set(state.answers[step.id] || []);
      for (const o of step.options) {
        const b = el('button', { class: 'chip', type: 'button', 'aria-pressed': multiDraft.has(o.id) ? 'true' : 'false', disabled: busy }, o.label);
        b.addEventListener('click', () => {
          multiDraft.has(o.id) ? multiDraft.delete(o.id) : multiDraft.add(o.id);
          b.setAttribute('aria-pressed', multiDraft.has(o.id) ? 'true' : 'false');
          showError(err, '');
        });
        chips.append(b);
      }
      const go = el('button', { class: 'btn btn-primary', type: 'button', disabled: busy }, 'Continue');
      go.addEventListener('click', () => {
        if (!multiDraft.size) return showError(err, 'Choose at least one option, or “Prefer not to say”.');
        answer(step, [...multiDraft], 'tap');
      });
      composer.append(chips, el('div', { class: 'actions' }, go));
    }

    if (config.aiEnabled && !state.aiOff) {
      const input = el('input', {
        type: 'text',
        maxlength: 300,
        placeholder: 'Or type your answer',
        'aria-label': 'Type your answer',
        autocomplete: 'off',
        disabled: busy,
      });
      const send = el('button', { class: 'btn', type: 'submit', disabled: busy }, 'Send');
      const form = el('form', { class: 'typebox' }, input, send);
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return showError(err, 'Type an answer first, or tap an option.');
        typed(step, text);
      });
      composer.append(form, el('p', { class: 'composer-note' }, 'Typed answers are sent to our AI provider to be understood, then discarded.'));
    }
  }

  function renderDone() {
    composer.replaceChildren();
    const go = el('button', { class: 'btn btn-primary', type: 'button' }, 'See my care map');
    go.addEventListener('click', async () => {
      go.disabled = true;
      showError(err, '');
      try {
        await saveFields({ path_id: state.pathId, intake_mode: state.intakeMode, last_screen: 'intake' });
        navigate('/map');
      } catch (ex) {
        showError(err, ex.message);
        go.disabled = false;
      }
    });
    composer.append(el('div', { class: 'actions' }, go));
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
    save();
    render();
  }

  async function typed(step, text) {
    showError(err, '');
    busy = true;
    pending.push({ who: 'user', text });
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
      pending.push({ who: 'bot', text: 'Typing isn’t available right now. Tap the option that fits best.' });
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
    pending.push({ who: 'bot', text: result.acknowledgement });
    render();
  }

  render();
}
