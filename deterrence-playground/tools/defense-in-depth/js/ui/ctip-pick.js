// One contextual tip at a time (UI streamline #13). Pure: no DOM, no engine imports. The caller reads the game
// (never changes it) into a small context; this picks the tip topic that fits what the player is doing, and
// otherwise steps through the side's start tips one at a time. Topic keys are js/tips-text.js startTips keys.

/** Planning step → tip topic. */
export const STEP_TIP = {
  def: { zones: 'depth', lanes: 'enfilade', works: 'deadGround', cs: 'counterattack', arty: 'suppression' },
  att: { front: 'enfilade', bns: 'leapfrog', infil: 'infiltration', fire: 'barrage', res: 'counterstroke' },
};

/**
 * The contextual topic for ctx, or null if nothing in particular applies.
 * ctx: { phase: 'plan'|'battle'|'over', side, step (plan step id), selType, selPosture, nSel, lodgOpen,
 *        beyondGuns, barrageMiss }
 */
export function contextTopic(ctx) {
  const side = ctx.side === 'att' ? 'att' : 'def';
  if (ctx.phase === 'plan') return STEP_TIP[side][ctx.step] || null;
  if (ctx.phase !== 'battle') return null;
  if (side === 'def') {
    if (ctx.selType === 'mg') return 'enfilade';
    if (ctx.lodgOpen) return 'counterattack';
    return null;
  }
  if (ctx.selType === 'storm' || ctx.selPosture === 'infil') return 'infiltration';
  if (ctx.nSel === 2) return 'leapfrog';
  if (ctx.barrageMiss) return 'barrage';
  if (ctx.beyondGuns) return 'cohesion';
  return null;
}

/**
 * Which tip to show: { key, contextual } or null (all dismissed). `keys` are the side's start-tip keys in order;
 * `dismissed` a Set of keys; `rot` the rotation index for the start tips (the "Next tip" button moves it).
 */
export function pickTip(ctx, keys, dismissed = new Set(), rot = 0) {
  const k = contextTopic(ctx);
  if (k && keys.includes(k) && !dismissed.has(k)) return { key: k, contextual: true };
  const left = keys.filter(x => !dismissed.has(x));
  if (!left.length) return null;
  return { key: left[((rot % left.length) + left.length) % left.length], contextual: false };
}
