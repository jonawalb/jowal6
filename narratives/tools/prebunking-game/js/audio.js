// Optional synthesized drone for the soundtrack round (Web Audio, no files).
// Two detuned low oscillators through a low-pass filter, with a slow amplitude pulse.
// All settings are this tool's choices (notional). Off unless the player turns it on.

let ctx = null, nodes = null;

export function audioAvailable() {
  return typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext);
}

export function startDrone() {
  if (!audioAvailable() || nodes) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, ctx.currentTime);
    out.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 2.5);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 320;
    const a = ctx.createOscillator(), b = ctx.createOscillator(), c = ctx.createOscillator();
    a.type = 'sawtooth'; a.frequency.value = 55;
    b.type = 'sawtooth'; b.frequency.value = 58.3;
    c.type = 'sine'; c.frequency.value = 77.8; // a tritone above 55 Hz
    const pulse = ctx.createGain(); pulse.gain.value = 0.6;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 1.15;
    const lfoAmt = ctx.createGain(); lfoAmt.gain.value = 0.35;
    lfo.connect(lfoAmt).connect(pulse.gain);
    [a, b, c].forEach(o => o.connect(lp));
    lp.connect(pulse).connect(out).connect(ctx.destination);
    [a, b, c, lfo].forEach(o => o.start());
    nodes = { out, oscs: [a, b, c, lfo] };
  } catch (e) {
    console.warn('Audio unavailable', e);
    nodes = null;
  }
}

export function stopDrone() {
  if (!nodes || !ctx) return;
  const { out, oscs } = nodes;
  nodes = null;
  const t = ctx.currentTime;
  out.gain.cancelScheduledValues(t);
  out.gain.setValueAtTime(out.gain.value, t);
  out.gain.linearRampToValueAtTime(0, t + 0.6);
  oscs.forEach(o => { try { o.stop(t + 0.7); } catch (e) { /* already stopped */ } });
}

export const droneOn = () => !!nodes;
