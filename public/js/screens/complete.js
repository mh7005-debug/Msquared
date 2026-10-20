import { el, state, clearState, copyText, icon } from '../core.js';
import { copySummary } from '../shared/mapText.js';
import { contactCard } from './trust.js';

export function renderComplete(main, { navigate }) {
  const code = state.sessionId ? `${state.sessionId.slice(0, 4)}-${state.sessionId.slice(4, 8)}-${state.sessionId.slice(8)}` : '';
  const status = el('span', { class: 'status', role: 'status' });
  const hasSummary = state.answers && state.pathId;

  const copyBtn = el('button', { class: 'btn', type: 'button' }, icon('copy'), 'Copy my summary again');
  copyBtn.addEventListener('click', async () => {
    status.textContent = (await copyText(copySummary(state.answers, state.pathId, state.ownWords))) ? 'Copied' : 'Couldn’t copy.';
  });
  const clearBtn = el('button', { class: 'btn', type: 'button' }, 'Clear my answers from this device');
  clearBtn.addEventListener('click', () => {
    clearState();
    navigate('/', { replace: true });
  });

  main.append(
    ...[
      el('div', { class: 'done-mark' }, icon('check')),
      el('h1', {}, 'Thank you'),
      el('p', { class: 'lede' }, 'Your feedback is saved. It helps us decide what to improve.'),
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
