import { el, state, save, clearState, copyText, icon, api, track, errorBox, showError } from '../core.js';
import { STUDY } from '../content/copy.js';
import { copySummary } from '../shared/mapText.js';
import { contactCard } from './trust.js';

export function renderComplete(main, { navigate }) {
  const code = state.sessionId ? `${state.sessionId.slice(0, 4)}-${state.sessionId.slice(4, 8)}-${state.sessionId.slice(8)}` : '';
  const status = el('span', { class: 'status', role: 'status' });
  const hasSummary = state.answers && state.pathId;

  const copyBtn = el('button', { class: 'btn', type: 'button' }, icon('copy'), 'Copy my summary');
  copyBtn.addEventListener('click', async () => {
    status.textContent = (await copyText(copySummary(state.answers, state.pathId, state.ownWords))) ? 'Copied' : 'Couldn’t copy.';
  });
  const clearBtn = el('button', { class: 'btn', type: 'button' }, 'Clear my answers from this device');
  clearBtn.addEventListener('click', () => {
    clearState();
    navigate('/', { replace: true });
  });

  // Optional one-week check-in: the only way to learn whether the map led to an actual appointment.
  function checkIn() {
    if (!state.sessionId) return null;
    if (state.followupOptIn) return el('section', { class: 'sheet' }, el('p', {}, icon('check'), ' We’ll check in once, in about a week.'));
    const err = errorBox();
    const input = el('input', { type: 'email', id: 'checkin-email', autocomplete: 'email', placeholder: 'you@example.com', maxlength: 254 });
    const btn = el('button', { class: 'btn btn-primary', type: 'submit' }, 'Check in with me');
    const form = el(
      'form',
      { class: 'sheet', novalidate: true, 'aria-labelledby': 'checkin-h' },
      el('h2', { id: 'checkin-h' }, 'Want a nudge in a week?'),
      el('p', {}, 'We’ll email you once with one question: did you get to talk to someone? It helps you follow through and tells us whether this actually helped.'),
      el('div', { class: 'field' }, el('label', { class: 'field-label', for: 'checkin-email' }, 'Email (optional)'), input),
      el('p', { class: 'small muted' }, `Kept apart from your answers, used only for this one check-in, deleted by ${STUDY.retention}.`),
      el('div', { class: 'actions' }, btn),
      err,
    );
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      btn.disabled = true;
      showError(err, '');
      try {
        await api('/api/followup', 'POST', { session_id: state.sessionId, email: input.value.trim() });
        state.followupOptIn = true;
        save();
        track('followup_opt_in');
        form.replaceWith(checkIn());
      } catch (ex) {
        showError(err, ex.message);
        btn.disabled = false;
      }
    });
    return form;
  }

  main.append(
    ...[
      el('div', { class: 'done-mark' }, icon('check')),
      el('h1', {}, 'Thank you'),
      el('p', { class: 'lede' }, 'You’re all done. Your answers help us decide what to build.'),
      state.concierge?.done
        ? el(
            'section',
            { class: 'sheet', 'aria-labelledby': 'next-h' },
            el('h2', { id: 'next-h' }, 'About your request'),
            el('p', {}, 'Msquared is a prototype from an NYU Stern class. No consultation is booked yet: your request shows us whether this service is worth building.'),
            el('p', {}, 'If you need care now, an OB-GYN or primary care clinician is a common place to start.'),
          )
        : checkIn(),
      code
        ? el(
            'section',
            { class: 'sheet', 'aria-labelledby': 'code-h' },
            el('h2', { id: 'code-h' }, 'Your session code'),
            el('p', {}, el('span', { class: 'code' }, code)),
            el('p', { class: 'small muted' }, 'If you want your responses deleted, give this code to the study team.'),
          )
        : null,
      el('div', { class: 'actions' }, hasSummary ? copyBtn : null, clearBtn, status),
      contactCard(),
      el('p', { class: 'fineprint' }, 'Msquared is educational. It doesn’t diagnose, treat, or replace an evaluation by a healthcare professional, and it can’t promise any medical outcome.'),
    ].filter(Boolean),
  );
}
