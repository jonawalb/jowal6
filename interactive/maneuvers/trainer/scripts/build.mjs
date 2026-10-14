// Builds the Maneuver Trainer pages. Run: node interactive/maneuvers/trainer/scripts/build.mjs
//
// For every game mode whose page template exists (scripts/<mode>.html + scripts/<mode>.mjs, mode in
// MODES), writes <mode>/index.html: the template with the kit + core + render + ui.mjs + the mode
// script bundled inline. Adding Medium or Hard = add scripts/medium.html and scripts/medium.mjs;
// nothing here needs editing. Also writes the hub, index.html, from scripts/hub.html.
//
// Bundling: each ES module becomes one function scope, `__M["<path>"] = (() => { ...; return { exports } })()`,
// with its `import { a, b as c } from "./x.mjs"` lines turned into `const { a, b: c } = __M["x"]`, in
// dependency order. Modules never share a scope, so the kit's and the core's private names cannot clash.
// Templates take: /*ISO_CSS*/ (kit + terrain CSS), /*COMMON_CSS*/ (scripts/common.css), /*DATA*/ (JSON),
// /*BUNDLE*/ (the script), <!--GAMES--> and <!--SCENARIOS--> (hub only).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { FIELD_CSS } from "../../kit/field.mjs";
import { TERRAIN_CSS } from "../../kit/terrain.mjs";
import { SCENARIOS, LEVELS } from "../core/scenarios.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const MODES = ["easy", "medium", "hard"];
const MODE_INFO = {
  easy: { title: "Easy", line: "Plan, then watch: pick a scheme of maneuver, set each element's task, route and trigger, and see it play out." },
  medium: { title: "Medium", line: "Turn-based orders: give every element its orders, run one turn, see what changed, order again." },
  hard: { title: "Hard", line: "Real time: the clock runs while you give orders, and at company level the radio delays them." },
};

function bundle(entries) {
  const done = new Map();
  const out = [];
  const visit = (file) => {
    const abs = resolve(file);
    if (done.has(abs)) return done.get(abs);
    const id = relative(ROOT, abs);
    done.set(abs, id);
    let src = readFileSync(abs, "utf8");
    const names = [];
    src = src.replace(/^import\s+(.+?)\s+from\s+["'](.+?)["'];?\s*$/gm, (_, what, from) => {
      const dep = visit(join(dirname(abs), from));
      if (what.startsWith("* as ")) return `const ${what.slice(5).trim()} = __M[${JSON.stringify(dep)}];`;
      const inner = what.replace(/[{}]/g, "").split(",").map((s) => s.trim()).filter(Boolean).map((s) => s.replace(/\s+as\s+/, ": "));
      return `const { ${inner.join(", ")} } = __M[${JSON.stringify(dep)}];`;
    });
    src = src.replace(/^export\s+(async\s+function\*?|function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)/gm, (_, kw, name) => { names.push(name); return `${kw} ${name}`; });
    src = src.replace(/^export\s*\{([^}]*)\};?\s*$/gm, (_, list) => { for (const n of list.split(",").map((s) => s.trim()).filter(Boolean)) names.push(n); return ""; });
    if (/^export\s/m.test(src)) throw new Error(`unsupported export form in ${id}`);
    out.push(`__M[${JSON.stringify(id)}] = (() => {\n${src}\nreturn { ${names.join(", ")} };\n})();`);
    return id;
  };
  for (const e of entries) visit(e);
  return `const __M = {};\n${out.join("\n")}`;
}

const ISO = k.ISO_CSS + FIELD_CSS + TERRAIN_CSS;
const COMMON = readFileSync(join(HERE, "common.css"), "utf8");
const scenList = SCENARIOS.map((s) => ({ id: s.id, n: s.n, level: s.level, title: s.title, line: s.briefing.mission.split(/(?<=\.)\s/)[0], concepts: s.concepts.map((c) => ({ fig: c.fig, title: c.title, href: c.href })) }));
const fill = (tpl, map) => Object.entries(map).reduce((s, [key, val]) => s.split(key).join(val), tpl);
const built = [];
for (const mode of MODES) {
  const tpl = join(HERE, `${mode}.html`), js = join(HERE, `${mode}.mjs`);
  if (!existsSync(tpl) || !existsSync(js)) continue;
  const script = bundle([js]).replace(/<\/(script)/gi, "<\\/$1");
  const page = fill(readFileSync(tpl, "utf8"), { "/*ISO_CSS*/": ISO, "/*COMMON_CSS*/": COMMON, "/*DATA*/": JSON.stringify({ mode, levels: LEVELS }), "/*BUNDLE*/": script });
  mkdirSync(join(ROOT, mode), { recursive: true });
  writeFileSync(join(ROOT, mode, "index.html"), page);
  built.push(mode);
  console.log(`wrote ${mode}/index.html ${(page.length / 1024).toFixed(0)} KB`);
}

// hub
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const games = MODES.map((m) => {
  const live = existsSync(join(ROOT, m, "index.html"));
  const inner = `<span class="mt-game-tag">${live ? "Play" : "Coming next"}</span><h3>${esc(MODE_INFO[m].title)}</h3><p>${esc(MODE_INFO[m].line)}</p>`;
  return live ? `<a class="mt-game" href="${m}/">${inner}</a>` : `<div class="mt-game mt-soon" aria-disabled="true">${inner}</div>`;
}).join("");
const firstLive = MODES.find((m) => existsSync(join(ROOT, m, "index.html"))) || "easy";
const scenHtml = Object.entries(LEVELS).map(([lvl, name]) => `<h3 class="mt-level-h">${esc(name)}</h3><div class="mt-cards">` + scenList.filter((s) => s.level === lvl).map((s) =>
  `<a class="mt-card" href="${firstLive}/#${s.id}" data-scen="${s.id}"><span class="mt-card-n">Scenario ${s.n}</span><b>${esc(s.title)}</b><span class="mt-card-line">${esc(s.line)}</span><span class="mt-tags">${s.concepts.map((c) => `<span>${esc(c.title)}</span>`).join("")}</span><span class="mt-best" data-best="${s.id}"></span></a>`).join("") + `</div>`).join("");
const hubTpl = join(HERE, "hub.html");
if (existsSync(hubTpl)) {
  const hub = fill(readFileSync(hubTpl, "utf8"), { "/*COMMON_CSS*/": COMMON, "<!--GAMES-->": games, "<!--SCENARIOS-->": scenHtml, "/*DATA*/": JSON.stringify({ modes: built }) });
  writeFileSync(join(ROOT, "index.html"), hub);
  console.log(`wrote index.html ${(hub.length / 1024).toFixed(0)} KB`);
}
