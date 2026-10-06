// Country notes for the per-country page. Each note paraphrases (or quotes, in quotation marks) the footnotes of
// FAS, "Status of World Nuclear Forces" (Kristensen, Korda, Johns, Knight-Boyle et al.), 2026 edition,
// https://fas.org/initiative/status-world-nuclear-forces/ , opened 2026-09-29.
// FAS military stockpile and total inventory for 2026 are copied from the same page's table.
export const FAS_URL = 'https://fas.org/initiative/status-world-nuclear-forces/';

export const NOTES = {
  USA: { stockpile: 3700, inventory: 5042,
    text: 'FAS counts bomber weapons at bomber bases as deployed, so its deployed number is higher than the old New START aggregate. Some 100 to 120 B61 bombs are deployed in Europe. The U.S. government last declassified its stockpile at 3,748 warheads as of September 2023; FAS estimates about 3,700 now, plus roughly 1,342 retired warheads awaiting dismantlement.' },
  RUS: { stockpile: 4400, inventory: 5420,
    text: 'FAS estimates 4,400 warheads in the military stockpile and about 1,020 retired warheads awaiting dismantlement. The reserve figure includes all of an estimated 1,794 non-strategic warheads, which FAS says are declared to be in central storage.' },
  GBR: { stockpile: 225, inventory: 225,
    text: 'The United Kingdom stopped publishing operational stockpile and deployed figures in 2021, and the same year raised its stockpile ceiling to "no more than 260 warheads".' },
  FRA: { stockpile: 290, inventory: 370,
    text: 'FAS assumes up to 80 retired TN75 warheads remain in the dismantlement queue. France announced in early 2026 that it will no longer disclose figures for its arsenal.' },
  CHN: { stockpile: 620, inventory: 620,
    text: 'FAS describes the Chinese stockpile as increasing. A small number of warheads are thought to be deployed and most are held in central storage. FAS notes a 2022 U.S. Department of Defense projection of about 1,000 operational warheads by 2030 and says that projection depends on many uncertain factors.' },
  ISR: { stockpile: 90, inventory: 90,
    text: 'Israel has produced enough plutonium for 100 to 200 warheads, but delivery platforms and U.S. intelligence estimates suggest a stockpile of about 90.' },
  IND: { stockpile: 190, inventory: 190,
    text: 'FAS estimates nearly all Indian warheads are in central storage, not mated with missiles, apart from a small number that might be carried on one ballistic-missile submarine on patrol. More warheads are in production. The FAS table lists 178 reserve warheads but a military stockpile of 190; this tool shows both as published.' },
  PAK: { stockpile: 170, inventory: 170,
    text: 'None of Pakistan\'s warheads are thought to be mated with missiles; most are in central storage. More warheads are in production. FAS stresses the estimate is highly uncertain.' },
  PRK: { stockpile: 60, inventory: 60,
    text: 'After six nuclear tests, FAS estimates North Korea may have fissile material for at least 90 warheads and perhaps about 60 assembled warheads, a number "almost certainly increasing". The series records no assembled warheads before 2015.' },
  ZAF: { stockpile: 0, inventory: 0,
    text: 'The FAS/OWID series records South Africa with a handful of warheads from 1982, peaking at six in 1989, and zero afterwards. South Africa is not in the 2026 FAS table.' },
};

// FAS table totals, 2026 (approximate, as printed).
export const FAS_TOTALS = { deployedStrategic: 3912, deployedNonstrategic: 100, reserve: 5733, stockpile: 9745, inventory: 12187 };
