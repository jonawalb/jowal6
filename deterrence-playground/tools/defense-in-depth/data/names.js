// Defense in Depth: invented names (D-05, D-07). Every place, state, formation and person is fictional.
// Generic English-sounding toponyms may coincide with tiny real hamlets; none is a real country, capital
// or demonym (scripts/names.test.mjs). Data only: imports nothing.

export const STATES = {
  def: { name: 'the Sorrel Republic', adj: 'Sorrelian', short: 'Sorrel' },
  att: { name: 'the Orvane Crown', adj: 'Orvanese', short: 'Orvane' },
};
export const FRONT = 'the Merrow front';

export const VILLAGES = [
  'Wendrel', 'Corran', 'Pellow', 'Drummet', 'Felwick', 'Larrow', 'Tobbin', 'Quellin', 'Saddock', 'Vantry',
  'Ulleth', 'Hessel', 'Garrow Mill', 'Brisk Farm', 'Ostby', 'Marrick', 'Tilsey', 'Fennick', 'Caddow', 'Rumley',
  'Escott', 'Wyndle', 'Pashby', 'Holloway Farm', 'Kettering Cross', 'Daunt', 'Selby Mill', 'Arkle', 'Bratton', 'Cobble End',
  'Dunmere', 'Ellery', 'Fallow', 'Gilsey', 'Hobb', 'Inchley', 'Jessop Farm', 'Kibble',
];
export const WOODS = ['Tamsin Copse', 'Callow Wood', 'Rennet Wood', 'Brack Wood', 'Hazel Spinney', 'Mott Copse', 'Linnet Wood', 'Sallow Wood', 'Teal Copse', 'Withy Wood', 'Ash Hanger', 'Pye Copse'];
export const RIDGES = ['Brannoch Ridge', 'Hask Rise', 'Corrie Rise', 'Dunlin Ridge'];
export const STREAMS = ['the Merrow Beck', 'the Sile', 'the Tarn Water'];

// Formation names. Bird names for counterstroke formations (D-08).
export const BIRDS = ['Kestrel', 'Merlin', 'Harrier', 'Osprey', 'Goshawk', 'Hobby', 'Peregrine', 'Buzzard'];
export const DEF_REGIMENTS = ['Fen Rifles', 'Moor Rifles', 'Vale Fusiliers', 'Marsh Rifles', 'Holt Rifles', 'Weald Fusiliers', 'Brook Rifles', 'Heath Fusiliers'];
export const ATT_REGIMENTS = ['Grenadier Regiment', 'Fusilier Regiment', 'Rifle Regiment'];
export const COMPANY_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S'];

export const ordinal = n => {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
export const roman = n => ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n] || String(n);
