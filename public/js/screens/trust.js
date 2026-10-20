// Human trust signals: who's behind Msquared, how to reach them, who reviewed the content.
// Everything comes from content/team.js and is hidden when empty.
import { el, icon } from '../core.js';
import { TEAM } from '../content/team.js';

const initials = (name) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export function contactLine() {
  if (!TEAM.contactEmail) return null;
  return el(
    'p',
    { class: 'contact-line' },
    icon('mail'),
    el('span', {}, 'Questions? Email ', el('a', { href: `mailto:${TEAM.contactEmail}` }, TEAM.contactEmail), `. We reply ${TEAM.replyTime}.`),
  );
}

export function reviewerLine() {
  const r = TEAM.reviewer;
  if (!r) return null;
  return el('p', { class: 'reviewer-line' }, icon('shield'), el('span', {}, `Content reviewed by ${r.name}, ${r.credentials}${r.date ? ` (${r.date})` : ''}.`));
}

/** Welcome-page block: the real people and organization behind the app. */
export function aboutSection() {
  return el(
    'section',
    { class: 'about', 'aria-labelledby': 'about-h' },
    el('h2', { id: 'about-h' }, 'Who’s behind Msquared'),
    el('p', {}, `${TEAM.org} ${TEAM.origin}`),
    TEAM.members.length
      ? el(
          'ul',
          { class: 'team' },
          TEAM.members.map((m) =>
            el('li', {}, el('span', { class: 'avatar', 'aria-hidden': 'true' }, initials(m.name)), el('span', {}, el('strong', {}, m.name), el('span', { class: 'muted' }, m.role))),
          ),
        )
      : null,
    reviewerLine(),
    TEAM.quotes.length
      ? el(
          'div',
          { class: 'quotes' },
          TEAM.quotes.map((q) => el('figure', {}, el('blockquote', {}, `“${q.text}”`), el('figcaption', {}, q.who))),
        )
      : null,
    contactLine(),
  );
}

/** Map and thank-you page: a way to reach a person. */
export function contactCard() {
  if (!TEAM.contactEmail) return null;
  return el('aside', { class: 'contact-card', 'aria-label': 'Contact the team' }, el('strong', {}, 'Talk to a person'), contactLine());
}
