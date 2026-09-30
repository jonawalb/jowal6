// "Learn about this model": a short run of one-screen pages built from the primer data (data/primers-*.js).
// Pages: the question and why it is a puzzle; the other explanations, at most three per page; the words needed
// for the sliders and figures (data/learn-terms.js), five a page, with the rest behind "More terms"; the answer and what the
// model leaves out. The primer's numbered steps are not shown here; the model's "Try this" prompts cover them.
import { esc } from './ui.js';

const PER_PAGE = 3;         // other explanations per page
const TERMS_PER_PAGE = 5;   // glossary terms per page

/** Split n items into the fewest pages of at most `per`, as evenly as possible (7 -> 3, 2, 2). */
function chunk(list, per) {
  const k = Math.ceil(list.length / per), out = [];
  let i = 0;
  for (let j = 0; j < k; j++) { const size = Math.ceil((list.length - i) / (k - j)); out.push(list.slice(i, i + size)); i += size; }
  return out;
}

const termList = ts => ts.map(t => `<div class="ln-term"><dt>${t.term}</dt><dd>${t.plain}</dd></div>`).join('');

/** The pages for one model: [{ key, title, html }]. */
export function learnPages(PR, keep = []) {
  const pages = [{
    key: 'question', title: 'The question',
    html: `<p class="ln-lab">The question</p><h2 class="ln-h ln-q" tabindex="-1">${PR.question}</h2>
      <section class="ln-puzzle"><h3>Why it’s a puzzle</h3><p>${PR.puzzle}</p></section>`,
  }];
  const groups = chunk(PR.others || [], PER_PAGE);
  groups.forEach((g, i) => pages.push({
    key: 'others', title: 'Other explanations',
    html: `<h2 class="ln-h" tabindex="-1">Other explanations${groups.length > 1 ? ` <span class="ln-part">${i + 1} of ${groups.length}</span>` : ''}</h2>
      <p class="fine">Answers others have given, and what the author says about each. Page numbers refer to the published article.</p>
      <ul class="ln-others">${g.map(o => `<li class="ln-oth">
        <p class="ln-oth-n">${o.name}</p>
        <p>${o.claim}</p>
        <p class="ln-oth-t"><span class="ln-view">Author’s view:</span> ${o.take}${o.src ? ` <span class="pg">${o.src}</span>` : ''}</p>
      </li>`).join('')}</ul>`,
  }));
  const terms = PR.terms || [];
  const main = terms.filter(t => keep.includes(t.term)), rest = terms.filter(t => !keep.includes(t.term));
  const tgroups = chunk(main, TERMS_PER_PAGE);
  tgroups.forEach((g, i) => pages.push({
    key: 'terms', title: 'Words you need',
    html: `<h2 class="ln-h" tabindex="-1">Words you need${tgroups.length > 1 ? ` <span class="ln-part">${i + 1} of ${tgroups.length}</span>` : ''}</h2>
      <p class="fine">The terms used on this model’s sliders and figures.</p>
      <dl class="ln-terms" id="ln-main">${termList(g)}</dl>
      ${rest.length && i === tgroups.length - 1 ? `<button type="button" class="linkbtn ln-more" aria-expanded="false" aria-controls="ln-rest">More terms (${rest.length})</button>
      <dl class="ln-terms ln-rest" id="ln-rest" tabindex="-1" aria-label="More terms" hidden>${termList(rest)}</dl>` : ''}`,
  }));
  pages.push({
    key: 'answer', title: 'The answer',
    html: `<section class="ln-answer"><h2 class="ln-h" tabindex="-1">The answer</h2><p>${PR.answer}</p></section>
      ${PR.limits ? `<section class="ln-limits"><h3>What it leaves out</h3><p>${PR.limits}</p></section>` : ''}`,
  });
  return pages;
}

/**
 * host: the #learn section. Returns { show(m, pageIndex, focus) }.
 * hooks.data(m) -> { PR, keep, card }: the primer, the terms to keep and the picker card for model m.
 * hooks.onPage(m, i): the page changed (write the hash). hooks.onModel(m): leave for the model.
 */
export function createLearn(host, hooks) {
  let state = null;   // { m, pages, i }

  function show(m, i, focus = true) {
    const { PR, keep, card } = hooks.data(m);
    const pages = learnPages(PR, keep);
    i = Math.max(0, Math.min(pages.length - 1, i));
    state = { m, pages, i };
    const n = pages.length, pg = pages[i], last = i === n - 1;
    host.innerHTML = `<div class="ln-top">
        <div class="ln-id"><p class="eyebrow">Learn about this model</p>
          <p class="ln-model"><b>${esc(card.title)}</b> <span>${esc(card.who)}</span></p></div>
        <button type="button" class="btn ln-skip" data-go="model">Skip to the model <span aria-hidden="true">→</span></button>
      </div>
      <div class="card ln-body ln-pg-${pg.key}" aria-roledescription="page">${pg.html}</div>
      <nav class="ln-nav" aria-label="Learn pages">
        <button type="button" class="btn ln-prev" ${i === 0 ? 'disabled' : ''}><span aria-hidden="true">←</span> Back</button>
        <p class="ln-count"><span class="ln-dots" aria-hidden="true">${pages.map((p, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('')}</span>
          <span>${i + 1} of ${n}</span><span class="sr-only">: ${esc(pg.title)}</span></p>
        ${last ? `<button type="button" class="btn solid ln-next" data-go="model">Go to the model <span aria-hidden="true">→</span></button>`
               : `<button type="button" class="btn solid ln-next">Next <span aria-hidden="true">→</span></button>`}
      </nav>`;
    host.querySelector('.ln-prev').addEventListener('click', () => go(-1));
    host.querySelectorAll('[data-go="model"]').forEach(b => b.addEventListener('click', () => hooks.onModel(m)));
    if (!last) host.querySelector('.ln-next').addEventListener('click', () => go(1));
    const more = host.querySelector('.ln-more');
    if (more) more.addEventListener('click', () => {
      const open = more.getAttribute('aria-expanded') !== 'true', rest = host.querySelector('#ln-rest');
      more.setAttribute('aria-expanded', String(open));
      more.textContent = open ? 'Back to the key terms' : `More terms (${rest.children.length})`;
      rest.hidden = !open; host.querySelector('#ln-main').hidden = open;
      if (open) rest.focus();
    });
    if (focus) host.querySelector('.ln-h').focus({ preventScroll: true });
    hooks.onPage(m, i);
    return i;
  }

  function go(d) {
    if (!state) return;
    const j = state.i + d;
    if (j < 0) return;
    if (j >= state.pages.length) { hooks.onModel(state.m); return; }
    show(state.m, j);
  }

  // Arrow keys page through while the learn view is showing (not while typing or inside a dialog).
  document.addEventListener('keydown', e => {
    if (host.hidden || !state || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (document.querySelector('dialog[open]')) return;
    const t = e.target;
    if (t && (t.closest('input, textarea, select, [contenteditable="true"], .tsm-bar'))) return;
    if (e.key === 'ArrowRight' && state.i < state.pages.length - 1) { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft' && state.i > 0) { e.preventDefault(); go(-1); }
  });

  return { show };
}
