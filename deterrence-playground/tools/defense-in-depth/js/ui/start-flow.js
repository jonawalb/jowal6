// The two-screen start (UI streamline #2). Pure: no DOM. Screen 1 asks side, campaign or single battle, and era;
// screen 2 asks scale, difficulty and the balance slider. Defaults are pre-selected; Next and Back keep choices.

export const SCREEN = { side: 1, mode: 1, era: 1, scale: 2, diff: 2 };
export const DEFAULTS = Object.freeze({ mode: 's', side: 'def', scale: 'd', era: 'w', diff: 's' });

/** A fresh start-screen state. */
export const startState = (C = DEFAULTS) => ({ step: 1, C: { ...DEFAULTS, ...C } });

/** Reduce an action: { type: 'pick', key, v } | { type: 'next' } | { type: 'back' } | { type: 'reset' }. */
export function startReduce(st, a) {
  switch (a.type) {
    case 'pick': return SCREEN[a.key] ? { ...st, C: { ...st.C, [a.key]: a.v } } : st;
    case 'next': return { ...st, step: 2 };
    case 'back': return { ...st, step: 1 };
    case 'reset': return { ...st, step: 1 };
    default: return st;
  }
}

/** The Start button's words. */
export const startLabel = C => (C.mode === 'c' ? 'Begin campaign' : C.side === 'def' ? 'Plan your defense' : 'Plan your attack');

/** One line that recaps screen 1 on screen 2. */
export const recap = (C, eraLabel = e => (e === 'm' ? 'Modern' : '1917–18')) =>
  `${C.side === 'def' ? 'Defend' : 'Attack'} · ${C.mode === 'c' ? 'Campaign (4 battles)' : 'Single battle'} · ${eraLabel(C.era)}`;
