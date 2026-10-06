// Unit-cost estimates in millions of U.S. dollars, low and high, copied from the sourced figures in
// tools/iran-israel-salvos/data/costs.js and re-checked against the sources on 29 Sep 2026.
// The game's weapons are notional. Each is PRICED like a class of real weapon; nothing else about the
// real weapon (range, speed, kill probability) is used.
export const COST = {
  // Short-range interceptor, priced like Iron Dome's Tamir.
  sri: { lo: 0.04, hi: 0.1, src: ['mtID'], note: 'priced like Iron Dome\'s Tamir: $40,000–50,000 in recent estimates, $100,000 initially (CSIS Missile Threat)' },
  // Long-range interceptor, priced like Israel's Arrow family.
  lri: { lo: 1.5, hi: 3.5, src: ['fpri', 'ynetA', 'jpostB'], note: 'priced like the Arrow family: Arrow-2 just over $1.5m in 2025 dollars (FPRI) to $3.5m per Arrow (Aminoach, Ynet)' },
  // Guns and electronic warfare: no sourced per-engagement cost in the data this tool uses.
  gun: { lo: null, hi: null, src: [], note: 'no sourced per-engagement cost; not priced, so it counts as $0 in the exchange' },
};
export const THREAT_COST = {
  drone: { lo: 0.02, hi: 0.05, src: ['cnbc'], note: 'Shahed type, $20,000–50,000 (public estimates cited by CNBC)' },
  ballistic: { lo: 0.25, hi: 5, src: ['jinsa'], note: 'Emad about $250,000 to Ghadr about $5m (JINSA)' },
  cruise: { lo: null, hi: null, src: [], note: 'no sourced unit cost found; cruise missiles destroyed are counted but not priced' },
};
