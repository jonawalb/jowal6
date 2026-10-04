// Rhetoric Search: where the search data lives.
//
// HF_REPO names the public Hugging Face dataset repo that holds the sealed (encrypted) search data, e.g.
// 'jwalberg/rhetoric-search-data'. scripts/build_hf_data.py uploads to it and scripts/build_site.py stops copying
// data/{s,t,m,docs,meta.json.gz} into the site once it is set. Leave it empty to serve data/ from the site itself.
//
// The page reads <base>data/current.json (sealed: {"build": "<id>"}) and then every file from <base>data/<id>/,
// so a visitor never mixes files of two builds.
//   ?local             use the site's own data/ folder (local development, or a site built before the move)
//   ?data=<base url>   use another host with the same layout; only accepted from a page served on localhost
export const HF_REPO = 'wallabee1/rhetoric-search-data';
export const HF_REVISION = 'main';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Remote base URL (ending in '/') holding data/current.json and data/<build>/, or null for the site's data/. */
export function remoteBase(loc = location) {
  const p = new URLSearchParams(loc.search);
  if (p.has('local')) return null;
  const override = p.get('data');
  if (override && LOCAL_HOSTS.has(loc.hostname)) return override.endsWith('/') ? override : override + '/';
  if (!HF_REPO) return null;
  return `https://huggingface.co/datasets/${HF_REPO}/resolve/${HF_REVISION}/`;
}

/** The folder every data file is read from: the site's data/, or <base>data/<current build>/. */
export async function dataRoot(localRoot) {
  const base = remoteBase();
  if (!base) return { url: localRoot, build: null };
  const r = await fetch(new URL('data/current.json', base), { cache: 'no-cache' });
  if (!r.ok) throw new Error(`data/current.json: HTTP ${r.status}`);
  const cur = JSON.parse(await r.text());
  if (!/^[\w.-]+$/.test(cur.build || '')) throw new Error('data/current.json: no build id');
  return { url: new URL(`data/${cur.build}/`, base), build: cur.build };
}

/** Folder of the Trends data: <base>data/<current build>/trends/ when HF_REPO is set and that build carries Trends
 *  (rhetoric-corpus publish/build_hf_data.py --trends, refreshed nightly without a site redeploy), else localTrends
 *  (the site's own data/trends/, built into the site by build_site.py). */
export async function trendsRoot(localTrends) {
  try {
    const root = await dataRoot(null);
    if (root.build) {
      const url = new URL('trends/', root.url);
      const r = await fetch(new URL('index.json.gz', url), { cache: 'no-cache' });
      if (r.ok) return url;
    }
  } catch (e) { /* remote host unreachable or an older build without trends: use the site's copy */ }
  return localTrends;
}
