import { el, state, save, saveFields, track, textField, radioTiles, errorBox, showError, copyText, icon, stableOrder } from '../core.js';
import { CARE_OPTIONS, ROLE_COMPARISON, KNOWN_VS_UNCERTAIN } from '../content/careOptions.js';
import { getSource } from '../content/sources.js';
import { UNRESOLVED, URGENT_NOTICE, FREE_TEXT_REMINDER } from '../content/copy.js';
import { PATHS, optionLabel } from '../shared/intake.js';
import { journeySummary, copySummary, sectionOrder } from '../shared/mapText.js';

const DECISIONS = {
  use: 'Use this to prepare for a conversation with a healthcare professional.',
  verify: 'Verify this with another source first.',
  unsure: 'I’m still unsure what to do.',
};

/** Path-based emphasis only. Never based on symptoms or duration. */
const HIGHLIGHT = { 1: null, 2: null, 3: 'coordination' };

const TODAY = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

function summaryRow(text) {
  return el('summary', {}, el('span', {}, text), icon('chevronDown', 'icon chev'));
}

export function renderMap(main, { navigate }) {
  const m = (state.map = state.map || { decision: null, reason: '', missing: '', nextConversation: '' });
  if (!state.mapViewed) {
    state.mapViewed = true;
    save();
    track('map_viewed', `p${state.pathId}`);
  }

  const root = el('div');
  main.append(root);

  function render() {
    root.replaceChildren();
    const pathId = state.pathId;
    root.className = `path-${pathId}`;
    const sections = {
      journey: journeySection,
      unresolved: unresolvedSection,
      evidence: evidenceSection,
      options: optionsSection,
      compare: compareSection,
      summary: summarySection,
      decision: decisionSection,
    };
    root.append(
      el(
        'div',
        { class: 'map-head' },
        el('h1', {}, 'Your next-step care map'),
        el('p', { class: 'prep-meta' }, `Prepared ${TODAY}. Educational information to discuss with a healthcare professional.`),
        pathRow(),
      ),
      ...sectionOrder(pathId).map((k) => sections[k](pathId)),
      el('div', { class: 'notice warn', role: 'note' }, icon('alert'), el('div', {}, el('strong', {}, URGENT_NOTICE.title), URGENT_NOTICE.body)),
    );
  }

  // ---- Path switcher ----
  function pathRow() {
    const btn = el('button', { class: 'btn-link', type: 'button', 'aria-expanded': 'false' }, 'Change');
    const row = el(
      'div',
      { class: 'path-row' },
      el('div', {}, el('span', { class: 'label' }, 'Where you’re stuck'), el('strong', {}, PATHS[state.pathId].label)),
      btn,
    );
    const picker = el('div', { class: 'card path-picker', hidden: true });
    let choice = state.pathId;
    const order = stableOrder('path', ['p1', 'p2', 'p3']).map((code) => PATHS[Number(code.slice(1))]);
    picker.append(
      radioTiles({
        name: 'path-change',
        legend: 'What’s making it hardest to move forward with your care right now?',
        options: order.map((p) => ({ value: p.id, label: p.label })),
        value: state.pathId,
        onChange: (v) => (choice = v),
      }),
      el(
        'button',
        {
          class: 'btn btn-primary',
          type: 'button',
          onclick: () => {
            if (choice !== state.pathId) {
              state.pathId = choice;
              state.answers = { ...state.answers, path: `p${choice}` };
              save();
              track('path_changed', `p${choice}`);
              saveFields({ path_id: choice }).catch(() => {});
            }
            render();
            window.scrollTo(0, 0);
          },
        },
        'Update my map',
      ),
    );
    btn.addEventListener('click', () => {
      picker.hidden = !picker.hidden;
      btn.setAttribute('aria-expanded', String(!picker.hidden));
    });
    return el('div', {}, row, picker);
  }

  // ---- A. Journey ----
  function journeySection(pathId) {
    const seen = (state.answers.types || []).filter((t) => t !== 'other').map((t) => optionLabel('types', t));
    return el(
      'section',
      { class: `section note-card${pathId === 3 ? ' emph' : ''}`, 'aria-labelledby': 'h-journey' },
      el('h2', { id: 'h-journey' }, 'Your journey so far'),
      el('p', {}, journeySummary(state.answers)),
      pathId === 3 && seen.length
        ? el('div', {}, el('p', { class: 'small muted' }, 'Professionals you’ve seen'), el('ul', { class: 'pills' }, seen.map((s) => el('li', {}, s))))
        : null,
      el('p', { class: 'small muted' }, 'Built only from the answers you chose. Nothing here is a diagnosis.'),
    );
  }

  // ---- B. Unresolved ----
  function unresolvedSection(pathId) {
    const u = UNRESOLVED[pathId];
    return el(
      'section',
      { class: 'section', 'aria-labelledby': 'h-unres' },
      el('h2', { id: 'h-unres' }, pathId === 3 ? 'Follow-up questions to clear up' : 'What remains unresolved'),
      el('p', {}, u.obstacle),
      el('ul', { class: 'qlist' }, u.questions.map((q) => el('li', {}, q))),
    );
  }

  // ---- Path 2: known vs uncertain ----
  function evidenceSection() {
    return el(
      'section',
      { class: 'section', 'aria-labelledby': 'h-evid' },
      el('h2', { id: 'h-evid' }, 'What guidance says, and what it can’t tell you'),
      el(
        'div',
        { class: 'kvu' },
        el(
          'div',
          { class: 'col known' },
          el('div', { class: 'col-head' }, icon('book'), el('h3', {}, 'What clinical guidance says')),
          el(
            'ul',
            {},
            KNOWN_VS_UNCERTAIN.known
              .filter((k) => getSource(k.sourceId)?.verified)
              .map((k) => {
                const s = getSource(k.sourceId);
                return el('li', {}, k.text, ' ', sourceLink(s, `(${shortPublisher(s)}, ${s.year})`, false));
              }),
          ),
        ),
        el(
          'div',
          { class: 'col unknown' },
          el('div', { class: 'col-head' }, icon('user'), el('h3', {}, 'Only your clinicians can answer')),
          el('ul', {}, KNOWN_VS_UNCERTAIN.uncertain.map((t) => el('li', {}, t))),
        ),
      ),
    );
  }

  function shortPublisher(s) {
    return s.id === 'asrm-2024' ? 'ASRM' : s.id === 'endo-2017' ? 'Endocrine Society' : s.publisher;
  }

  function sourceLink(s, text, withIcon = true) {
    return el(
      'a',
      {
        href: s.url,
        target: '_blank',
        rel: 'noopener noreferrer',
        onclick: () => track('source_clicked', s.id),
      },
      text,
      withIcon ? icon('external') : null,
      el('span', { class: 'sr-only' }, ' (opens in a new tab)'),
    );
  }

  // ---- C. Care-option cards ----
  function optionsSection(pathId) {
    return el(
      'section',
      { class: 'section', 'aria-labelledby': 'h-opts' },
      el('h2', { id: 'h-opts' }, 'Professional conversations to consider'),
      el('p', { class: 'section-intro' }, 'Everyone sees the same options. They aren’t ranked, and none of them is required.'),
      CARE_OPTIONS.map((c) => optionCard(c, pathId)),
    );
  }

  function optionCard(c, pathId) {
    const sources = c.sources.map((x) => ({ ...x, s: getSource(x.sourceId) })).filter((x) => x.s && x.s.verified);
    const why = el(
      'details',
      { class: 'disclosure' },
      summaryRow(pathId === 2 ? 'Check why this may be relevant' : 'Why this may be relevant'),
      el('div', { class: 'body' }, el('p', {}, c.whyRelevant)),
    );
    why.addEventListener('toggle', () => why.open && track('care_option_expanded', c.id));

    const evidence = el(
      'details',
      { class: 'disclosure' },
      summaryRow(`See the evidence (${sources.length} ${sources.length === 1 ? 'source' : 'sources'})`),
      el(
        'div',
        { class: 'body' },
        sources.map(({ s }) =>
          el(
            'div',
            { class: 'source' },
            icon('book'),
            el(
              'div',
              {},
              el('span', { class: 'source-kind' }, 'Professional society guidance'),
              sourceLink(s, s.title),
              el('span', { class: 'meta' }, `${s.publisher}, ${s.year}`),
            ),
          ),
        ),
      ),
    );
    evidence.addEventListener('toggle', () => {
      if (evidence.open) for (const { s } of sources) track('evidence_opened', s.id);
    });

    return el(
      'article',
      { class: `card option-card${HIGHLIGHT[pathId] === c.id ? ' emph' : ''}`, 'aria-labelledby': `h-${c.id}` },
      HIGHLIGHT[pathId] === c.id ? el('span', { class: 'tag' }, 'Related to where you’re stuck') : null,
      el('h3', { id: `h-${c.id}` }, c.role),
      el('p', { class: 'summary' }, c.summary),
      el('p', { class: 'subhead' }, 'Questions to bring'),
      el('ul', { class: 'qlist' }, c.appointmentQuestions.map((q) => el('li', {}, q))),
      why,
      sources.length ? evidence : null,
    );
  }

  // ---- D. Role comparison ----
  function compareSection(pathId) {
    const table = el(
      'table',
      { class: 'compare-table' },
      el('caption', { class: 'sr-only' }, 'What each professional role can help discuss'),
      el('thead', {}, el('tr', {}, el('th', { scope: 'col' }, 'Role'), el('th', { scope: 'col' }, 'Can help discuss'), el('th', { scope: 'col' }, 'Often'))),
      el(
        'tbody',
        {},
        ROLE_COMPARISON.map((r) =>
          el(
            'tr',
            {},
            el('th', { scope: 'row' }, r.role),
            el('td', { 'data-label': 'Can help discuss' }, r.helpsDiscuss),
            el('td', { 'data-label': 'Often' }, r.often),
          ),
        ),
      ),
    );
    if (pathId === 1) {
      return el(
        'section',
        { class: 'section card emph', 'aria-labelledby': 'h-cmp' },
        el('h2', { id: 'h-cmp' }, 'Compare professional roles'),
        el('p', { class: 'section-intro' }, 'General roles only. What fits you depends on your clinician’s evaluation.'),
        table,
      );
    }
    const d = el(
      'details',
      { class: 'disclosure compare-details' },
      el('summary', {}, el('span', { class: 'h2like' }, 'Compare professional roles'), icon('chevronDown', 'icon chev')),
      el('div', { class: 'body' }, table),
    );
    d.addEventListener('toggle', () => d.open && track('role_comparison_opened', `p${pathId}`));
    return el('section', { class: 'section' }, d);
  }

  // ---- E. Copyable summary ----
  function summarySection(pathId) {
    const text = copySummary(state.answers, pathId);
    const status = el('span', { class: 'status', role: 'status' });
    const btn = el('button', { class: 'btn', type: 'button' }, icon('copy'), 'Copy summary');
    btn.addEventListener('click', async () => {
      const ok = await copyText(text);
      status.textContent = ok ? 'Copied' : 'Couldn’t copy. Select the text and copy it instead.';
      if (ok) track('summary_copied', `p${pathId}`);
    });
    return el(
      'section',
      { class: `section${pathId === 3 ? ' card emph' : ''}`, 'aria-labelledby': 'h-sum' },
      el('h2', { id: 'h-sum' }, 'Your next-step summary'),
      el('p', { class: 'section-intro' }, 'Copy this into your notes or bring it to an appointment. It leaves out your symptom details.'),
      el('pre', { class: 'summary-box', tabindex: '0', 'aria-label': 'Summary text' }, text),
      el('div', { class: 'copy-row' }, btn, status),
    );
  }

  // ---- F. Decision prompt ----
  function decisionSection() {
    const err = errorBox();
    const next = el('button', { class: 'btn btn-primary', type: 'button' }, 'Continue to feedback');
    next.addEventListener('click', async () => {
      if (!m.decision) return showError(err, 'Choose one option to continue.');
      showError(err, '');
      next.disabled = true;
      try {
        await saveFields({
          decision_choice: m.decision,
          decision_reason: m.reason || null,
          map_missing_info: m.missing || null,
          map_next_conversation: m.nextConversation || null,
          last_screen: 'map',
        });
        state.mapDecision = true;
        save();
        navigate('/feedback');
      } catch (ex) {
        showError(err, ex.message);
        next.disabled = false;
      }
    });

    const select = el(
      'select',
      { id: 'next-conv' },
      el('option', { value: '' }, 'Choose one (optional)'),
      CARE_OPTIONS.map((c) => el('option', { value: c.id, selected: m.nextConversation === c.id }, c.shortRole)),
      el('option', { value: 'none', selected: m.nextConversation === 'none' }, 'None of these'),
      el('option', { value: 'not-sure', selected: m.nextConversation === 'not-sure' }, 'I’m not sure yet'),
    );
    select.addEventListener('change', () => ((m.nextConversation = select.value), save()));

    // Random order per session so the first-listed option doesn't get picked more just for being first.
    const order = stableOrder('decision', Object.keys(DECISIONS));

    return el(
      'section',
      { class: 'section card', 'aria-labelledby': 'h-dec' },
      el('h2', { id: 'h-dec' }, 'What would you do next?'),
      el('p', { class: 'section-intro' }, 'This isn’t a medical recommendation or a commitment. Every answer is useful to us.'),
      radioTiles({
        name: 'decision',
        legend: 'Choose one',
        options: order.map((v) => ({ value: v, label: DECISIONS[v] })),
        value: m.decision,
        onChange: (v) => {
          m.decision = v;
          save();
          showError(err, '');
          track('decision_selected', v);
        },
      }),
      textField({ label: 'What led you to that choice? (optional)', hint: FREE_TEXT_REMINDER, value: m.reason, onInput: (v) => ((m.reason = v), save()) }),
      textField({ label: 'What information, if any, is missing? (optional)', hint: FREE_TEXT_REMINDER, value: m.missing, onInput: (v) => ((m.missing = v), save()) }),
      el('div', { class: 'field' }, el('label', { class: 'field-label', for: 'next-conv' }, 'Which professional conversation, if any, would you consider next? (optional)'), select),
      el('div', { class: 'actions' }, next),
      err,
    );
  }

  render();
}
