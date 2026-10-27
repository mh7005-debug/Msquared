import { el, state, save, saveFields, track, icon, promiseTag } from '../core.js';
import { getSource } from '../content/sources.js';
import { URGENT_NOTICE, WHY_RESEARCH } from '../content/copy.js';
import { PATHS } from '../shared/intake.js';
import { journeySummary, focusFor } from '../shared/mapText.js';
import { suggestNext } from '../content/providers.js';
import { conciergeBlock } from './concierge.js';
import { TEAM } from '../content/team.js';
import { VALUE_PROPS } from '../content/valueProps.js';

function sourceLink(s) {
  return el(
    'a',
    { href: s.url, target: '_blank', rel: 'noopener noreferrer', onclick: () => track('source_clicked', s.id) },
    `${s.publisher.split(' (')[0]}, ${s.year}`,
    icon('external'),
    el('span', { class: 'sr-only' }, ' (opens in a new tab)'),
  );
}

/** The research behind the consultation, each point with its verified sources. */
export function researchList({ brief = false } = {}) {
  if (brief) return el('ul', { class: 'research-list brief' }, WHY_RESEARCH.map((r) => el('li', {}, el('strong', {}, r.title))));
  return el(
    'ul',
    { class: 'research-list' },
    WHY_RESEARCH.map((r) => {
      const srcs = (r.sourceIds || [r.sourceId]).map(getSource).filter((s) => s && s.verified);
      return el(
        'li',
        {},
        el('strong', {}, r.title),
        el('span', {}, r.text),
        srcs.length ? el('span', { class: 'research-src' }, icon('book'), ...srcs.flatMap((s, i) => (i ? [' · ', sourceLink(s)] : [sourceLink(s)]))) : null,
      );
    }),
  );
}

/** Who runs the call. Fields come from team.js and must all be true; blank ones are hidden. */
function consultantCard() {
  const p = TEAM.consultantProfile || {};
  return el(
    'div',
    { class: 'consultant' },
    el('span', { class: 'avatar lg', 'aria-hidden': 'true' }, p.initials || 'M²'),
    el(
      'div',
      {},
      p.sample ? el('p', { class: 'sample-label' }, 'Example profile for this prototype') : null,
      p.name ? el('p', { class: 'consultant-name' }, p.name) : null,
      el('p', { class: 'consultant-title' }, p.title || TEAM.consultant),
      el('p', { class: 'small' }, '20-minute call · a real person, not a chatbot'),
      p.bio ? el('p', {}, p.bio) : null,
      p.facts && p.facts.length ? el('ul', { class: 'consultant-facts' }, p.facts.map((f) => el('li', {}, icon('check'), el('span', {}, f)))) : null,
    ),
  );
}

/**
 * The one page after the questions: what we heard, what the research professional will do, the research behind it,
 * and booking. H2: how likely to book BEFORE reading the research, then whether the research changed that.
 */
export function renderHelp(main, { navigate }) {
  const h = (state.help = state.help || {});
  if (!state.helpViewed) {
    state.helpViewed = true;
    save();
    track('map_viewed', `p${state.pathId}`);
  }
  const root = el('div');
  main.append(root);

  function finish(choice) {
    h.choice = choice;
    state.mapDecision = true;
    save();
    track('decision_selected', choice);
    track('session_completed');
    saveFields({ book_choice: choice, last_screen: 'feedback' })
      .catch(() => {})
      .finally(() => {
        state.completed = true;
        save();
        navigate('/complete');
      });
  }

  function render() {
    root.replaceChildren();
    const suggestion = suggestNext(state.answers, state.pathId);
    const booked = Boolean(state.concierge?.done);

    // H2 is measured by behavior: does she open the research, and does she book?
    const why = el(
      'details',
      { class: 'disclosure why' },
      el('summary', {}, el('span', {}, 'The research behind it'), icon('chevronDown', 'icon chev')),
      el('div', { class: 'body' }, researchList()),
    );
    why.addEventListener('toggle', () => {
      if (!why.open) return;
      track('care_option_expanded', 'research');
      if (!h.researchOpened) {
        h.researchOpened = true;
        save();
        saveFields({ research_opened: true }).catch(() => {});
      }
    });

    root.append(
      el('h1', {}, 'Here’s how we can help'),
      el(
        'section',
        { class: 'note-card heard', 'aria-labelledby': 'h-heard' },
        el('h2', { id: 'h-heard' }, 'What we heard'),
        el('p', {}, journeySummary(state.answers)),
        state.pathId ? el('p', {}, el('strong', {}, 'Where you’re stuck: '), PATHS[state.pathId].label) : null,
      ),
      el(
        'section',
        { class: 'card consult-card', 'aria-labelledby': 'h-consult' },
        promiseTag('clarity', VALUE_PROPS.clarity.label),
        el('h2', { id: 'h-consult' }, 'Your free consultation'),
        consultantCard(),
        el('p', { class: 'small muted' }, 'This is not a doctor’s appointment. Any medical care comes from licensed clinicians.'),
        el('div', { class: 'card-evidence' }, promiseTag('evidence', VALUE_PROPS.evidence.label), why),
        booked ? null : el('h3', { class: 'subhead' }, 'Book your time'),
        conciergeBlock({ where: 'help', focus: focusFor(suggestion), onDone: render, startOpen: true }),
        booked
          ? el('div', { class: 'actions' }, el('button', { class: 'btn btn-primary', type: 'button', onclick: () => finish('booked') }, 'Finish'))
          : el('button', { class: 'btn-link not-now', type: 'button', onclick: () => finish('not_now') }, 'Not right now'),
      ),
      el('div', { class: 'notice warn', role: 'note' }, icon('alert'), el('div', {}, el('strong', {}, URGENT_NOTICE.title), URGENT_NOTICE.body)),
    );
  }

  render();
}

