// Prebunking Game: a fictional social-media post card.
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Text with [[tells]]: highlighted when reveal is true, plain otherwise. */
export function tellText(s, reveal) {
  return esc(s).replace(/\[\[(.+?)\]\]/g, (_, m) => (reveal ? `<mark>${m}</mark>` : m));
}

const initials = n => n.replace(/[^A-Za-z0-9 ]/g, '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

/**
 * Render a post. p: { name, handle, body, av }. opts: { reveal, tag, cls }.
 * Every post carries a visible "Fictional example" label.
 */
export function postHtml(p, { reveal = false, cls = '', label = 'Fictional example' } = {}) {
  const name = p.name.replace(/\[\[|\]\]/g, '');
  return `<article class="post ${cls}">
    <header class="post-h">
      <span class="av av-${p.av || 1}" aria-hidden="true">${esc(initials(name))}</span>
      <span class="who"><b>${esc(name)}</b><span class="handle">@${tellText(p.handle, reveal)}</span></span>
      <span class="fic">${label}</span>
    </header>
    <p class="post-b">${tellText(p.body, reveal)}</p>
  </article>`;
}
