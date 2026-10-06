// Written by scripts/balance.mjs on 2026-10-01: 1000 seeded hunts (seeds 1–1000) per scripted player.
// Re-run after changing data/params.js or js/bots.js: node scripts/balance.mjs 1000 --write
export const BALANCE = {
 "n": 1000,
 "date": "2026-10-01",
 "rows": [
  {
   "name": "random",
   "n": 1000,
   "found": 0,
   "escaped": 384,
   "timeout": 616,
   "lo": 0,
   "hi": 0,
   "shots": 0.283,
   "medianHour": null,
   "byBeh": {
    "sprinter": {
     "n": 265,
     "found": 0
    },
    "zigzag": {
     "n": 299,
     "found": 0
    },
    "shy": {
     "n": 271,
     "found": 0
    },
    "loiter": {
     "n": 165,
     "found": 0
    }
   }
  },
  {
   "name": "lazy",
   "n": 1000,
   "found": 118,
   "escaped": 376,
   "timeout": 506,
   "lo": 0.098,
   "hi": 0.138,
   "shots": 0.646,
   "medianHour": 22,
   "byBeh": {
    "sprinter": {
     "n": 265,
     "found": 82
    },
    "zigzag": {
     "n": 299,
     "found": 17
    },
    "shy": {
     "n": 271,
     "found": 15
    },
    "loiter": {
     "n": 165,
     "found": 4
    }
   }
  },
  {
   "name": "barrier",
   "n": 1000,
   "found": 507,
   "escaped": 139,
   "timeout": 354,
   "lo": 0.476,
   "hi": 0.538,
   "shots": 1.045,
   "medianHour": 8,
   "byBeh": {
    "sprinter": {
     "n": 265,
     "found": 191
    },
    "zigzag": {
     "n": 299,
     "found": 156
    },
    "shy": {
     "n": 271,
     "found": 118
    },
    "loiter": {
     "n": 165,
     "found": 42
    }
   }
  },
  {
   "name": "follow",
   "n": 1000,
   "found": 653,
   "escaped": 96,
   "timeout": 251,
   "lo": 0.623,
   "hi": 0.683,
   "shots": 1.168,
   "medianHour": 8,
   "byBeh": {
    "sprinter": {
     "n": 265,
     "found": 201
    },
    "zigzag": {
     "n": 299,
     "found": 205
    },
    "shy": {
     "n": 271,
     "found": 145
    },
    "loiter": {
     "n": 165,
     "found": 102
    }
   }
  },
  {
   "name": "good",
   "n": 1000,
   "found": 691,
   "escaped": 72,
   "timeout": 237,
   "lo": 0.662,
   "hi": 0.72,
   "shots": 1.399,
   "medianHour": 6,
   "byBeh": {
    "sprinter": {
     "n": 265,
     "found": 196
    },
    "zigzag": {
     "n": 299,
     "found": 221
    },
    "shy": {
     "n": 271,
     "found": 175
    },
    "loiter": {
     "n": 165,
     "found": 99
    }
   }
  }
 ]
};
