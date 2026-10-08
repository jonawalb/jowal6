// Active payloads on orbit by owner and layer, tracked debris (fragments, rocket bodies and unknown objects,
// as in the Space-Track/CelesTrak box score) and all tracked objects by layer.
// Source: CelesTrak SATCAT (https://celestrak.org/pub/satcat.csv), built by scripts/satcat_counts.py.
// Active = status +, P, B, S or X. Layer by mean altitude; apogee-perigee > 10,000 km = HEO.
// Starlink, OneWeb and Kuiper are counted as 'com'; other payloads go by the SATCAT owner code.
export const COUNTS = {
 "asof": "2026-10-08",
 "source": "https://celestrak.org/pub/satcat.csv",
 "byCountry": {
  "us": {
   "leo": 921,
   "meo": 46,
   "geo": 172,
   "cislunar": 9,
   "heo": 24,
   "vleo": 254
  },
  "fr": {
   "leo": 65,
   "geo": 3,
   "vleo": 4
  },
  "other": {
   "heo": 3,
   "leo": 699,
   "meo": 39,
   "geo": 227,
   "vleo": 89,
   "cislunar": 2
  },
  "uk": {
   "leo": 34,
   "geo": 9,
   "vleo": 3,
   "heo": 1
  },
  "jp": {
   "leo": 103,
   "geo": 26,
   "vleo": 7,
   "heo": 1
  },
  "ru": {
   "meo": 34,
   "leo": 240,
   "geo": 33,
   "heo": 14,
   "vleo": 58,
   "cislunar": 1
  },
  "eu": {
   "cislunar": 2,
   "heo": 4,
   "leo": 30,
   "geo": 7,
   "meo": 33,
   "vleo": 3
  },
  "il": {
   "leo": 12,
   "geo": 4
  },
  "au": {
   "leo": 23,
   "geo": 7,
   "vleo": 2
  },
  "cn": {
   "leo": 1315,
   "geo": 109,
   "meo": 38,
   "vleo": 72,
   "cislunar": 9,
   "heo": 5
  },
  "in": {
   "leo": 39,
   "geo": 32,
   "cislunar": 2,
   "heo": 1,
   "vleo": 6
  },
  "ir": {
   "leo": 8,
   "vleo": 2,
   "geo": 1
  },
  "kr": {
   "leo": 45,
   "geo": 8,
   "vleo": 7,
   "cislunar": 1
  },
  "tw": {
   "leo": 27
  },
  "com": {
   "leo": 11079,
   "vleo": 1095
  },
  "kp": {
   "leo": 1
  }
 },
 "megaconstellations": {
  "OneWeb": 651,
  "Starlink": 11132,
  "Kuiper": 391
 },
 "debrisByLayer": {
  "leo": 11092,
  "meo": 561,
  "vleo": 123,
  "cislunar": 34,
  "heo": 2410,
  "geo": 450
 },
 "trackedByLayer": {
  "meo": 1002,
  "leo": 27354,
  "vleo": 1772,
  "cislunar": 88,
  "geo": 1842,
  "heo": 2640
 }
};
