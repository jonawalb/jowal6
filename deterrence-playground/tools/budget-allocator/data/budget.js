// Real budget figures used by the Defense Budget Allocator.
// Sources (all opened and checked 2026-09-28; all re-opened 2026-10-02):
//   CNA, 2026-09-03, "政院通過追加預算含國防1457億": https://www.cna.com.tw/news/aipl/202609030184.aspx
//     (DGBAS breakdown of the NT$145.7bn defense line: 7 programs led by the mid-tier anti-tactical ballistic
//      missile system 13.0; 3 uncrewed programs 55.9; 2 classified programs 64.5; urgent ammunition 7.3;
//      Taiwan Tactical Network cross-domain data integration 0.9; recruitment growth 2.5; combat-unit allowance 1.6)
//   Focus Taiwan, 2026-09-03: https://focustaiwan.tw/politics/202609030018 (NT$607.6bn total, NT$145.7bn defense,
//      NT$55.9bn for >40,000 coastal attack drones, 600 coastal reconnaissance drones, 100 small one-way USVs)
//   CNA, 2026-05-08: https://www.cna.com.tw/news/aipl/202605080239.aspx (special act ceiling NT$780bn: 300bn + 480bn
//      for U.S. FMS cases; named items M109A7, HIMARS, anti-armor drone missile system, Javelin, TOW-2B)
//   CNA, 2026-05-11: https://www.cna.com.tw/news/aipl/202605110212.aspx (presidential order promulgating the NT$780bn act)
//   Context notes shown under "The real budgets" (all opened 2026-09-28):
//   CNA, 2026-05-29: https://www.cna.com.tw/news/aipl/202605290081.aspx (FY2026 special budget under the act, NT$8.81bn)
//   UDN, 2026-09-04: https://udn.com/news/story/124984/9733451 (NT$55.9bn uncrewed line: NT$13.8bn for 2026, NT$42.1bn for 2027)
//   Liberty Times Defense, 2026-09-03: https://def.ltn.com.tw/article/breakingnews/5561756 (Strong Bow NT$36.04bn in the FY2027 budget through 2032)
//   CNA, 2026-08-20: https://www.cna.com.tw/news/aipl/202608200111.aspx (FY2027 general budget; total defense NT$1.1225 trillion)
//   DGBAS, 2025-08-21: https://www.dgbas.gov.tw/News_Content.aspx?n=3602&s=235226 (FY2026 MND NT$561.4bn; defense total NT$949.5bn, 3.32% of GDP)
//   CNA via UDN, 2026-09-11: https://udn.com/news/story/10930/9748144 (drone industry act promulgated; NT$240bn over 6 years, NT$40bn a year)
//   Newtalk, 2026-07-31: https://newtalk.tw/news/view/2026-07-31/1050575 (Legislative Yuan session scheduled to open Sept. 29, 2026)
//   UDN, 2026-10-02 (opened 2026-10-02): https://udn.com/news/story/6656/9789469 (supplementary budget referred to committee
//      Oct. 2 at the earliest; Premier asks for third reading by end of November)
//   Newtalk, 2026-09-30 (opened 2026-10-02): https://newtalk.tw/news/view/2026-09-30/1062668 (MND: procurement speeds up
//      once the Legislative Yuan passes the budget; still lobbying caucuses for a prompt review)
//   CNA, 2026-10-02 (opened 2026-10-02): https://www.cna.com.tw/news/aipl/202610020225.aspx (FY2027 general budget and the FY2026
//      supplementary passed first reading and were referred to committee on Oct. 2)
//   CNA, 2026-10-01 (opened 2026-10-02): https://www.cna.com.tw/news/aipl/202610015002.aspx (FY2027: MND agencies NT$690.1bn, of which
//      personnel 204.2, logistics/ammunition/transport 183.0, general weapons ~134.2; classified ~112.1; defense function 683.6, +134.7)
//   Taiwan FactCheck Center, 2025-12-03: https://tfc-taiwan.org.tw/fact-check-reports/taiwan-1point25-trillion-defense-budget-us-arms-sales/
//      (NT$1.25 trillion, 2026-2033, eight-year special plan announced 2025-11-26)
//   TSM analysis: J. Walberg, "Taiwan's NT$607.6 Billion Supplementary Budget and the Fight Over Who Controls the Purse",
//      Taiwan Security Monitor, 2026-09-07 (local file Taiwan_2026_Supplementary_Budget_Analysis_v1.docx).

export const BUDGETS = [
  { k: 's145', bn: 145.7, t: 'FY2026 supplementary, defense line', s: 'NT$145.7bn · cabinet proposal, Sept. 3, 2026',
    note: 'The defense heading of the NT$607.6bn supplementary budget the cabinet approved on September 3, 2026. The Legislative Yuan referred it to committee on October 2, 2026 and had not passed it; the premier asked for a third reading by the end of November.' },
  { k: 's780', bn: 780, t: 'Special act ceiling', s: 'NT$780bn · passed May 8, promulgated May 11, 2026',
    note: 'The ceiling in the special procurement act the legislature passed on May 8, 2026 and the president promulgated on May 11. In law it is reserved for U.S. Foreign Military Sales cases (NT$300bn plus NT$480bn); here you may spend it however you like.' },
  { k: 's1250', bn: 1250, t: 'Proposed eight-year plan', s: 'NT$1.25 trillion · 2026-2033, proposed Nov. 2025',
    note: 'The eight-year special defense plan President Lai announced on November 26, 2025. The legislature replaced it with the NT$780bn act.' },
];

// The cabinet's actual NT$145.7bn defense line, in its own terms (NT$ billion).
export const CABINET_145 = [
  { t: 'Mid-tier missile defense (Strong Bow) and 6 other programs', bn: 13.0, cat: 'airdef' },
  { t: 'Uncrewed systems: coastal attack and reconnaissance drones, one-way USVs', bn: 55.9, cat: 'drones' },
  { t: 'Two classified programs', bn: 64.5, cat: 'other' },
  { t: 'Urgent ammunition replenishment', bn: 7.3, cat: 'ammo' },
  { t: 'Taiwan Tactical Network data integration', bn: 0.9, cat: 'c4isr' },
  { t: 'Recruitment growth and combat-unit allowance', bn: 4.1, cat: 'other' },
];

// Items named in the NT$780bn act (no per-item amounts were published in the source).
export const ACT_780_ITEMS = ['M109A7 self-propelled howitzers', 'HIMARS', 'anti-armor drone missile systems', 'Javelin', 'TOW-2B'];
