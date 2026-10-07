(function () {
  'use strict';

  var state = { regimes: [], byId: {}, items: [], timeline: [], item: null, jur: 'all' };

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'text') n.textContent = attrs[k];
        else if (k === 'class') n.className = attrs[k];
        else n.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) {
      if (c == null) return;
      n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return n;
  }

  function link(href, text) {
    return el('a', { href: href, target: '_blank', rel: 'noopener', text: text });
  }

  function fmtDate(d) {
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var p = d.split('-');
    if (p.length === 1) return p[0];
    if (p.length === 2) return months[+p[1] - 1] + ' ' + p[0];
    return (+p[2]) + ' ' + months[+p[1] - 1] + ' ' + p[0];
  }

  /* ---------- tabs ---------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
    if (tab.id === 'tab-map' && document.getElementById('matrix').rows.length) updateMatrixHint();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () {
      selectTab(t);
      var key = t.id.replace('tab-', '');
      setHash(key === 'finder' && state.item ? 'finder/' + state.item : key);
    });
    t.addEventListener('keydown', function (e) {
      var j = null;
      if (e.key === 'ArrowRight') j = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = tabs.length - 1;
      if (j !== null) { e.preventDefault(); selectTab(tabs[j], true); tabs[j].click(); }
    });
  });

  function setHash(h) {
    if (history.replaceState) history.replaceState(null, '', '#' + h);
  }

  /* ---------- item finder ---------- */
  function renderItemList() {
    var list = document.getElementById('item-list');
    var sel = document.getElementById('item-select');
    var groups = [];
    state.items.forEach(function (it) { if (groups.indexOf(it.group) < 0) groups.push(it.group); });
    groups.forEach(function (g) {
      list.appendChild(el('div', { class: 'item-group', text: g }));
      var og = el('optgroup', { label: g });
      state.items.filter(function (it) { return it.group === g; }).forEach(function (it) {
        var b = el('button', { class: 'item-btn', type: 'button', 'data-id': it.id, 'aria-pressed': 'false', text: it.label });
        b.addEventListener('click', function () { showItem(it.id); });
        list.appendChild(b);
        og.appendChild(el('option', { value: it.id, text: it.label }));
      });
      sel.appendChild(og);
    });
    sel.addEventListener('change', function () { showItem(sel.value); });
  }

  function regimeDetail(r) {
    var box = el('div', { class: 'regime-detail' });
    box.appendChild(el('dl', null, [
      el('dt', { text: 'Instrument' }), el('dd', { text: r.name }),
      el('dt', { text: 'Citation' }), el('dd', { text: r.cite }),
      el('dt', { text: 'Legal force' }), el('dd', { text: r.force }),
      el('dt', { text: 'Run by' }), el('dd', { text: r.administrator })
    ]));
    box.appendChild(el('p', { text: r.summary }));
    if (r.key_provisions.length) {
      box.appendChild(el('h4', { text: 'Key provisions' }));
      var ul = el('ul');
      r.key_provisions.forEach(function (k) {
        ul.appendChild(el('li', null, [el('strong', { text: k.cite + ': ' }), k.text + ' ', link(k.url, 'Text')]));
      });
      box.appendChild(ul);
    }
    if (r.changes.length) {
      box.appendChild(el('h4', { text: 'Recent and notable changes' }));
      var cl = el('ul');
      r.changes.forEach(function (c) {
        cl.appendChild(el('li', null, [el('strong', { text: fmtDate(c.date) + ': ' }), c.text + ' ', link(c.url, 'Source')]));
      });
      box.appendChild(cl);
    }
    if (r.notes) box.appendChild(el('p', { class: 'verified', text: r.notes }));
    box.appendChild(el('p', { class: 'verified', text: 'Last verified ' + fmtDate(r.last_verified) + '.' }));
    return box;
  }

  function showItem(id, fromHash) {
    var it = state.items.filter(function (x) { return x.id === id; })[0];
    if (!it) return;
    state.item = id;
    Array.prototype.forEach.call(document.querySelectorAll('.item-btn'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-id') === id ? 'true' : 'false');
    });
    document.getElementById('item-select').value = id;
    document.getElementById('item-title').textContent = it.label;
    var direct = it.applies.filter(function (a) { return a.level === 'direct'; }).length;
    document.getElementById('item-count').textContent = it.applies.length + ' entries, ' + direct + ' direct';

    var hits = document.getElementById('hits');
    hits.innerHTML = '';
    var order = { direct: 0, conditional: 1 };
    it.applies.slice().sort(function (a, b) { return order[a.level] - order[b.level]; }).forEach(function (a, idx) {
      var r = state.byId[a.regime];
      var detailId = 'detail-' + id + '-' + idx;
      var toggle = el('button', { class: 'linkbtn', type: 'button', 'aria-expanded': 'false', 'aria-controls': detailId, text: 'About this regime' });
      var card = el('article', { class: 'card hit' }, [
        el('div', { class: 'hit-top' }, [
          el('h3', { text: r.short }),
          el('span', { class: 'badge', text: r.jurisdiction }),
          el('span', { class: 'badge ' + a.level, text: a.level === 'direct' ? 'Direct' : 'Conditional' })
        ]),
        el('div', { class: 'prov', text: a.provision }),
        el('p', { text: a.plain }),
        el('div', { class: 'hit-links' }, [link(a.url, 'Primary text'), toggle])
      ]);
      var detail = regimeDetail(r);
      detail.id = detailId;
      detail.hidden = true;
      card.appendChild(detail);
      toggle.addEventListener('click', function () {
        var open = detail.hidden;
        detail.hidden = !open;
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.textContent = open ? 'Hide regime details' : 'About this regime';
      });
      hits.appendChild(card);
    });

    var used = it.applies.map(function (a) { return a.regime; });
    var none = state.regimes.filter(function (r) { return used.indexOf(r.id) < 0; }).map(function (r) { return r.short; });
    document.getElementById('absent').textContent = none.length ? 'Reviewed, no entry found: ' + none.join(', ').replace(/\.?$/, '.') : '';
    if (!fromHash) setHash('finder/' + id);
  }

  /* ---------- regime map ---------- */
  function visibleRegimes() {
    return state.regimes.filter(function (r) { return state.jur === 'all' || r.jurisdiction === state.jur; });
  }

  function renderMatrix() {
    var t = document.getElementById('matrix');
    t.innerHTML = '';
    var regs = visibleRegimes();
    var thead = el('thead');
    var hr = el('tr', null, [el('th', { scope: 'col' }, [el('span', { class: 'sr-only', text: 'Item type' })])]);
    regs.forEach(function (r) {
      hr.appendChild(el('th', { scope: 'col', title: r.name }, [el('span', { class: 'vh' }, [r.short, el('span', { class: 'jur', text: r.jurisdiction })])]));
    });
    thead.appendChild(hr);
    t.appendChild(thead);
    var tb = el('tbody');
    state.items.forEach(function (it) {
      var tr = el('tr', null, [el('th', { scope: 'row', text: it.label })]);
      regs.forEach(function (r) {
        var hits = it.applies.filter(function (a) { return a.regime === r.id; });
        var lvl = hits.some(function (a) { return a.level === 'direct'; }) ? 'direct' : (hits.length ? 'conditional' : 'none');
        var label = it.label + ' / ' + r.short + ': ' + (lvl === 'none' ? 'none found' : lvl);
        var b = el('button', { class: 'cellbtn', type: 'button', 'aria-pressed': 'false', 'aria-label': label, title: label }, [el('span', { class: 'dot ' + lvl, 'aria-hidden': 'true' })]);
        b.addEventListener('click', function () {
          Array.prototype.forEach.call(t.querySelectorAll('.cellbtn[aria-pressed="true"]'), function (x) { x.setAttribute('aria-pressed', 'false'); });
          b.setAttribute('aria-pressed', 'true');
          showCell(it, r, hits);
        });
        tr.appendChild(el('td', null, [b]));
      });
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    updateMatrixHint();
  }

  function updateMatrixHint() {
    var wrap = document.getElementById('matrix-wrap');
    document.getElementById('matrix-hint').hidden = !wrap.offsetWidth || wrap.scrollWidth <= wrap.clientWidth + 1;
  }

  function showCell(it, r, hits) {
    var box = document.getElementById('cell-info');
    box.innerHTML = '';
    box.appendChild(el('strong', { text: it.label + ' × ' + r.short }));
    if (!hits.length) {
      box.appendChild(el('p', { text: 'No entry found in this instrument for this item type. ' + r.short + ' covers: ' + r.summary }));
      return;
    }
    hits.forEach(function (a) {
      box.appendChild(el('p', null, [
        el('span', { class: 'badge ' + a.level, text: a.level === 'direct' ? 'Direct' : 'Conditional' }), ' ',
        el('code', { text: a.provision }), ' ', a.plain + ' ', link(a.url, 'Primary text')
      ]));
    });
    var go = el('button', { class: 'linkbtn', type: 'button', text: 'Open in item finder' });
    go.addEventListener('click', function () { selectTab(tabs[0]); showItem(it.id); window.scrollTo(0, 0); });
    box.appendChild(go);
  }

  document.getElementById('jur-filter').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    state.jur = b.getAttribute('data-jur');
    Array.prototype.forEach.call(this.querySelectorAll('button'), function (x) {
      x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
    });
    renderMatrix();
    document.getElementById('cell-info').textContent = 'Select a cell.';
  });

  function renderTimeline() {
    var box = document.getElementById('timeline');
    var year = null, ul = null;
    state.timeline.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }).forEach(function (ev) {
      var y = ev.date.slice(0, 4);
      if (y !== year) {
        year = y;
        box.appendChild(el('div', { class: 'tl-year', text: y }));
        ul = el('ul', { class: 'tl' });
        box.appendChild(ul);
      }
      var r = state.byId[ev.regime];
      ul.appendChild(el('li', null, [
        el('time', { datetime: ev.date, text: fmtDate(ev.date) }),
        el('span', null, [el('span', { class: 'rg', text: r ? r.short : ev.regime }), ev.text + ' ', link(ev.url, 'Source')])
      ]));
    });
  }

  /* ---------- method ---------- */
  function renderSources() {
    var t = document.getElementById('src-table');
    t.appendChild(el('thead', null, [el('tr', null, [
      el('th', { text: 'Regime' }), el('th', { text: 'Jurisdiction' }), el('th', { text: 'Verified' }), el('th', { text: 'Sources' })
    ])]));
    var tb = el('tbody');
    state.regimes.forEach(function (r) {
      var ul = el('ul');
      r.sources.forEach(function (s) { ul.appendChild(el('li', null, [link(s.url, s.label)])); });
      tb.appendChild(el('tr', null, [
        el('td', null, [el('strong', { text: r.short }), el('br'), el('span', { class: 'verified', text: r.cite })]),
        el('td', { text: r.jurisdiction }),
        el('td', { text: fmtDate(r.last_verified) }),
        el('td', null, [ul])
      ]));
    });
    t.appendChild(tb);
  }

  /* ---------- boot ---------- */
  function routeFromHash() {
    var h = (location.hash || '').replace('#', '');
    var parts = h.split('/');
    var map = { finder: 0, info: 1, map: 2, method: 3 };
    if (parts[0] in map) selectTab(tabs[map[parts[0]]]);
    if (parts[0] === 'finder' && parts[1]) showItem(parts[1], true);
  }

  function getJSON(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(url + ' ' + r.status);
      return r.json();
    });
  }

  Promise.all([getJSON('data/regimes.json'), getJSON('data/items.json'), getJSON('data/timeline.json')])
    .then(function (res) {
      state.regimes = res[0].regimes;
      state.regimes.forEach(function (r) { state.byId[r.id] = r; });
      state.items = res[1].items;
      state.timeline = res[2].events;
      renderItemList();
      renderMatrix();
      renderTimeline();
      renderSources();
      showItem(state.items[0].id, true);
      routeFromHash();
      window.addEventListener('hashchange', routeFromHash);
      window.addEventListener('resize', updateMatrixHint);
    })
    .catch(function (err) {
      document.getElementById('hits').textContent = 'Data failed to load. ' + err.message;
    });
})();
