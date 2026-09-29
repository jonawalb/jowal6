// Before/after comparison presets. Windows are inclusive ISO dates; `date` is where the cursor lands.
// The 2026 Hormuz windows split on 1 March 2026, the first day PortWatch counts fell below 25 ships
// (57 on 28 February, 20 on 1 March, 4 on 2 March).
import { LAST } from './series.js';

export const PRESETS = [
  { id: 'redsea', label: 'Red Sea campaign', sub: '2023 (Jan–Oct) vs 2024',
    before: ['2023-01-01', '2023-10-31'], after: ['2024-01-01', '2024-12-31'], date: '2024-01-12',
    note: 'Before: January to October 2023, ahead of the Galaxy Leader seizure. After: calendar 2024, the first full year of Houthi attacks.' },
  { id: 'war25', label: 'June 2025 war', sub: '12-day war vs the six weeks before',
    before: ['2025-05-01', '2025-06-12'], after: ['2025-06-13', '2025-06-24'], date: '2025-06-22',
    note: 'Before: 1 May to 12 June 2025. After: 13 to 24 June 2025, from Israel\'s first strikes on Iran to the ceasefire.' },
  { id: 'hormuz26', label: 'Hormuz 2026', sub: 'March–August 2026 vs the prior year',
    before: ['2025-03-01', '2026-02-28'], after: ['2026-03-01', '2026-08-26'], date: '2026-03-15',
    note: 'Before: the twelve months to 28 February 2026. After: 1 March to 26 August 2026, from the collapse in Hormuz counts to the eve of CENTCOM\'s statement that the shipping lanes were clear of mines.' },
  { id: 'clearance', label: 'After the clearance', sub: 'since 27 August 2026 vs the prior year',
    before: ['2025-03-01', '2026-02-28'], after: ['2026-08-27', LAST], date: LAST,
    note: 'Before: the twelve months to 28 February 2026. After: 27 August 2026, when CENTCOM said the shipping lanes were clear of mines, to the latest PortWatch day.' },
];
