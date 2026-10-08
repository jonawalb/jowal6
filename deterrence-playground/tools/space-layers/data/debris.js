// Tracked and untracked debris.
// Public catalog: CelesTrak SATCAT Boxscore (mirrors the U.S. Space Force catalog published on Space-Track.org),
//   retrieved 2026-10-08. "Debris" there = fragments, spent rocket bodies and unidentified objects still in orbit.
//   https://celestrak.org/satcat/boxscore.php
// Estimates: ESA Space Debris Office, DISCOSweb "Space Environment Statistics", last update 31 July 2026;
//   model figures from MASTER-8, reference population February 2026.
//   https://sdup.esoc.esa.int/discosweb/statistics/
export const DEBRIS = {
  public: { asof: '2026-10-08', payloads: 20257, debris: 15019,
    src: { t: 'CelesTrak, SATCAT Boxscore (U.S. Space Force public catalog), retrieved 8 Oct 2026', u: 'https://celestrak.org/satcat/boxscore.php' } },
  esa: { asof: '31 July 2026', tracked: 47140, fragmentations: 660, tonnes: 17000,
    over10cm: 68450, activeIn10cm: 11300, cm1to10: 1.5e6, mm1to10: 230e6,
    src: { t: 'ESA Space Debris Office, Space Environment Statistics (MASTER-8, Feb 2026 population), updated 31 July 2026', u: 'https://sdup.esoc.esa.int/discosweb/statistics/' } },
};
