// Small inline SVG glyphs for the picker cards. Colors come from CSS tokens via currentColor and classes.
const G = {
  range: '<rect x="4" y="17" width="40" height="8" rx="2" class="i-t"/><rect x="16" y="17" width="16" height="8" class="i-a"/><path d="M16 12v18M32 12v18" class="i-s"/>',
  shift: '<path d="M4 34h14l6-18h20" class="i-s"/><path d="M4 26h40" class="i-d"/>',
  ladder: '<rect x="6" y="30" width="10" height="6" class="i-b"/><rect x="26" y="22" width="16" height="6" class="i-a"/><rect x="6" y="14" width="22" height="6" class="i-b"/><rect x="26" y="6" width="16" height="6" class="i-x"/>',
  curves: '<path d="M4 38C14 20 24 14 40 12" class="i-s"/><path d="M4 38C16 30 28 26 40 24" class="i-s2"/><path d="M40 6v34" class="i-d"/>',
  matrix: '<rect x="6" y="6" width="17" height="17" class="i-a"/><rect x="25" y="6" width="17" height="17" class="i-t"/><rect x="6" y="25" width="17" height="17" class="i-t"/><rect x="25" y="25" width="17" height="17" class="i-x"/>',
  band: '<path d="M4 38C16 28 30 18 44 10L44 4C30 12 16 22 4 30Z" class="i-a"/><circle cx="20" cy="27" r="3.5" class="i-m"/>',
  steps: '<path d="M4 36h8v-8h8v8h8v-16h8v-8h8" class="i-s"/>',
  pie: '<rect x="4" y="17" width="26" height="12" class="i-a"/><rect x="30" y="17" width="14" height="12" class="i-b"/>',
  link: '<path d="M18 30l12-12M22 14h12v12" class="i-s"/><rect x="6" y="8" width="34" height="32" rx="3" class="i-o"/>',
};
export const cardIcon = k => `<svg class="mc-i" viewBox="0 0 48 44" aria-hidden="true">${G[k] || ''}</svg>`;
