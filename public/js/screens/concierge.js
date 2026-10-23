import { el, state, save, api, track, errorBox, showError, icon, radioTiles } from '../core.js';
import { CONCIERGE } from '../content/copy.js';
import { conciergeSummary, FOCUS_OPTIONS } from '../shared/mapText.js';

/**
 * "Have Msquared match me": the done-for-you step. A button that opens a short request form.
 * Nothing about her case leaves the device unless she checks the share box and sends.
 */
export function conciergeBlock({ where, focus, onDone, primary = true }) {
  if (state.concierge?.done) {
    return el('div', { class: 'notice ok concierge-done', role: 'status' }, icon('check'), el('div', {}, el('strong', {}, 'Match requested. '), CONCIERGE.done));
  }
  const c = (state.concierge = state.concierge || { method: 'email', contact: '', firstName: '', focus, bestTime: '', share: false });
  if (!c.focus) c.focus = focus;
  const wrap = el('div', { class: 'concierge' });
  const open = el('button', { class: `btn ${primary ? 'btn-rose' : 'btn-primary'}`, type: 'button' }, icon('user'), CONCIERGE.cta);
  open.addEventListener('click', () => {
    track('concierge_opened', where);
    open.replaceWith(form());
  });
  wrap.append(open);
  return wrap;

  function form() {
    const err = errorBox();
    const contact = el('input', { id: `cc-contact-${where}`, type: c.method === 'phone' ? 'tel' : 'email', autocomplete: c.method === 'phone' ? 'tel' : 'email', value: c.contact, maxlength: 254 });
    contact.addEventListener('input', () => ((c.contact = contact.value), save()));
    const contactLabel = el('label', { class: 'field-label', for: `cc-contact-${where}` }, c.method === 'phone' ? 'Phone number' : 'Email');
    const name = el('input', { id: `cc-name-${where}`, type: 'text', autocomplete: 'given-name', value: c.firstName, maxlength: 60 });
    name.addEventListener('input', () => ((c.firstName = name.value), save()));
    const best = el('input', { id: `cc-best-${where}`, type: 'text', value: c.bestTime, maxlength: 120, placeholder: 'e.g. weekday evenings' });
    best.addEventListener('input', () => ((c.bestTime = best.value), save()));
    const share = el('input', { type: 'checkbox', id: `cc-share-${where}`, checked: c.share });
    share.addEventListener('change', () => ((c.share = share.checked), save()));
    const send = el('button', { class: 'btn btn-primary', type: 'submit' }, 'Send my request');

    const f = el(
      'form',
      { class: 'concierge-form', novalidate: true, 'aria-label': CONCIERGE.title },
      el('h3', {}, CONCIERGE.title),
      el('p', {}, CONCIERGE.lede),
      radioTiles({
        name: `cc-focus-${where}`,
        legend: 'What kind of clinician are you looking for?',
        options: FOCUS_OPTIONS,
        value: c.focus,
        onChange: (v) => ((c.focus = v), save()),
      }),
      radioTiles({
        name: `cc-method-${where}`,
        legend: 'How should we reach you?',
        options: [
          { value: 'email', label: 'Email' },
          { value: 'phone', label: 'Phone or text' },
        ],
        value: c.method,
        onChange: (v) => {
          c.method = v;
          save();
          contact.type = v === 'phone' ? 'tel' : 'email';
          contact.autocomplete = v === 'phone' ? 'tel' : 'email';
          contactLabel.textContent = v === 'phone' ? 'Phone number' : 'Email';
        },
      }),
      el('div', { class: 'field' }, contactLabel, contact),
      el('div', { class: 'field' }, el('label', { class: 'field-label', for: `cc-name-${where}` }, 'First name (optional)'), name),
      el('div', { class: 'field' }, el('label', { class: 'field-label', for: `cc-best-${where}` }, 'Best time to reach you (optional)'), best),
      el('label', { class: 'check', for: `cc-share-${where}` }, share, el('span', {}, CONCIERGE.share)),
      el('p', { class: 'small muted' }, CONCIERGE.privacy),
      el('div', { class: 'actions' }, send),
      err,
    );
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!c.contact.trim()) return showError(err, c.method === 'phone' ? 'Add a phone number.' : 'Add an email address.');
      if (!c.share) return showError(err, 'Check the box so our team can see your summary.');
      send.disabled = true;
      showError(err, '');
      try {
        await api('/api/concierge', 'POST', {
          session_id: state.sessionId,
          method: c.method,
          contact: c.contact.trim(),
          first_name: c.firstName.trim() || null,
          focus: c.focus,
          best_time: c.bestTime.trim() || null,
          summary: conciergeSummary(state.answers, state.pathId, state.ownWords, c.focus),
          share: true,
        });
        c.done = true;
        save();
        track('concierge_requested', `${where}:${c.focus}`);
        onDone();
      } catch (ex) {
        showError(err, ex.message);
        send.disabled = false;
      }
    });
    return f;
  }
}
