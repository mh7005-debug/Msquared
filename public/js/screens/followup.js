import { el, api, errorBox, showError, icon, radioTiles, textField } from '../core.js';

/** One-question check-in, opened from the email the team sends about a week after a session (/followup?s=…). */
export function renderFollowup(main) {
  const id = (new URLSearchParams(location.search).get('s') || '').trim().toLowerCase();
  if (!/^[a-z0-9]{12}$/.test(id)) {
    main.append(el('h1', {}, 'Check-in link not recognized'), el('p', { class: 'lede' }, 'Open the link from your email again, or reply to that email.'));
    return;
  }
  let status = null;
  let note = '';
  const err = errorBox();
  const btn = el('button', { class: 'btn btn-primary', type: 'submit' }, 'Send');
  const form = el(
    'form',
    { class: 'sheet', novalidate: true },
    radioTiles({
      name: 'followup_status',
      legend: 'Since using Msquared, have you contacted a healthcare professional about your cycle?',
      options: [
        { value: 'booked', label: 'Yes, I booked or had an appointment' },
        { value: 'contacted', label: 'I reached out, but nothing is booked yet' },
        { value: 'not_yet', label: 'Not yet' },
      ],
      value: null,
      onChange: (v) => (status = v),
    }),
    textField({ label: 'What helped, or what got in the way? (optional)', key: 'followup_note', value: '', onInput: (v) => (note = v), voice: false }),
    el('div', { class: 'actions' }, btn),
    err,
  );
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!status) return showError(err, 'Choose one answer.');
    btn.disabled = true;
    try {
      await api('/api/followup', 'PUT', { session_id: id, status, note: note || null });
      form.replaceWith(el('div', { class: 'sheet' }, el('div', { class: 'done-mark' }, icon('check')), el('h2', {}, 'Thank you'), el('p', {}, 'That’s all. Wishing you good care.')));
    } catch (ex) {
      showError(err, ex.message);
      btn.disabled = false;
    }
  });
  main.append(el('h1', {}, 'A quick check-in'), el('p', { class: 'lede' }, 'One question, about 20 seconds.'), form);
}
