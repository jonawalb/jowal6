// Wording for the model-generated branch that starts when a player leaves the historical record.
// None of this is history. The four moves are generic (de-escalate / hold / escalate one step / major escalation);
// the labels only name actors and instruments that existed at the time, so the choice reads in period.
// Where a label repeats an alternative that a source records as considered, `src` cites it (sources.js) and the
// page shows the source; that makes the option sourced, never the model's result.
export const MOVES = ['d', 'h', 'e', 'm'];
export const MOVE_NAMES = { d: 'De-escalate or negotiate', h: 'Hold and signal', e: 'Escalate one step', m: 'Major escalation' };
export const RESP_NAMES = { bd: 'backs down', hold: 'holds its position', match: 'matches the move', esc: 'escalates' };

export const BRANCH = {
  cuba: { opp: 'Moscow', opts: {
    d: { label: 'Offer a settlement through the UN and pause the quarantine' },
    h: { label: 'Tighten the quarantine and keep low-level reconnaissance flights' },
    e: { label: 'Strike the air-defense sites that fire on U.S. aircraft' },
    m: { label: 'Air strike on the missiles, then invasion', src: ['oh1962'] } } },
  sino1969: { opp: 'Moscow', opts: {
    d: { label: 'Offer quiet good offices to both sides' },
    h: { label: 'Repeat that Washington will not collude, and watch', src: ['nsa49'] },
    e: { label: 'Warn Moscow privately against a strike on China' },
    m: { label: 'Move Pacific forces as a visible signal' } } },
  lance: { opp: 'Moscow and Hanoi', opts: {
    d: { label: 'Stand the alert down and return to the Paris talks' },
    h: { label: 'Keep the readiness measures in place' },
    e: { label: 'Add naval moves and more bomber alerts' },
    m: { label: 'Launch Duck Hook', src: ['nsa195'] } } },
  defcon73: { opp: 'Moscow', opts: {
    d: { label: 'Accept a joint U.S.-Soviet force', src: ['nsa98'] },
    h: { label: 'Hold at DEFCON III and press Israel on the ceasefire' },
    e: { label: 'Move to DEFCON II' },
    m: { label: 'Let Israel hit the Egyptian Third Army', src: ['frus269'] } } },
  able83: { opp: 'Moscow', opts: {
    d: { label: 'End the exercise early and reassure Moscow directly' },
    h: { label: 'Finish the exercise on schedule with no new alerts' },
    e: { label: 'Raise Western alert in response', src: ['nsa533'] },
    m: { label: 'Move real forces forward in Europe' } } },
  kargil: { opp: 'Pakistan', opts: {
    d: { label: 'Pause the offensive and accept outside mediation' },
    h: { label: 'Keep evicting the intruders on your side of the LOC', src: ['rand1450'] },
    e: { label: 'Strike positions across the LOC' },
    m: { label: 'Escalate horizontally across the LOC or border', src: ['rand1450'] } } },
  korea2017: { opp: 'Pyongyang', opts: {
    d: { label: 'Negotiate a freeze', src: ['crs44994'] },
    h: { label: 'Maximum pressure: more sanctions and bomber flights', src: ['crs44994', 'acadprk'] },
    e: { label: 'Enhanced containment, including tactical nuclear weapons in the South', src: ['crs44994'] },
    m: { label: 'Limited strike on ICBM sites', src: ['crs44994'] } } },
  balakot: { opp: 'Pakistan', opts: {
    d: { label: 'Isolate Pakistan diplomatically and economically', src: ['mukherjee'] },
    h: { label: 'Hold forces at readiness along the LOC' },
    e: { label: 'Another air strike on camps inside Pakistan' },
    m: { label: 'Cold Start: seize a strip of Pakistani territory', src: ['mukherjee'] } } },
  russia2022: { opp: 'Moscow', opts: {
    d: { label: 'Press Kyiv and Moscow toward a ceasefire' },
    h: { label: 'Keep arming Ukraine at the current level' },
    e: { label: 'Lift the remaining limits on long-range strikes' },
    m: { label: 'Impose a no-fly zone', src: ['lrt0317', 'nato0304'] } } },
};
