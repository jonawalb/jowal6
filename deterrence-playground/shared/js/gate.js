// Interactive Deterrence access gate. Classic (non-module) script, injected into the <head> of every page
// by scripts/build_site.py. Data files are published AES-256-GCM encrypted; the key is derived
// from the access password with PBKDF2-SHA256 and never leaves the browser.
// In local development (serving the source tree) this file is not loaded and data is plaintext.
(function () {
  'use strict';
  var CFG = {"id": "3d314fe2f5", "salt": "Y4WWLNuKMQNV9IJIKHdnMA==", "iter": 600000, "check": "tjkjLw74yJV6+mditJ1VR8hDkJT5Hm3Ucw4HZSJ8PZRGXg==", "remember": false, "t2": {"id": "24323fd3b3", "salt": "1h8efphNDcDulPgKOV6WkA==", "check": "4ufCwV4H5vsTzWw8SsppYG8CYEFPkH2wYaZh4xmBJCzThQ==", "slugs": ["crossing-windows", "joint-sword", "misinfo-cascade", "penghu-gambit", "strait-layers", "transit-response", "wargame-explorer", "warning-board"], "name": "TSM"}, "t3": {"id": "1561121461", "salt": "MVNotf4TEPtaytW5XYSB0A==", "check": "9pi+x9N+EpXYMdBBG8XYpFM4Aoxc+i2ZQWbUvA2rxnLp3w==", "slugs": ["dissertation-games"], "name": "Jon Dissertation Games"}};
  var KEYNAME = 'tsm-vault-key-' + (CFG ? CFG.id : 'dev');
  var MAGIC = 'TSMVAULT2:';
  // Optional extra tiers: tools listed in CFG.t2.slugs (or CFG.t3.slugs) have their data sealed with a
  // second (or third) password. A page belongs to at most one extra tier.
  var TIERS = { 2: CFG && CFG.t2, 3: CFG && CFG.t3 };
  var T2 = TIERS[2];
  var KEYNAME2 = T2 ? 'tsm-vault-key-' + T2.id : '';
  var KEYNAME3 = TIERS[3] ? 'tsm-vault-key-' + TIERS[3].id : '';
  var MAGIC2 = 'TSMVAULT3:';
  var MAGIC3 = 'TSMVAULT4:';
  var ROOT = new URL('../../', document.currentScript.src).href;
  var slugMatch = location.pathname.match(/\/tools\/([^/]+)\//);
  var inTier = function (t) { return !!(TIERS[t] && slugMatch && TIERS[t].slugs.indexOf(slugMatch[1]) >= 0); };
  var PAGE_TIER = inTier(3) ? 3 : inTier(2) ? 2 : 0;
  var LOCKED_PAGE = PAGE_TIER > 0;
  var resolveKey, resolveKey2;
  var keyReady = new Promise(function (r) { resolveKey = r; });
  var key2Ready = new Promise(function (r) { resolveKey2 = r; });

  var b64d = function (s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  var b64e = function (u) { var s = ''; for (var i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  var importRaw = function (raw) { return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']); };
  function decrypt(key, bytes) {
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, key, bytes.slice(12)).then(function (b) { return new Uint8Array(b); });
  }
  /** Decrypt, then gunzip when the payload was compressed at build time. */
  function open(key, bytes, gz) {
    return decrypt(key, bytes).then(function (plain) {
      if (!gz) return plain;
      var stream = new Blob([plain]).stream().pipeThrough(new DecompressionStream('gzip'));
      return new Response(stream).arrayBuffer().then(function (ab) { return new Uint8Array(ab); });
    });
  }
  function derive(pw, tier) {
    var salt = tier > 1 ? TIERS[tier].salt : CFG.salt;
    return crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']).then(function (base) {
      return crypto.subtle.deriveBits({ name: 'PBKDF2', salt: b64d(salt), iterations: CFG.iter, hash: 'SHA-256' }, base, 256);
    }).then(function (bits) { return new Uint8Array(bits); });
  }
  /** Resolves to a CryptoKey if raw key bytes decrypt the check token, else rejects. */
  function tryRaw(raw, tier) {
    var check = tier > 1 ? TIERS[tier].check : CFG.check;
    return importRaw(raw).then(function (k) { return decrypt(k, b64d(check)).then(function () { return k; }); });
  }
  function storedKey(name, tier) {
    var v = null;
    try { v = localStorage.getItem(name) || sessionStorage.getItem(name); } catch (e) { /* storage blocked */ }
    return v ? tryRaw(b64d(v), tier) : Promise.reject();
  }
  /** Extra-tier key: asked for on every visit to a locked tool page and never stored, so nothing else can use it. */
  function key2Now(tier) { return tier === PAGE_TIER ? key2Ready : Promise.reject(); }
  // Sites built with remember:false keep the site key only for this tab (sessionStorage), never on the device.
  var REMEMBER = !CFG || CFG.remember !== false;
  if (!REMEMBER) { try { localStorage.removeItem(KEYNAME); } catch (e) { /* storage blocked */ } }
  // Drop any second-tier key saved by an earlier version of this gate.
  [KEYNAME2, KEYNAME3].forEach(function (n) { if (n) { try { localStorage.removeItem(n); sessionStorage.removeItem(n); } catch (e) { /* storage blocked */ } } });

  function startsWithMagic(buf, magic) {
    if (buf.length < magic.length) return false;
    for (var i = 0; i < magic.length; i++) if (buf[i] !== magic.charCodeAt(i)) return false;
    return true;
  }

  window.TSMVault = {
    ready: keyReady,
    /** Decrypt an encrypted ES module (data/*.js) and import it. baseUrl resolves its relative imports. */
    module: function (baseUrl, b64, gz, tier) {
      return (tier > 1 ? key2Now(tier) : keyReady).then(function (k) { return open(k, b64d(b64), gz); }).then(function (bytes) {
        var src = new TextDecoder().decode(bytes).replace(/(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])(\.{1,2}\/[^'"]+)\2/g,
          function (m, pre, q, spec) { return pre + q + new URL(spec, baseUrl).href + q; });
        var url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
        return import(url).finally(function () { URL.revokeObjectURL(url); });
      });
    },
    lock: function () {
      try { [KEYNAME, KEYNAME2, KEYNAME3].forEach(function (n) { if (n) { localStorage.removeItem(n); sessionStorage.removeItem(n); } }); } catch (e) { /* storage blocked */ }
      location.reload();
    },
  };

  // Transparent decryption for fetched data files (json, csv, etc.).
  var nativeFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    return nativeFetch(input, init).then(function (r) {
      if (!r.ok || !/\/data\/|\/thumb\.png$/.test(r.url || '')) return r;
      return r.clone().arrayBuffer().then(function (ab) {
        var buf = new Uint8Array(ab);
        var tier = startsWithMagic(buf, MAGIC) ? 1 : startsWithMagic(buf, MAGIC2) ? 2 : startsWithMagic(buf, MAGIC3) ? 3 : 0;
        if (!tier) return r;
        return (tier > 1 ? key2Now(tier) : keyReady).then(function (k) { return open(k, b64d(new TextDecoder().decode(buf.subarray(MAGIC.length))), true); })
          .then(function (plain) { return new Response(plain, { status: 200, headers: r.headers }); },
            function () { return new Response(null, { status: 403, statusText: 'Locked' }); });
      });
    });
  };

  if (!CFG) { resolveKey(null); return; }

  // Hide the page until unlocked.
  var html = document.documentElement;
  html.classList.add('tsm-locked');
  var style = document.createElement('style');
  style.textContent = 'html.tsm-locked body>*:not(#tsm-gate){visibility:hidden!important}' +
    '#tsm-gate{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:20px;background:#f4f5f6;color:#101317;font:15px/1.5 "Public Sans",Arial,sans-serif}' +
    '@media (prefers-color-scheme:dark){#tsm-gate{background:#0c120e;color:#dfe7e1}#tsm-gate .g-card{background:#121a15;border-color:#243129}#tsm-gate input[type=password]{background:#0c120e;color:#dfe7e1;border-color:#243129}}' +
    '#tsm-gate .g-card{width:min(420px,100%);background:#ffffff;border:1px solid #d3d6cd;border-top:4px solid #c8102e;border-radius:6px;padding:26px 24px 22px;display:flex;flex-direction:column;gap:12px}' +
    '#tsm-gate .g-brand{display:flex;align-items:center;gap:12px}#tsm-gate img{width:56px;height:56px}' +
    '#tsm-gate .g-org{margin:0;font:600 12px "Libre Franklin",Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#0c1f3a}' +
    '#tsm-gate h1{margin:0;font:700 28px/1.05 "Libre Franklin",Arial,sans-serif}#tsm-gate p{margin:0;color:#7f8a83;font-size:13.5px}' +
    '#tsm-gate form{display:flex;flex-direction:column;gap:10px}' +
    '#tsm-gate input[type=password]{font:inherit;padding:10px 12px;border:1px solid #d3d6cd;border-radius:4px}' +
    '#tsm-gate input:focus-visible,#tsm-gate button:focus-visible{outline:2px solid #c8102e;outline-offset:2px}' +
    '#tsm-gate button{font:600 14px inherit;padding:10px 14px;border-radius:4px;border:1px solid #0c1f3a;background:#0c1f3a;color:#f4f5f6;cursor:pointer}' +
    '#tsm-gate button:disabled{opacity:.6;cursor:wait}#tsm-gate label.g-rem{display:flex;gap:8px;align-items:center;font-size:13px;color:#7f8a83}' +
    '#tsm-gate .g-err{color:#b3261e;font-size:13px;min-height:1.3em}';
  document.head.appendChild(style);

  function reveal() { html.classList.remove('tsm-locked'); var g = document.getElementById('tsm-gate'); if (g) g.remove(); }
  function unlock2(key) { resolveKey2(key); reveal(); }
  function unlock(key) {
    resolveKey(key);
    if (!LOCKED_PAGE) { reveal(); return; }
    var g = document.getElementById('tsm-gate'); if (g) g.remove();
    if (document.body) showGate(PAGE_TIER); else document.addEventListener('DOMContentLoaded', function () { showGate(PAGE_TIER); });
  }

  function showGate(tier) {
    tier = tier > 1 && TIERS[tier] ? tier : 1;
    var g = document.createElement('div');
    g.id = 'tsm-gate';
    g.setAttribute('role', 'dialog');
    g.setAttribute('aria-modal', 'true');
    g.setAttribute('aria-labelledby', 'g-title');
    g.innerHTML = '<div class="g-card"><div class="g-brand"><img src="' + ROOT + 'shared/assets/site-logo.svg" alt="">' +
      '<div><p class="g-org">Jonathan Walberg</p><h1 id="g-title">Interactive Deterrence</h1></div></div>' +
      (tier > 1 ? '<p><b>' + (TIERS[tier].name || 'This section') + '</b> needs ' + (tier === 2 ? 'a second' : 'its own') + ' password. Enter it to continue.</p>'
        : '<p>This site is for invited readers. Enter the access password to continue.</p>') +
      '<form><input type="password" id="g-pw" autocomplete="current-password" aria-label="Access password" placeholder="Access password" required>' +
      (tier > 1 || !REMEMBER ? '' : '<label class="g-rem"><input type="checkbox" id="g-rem" checked> Remember on this device</label>') +
      '<button type="submit" id="g-go">Unlock</button><div class="g-err" id="g-err" aria-live="polite"></div></form></div>';
    document.body.appendChild(g);
    var pw = g.querySelector('#g-pw'), go = g.querySelector('#g-go'), err = g.querySelector('#g-err');
    pw.focus();
    g.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      go.disabled = true; go.textContent = 'Checking\u2026'; err.textContent = '';
      derive(pw.value, tier).then(function (raw) {
        return tryRaw(raw, tier).then(function (k) {
          if (tier === 1) { try { (REMEMBER && g.querySelector('#g-rem').checked ? localStorage : sessionStorage).setItem(KEYNAME, b64e(raw)); } catch (e2) { /* storage blocked */ } }
          (tier > 1 ? unlock2 : unlock)(k);
        });
      }).catch(function () {
        go.disabled = false; go.textContent = 'Unlock';
        err.textContent = 'That password is not right. Check it and try again.';
        pw.select();
      });
    });
  }

  storedKey(KEYNAME, 1).then(unlock, function () {
    if (document.body) showGate(1); else document.addEventListener('DOMContentLoaded', function () { showGate(1); });
  });
})();
