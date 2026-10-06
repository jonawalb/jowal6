// Country profiles offered by the selector. Taiwan comes first and is the default; Interactive Deterrence shows only Taiwan.
import { TAIWAN } from './taiwan.js';
import { JAPAN } from './japan.js';
import { KOREA } from './korea.js';
import { PHILIPPINES } from './philippines.js';
import { AUSTRALIA } from './australia.js';
import { SINGAPORE } from './singapore.js';
import { POLAND } from './poland.js';
import { GERMANY } from './germany.js';
import { LITHUANIA } from './lithuania.js';
import { FINLAND } from './finland.js';
import { SWEDEN } from './sweden.js';
import { NORWAY } from './norway.js';
import { ROMANIA } from './romania.js';

export const COUNTRIES = [TAIWAN, JAPAN, KOREA, PHILIPPINES, AUSTRALIA, SINGAPORE,
  POLAND, GERMANY, LITHUANIA, FINLAND, SWEDEN, NORWAY, ROMANIA];

// Headings for the country selector, in display order.
export const REGIONS = [
  { t: 'Indo-Pacific', ks: ['tw', 'jp', 'kr', 'ph', 'au', 'sg'] },
  { t: 'Europe', ks: ['pl', 'de', 'lt', 'fi', 'se', 'no', 'ro'] },
];
