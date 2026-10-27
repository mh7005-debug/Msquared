import { el, state, save, api, track, errorBox, showError, icon, radioTiles } from '../core.js';
import { CONCIERGE } from '../content/copy.js';
import { conciergeSummary, FOCUS_OPTIONS } from '../shared/mapText.js';
import { TEAM } from '../content/team.js';

// Demo schedule for the pilot: the next 3 weekdays, four slots each (Eastern). A pick is a REQUESTED time;
// a person confirms it. Nothing here claims a booked appointment.
const SLOT_TIMES = ['10:00 AM', '12:30 PM', '4:00 PM', '6:30 PM'];
export function demoSlots(from = new Date()) {
  const days = [];
  const d = new Date(from);
  while (days.length < 3) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) days.push(new Date(d));
  }
  return days.map((day) => ({
    label: day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    times: SLOT_TIMES,
  }));
}

/**
 * "Have Msquared match me": the done-for-you step. A button that opens a short request form.
 * Nothing about her case leaves the device unless she checks the share box and sends.
 */
export function conciergeBlock({ where, focus, onDone, primary = true }) {
  if (state.concierge?.done) {
    const when = state.concierge.slot ? ` Requested time: ${state.concierge.slot}.` : '';
    return el('div', { class: 'notice ok concierge-done', role: 'status' }, icon('check'), el('div', {}, el('strong', {}, 'Consultation requested. '), `${CONCIERGE.done.replace('Consultation requested. ', '')}${when}`));
  }
  const c = (state.concierge = state.concierge || { method: 'email', contact: '', firstName: '', focus, bestTime: '', share: false });
  if (!c.focus) c.focus = focus;
  const wrap = el('div', { class: 'concierge' });
  const open = el('button', { class: `btn ${primary ? 'btn-rose' : 'btn-primary'}`, type: 'button' }, icon('user'), CONCIERGE.cta);
  wrap.append(el('p', { class: 'free-badge' }, CONCIERGE.badge));
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
    const bestField = el('div', { class: 'field', hidden: c.slot !== 'other' }, el('label', { class: 'field-label', for: `cc-best-${where}` }, 'When works for you?'), best);
    // Slot picker (demo schedule): one choice across all days, plus "none of these work".
    const slotButtons = [];
    const pick = (value, btn) => {
      c.slot = value;
      save();
      slotButtons.forEach((b) => b.setAttribute('aria-checked', b === btn ? 'true' : 'false'));
      bestField.hidden = value !== 'other';
    };
    const slotDays = demoSlots().map((day) =>
      el(
        'div',
        { class: 'slot-day' },
        el('p', { class: 'slot-day-label' }, day.label),
        el(
          'div',
          { class: 'slot-times' },
          day.times.map((t) => {
            const value = `${day.label}, ${t} ET`;
            const b = el('button', { class: 'chip slot', type: 'button', role: 'radio', 'aria-checked': c.slot === value ? 'true' : 'false', 'aria-label': value }, t);
            b.addEventListener('click', () => pick(value, b));
            slotButtons.push(b);
            return b;
          }),
        ),
      ),
    );
    const other = el('button', { class: 'chip slot', type: 'button', role: 'radio', 'aria-checked': c.slot === 'other' ? 'true' : 'false' }, 'None of these work');
    other.addEventListener('click', () => pick('other', other));
    slotButtons.push(other);
    const slotPicker = el(
      'div',
      { class: 'field' },
      el('p', { class: 'field-label', id: `cc-slot-${where}` }, 'Pick a time for your 20-minute call'),
      el('p', { class: 'hint' }, `With ${TEAM.consultant}. ${CONCIERGE.promise}`),
      el('div', { class: 'slots', role: 'radiogroup', 'aria-labelledby': `cc-slot-${where}` }, slotDays, el('div', { class: 'slot-other' }, other)),
      bestField,
    );
    const share = el('input', { type: 'checkbox', id: `cc-share-${where}`, checked: c.share });
    share.addEventListener('change', () => ((c.share = share.checked), save()));
    const send = el('button', { class: 'btn btn-primary', type: 'submit' }, 'Request this time');

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
      slotPicker,
      radioTiles({
        name: `cc-method-${where}`,
        legend: 'How should we reach you?',
        options: [
          { value: 'email', label: 'Email (we’ll send a video link)' },
          { value: 'phone', label: 'Phone call' },
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
      el('label', { class: 'check', for: `cc-share-${where}` }, share, el('span', {}, CONCIERGE.share)),
      el('p', { class: 'small muted' }, CONCIERGE.privacy),
      el('div', { class: 'actions' }, send),
      err,
    );
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!c.slot) return showError(err, 'Pick a time, or choose “None of these work”.');
      if (c.slot === 'other' && !c.bestTime.trim()) return showError(err, 'Tell us when works for you.');
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
          slot: c.slot === 'other' ? null : c.slot,
          best_time: c.slot === 'other' ? c.bestTime.trim() : null,
          summary: conciergeSummary(state.answers, state.pathId, state.ownWords, c.focus),
          share: true,
        });
        c.done = true;
        if (c.slot === 'other') c.slot = null;
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
