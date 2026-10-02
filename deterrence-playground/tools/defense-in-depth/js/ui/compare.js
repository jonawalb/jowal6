// Runs the review's replays in a module Worker (js/ui/compare-worker.js) and reports progress; one run at a
// time, cancelled when a new game starts.

let worker = null;

/** msg: { ch, plan, log, token, n? }. onProgress(0..1). Resolves to the results array (or null if cancelled). */
export function runReplays(msg, onProgress) {
  cancelReplays();
  return new Promise(resolve => {
    try { worker = new Worker(new URL('./compare-worker.js', import.meta.url), { type: 'module' }); }
    catch { resolve(null); return; }
    const w = worker;
    w.onmessage = e => {
      if (e.data.progress != null) onProgress && onProgress(e.data.progress);
      if (e.data.done) { resolve(e.data.results); if (worker === w) { w.terminate(); worker = null; } }
    };
    w.onerror = err => { console.warn('Replay worker failed', err.message); resolve(null); };
    w.postMessage(JSON.parse(JSON.stringify(msg)));
  });
}

export function cancelReplays() { if (worker) { worker.terminate(); worker = null; } }
