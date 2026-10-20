import { el, state, clearState, copyText } from '../core.js';
import { copySummary } from '../shared/mapText.js';
import { EDUCATIONAL_NOTICE } from '../content/copy.js';

export function renderComplete(main, { navigate }) {
  const code = state.sessionId ? `${state.sessionId.slice(0, 4)}-${state.sessionId.slice(4, 8)}-${state.sessionId.slice(8)}` : '';
  const status = el('span', { class: 'status', role: 'status' });
  const hasSummary = state.answers && state.pathId;

  const copyBtn = el('button', { class: 'btn', type: 'button' }, 'Copy my summary again');
  copyBtn.addEventListener('click', async () => {
    status.textContent = (await copyText(copySummary(state.answers, state.pathId))) ? 'Copied' : 'Couldn’t copy.';
  });
  const clearBtn = el('button', { class: 'btn', type: 'button' }, 'Clear my answers from this device');
  clearBtn.addEventListener('click', () => {
    clearState();
    navigate('/', { replace: true });
  });

  main.append(
    ...[
    el('h1', {}, 'Thank you'),
    el('p', { class: 'lede' }, 'Your feedback is saved. It will help us decide what to improve.'),
    code
      ? el(
          'div',
          { class: 'card' },
          el('h2', {}, 'Your session code'),
          el('p', {}, el('span', { class: 'code' }, code)),
          el('p', { class: 'small muted' }, 'If you want your responses deleted, give this code to the study team.'),
        )
      : null,
    el('div', { class: 'actions' }, hasSummary ? copyBtn : null, clearBtn, status),
    el('p', { class: 'small muted' }, EDUCATIONAL_NOTICE + ' Msquared can’t promise any medical outcome.'),
    ].filter(Boolean),
  );
}
