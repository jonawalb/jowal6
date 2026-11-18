// U.S., allied and Chinese export controls, investment rules and counter-measures aimed at the AI chip supply chain,
// Aug 2022 to Nov 2026, plus Japan's 2019 Korea licensing measure, the 2020 Huawei foreign direct product rule and the SMIC Entity List listing as background.
// Each entry was checked on 2026-11-16 against the linked primary source (Federal Register, bis.gov, whitehouse.gov,
// government.nl / officielebekendmakingen.nl, METI texts hosted by CISTEC, eur-lex, legislation.gov.uk,
// motir.go.kr, trade.gov.tw, mofcom.gov.cn, samr.gov.cn, cac.gov.cn, govinfo.gov, SEC filings). Entries marked verified:false
// rest on company statements or press reports and are flagged 'unverified' in the UI. Text is a plain summary, not a quotation.
// `nodes` are stage ids in data/chain.js.
export const CONTROLS = [
 {
  "date": "2019-07-01",
  "eff": "2019-07-04",
  "who": "Japan",
  "bloc": "al",
  "ref": "METI, Update of METI's licensing policies and procedures on exports of controlled items to the Republic of Korea (1 Jul 2019)",
  "nodes": [
   "resist"
  ],
  "kind": "licence",
  "status": "lifted 23 Mar 2023 (bulk licences restored)",
  "text": "Aimed at South Korea, not China; included as background, as a precedent for a supplier government using licensing on chip materials. From 4 July 2019 Japanese exporters needed an individual export licence for fluorinated polyimide, resist and hydrogen fluoride (and related technology) going to South Korea, as the bulk licences for those items no longer applied. METI also opened public comment on removing South Korea from its \"white countries\" list. On 16 Mar 2023, after a Japan–Korea export control dialogue, METI decided to revise the controls; from 23 Mar 2023 the three items again fell under the special general bulk export licence, \"as was the case prior to July 2019\".",
  "url": "https://web.archive.org/web/2019/https://www.meti.go.jp/english/press/2019/0701_001.html",
  "verified": true
 },
 {
  "date": "2020-05-15",
  "eff": "2020-05-15; expanded 2020-08-17 (85 FR 51596)",
  "who": "United States (BIS)",
  "bloc": "us",
  "ref": "85 FR 29849; FR Doc 2020-10856; and 85 FR 51596; FR Doc 2020-18213 (Huawei foreign direct product rule)",
  "nodes": [
   "design",
   "foundry"
  ],
  "kind": "rule",
  "title": "Amendments to General Prohibition Three (Foreign-Produced Direct Product Rule) and the Entity List; Addition of Huawei Non-U.S. Affiliates",
  "text": "Extended the EAR to foreign-made items that are the direct product of specified U.S. software or technology, or are made by a plant that is, when Huawei or a listed affiliate is involved: from May 2020 for items made from Huawei designs, and from 17 Aug 2020 whenever such an entity is a party to the transaction. It cut HiSilicon off from foreign foundries using U.S. tools. Today it is the Entity List FDP rule for footnote 1 entities, 15 CFR 734.9(e)(1). Included as background, with the December 2020 SMIC listing: the other entries start in August 2022.",
  "status": "in force",
  "url": "https://www.federalregister.gov/documents/2020/05/19/2020-10856/export-administration-regulations-amendments-to-general-prohibition-three-foreign-produced-direct",
  "verified": true
 },
 {
  "date": "2020-12-18",
  "eff": "2020-12-18",
  "who": "United States (BIS)",
  "bloc": "us",
  "ref": "85 FR 83416; FR Doc 2020-28031 (SMIC Entity List listing)",
  "nodes": [
   "foundry"
  ],
  "kind": "entity",
  "status": "in force",
  "title": "Addition of Entities to the Entity List, Revision of Entry on the Entity List, and Removal of Entities From the Entity List",
  "text": "Added SMIC and ten related entities to the Entity List, citing China's military-civil fusion doctrine. Items uniquely required to produce semiconductors at 10 nm and below, including EUV technology, get a presumption of denial; other items are reviewed case by case. Included as background, like the 2020 Huawei rule.",
  "url": "https://www.federalregister.gov/documents/2020/12/22/2020-28031/addition-of-entities-to-the-entity-list-revision-of-entry-on-the-entity-list-and-removal-of-entities",
  "verified": true
 },
 {
  "date": "2022-08-09",
  "eff": "2022-08-09",
  "who": "United States (Congress)",
  "bloc": "us",
  "ref": "CHIPS Act of 2022, Pub. L. 117-167, div. A, sec. 103(b), adding the \"expansion clawback\" at 15 U.S.C. 4652(a)(6)",
  "nodes": [
   "foundry",
   "hbm"
  ],
  "kind": "statute",
  "title": "CHIPS and Science Act: prohibition on certain transactions by recipients of CHIPS manufacturing incentives",
  "text": "Companies receiving CHIPS manufacturing incentives must agree that, for 10 years from the award, they \"may not engage in any significant transaction, as defined in the agreement, involving the material expansion of semiconductor manufacturing capacity in the People's Republic of China or any other foreign country of concern\". Existing legacy-chip facilities are exempt, as is legacy-chip expansion that predominately serves that country's market (legacy logic is 28 nm and older). If a recipient fails to remedy a violation, the Secretary \"shall recover the full amount of the Federal financial assistance\", subject to a mitigation clause.",
  "status": "in force",
  "url": "https://www.govinfo.gov/content/pkg/PLAW-117publ167/html/PLAW-117publ167.htm",
  "verified": true
 },
 {
  "date": "2022-10-07",
  "eff": "2022-10-07 (some provisions 2022-10-12 and 2022-10-21)",
  "who": "United States (BIS)",
  "bloc": "us",
  "ref": "87 FR 62186; FR Doc 2022-21658; RIN 0694-AI94",
  "nodes": [
   "accel",
   "dep",
   "etch",
   "clean",
   "cmp",
   "metro",
   "track",
   "foundry"
  ],
  "kind": "rule",
  "title": "Implementation of Additional Export Controls: Certain Advanced Computing and Semiconductor Manufacturing Items; Supercomputer and Semiconductor End Use; Entity List Modification",
  "text": "IFR creating ECCNs 3A090 (advanced computing ICs), 4A090 (computers containing them) and 3B090 (certain SME) with China license requirements, an advanced-computing FDP rule, supercomputer and semiconductor-fab end-use controls, and a license requirement for certain U.S.-person support to PRC chip fabs; expanded FDP scope for 28 Chinese Entity List parties.",
  "status": "in force",
  "url": "https://www.federalregister.gov/documents/2022/10/13/2022-21658/implementation-of-additional-export-controls-certain-advanced-computing-and-semiconductor",
  "verified": true
 },
 {
  "date": "2022-12-15",
  "eff": "2022-12-16",
  "who": "United States (BIS)",
  "bloc": "us",
  "ref": "87 FR 77505; FR Doc 2022-27151; RIN 0694-AJ04",
  "nodes": [
   "foundry",
   "design",
   "euv",
   "duv",
   "accel"
  ],
  "kind": "entity",
  "title": "Additions and Revisions to the Entity List and Conforming Removal From the Unverified List",
  "text": "Added 36 entities (China, Japan) including Yangtze Memory Technologies (and a Japan affiliate), Cambricon entities and Shanghai Micro Electronics Equipment (SMEE); some with footnote 4 FDP designation.",
  "status": "in force",
  "url": "https://www.federalregister.gov/documents/2022/12/19/2022-27151/additions-and-revisions-to-the-entity-list-and-conforming-removal-from-the-unverified-list",
  "verified": true
 },
 {
  "date": "2023-01-11",
  "eff": "2023-01-12",
  "who": "EU",
  "bloc": "al",
  "ref": "Commission Delegated Regulation (EU) 2023/66 of 21 October 2022 (OJ L 9, 11.1.2023) amending Annex I of Regulation (EU) 2021/821",
  "nodes": [
   "eda",
   "wafers"
  ],
  "kind": "rule",
  "title": "",
  "text": "The annual Annex I update implementing 2021 regime decisions. Among other changes it lists ECAD software for developing GAAFET integrated circuits (3D006) and gallium oxide and diamond substrate materials.",
  "status": "superseded",
  "url": "https://eur-lex.europa.eu/eli/reg_del/2023/66/oj/eng",
  "verified": true
 },
 {
  "date": "2023-01-17",
  "eff": "2023-01-17",
  "who": "United States (BIS)",
  "bloc": "us",
  "ref": "88 FR 2821; FR Doc 2023-00888; RIN 0694-AI94",
  "nodes": [
   "accel",
   "dep",
   "etch",
   "clean",
   "cmp",
   "metro",
   "track",
   "foundry"
  ],
  "kind": "rule",
  "title": "Implementation of Additional Export Controls: Certain Advanced Computing and Semiconductor Manufacturing Items; Supercomputer and Semiconductor End Use; Entity List Modification; Updates to the Controls To Add Macau",
  "text": "Extended the October 7, 2022 China controls on advanced computing items and SME to Macau.",
  "status": "in force",
  "url": "https://www.federalregister.gov/documents/2023/01/18/2023-00888/implementation-of-additional-export-controls-certain-advanced-computing-and-semiconductor",
  "verified": true
 },
 {
  "date": "2023-05-21",
  "eff": "2023-05-21",
  "who": "China (CAC)",
  "bloc": "cn",
  "ref": "CAC Cybersecurity Review Office notice of 21 May 2023: Micron products sold in China fail cybersecurity review",
  "nodes": [
   "hbm"
  ],
  "kind": "ban",
  "title": "",
  "text": "After a cybersecurity review, Beijing found that Micron products sold in China pose serious security risks to critical information infrastructure supply chains and ordered: \"按照《网络安全法》等法律法规，我国内关键信息基础设施的运营者应停止采购美光公司产品。\" (Under the Cybersecurity Law, operators of critical information infrastructure should stop buying Micron products.)",
  "status": "in force",
  "url": "https://www.cac.gov.cn/2023-05/21/c_1686348043518073.htm",
  "verified": true
 },
 {
  "date": "2023-05-23",
  "eff": "2023-07-23",
  "who": "Japan",
  "bloc": "al",
  "ref": "METI Ordinance 2023 No. 25 amending the Goods/Technology Ordinance (貨物等省令), plus 輸出注意事項2023第7号",
  "nodes": [
   "dep",
   "etch",
   "clean",
   "cmp",
   "metro",
   "track",
   "euv",
   "duv"
  ],
  "kind": "licence",
  "title": "",
  "text": "Adds 23 kinds of advanced semiconductor manufacturing equipment to Japan's list controls, worldwide in scope: cleaning, deposition, annealing, lithography/exposure, etching and inspection. The new entries are Art. 6 item 17 ru-fu and 17-2, and the related software and technology are also controlled.",
  "status": "in force",
  "url": "https://www.cistec.or.jp/export/express/230523/1-20230523_gaiyo.pdf",
  "verified": true
 },
 {
  "date": "2023-06-30",
  "eff": "2023-09-01",
  "who": "Netherlands",
  "bloc": "al",
  "ref": "Regeling geavanceerde productieapparatuur voor halfgeleiders (Regeling van 23 juni 2023, nr. MinBuza.2023.15246-27), Stcrt. 2023, 18212",
  "nodes": [
   "euv",
   "duv",
   "dep",
   "etch",
   "clean",
   "cmp",
   "metro",
   "track"
  ],
  "kind": "licence",
  "title": "",
  "text": "National licence requirement for exporting listed advanced chipmaking tools not covered by EU Annex I, including immersion DUV lithography with dedicated chuck overlay of 1.50 nm or less, certain ALD, epitaxy and void-free dielectric deposition tools, plus related software and technology. Signed 23 June, published 30 June, in force 1 September 2023.",
  "status": "in force",
  "url": "https://zoek.officielebekendmakingen.nl/stcrt-2023-18212.html",
  "verified": true
 },
 {
  "date": "2023-07-03",
  "eff": "2023-08-01",
  "who": "China",
  "bloc": "cn",
  "ref": "MOFCOM/GACC Announcement 2023 No. 23 (gallium and germanium export control)",
  "nodes": [
   "ga",
   "ge"
  ],
  "kind": "licence",
  "title": "",
  "text": "Requires a MOFCOM dual-use export licence for gallium and germanium items, including Ga metal, GaN, Ga2O3, GaP, GaAs, InGaAs, GaSe, GaSb, Ge metal, zone-refined Ge ingots and Ge epitaxial substrates.",
  "status": "in force",
  "url": "https://web.archive.org/web/20231116105301/http://www.mofcom.gov.cn/article/zwgk/gkzcfb/202307/20230703419666.shtml",
  "verified": true
 },
 {
  "date": "2023-09-25",
  "eff": "2023-11-24",
  "who": "United States (Commerce, CHIPS Program Office)",
  "bloc": "us",
  "ref": "88 FR 65600; FR Doc 2023-20471 (Preventing the Improper Use of CHIPS Act Funding); 'material expansion' revised by 88 FR 89572 (28 Dec 2023)",
  "nodes": [
   "foundry",
   "hbm"
  ],
  "kind": "rule",
  "title": "Preventing the Improper Use of CHIPS Act Funding",
  "text": "Final rule implementing the CHIPS Act guardrails: defines 'material expansion' and 'significant transaction', sets the legacy-chip exception, and sets the notification and clawback process for funding recipients that expand capacity in China or other foreign countries of concern. The 'material expansion' definition was revised on 28 Dec 2023.",
  "status": "in force",
  "url": "https://www.federalregister.gov/documents/2023/09/25/2023-20471/preventing-the-improper-use-of-chips-act-funding",
  "verified": true
 },
 {
  "date": "2023-10-13",
  "eff": "2023-10-17",
  "who": "United States (BIS)",
  "bloc": "us",
  "ref": "88 FR 71478; FR Doc 2023-22873; RIN 0694-AJ39",
  "nodes": [
   "dep",
   "etch",
   "clean",
   "cmp",
   "metro",
   "track",
   "foundry"
  ],
  "kind": "license",
  "title": "Existing Validated End-User Authorizations in the People's Republic of China: Samsung China Semiconductor Co. Ltd. and SK Hynix Semiconductor (China) Ltd.",
  "text": "Revised the eligible-items lists in the existing VEU authorizations for Samsung China Semiconductor and SK hynix Semiconductor (China) fabs (corrected at 88 FR 76990, Nov 8, 2023).",
  "status": "moot: VEUs revoked eff. 31 Dec 2025 (90 FR 42321)",
  "url": "https://www.federalregister.gov/documents/2023/10/17/2023-22873/existing-validated-end-user-authorizations-in-the-peoples-republic-of-china-samsung-china",
  "verified": true
 },
 {
  "date": "2023-10-17",
  "eff": "2023-11-17",
  "who": "United States (BIS)",
  "bloc": "us",
  "ref": "88 FR 73458; FR Doc 2023-23055; RIN 0694-AI94",
  "nodes": [
   "accel",
   "design"
  ],
  "kind": "rule",
  "title": "Implementation of Additional Export Controls: Certain Advanced Computing Items; Supercomputer and Semiconductor End Use; Updates and Corrections",
  "text": "AC/S IFR: revised 3A090/4A090 parameters (TPP and performance density), added .z paragraphs (e.g., 3A001.z, 4A003.z, 5A992.z), expanded license requirements beyond China/Macau to D:1, D:4, D:5 destinations and to entities headquartered in D:5/Macau, and responded to comments on the 2022 rule.",
  "status": "in force",
  "url": "https://www.federalregister.gov/documents/2023/10/25/2023-23055/implementation-of-additional-export-controls-certain-advanced-computing-items-supercomputer-and",
  "verified": true
 },
 {
  "date": "2023-10-17",
  "eff": "2023-11-17 (one instruction 2026-01-01)",
  "who": "United States (BIS)",
  "bloc": "us",
  "ref": "88 FR 73424; FR Doc 2023-23049; RIN 0694-AJ23",
  "nodes": [
   "dep",
   "etch",
   "clean",
   "cmp",
   "metro",
   "track",
   "euv",
   "duv",
   "foundry"
  ],
  "kind": "rule",
  "title": "Export Controls on Semiconductor Manufacturing Items",
  "text": "SME IFR: added further SME types, moved all 3B090 items into 3B001 and 3B002 (removing 3B090), extended NS/RS controls on them to Macau and Country Group D:5, revised end-use controls, and added a 0% de minimis rule for items in new ECCN 3B001.f.1.b.2.b (specified lithography equipment).",
  "status": "in force",
  "url": "https://www.federalregister.gov/documents/2023/10/25/2023-23049/export-controls-on-semiconductor-manufacturing-items",
  "verified": true
 },
 {
  "date": "2023-10-17",
  "eff": "2023-10-17",
  "who": "United States (BIS)",
  "bloc": "us",
  "ref": "88 FR 71991; FR Doc 2023-23048; RIN 0694-AJ41",
  "nodes": [
   "design",
   "accel"
  ],
  "kind": "entity",
  "title": "Entity List Additions",
  "text": "Added 13 Chinese entities, including Biren Technology and Moore Thread Intelligent Technology GPU-design entities, with footnote 4 designations.",
  "status": "in force",
  "url": "https://www.federalregister.gov/documents/2023/10/19/2023-23048/entity-list-additions",
  "verified": true
 },
 {
  "date": "2024-03-07",
  "eff": "2024-04-01",
  "who": "UK",
  "bloc": "al",
  "ref": "The Export Control (Amendment) Regulations 2024, S.I. 2024/346 (new Schedule 3 entries PL9013-PL9015)",
  "nodes": [
   "dep",
   "etch",
   "clean",
   "cmp",
   "metro",
   "track",
   "accel"
  ],
  "kind": "licence",
  "title": "",
  "text": "UK national controls on chip items, including cryo-CMOS ICs, certain SiGe-selective and pulsed-RF dry etch tools, chip-imaging SEMs, and ICs with 600 GB/s or more of I/O and TPP of 6,000 or more, alongside quantum items. Licences required for all destinations.",
  "status": "superseded: PL9013–15 omitted 16 Dec 2025 by S.I. 2025/1197",
  "url": "https://www.legislation.gov.uk/uksi/2024/346/made",
  "verified": true
 },
 {
  "date": "2024-03-29",
  "eff": "2024-04-04",
  "who": "United States (BIS)",
  "bloc": "us",
  "ref": "89 FR 23876; FR Doc 2024-07004; RIN 0694-AI94",
  "nodes": [
   "accel",
   "dep",
   "etch",
   "clean",
   "cmp",
   "metro",
   "track"
  ],
  "kind": "rule",
  "title": "Implementation of Additional Export Controls: Certain Advanced Computing Items; Supercomputer and Semiconductor End Use; Updates and Corrections; and Export Controls on Semiconductor Manufacturing Items; Corrections and Clarifications",
  "text": "Corrected errors and clarified the two October 2023 IFRs.",
  "status": "in force",
  "url": "https://www.federalregister.gov/documents/2024/04/04/2024-07004/implementation-of-additional-export-controls-certain-advanced-computing-items-supercomputer-and",
  "verified": true
 },
 {
  "date": "2024-07-08",
  "eff": "2024-09-08",
  "who": "Japan",
  "bloc": "al",
  "ref": "METI Ordinance 2024 No. 44 amending the Goods/Technology Ordinance (critical and emerging technologies)",
  "nodes": [
   "dep",
   "etch",
   "clean",
   "cmp",
   "metro",
   "track",
   "design",
   "eda",
   "accel"
  ],
  "kind": "licence",
  "title": "",
  "text": "Adds controls on certain CMOS ICs, SEMs for imaging chips, quantum computers, software that generates multilayer GDSII data, and technology to design or manufacture GAAFET ICs. It also revises thresholds for the 23 chip-equipment entries to match other countries' controls.",
  "status": "in force",
  "url": "https://cistec.or.jp/export/express/240708/1-20240708_gaiyo.pdf",
  "verified": true
 },
 {
  "date": "2024-09-06",
  "eff": "2024-09-07",
  "who": "Netherlands",
  "bloc": "al",
  "ref": "Regeling van 2 september 2024, nr. BZ2404162, wijziging Regeling geavanceerde productieapparatuur voor halfgeleiders, Stcrt. 2024, 29008",
  "nodes": [
   "euv",
   "duv"
  ],
  "kind": "licence",
  "title": "",
  "text": "Replaces the annex and adds a licence requirement for DUV immersion lithography tools with dedicated chuck overlay above 1.50 nm and up to 2.40 nm, effective the day after publication. The rule names no tool models; the Rijksoverheid release describes it as targeting DUV lithography.",
  "status": "in force",
  "url": "https://zoek.officielebekendmakingen.nl/stcrt-2024-29008.html",
  "verified": true
 },
 {
  "date": "2024-09-30",
  "eff": "2024-10-02",
  "who": "United States (BIS)",
  "bloc": "us",
  "ref": "89 FR 80080; FR Doc 2024-22587; RIN 0694-AJ82",
  "nodes": [
   "accel"
  ],
  "kind": "license",
  "title": "Expansion of Validated End User Authorization: Data Center Validated End User Authorization",
  "text": "Created a Data Center VEU authorization so pre-approved data centers in specified destinations can receive CCL items, including advanced computing items, without individual licenses. RIN 0694-AK50 (FR Doc 2026-23529) removes the Data Center VEU from § 748.15 effective 19 Nov 2026.",
  "status": "in force until 19 Nov 2026; removed on publication of FR Doc 2026-23529",
  "url": "https://www.federalregister.gov/documents/2024/10/02/2024-22587/expansion-of-validated-end-user-authorization-data-center-validated-end-user-authorization",
  "verified": true,
  "later": [
   [
    "2026-11-19",
    "removed effective 19 Nov 2026 by FR Doc 2026-23529"
   ]
  ]
 },
 {
  "date": "2024-10-18",
  "eff": "2024-12-01",
  "who": "Netherlands",
  "bloc": "al",
  "ref": "Regeling aanvullende controlemaatregelen op de Verordening producten voor tweeërlei gebruik (Regeling van 11 oktober 2024, nr. BZ2405833), Stcrt. 2024, 33838",
  "nodes": [
   "dep",
   "etch",
   "clean",
   "metro",
   "eda"
  ],
  "kind": "licence",
  "title": "",
  "text": "Separate national licence requirement under Art. 9 of Regulation 2021/821 for emerging-technology items outside Annex I, including cryogenic CMOS chips, certain semiconductor tools, SEM imaging equipment, materials, process design kit technology, quantum and additive-manufacturing items.",
  "status": "withdrawn w.e.f. 15 Nov 2025 (Stcrt. 2025, 38653)",
  "url": "https://zoek.officielebekendmakingen.nl/stcrt-2024-33838.html",
  "verified": true
 },
 {
  "date": "2024-11-15",
  "eff": "2025-01-02",
  "who": "United States (Treasury)",
  "bloc": "us",
  "ref": "89 FR 90398; FR Doc 2024-25422; 31 CFR part 850 (Outbound Investment Security Program)",
  "nodes": [
   "design",
   "eda",
   "euv",
   "duv",
   "track",
   "dep",
   "etch",
   "clean",
   "cmp",
   "implant",
   "metro",
   "foundry",
   "hbm",
   "cowos",
   "accel"
  ],
  "kind": "rule",
  "title": "Provisions Pertaining to U.S. Investments in Certain National Security Technologies and Products in Countries of Concern",
  "text": "Implements E.O. 14105 for China (including Hong Kong and Macau): U.S. persons must notify Treasury of certain investments in entities working on semiconductors and AI, and the rule \"prohibits United States persons from engaging in certain other transactions involving persons of a country of concern that are engaged in activities involving certain other national security technologies and products\". Prohibited activities (31 CFR 850.224) include developing EDA software, front-end fabrication or advanced-packaging equipment and EUV-specific items; designing 3A090.a ICs; fabricating advanced logic, NAND of 128 layers or more and DRAM at 18 nm half-pitch or less; advanced packaging; and certain supercomputers.",
  "status": "in force; replacement rules proposed (91 FR 67396)",
  "url": "https://www.federalregister.gov/documents/2024/11/15/2024-25422/provisions-pertaining-to-us-investments-in-certain-national-security-technologies-and-products-in",
  "verified": true
 },
 {
  "date": "2024-12-02",
  "eff": "2024-12-02 (staggered compliance dates)",
  "who": "United States (BIS)",
  "bloc": "us",
  "ref": "89 FR 96790; FR Doc 2024-28270; RIN 0694-AJ74",
  "nodes": [
   "dep",
   "etch",
   "clean",
   "cmp",
   "metro",
   "track",
   "euv",
   "duv",
   "eda",
   "hbm",
   "foundry"
  ],
  "kind": "rule",
  "title": "Foreign-Produced Direct Product Rule Additions, and Refinements to Controls for Advanced Computing and Semiconductor Manufacturing Items",
  "text": "IFR adding new SME ECCNs (e.g., 3B993, 3B994 and related 3D/3E entries), revising 3B001/3B002, creating new FDP rules (SME and footnote 5) aimed at advanced-node IC production, creating ECCN 3A090.c and License Exception HBM for high-bandwidth memory, and clarifying controls on software keys. 3A090.c covers HBM with a memory bandwidth density above 2 GB/s per mm² (\"All HBM stacks currently in production exceed this threshold\"), with a licence requirement for D:5 and Macau; License Exception HBM (§ 740.25) is limited to stacks below 3.3 GB/s per mm².",
  "status": "in force",
  "url": "https://www.federalregister.gov/documents/2024/12/05/2024-28270/foreign-produced-direct-product-rule-additions-and-refinements-to-controls-for-advanced-computing",
  "verified": true
 },
 {
  "date": "2024-12-02",
  "eff": "2024-12-02",
  "who": "United States (BIS)",
  "bloc": "us",
  "ref": "89 FR 96830; FR Doc 2024-28267; RIN 0694-AJ77",
  "nodes": [
   "dep",
   "etch",
   "clean",
   "cmp",
   "metro",
   "track",
   "foundry",
   "eda"
  ],
  "kind": "entity",
  "title": "Additions and Modifications to the Entity List; Removals From the Validated End-User (VEU) Program",
  "text": "Added 140 entities (China, Japan, South Korea, Singapore) involved in advanced-node IC or SME production, including Naura, Piotech, SiCarrier, Empyrean and SMIC-linked entries; modified 14 entries; 16 entries (9 new, 7 modified) given foreign-produced-item (footnote 5) restrictions; removed three entities from the VEU program.",
  "status": "in force",
  "url": "https://www.federalregister.gov/documents/2024/12/05/2024-28267/additions-and-modifications-to-the-entity-list-removals-from-the-validated-end-user-veu-program",
  "verified": true
 },
 {
  "date": "2024-12-03",
  "eff": "2024-12-03",
  "who": "China",
  "bloc": "cn",
  "ref": "MOFCOM Announcement 2024 No. 46 (strengthening export control of dual-use items to the United States)",
  "nodes": [
   "ga",
   "ge"
  ],
  "kind": "ban",
  "title": "",
  "text": "Para 1 bans all dual-use exports to US military users or end uses. Para 2 says licences for gallium, germanium, antimony and superhard-material dual-use items to the US will in principle be denied, and graphite exports to the US get stricter end-user review. Third-country transfers of Chinese-origin items to the US are also covered.",
  "status": "partly suspended",
  "url": "https://www.mofcom.gov.cn/zwgk/zcfb/art/2024/art_3d5e990b43424e60828030f58a547b60.html",
  "verified": true,
  "later": [
   [
    "2026-11-28",
    "para. 2 suspension ran to 27 Nov 2026; check MOFCOM for an extension"
   ]
  ]
 },
 {
  "date": "2025-01-13",
  "eff": "2025-01-13 (compliance 2025-05-15)",
  "who": "United States (BIS)",
  "bloc": "us",
  "ref": "90 FR 4544; FR Doc 2025-00636; RIN 0694-AJ90",
  "nodes": [
   "accel"
  ],
  "kind": "rule",
  "title": "Framework for Artificial Intelligence Diffusion",
  "text": "IFR imposing a worldwide license requirement on 3A090.a/4A090.a and .z items with new exceptions (AIA, ACM, LPP), a new ECCN 4E091 control on closed AI model weights trained with 10^26 or more operations, and revised Data Center VEU rules.",
  "status": "never enforced (rescission announced 13 May 2025); rescinded effective 19 Nov 2026 (FR Doc 2026-23529)",
  "url": "https://www.federalregister.gov/documents/2025/01/15/2025-00636/framework-for-artificial-intelligence-diffusion",
  "verified": true,
  "later": [
   [
    "2026-11-19",
    "rescinded effective 19 Nov 2026 (FR Doc 2026-23529); never enforced"
   ]
  ]
 },
 {
  "date": "2025-01-15",
  "eff": "2025-01-16 (compliance 2025-01-31)",
  "who": "United States (BIS)",
  "bloc": "us",
  "ref": "90 FR 5298; FR Doc 2025-00711; RIN 0694-AJ98 (corrected 90 FR 9604, Feb 14 2025)",
  "nodes": [
   "foundry",
   "cowos",
   "atp",
   "design"
  ],
  "kind": "rule",
  "title": "Implementation of Additional Due Diligence Measures for Advanced Computing Integrated Circuits; Amendments and Clarifications; and Extension of Comment Period",
  "text": "Foundry/OSAT due-diligence IFR: presumption (Note 1 to 3A090.a) that 'applicable advanced logic ICs' (16/14 nm node or below) are 3A090.a unless designed by an approved or authorized IC designer or attested by an approved OSAT, with front-end fabricator reporting, an HBM red flag and amendments to the Dec 2024 FDP IFR.",
  "status": "in force",
  "url": "https://www.federalregister.gov/documents/2025/01/16/2025-00711/implementation-of-additional-due-diligence-measures-for-advanced-computing-integrated-circuits",
  "verified": true
 },
 {
  "date": "2025-01-15",
  "eff": "2025-01-16",
  "who": "United States (BIS)",
  "bloc": "us",
  "ref": "90 FR 4617; FR Doc 2025-00704; RIN 0694-AJ76",
  "nodes": [
   "accel"
  ],
  "kind": "entity",
  "title": "Addition of Entities to and Revision of Entry on the Entity List",
  "text": "Added 11 Chinese entities, including Zhipu AI entities (Zhipu Huazhang and affiliates), with license review under presumption of denial.",
  "status": "in force",
  "url": "https://www.federalregister.gov/documents/2025/01/16/2025-00704/addition-of-entities-to-and-revision-of-entry-on-the-entity-list",
  "verified": true
 },
 {
  "date": "2025-01-15",
  "eff": "2025-01-16",
  "who": "United States (BIS)",
  "bloc": "us",
  "ref": "90 FR 4621; FR Doc 2025-00480; RIN 0694-AK01",
  "nodes": [
   "design",
   "foundry"
  ],
  "kind": "entity",
  "title": "Additions to the Entity List",
  "text": "Added 16 entities (14 China, 2 Singapore), including Sophgo Technologies entities; the rule cites activity involving Huawei.",
  "status": "in force",
  "url": "https://www.federalregister.gov/documents/2025/01/16/2025-00480/additions-to-the-entity-list",
  "verified": true
 },
 {
  "date": "2025-01-15",
  "eff": "2025-04-01",
  "who": "Netherlands",
  "bloc": "al",
  "ref": "Regeling van 13 januari 2025, BZ2411160, wijziging Regeling geavanceerde productieapparatuur voor halfgeleiders, Stcrt. 2025, 1894",
  "nodes": [
   "dep",
   "etch",
   "clean",
   "cmp",
   "metro",
   "track",
   "euv",
   "duv"
  ],
  "kind": "licence",
  "title": "",
  "text": "Replaces the annex again, adding licence requirements for certain metrology and inspection tools (e.g. patterned-wafer defect inspection at 21 nm or below), cleaning and further deposition tools, and upgrades that raise throughput of controlled lithography tools. Published 15 January 2025 but in force only from 1 April 2025, not on publication.",
  "status": "in force",
  "url": "https://zoek.officielebekendmakingen.nl/stcrt-2025-1894.html",
  "verified": true
 },
 {
  "date": "2025-02-04",
  "eff": "2025-02-04",
  "who": "China (MOFCOM/GACC)",
  "bloc": "cn",
  "ref": "MOFCOM/GACC Announcement 2025 No. 10: export controls on tungsten, tellurium, bismuth, molybdenum and indium items",
  "nodes": [
   "wafers"
  ],
  "kind": "licence",
  "title": "",
  "text": "Requires export licences for listed tungsten, tellurium, bismuth, molybdenum and indium items, effective on issue. The indium items are indium phosphide, trimethylindium and triethylindium (China list 3C004.a-.c); the tungsten items include ammonium paratungstate and tungsten oxide. Shown under the wafers and materials stage because the tool has no separate stage for these inputs. No later announcement suspends it: 2025 No. 70 suspends 2025 Nos. 55-58, 61 and 62 until 10 Nov 2026; 2025 No. 72 suspends paragraph 2 of 2024 No. 46 until 27 Nov 2026; 2026 No. 58 continues the No. 70 suspension from 11 Nov 2026 to 10 Jan 2027. None names 2025 No. 10.",
  "status": "in force",
  "url": "https://www.mofcom.gov.cn/zfxxgk/gkml/art/2025/art_084ded0609404b2d81c746b31c9a03a6.html",
  "verified": true
 },
 {
  "date": "2025-03-25",
  "eff": "2025-03-25",
  "who": "United States (BIS)",
  "bloc": "us",
  "ref": "90 FR 14046; FR Doc 2025-05427; RIN 0694-AK08 (with 90 FR 14032, FR Doc 2025-05426)",
  "nodes": [
   "accel"
  ],
  "kind": "entity",
  "title": "Additions to the Entity List",
  "text": "Added 12 entities (11 China, 1 Taiwan), including Inspur subsidiaries, Nettrix and the Beijing Academy of Artificial Intelligence, for developing advanced AI, supercomputers and high-performance chips for military-linked users; companion 90 FR 14032 added 70 more for quantum, hypersonic and other activities.",
  "status": "in force",
  "url": "https://www.federalregister.gov/documents/2025/03/28/2025-05427/additions-to-the-entity-list",
  "verified": true
 },
 {
  "date": "2025-04-04",
  "eff": "2025-04-04",
  "who": "China",
  "bloc": "cn",
  "ref": "MOFCOM/GACC Announcement 2025 No. 18 (export control on certain medium and heavy rare earth items)",
  "nodes": [
   "ree"
  ],
  "kind": "licence",
  "title": "",
  "text": "Adds licence requirements for seven medium/heavy rare earths (Sm, Gd, Tb, Dy, Lu, Sc, Y) and their alloys, compounds and magnets. Sm, Gd and other sputtering targets are listed, including under HS 8486909110, a semiconductor-equipment parts heading. Not among the measures suspended by 2025 No. 70 or 2026 No. 58. The White House fact sheet of 1 Nov 2025 says China will issue general licences for U.S. end users; no MOFCOM text on that was found.",
  "status": "in force",
  "url": "https://www.mofcom.gov.cn/zwgk/zcfb/art/2025/art_9c2108ccaf754f22a34abab2fedaa944.html",
  "verified": true
 },
 {
  "date": "2025-04-09",
  "eff": "",
  "who": "United States (BIS)",
  "bloc": "us",
  "ref": "Is-informed notice to NVIDIA (no FR document); NVIDIA Form 8-K filed 2025-04-15",
  "nodes": [
   "accel",
   "hbm"
  ],
  "kind": "license",
  "title": "USG license requirement for NVIDIA H20 exports",
  "text": "The U.S. government told NVIDIA that exports of H20 ICs, and any ICs reaching the H20's memory or interconnect bandwidth, to China (incl. Hong Kong and Macau), D:5 countries, or firms headquartered there need a license; on 2025-04-14 it said the requirement was indefinite. AMD reported a similar requirement for MI308 (not checked against AMD's filing).",
  "status": "in force",
  "url": "https://www.sec.gov/Archives/edgar/data/1045810/000104581025000082/nvda-20250409.htm",
  "verified": true
 },
 {
  "date": "2025-05-13",
  "eff": "",
  "who": "United States (BIS)",
  "bloc": "us",
  "ref": "BIS press release 2025-05-13; BIS guidance on GP10 and PRC advanced-computing ICs",
  "nodes": [
   "accel",
   "design"
  ],
  "kind": "rescind",
  "title": "Department of Commerce Announces Rescission of Biden-Era Artificial Intelligence Diffusion Rule, Strengthens Chip-Related Export Controls",
  "text": "BIS said it would not enforce the AI Diffusion Rule and would rescind it, and issued guidance that using PRC-designed 3A090 ICs (named: Huawei Ascend 910B, 910C, 910D) may violate General Prohibition 10, plus guidance on diversion and on Chinese model training. The release also said BIS was imposing licensing requirements for Malaysia and Thailand; no rule doing so was issued until RIN 0694-AK50 (FR Doc 2026-23529, effective 19 Nov 2026).",
  "status": "in force",
  "url": "https://www.bis.gov/press-release/department-commerce-announces-rescission-biden-era-artificial-intelligence-diffusion-rule-strengthens",
  "verified": true
 },
 {
  "date": "2025-05-15",
  "eff": "",
  "who": "United States (Congress)",
  "bloc": "us",
  "ref": "Chip Security Act, H.R. 3447 (introduced 15 May 2025) and S. 1705 (introduced 8 May 2025), 119th Congress",
  "nodes": [
   "accel"
  ],
  "kind": "statute",
  "status": "bill: H.R. 3447 ordered reported 42–0 by House Foreign Affairs, 26 Mar 2026; not enacted",
  "title": "Chip Security Act",
  "text": "As introduced, would direct Commerce to require chip security mechanisms that implement location verification on covered integrated circuit products (e.g., advanced computing chips) before export, reexport or in-country transfer abroad, and require licensees to report credible information of diversion or tampering to BIS. S. 1705 is in the Senate Banking Committee.",
  "url": "https://www.congress.gov/bill/119th-congress/house-bill/3447",
  "verified": true
 },
 {
  "date": "2025-05-29",
  "eff": "2025-05-29",
  "who": "United States (BIS)",
  "bloc": "us",
  "ref": "BIS letter received by Synopsys on 29 May 2025 imposing China export restrictions (Synopsys Form 8-K filed 29 May 2025)",
  "nodes": [
   "eda"
  ],
  "kind": "license",
  "title": "BIS letter restricting EDA exports to China",
  "text": "Synopsys disclosed that on 29 May 2025 it \"received a letter from the Bureau of Industry and Security of the U.S. Department of Commerce informing Synopsys of new export restrictions related to China\", and suspended its financial guidance. The letter was not published. On 2 Jul 2025 Synopsys received a BIS letter rescinding the restrictions, effective immediately (next entry).",
  "status": "rescinded (rescission letter received 2 Jul 2025)",
  "url": "https://www.sec.gov/Archives/edgar/data/883241/000119312525130725/d14316d8k.htm",
  "verified": true
 },
 {
  "date": "2025-06-10",
  "eff": "2025-06-10",
  "who": "Taiwan",
  "bloc": "al",
  "ref": "MOEA International Trade Administration update of the Strategic High-Tech Commodities (SHTC) Entity List (+601 entities incl. Huawei, SMIC)",
  "nodes": [
   "foundry",
   "design",
   "dep",
   "etch",
   "clean",
   "cmp",
   "metro",
   "track",
   "wafers",
   "resist"
  ],
  "kind": "entity",
  "title": "",
  "text": "Taiwan's SHTC entity list now includes Huawei and its affiliates and SMIC and its subsidiaries, so Taiwanese exporters need an ITA licence to ship strategic high-tech goods to them. The listing is confirmed in the official open-data CSV; the 2025-06-10 date and +601 count come from press reports quoting the ITA.",
  "status": "in force",
  "url": "https://www.trade.gov.tw/OpenData/getOpenData.aspx?oid=0F2CD336A579151B",
  "verified": true
 },
 {
  "date": "2025-07-02",
  "eff": "2025-07-02",
  "who": "United States (BIS)",
  "bloc": "us",
  "ref": "BIS letter received by Synopsys on 2 Jul 2025 rescinding the China restrictions of the letter received 29 May 2025 (Synopsys Form 8-K filed 3 Jul 2025)",
  "nodes": [
   "eda"
  ],
  "kind": "rescind",
  "title": "Rescission of the EDA export restrictions",
  "text": "Synopsys disclosed that on 2 Jul 2025 it \"received a letter from the Bureau of Industry and Security of the U.S. Department of Commerce informing Synopsys that the export restrictions related to China, pursuant to a letter received on May 29, 2025, have now been rescinded, effective immediately.\"",
  "status": "in effect",
  "url": "https://www.sec.gov/Archives/edgar/data/883241/000119312525155294/d80081d8k.htm",
  "verified": true
 },
 {
  "date": "2025-07-14",
  "eff": "2025-07-14",
  "who": "Malaysia",
  "bloc": "al",
  "ref": "MITI press statement: Strategic Trade Permit for U.S.-origin high-performance AI chips (Strategic Trade Act 2010, s. 12)",
  "nodes": [
   "accel"
  ],
  "kind": "licence",
  "status": "in force",
  "text": "Effective immediately, all exports, transhipments and transits of high-performance AI chips of U.S. origin need a Strategic Trade Permit, under the catch-all provision of the Strategic Trade Act 2010, while Malaysia reviews adding them to its Strategic Items List.",
  "url": "https://www.miti.gov.my/miti/resources/Media%20Release/%5BFINAL%5D%5FMITI%5FPress%5FStmt%5FMalaysia%5FRegulates%5FTrade%5Fof%5FUS%5FAI%5FChips%5F2025-07-14.pdf",
  "verified": true
 },
 {
  "date": "2025-07-23",
  "eff": "",
  "who": "United States (White House)",
  "bloc": "us",
  "ref": "EO 14320; 90 FR 35393; FR Doc 2025-14218",
  "nodes": [
   "accel"
  ],
  "kind": "guidance",
  "title": "Promoting the Export of the American AI Technology Stack",
  "text": "Executive order setting up a Commerce-led program to promote exports of full-stack U.S. AI packages; proposals must comply with U.S. export controls and BIS guidance. It does not change ECCNs or licensing policy.",
  "status": "in force",
  "url": "https://www.federalregister.gov/documents/2025/07/28/2025-14218/promoting-the-export-of-the-american-ai-technology-stack",
  "verified": true
 },
 {
  "date": "2025-08-11",
  "eff": "",
  "who": "United States (White House)",
  "bloc": "us",
  "ref": "Reported 15% revenue-share arrangement for H20 and MI308 sales to China",
  "nodes": [
   "accel"
  ],
  "kind": "deal",
  "title": "Reported 15% revenue-share arrangement for NVIDIA H20 and AMD MI308 sales to China",
  "text": "Press reports (Aug 10-11, 2025) said NVIDIA and AMD agreed to remit 15% of China H20/MI308 revenue to the U.S. government in exchange for export licenses; reporting says the President described the terms publicly. No regulation or written agreement located.",
  "status": "unverified",
  "url": "https://www.aljazeera.com/economy/2025/8/11/nvidia-amd-to-pay-15-of-china-chip-sales-to-us-government-reports-say",
  "verified": false
 },
 {
  "date": "2025-08-29",
  "eff": "2025-12-31",
  "who": "United States (BIS)",
  "bloc": "us",
  "ref": "90 FR 42321; FR Doc 2025-16735; RIN 0694-AK32",
  "nodes": [
   "dep",
   "etch",
   "clean",
   "cmp",
   "metro",
   "track",
   "foundry",
   "hbm"
  ],
  "kind": "rescind",
  "title": "Revocation of Validated End-User Authorizations in the People's Republic of China",
  "text": "Removed the China VEU authorizations for Intel Semiconductor (Dalian), Samsung China Semiconductor and SK hynix Semiconductor (China), effective 120 days later; BIS said it intends to license operation of existing fabs but not capacity expansion or technology upgrades.",
  "status": "in force",
  "url": "https://www.federalregister.gov/documents/2025/09/02/2025-16735/revocation-of-validated-end-user-authorizations-in-the-peoples-republic-of-china",
  "verified": true
 },
 {
  "date": "2025-09-02",
  "eff": "2025-12-31",
  "who": "United States (BIS)",
  "bloc": "us",
  "ref": "TSMC Nanjing VEU revocation (TSMC statement; never published in the EAR)",
  "nodes": [
   "dep",
   "etch",
   "clean",
   "cmp",
   "metro",
   "track",
   "foundry"
  ],
  "kind": "rescind",
  "title": "Revocation of TSMC Nanjing VEU authorization",
  "text": "TSMC said it was notified that the VEU authorization for TSMC Nanjing would be revoked effective 2025-12-31 (TSMC statement quoted by The Register, 2025-09-03). No U.S. government document found.",
  "status": "reported",
  "url": "https://www.theregister.com/2025/09/03/trump_tsmc_china/",
  "verified": false
 },
 {
  "date": "2025-09-12",
  "eff": "2025-09-12",
  "who": "United States (BIS)",
  "bloc": "us",
  "ref": "90 FR 44496; FR Doc 2025-17893; RIN 0694-AK26",
  "nodes": [
   "dep",
   "etch",
   "clean",
   "cmp",
   "metro",
   "track",
   "design",
   "foundry",
   "atp"
  ],
  "kind": "entity",
  "title": "Additions and Revisions to the Entity List",
  "text": "Added 32 entities (23 China); chip-related additions include GMC Semiconductor Technology (Wuxi) and Jicun Semiconductor Technology (Shanghai) for buying SME for SMIC entities, and Shanghai Fudan Microelectronics and Sino IC Technology (footnote 4).",
  "status": "in force",
  "url": "https://www.federalregister.gov/documents/2025/09/16/2025-17893/additions-and-revisions-to-the-entity-list",
  "verified": true
 },
 {
  "date": "2025-09-13",
  "eff": "2025-09-13",
  "who": "China",
  "bloc": "cn",
  "ref": "MOFCOM Announcement 2025 No. 50 (anti-discrimination investigation into US measures in the integrated circuit sector)",
  "nodes": [
   "design",
   "dep",
   "etch",
   "clean",
   "cmp",
   "metro",
   "track",
   "foundry",
   "accel",
   "wafers",
   "cowos"
  ],
  "kind": "investigation",
  "title": "",
  "text": "Opens a Foreign Trade Law Art. 7/36 anti-discrimination investigation into US IC measures: Section 301 tariffs, the 2022-2025 export-control rules, CHIPS Act restrictions and the May 2025 guidance on Huawei Ascend chips. The normal investigation period is three months, extendable. The White House fact sheet (1 Nov 2025) says China will terminate its semiconductor investigations targeting U.S. firms; no MOFCOM termination notice was found.",
  "status": "outcome unknown",
  "url": "https://trb.mofcom.gov.cn/mybldc/art/2025/art_e3842d2a7d7f4d399766199ac12fed86.html",
  "verified": true
 },
 {
  "date": "2025-09-13",
  "eff": "2025-09-13",
  "who": "China",
  "bloc": "cn",
  "ref": "MOFCOM Announcement 2025 No. 27 (anti-dumping investigation of certain analog chips from the U.S.; MOFCOM text as reprinted by Xinhua)",
  "nodes": [
   "design",
   "foundry"
  ],
  "kind": "investigation",
  "status": "outcome unknown",
  "text": "Opens an anti-dumping investigation into U.S.-origin general interface chips and gate-driver chips made on 40 nm and larger processes, on an application by the Jiangsu Semiconductor Industry Association; the dumping period is 2024. The White House fact sheet (1 Nov 2025) says China will terminate such investigations; no termination notice was found.",
  "url": "https://www.news.cn/fortune/20250913/37be7ecc9ee249b0b33e50ab431f0e9d/c.html",
  "verified": true
 },
 {
  "date": "2025-09-15",
  "eff": "",
  "who": "China",
  "bloc": "cn",
  "ref": "SAMR statement: Nvidia violated the Anti-Monopoly Law; further investigation decided",
  "nodes": [
   "accel"
  ],
  "kind": "investigation",
  "title": "",
  "text": "SAMR said a preliminary investigation found Nvidia breached the Anti-Monopoly Law and the conditions SAMR attached to its 2020 approval of the Mellanox acquisition, and that it would investigate further. The White House fact sheet (1 Nov 2025) says China will terminate its antitrust and other investigations of U.S. semiconductor firms; no SAMR termination notice was found.",
  "status": "outcome unknown",
  "url": "https://www.samr.gov.cn/xw/zj/art/2025/art_66b8363c3a194ba0a394a843d6cf3fd1.html",
  "verified": true
 },
 {
  "date": "2025-09-29",
  "eff": "2025-09-29",
  "who": "United States (BIS)",
  "bloc": "us",
  "ref": "90 FR 47201; FR Doc 2025-19001; RIN 0694-AK11",
  "nodes": [
   "design",
   "eda",
   "dep",
   "etch",
   "clean",
   "cmp",
   "metro",
   "track",
   "foundry",
   "hbm",
   "accel"
  ],
  "kind": "rule",
  "title": "Expansion of End-User Controls To Cover Affiliates of Certain Listed Entities",
  "text": "Affiliates Rule IFR: any entity at least 50% owned by one or more Entity List or MEU List parties (and certain sanctioned parties) is automatically subject to the same restrictions.",
  "status": "suspended until 10 Jan 2027",
  "url": "https://www.federalregister.gov/documents/2025/09/30/2025-19001/expansion-of-end-user-controls-to-cover-affiliates-of-certain-listed-entities",
  "verified": true,
  "later": [
   [
    "2027-01-11",
    "suspension ran to 10 Jan 2027; check the Federal Register for an extension"
   ]
  ]
 },
 {
  "date": "2025-09-30",
  "eff": "2025-09-30",
  "who": "Netherlands",
  "bloc": "al",
  "ref": "Ministerial order (bevel) under the Wet beschikbaarheid goederen re Nexperia Holding B.V. / Nexperia B.V.; made public 12 Oct 2025; Kamerstuk 32637, nr. 713 (letter of 14 Oct 2025)",
  "nodes": [
   "atp"
  ],
  "kind": "order",
  "title": "",
  "text": "The Minister of Economic Affairs used the Goods Availability Act, for the first time since 1952, to let the state block or reverse Nexperia corporate decisions that threatened production capacity, know-how and European chip supply. The order was not announced when made and became public on 12 October 2025. Normal production could continue.",
  "status": "suspended",
  "url": "https://www.government.nl/latest/news/2025/10/12/minister-of-economic-affairs-invokes-goods-availability-act",
  "verified": true
 },
 {
  "date": "2025-10-09",
  "eff": "2025-11-08",
  "who": "China",
  "bloc": "cn",
  "ref": "MOFCOM/GACC Announcement 2025 No. 55 (superhard materials)",
  "nodes": [
   "wafers"
  ],
  "kind": "licence",
  "title": "",
  "text": "Requires export licences for synthetic diamond micropowder, single crystals, diamond wire saws and grinding wheels (all above stated thresholds), plus DC arc plasma-jet CVD equipment and its process technology. These are inputs to wafer slicing, grinding and diamond-substrate work.",
  "status": "suspended",
  "url": "https://www.mofcom.gov.cn/zwgk/zcfb/art/2025/art_949f47563b834dad95b0010f375a892c.html",
  "verified": true,
  "later": [
   [
    "2027-01-11",
    "suspension ran to 10 Jan 2027; check MOFCOM for an extension"
   ]
  ]
 },
 {
  "date": "2025-10-09",
  "eff": "2025-11-08",
  "who": "China",
  "bloc": "cn",
  "ref": "MOFCOM/GACC Announcement 2025 No. 56 (rare earth production equipment and raw/auxiliary materials)",
  "nodes": [
   "ree"
  ],
  "kind": "licence",
  "title": "",
  "text": "Adds licence requirements for rare-earth processing equipment (e.g. centrifugal extraction, extraction tanks, roasting kilns, electrolysis equipment) and related raw and auxiliary materials.",
  "status": "suspended",
  "url": "https://www.mofcom.gov.cn/zwgk/zcfb/art/2025/art_1315078cebe04210bc35c72a4e7f7967.html",
  "verified": true,
  "later": [
   [
    "2027-01-11",
    "suspension ran to 10 Jan 2027; check MOFCOM for an extension"
   ]
  ]
 },
 {
  "date": "2025-10-09",
  "eff": "2025-11-08",
  "who": "China",
  "bloc": "cn",
  "ref": "MOFCOM/GACC Announcement 2025 No. 57 (holmium, erbium, thulium, europium, ytterbium items)",
  "nodes": [
   "ree"
  ],
  "kind": "licence",
  "title": "",
  "text": "Adds licence requirements for five more medium/heavy rare earths (Ho, Er, Tm, Eu, Yb), including their metals, alloys, sputtering targets, crystal and optical-fibre materials, oxides and compounds.",
  "status": "suspended",
  "url": "https://www.mofcom.gov.cn/zwgk/zcfb/art/2025/art_59ec4f6bec0b459aa4a30c4bbd0a41c1.html",
  "verified": true,
  "later": [
   [
    "2027-01-11",
    "suspension ran to 10 Jan 2027; check MOFCOM for an extension"
   ]
  ]
 },
 {
  "date": "2025-10-09",
  "eff": "2025-12-01",
  "who": "China",
  "bloc": "cn",
  "ref": "MOFCOM Announcement 2025 No. 61 (export control on relevant foreign-made rare earth items)",
  "nodes": [
   "ree",
   "foundry",
   "hbm",
   "accel"
  ],
  "kind": "rule",
  "title": "",
  "text": "An extraterritorial rule. Foreign exporters would need a MOFCOM licence for foreign-made items that contain at least 0.1% by value of listed Chinese-origin rare earth materials or were made with Chinese rare-earth technology. Applications for end uses in R&D or production of logic chips at 14nm and below or memory with 256+ layers, related production/test equipment and materials, or military-capable AI would be reviewed case by case. Part 1(3) took effect on 9 Oct 2025; parts 1(1) and 1(2) were due on 1 Dec 2025.",
  "status": "suspended",
  "url": "https://www.mofcom.gov.cn/zwgk/zcfb/art/2025/art_7fc9bff0fb4546ecb02f66ee77d0e5f6.html",
  "verified": true,
  "later": [
   [
    "2027-01-11",
    "suspension ran to 10 Jan 2027; check MOFCOM for an extension"
   ]
  ]
 },
 {
  "date": "2025-10-09",
  "eff": "2025-10-09",
  "who": "China",
  "bloc": "cn",
  "ref": "MOFCOM Announcement 2025 No. 62 (rare earth related technologies)",
  "nodes": [
   "ree"
  ],
  "kind": "licence",
  "title": "",
  "text": "Requires licences to export rare earth mining, separation, metal smelting, magnet manufacturing and recycling technologies, including production-line assembly and maintenance know-how. It also catches non-controlled exports known to support those activities abroad.",
  "status": "suspended",
  "url": "https://www.mofcom.gov.cn/zwgk/zcfb/art/2025/art_6cb42957741440c6984de696b70df9ae.html",
  "verified": true,
  "later": [
   [
    "2027-01-11",
    "suspension ran to 10 Jan 2027; check MOFCOM for an extension"
   ]
  ]
 },
 {
  "date": "2025-10-09",
  "eff": "2025-10-09",
  "who": "China",
  "bloc": "cn",
  "ref": "Unreliable Entity List Working Mechanism Announcement [2025] No. 10 (incl. TechInsights Inc. and affiliates)",
  "nodes": [
   "design"
  ],
  "kind": "entity",
  "title": "",
  "text": "Puts 14 foreign entities on the Unreliable Entity List, including the Canadian chip reverse-engineering firm TechInsights and nine affiliates. They are barred from China-related import/export and new investment in China, and Chinese parties are barred from transacting with them or sending them data.",
  "status": "in force",
  "url": "https://aqygzj.mofcom.gov.cn/flzc/gzjgfxwj/art/2025/art_902476c543bf426b8ec6a8e64142b7d0.html",
  "verified": true
 },
 {
  "date": "2025-11-01",
  "eff": "",
  "who": "United States (White House)",
  "bloc": "us",
  "ref": "White House fact sheet, 2025-11-01",
  "nodes": [
   "design",
   "dep",
   "etch",
   "clean",
   "cmp",
   "metro",
   "track",
   "foundry",
   "accel"
  ],
  "kind": "deal",
  "title": "Fact Sheet: President Donald J. Trump Strikes Deal on Economic and Trade Relations with China",
  "text": "Fact sheet stating the U.S. would suspend the Affiliates Rule for one year from 2025-11-10 as part of the U.S.-China trade arrangement. It also says China will suspend the rare-earth and related controls announced on 9 Oct 2025, issue general licences for rare earths, gallium, germanium, antimony and graphite for U.S. end users, terminate its investigations of U.S. semiconductor firms, and restore trade from Nexperia's China facilities.",
  "status": "partly implemented",
  "url": "https://www.whitehouse.gov/fact-sheets/2025/11/fact-sheet-president-donald-j-trump-strikes-deal-on-economic-and-trade-relations-with-china/",
  "verified": true
 },
 {
  "date": "2025-11-07",
  "eff": "2025-11-07",
  "who": "China",
  "bloc": "cn",
  "ref": "MOFCOM/GACC Announcement 2025 No. 70 (suspension of 2025 Nos. 55-58 and MOFCOM 2025 Nos. 61-62)",
  "nodes": [
   "ree",
   "wafers",
   "foundry",
   "hbm"
  ],
  "kind": "suspend",
  "title": "",
  "text": "Suspends MOFCOM/GACC 2025 Nos. 55, 56, 57 and 58 and MOFCOM 2025 Nos. 61 and 62 from the date of issue until 10 Nov 2026. These cover superhard materials, rare-earth equipment and materials, five more rare earths, lithium batteries and graphite, the extraterritorial rule and rare-earth technologies.",
  "status": "expired, replaced",
  "url": "https://www.mofcom.gov.cn/zwgk/zcfb/art/2025/art_b1ec77dd3f0d4762952904df7cdaadec.html",
  "verified": true
 },
 {
  "date": "2025-11-09",
  "eff": "",
  "who": "China",
  "bloc": "cn",
  "ref": "MOFCOM spokesperson remarks on EU statement regarding Nexperia (exemptions for compliant civilian-use chip exports)",
  "nodes": [
   "atp"
  ],
  "kind": "suspend",
  "title": "",
  "text": "MOFCOM said it had granted exemptions for compliant chip exports for civilian use from Nexperia-related operations. It again blamed the Dutch government's measures for the disruption.",
  "status": "in force",
  "url": "https://english.mofcom.gov.cn/News/SpokesmansRemarks/art/2025/art_e0295ce9824747038fcde1c1ff3fcc84.html",
  "verified": true
 },
 {
  "date": "2025-11-09",
  "eff": "2025-11-09",
  "who": "China",
  "bloc": "cn",
  "ref": "MOFCOM Announcement 2025 No. 72 (adjusting implementation of 2024 No. 46)",
  "nodes": [
   "ga",
   "ge"
  ],
  "kind": "suspend",
  "title": "",
  "text": "Suspends para 2 of 2024 No. 46 (presumptive denial of Ga, Ge, Sb and superhard-material exports to the US, plus stricter graphite review) until 2026-11-27. The ban on US military end users in para 1 stays.",
  "status": "in force to 27 Nov 2026",
  "url": "https://www.mofcom.gov.cn/zwgk/zcfb/art/2025/art_5c68985a6b1a46778e2e8dbff1bb1601.html",
  "verified": true,
  "later": [
   [
    "2026-11-28",
    "suspension ran to 27 Nov 2026; check MOFCOM for an extension"
   ]
  ]
 },
 {
  "date": "2025-11-10",
  "eff": "2025-11-10",
  "who": "United States (BIS)",
  "bloc": "us",
  "ref": "90 FR 50857; FR Doc 2025-19846; RIN 0694-AK34",
  "nodes": [
   "design",
   "dep",
   "etch",
   "clean",
   "cmp",
   "metro",
   "track",
   "foundry",
   "accel"
  ],
  "kind": "suspend",
  "title": "One Year Suspension of Expansion of End-User Controls for Affiliates of Certain Listed Entities",
  "text": "Suspended the Affiliates Rule for one year, to end 2026-11-09 absent extension.",
  "status": "extended to 10 Jan 2027 by 91 FR 70789",
  "url": "https://www.federalregister.gov/documents/2025/11/12/2025-19846/one-year-suspension-of-expansion-of-end-user-controls-for-affiliates-of-certain-listed-entities",
  "verified": true
 },
 {
  "date": "2025-11-13",
  "eff": "2025-12-16",
  "who": "UK",
  "bloc": "al",
  "ref": "The Export Control (Amendment) (No. 2) Regulations 2025, S.I. 2025/1197",
  "nodes": [
   "dep",
   "etch",
   "clean",
   "cmp",
   "metro",
   "track",
   "euv",
   "duv",
   "wafers",
   "resist",
   "accel",
   "ip",
   "design"
  ],
  "kind": "rule",
  "title": "",
  "text": "Moves the UK's national chip and quantum controls into the assimilated dual-use list as x5xx entries matching the EU's (3A501, 3B501, 3C507, 3D507, 3E505, 4A506). It also deletes the old PL9013-PL9015 national entries.",
  "status": "in force",
  "url": "https://www.legislation.gov.uk/uksi/2025/1197/made",
  "verified": true
 },
 {
  "date": "2025-11-14",
  "eff": "2025-11-15",
  "who": "EU",
  "bloc": "al",
  "ref": "Commission Delegated Regulation (EU) 2025/2003 of 8 September 2025 (OJ L, 2025/2003, 14.11.2025) replacing Annex I of Regulation (EU) 2021/821",
  "nodes": [
   "dep",
   "etch",
   "clean",
   "cmp",
   "metro",
   "track",
   "euv",
   "duv",
   "wafers",
   "resist",
   "accel",
   "ip",
   "design"
  ],
  "kind": "rule",
  "title": "",
  "text": "The first EU-wide listing of the plurilateral 'like-minded' controls Member States accepted on 23 May 2025, in new x5xx entries. These include semiconductor manufacturing equipment (3B501), SEM chip-imaging tools, cryogenic probers, isotopically pure silicon and germanium materials, GAAFET technology (3E505), quantum computers (4A506) and ICs with TPP of 6,000 or more (3A501.a.16).",
  "status": "in force",
  "url": "https://eur-lex.europa.eu/eli/reg_del/2025/2003/oj/eng",
  "verified": true
 },
 {
  "date": "2025-11-14",
  "eff": "2026-02-14",
  "who": "Japan",
  "bloc": "al",
  "ref": "Cabinet Order 2025 No. 376 and METI Ordinance 2025 No. 72 (Export Trade Control Order and Goods/Technology Ordinance amendments)",
  "nodes": [
   "design",
   "accel"
  ],
  "kind": "licence",
  "title": "",
  "text": "Implements the regime-agreed list changes: revised IC and semiconductor specs under item 7 and new controls on modules and assemblies with programmable logic devices (FPGAs). It also adds technologies to the public-private dialogue reporting scheme from 2026-01-14.",
  "status": "in force",
  "url": "https://www.cistec.or.jp/export/express/251117/1-20251114_gaiyo01.pdf",
  "verified": true
 },
 {
  "date": "2025-11-19",
  "eff": "2025-11-19",
  "who": "Netherlands",
  "bloc": "al",
  "ref": "Suspension of the Wbg order re Nexperia: 'Update on invoking Goods Availability Act' (19 Nov 2025); Kamerstuk 32637, nr. 717 ('Ontwikkelingen Nexperia')",
  "nodes": [
   "atp"
  ],
  "kind": "suspend",
  "title": "",
  "text": "The minister suspended, but did not revoke, the 30 September order as a goodwill step after China began granting export permits for Nexperia chips. Separate Enterprise Chamber measures (a court track, not government action) were unaffected.",
  "status": "suspended",
  "url": "https://www.government.nl/documents/diplomatic-statements/2025/11/19/update-on-invoking-goods-availability-act",
  "verified": true
 },
 {
  "date": "2025-11-24",
  "eff": "2025-11-15",
  "who": "Netherlands",
  "bloc": "al",
  "ref": "Regeling van 20 november 2025, nr. BZ2520952, intrekking Regeling aanvullende controlemaatregelen en wijziging Regeling geavanceerde productieapparatuur voor halfgeleiders, Stcrt. 2025, 38653",
  "nodes": [
   "dep",
   "etch",
   "clean",
   "cmp",
   "metro",
   "track",
   "euv",
   "duv"
  ],
  "kind": "rule",
  "title": "",
  "text": "After Delegated Regulation (EU) 2025/2003 took most Dutch national items into EU Annex I, this rule withdraws the 2024 supplementary-controls regulation and trims the chip-tool annex to the items still national-only. It applies retroactively from 15 November 2025, and Customs swapped existing licences for EU Art. 12 licences.",
  "status": "in force",
  "url": "https://zoek.officielebekendmakingen.nl/stcrt-2025-38653.html",
  "verified": true
 },
 {
  "date": "2025-12-08",
  "eff": "",
  "who": "United States (White House)",
  "bloc": "us",
  "ref": "Presidential announcement 2025-12-08 (Truth Social), referenced in BIS press release of 2026-01-13",
  "nodes": [
   "accel"
  ],
  "kind": "deal",
  "title": "Announcement allowing NVIDIA H200 sales to approved customers in China",
  "text": "The President announced H200 and similar chips could ship to approved customers in China; BIS's 2026-01-13 release confirms the announcement. The 25% payment term and the exclusion of Blackwell/Rubin are from press reports only.",
  "status": "implemented",
  "url": "https://www.bis.gov/press-release/department-commerce-revises-license-review-policy-semiconductors-exported-china",
  "verified": true
 },
 {
  "date": "2025-12-18",
  "eff": "2025-12-18",
  "who": "United States (Congress)",
  "bloc": "us",
  "ref": "Comprehensive Outbound Investment National Security (COINS) Act of 2025, title LXXXV of the FY2026 NDAA, Pub. L. 119-60 (approved 18 Dec 2025)",
  "nodes": [
   "design",
   "eda",
   "euv",
   "duv",
   "track",
   "dep",
   "etch",
   "clean",
   "cmp",
   "implant",
   "metro",
   "foundry",
   "hbm",
   "cowos",
   "accel"
  ],
  "kind": "statute",
  "title": "Comprehensive Outbound Investment National Security Act of 2025",
  "text": "Puts the outbound investment program in statute (Title VIII of the Defense Production Act). The prohibited technologies are, as specified by regulation, \"(i) Advanced semiconductor technology and microelectronics. (ii) Artificial intelligence systems. (iii) Quantum information technologies. (iv) High-performance computing and supercomputing. (v) Hypersonic systems.\"",
  "status": "in force; implementing rules proposed (91 FR 67396)",
  "url": "https://www.govinfo.gov/content/pkg/PLAW-119publ60/html/PLAW-119publ60.htm",
  "verified": true
 },
 {
  "date": "2025-12-23",
  "eff": "2025-12-23",
  "who": "United States (USTR)",
  "bloc": "us",
  "ref": "90 FR 60848; FR Doc 2025-23912 (Section 301 action: China's targeting of the semiconductor industry); investigation initiated 23 Dec 2024, notice of initiation 89 FR 106725 (30 Dec 2024)",
  "nodes": [
   "design",
   "foundry"
  ],
  "kind": "tariff",
  "title": "Notice of Action: China's Acts, Policies, and Practices Related to Targeting of the Semiconductor Industry for Dominance",
  "text": "USTR found China's targeting of the semiconductor industry actionable under Section 301 and is \"taking tariff action now on semiconductors from China, with an initial tariff level of 0 percent, increasing in 18 months on June 23, 2027, to a rate to be announced not fewer than 30 days prior to that date\". Effective 23 Dec 2025; published 29 Dec 2025.",
  "status": "in force; 0% until 23 Jun 2027",
  "url": "https://www.federalregister.gov/documents/2025/12/29/2025-23912/notice-of-action-chinas-acts-policies-and-practices-related-to-targeting-of-the-semiconductor",
  "verified": true
 },
 {
  "date": "2026-01-07",
  "eff": "2026-09-08",
  "who": "China",
  "bloc": "cn",
  "ref": "MOFCOM Announcement 2026 No. 2 (AD investigation, dichlorosilane from Japan); preliminary determination 2026 No. 37 (2026-09-07)",
  "nodes": [
   "gases"
  ],
  "kind": "investigation",
  "title": "",
  "text": "Anti-dumping case on Japanese dichlorosilane, a deposition gas for logic, memory and analog chip films. A preliminary affirmative determination on 2026-09-07 imposed cash deposits from 2026-09-08: 99.2% for Shin-Etsu Chemical and all others, 80.8% for Denal Silane.",
  "status": "in force",
  "url": "https://trb.mofcom.gov.cn/myjjdc/art/2026/art_e53f2b4156484a9f91d45ac3a0bd7391.html",
  "verified": true
 },
 {
  "date": "2026-01-13",
  "eff": "2026-01-15",
  "who": "United States (BIS)",
  "bloc": "us",
  "ref": "91 FR 1684; FR Doc 2026-00789; RIN 0694-AK43",
  "nodes": [
   "accel",
   "hbm"
  ],
  "kind": "license",
  "title": "Revision to License Review Policy for Advanced Computing Commodities",
  "text": "Moved license review for China/Macau from presumption of denial to case-by-case for commercially available chips with TPP below 21,000 and total DRAM bandwidth below 6,500 GB/s (e.g., NVIDIA H200, AMD MI325X), if exporters certify U.S. supply, no diversion of foundry capacity, recipient security procedures, and independent U.S. third-party testing; China volume capped at 50% of U.S. shipments of the same product.",
  "status": "in force",
  "url": "https://www.federalregister.gov/documents/2026/01/15/2026-00789/revision-to-license-review-policy-for-advanced-computing-commodities",
  "verified": true
 },
 {
  "date": "2026-01-14",
  "eff": "2026-01-15 (12:01 a.m. EST)",
  "who": "United States (White House)",
  "bloc": "us",
  "ref": "Proclamation 11002; 91 FR 2443; FR Doc 2026-01052",
  "nodes": [
   "accel"
  ],
  "kind": "rule",
  "title": "Adjusting Imports of Semiconductors, Semiconductor Manufacturing Equipment, and Their Derivative Products Into the United States",
  "text": "Section 232 proclamation imposing a 25% ad valorem duty on certain advanced computing chips and derivative products listed in its Annex when imports do not support the U.S. technology supply-chain buildout. Press reports tie it to the H200 export arrangement; the text does not mention exports.",
  "status": "in force",
  "url": "https://www.federalregister.gov/documents/2026/01/20/2026-01052/adjusting-imports-of-semiconductors-semiconductor-manufacturing-equipment-and-their-derivative",
  "verified": true
 },
 {
  "date": "2026-04-07",
  "eff": "2026-04-07",
  "who": "United States (BIS)",
  "bloc": "us",
  "ref": "91 FR 17851; FR Doc 2026-06851; RIN 0694-AJ98",
  "nodes": [
   "design",
   "foundry",
   "cowos"
  ],
  "kind": "rule",
  "title": "Extension of Authorized Integrated Circuit (IC) Designer Status and Application Deadline To Become an Approved IC Designer",
  "text": "Extended by about eight months, to 2026-12-31, the triggering date for authorized IC designer status and the deadline to apply for approved IC designer status under the foundry due-diligence rule.",
  "status": "in force",
  "url": "https://www.federalregister.gov/documents/2026/04/09/2026-06851/extension-of-authorized-integrated-circuit-ic-designer-status-and-application-deadline-to-become-an",
  "verified": true
 },
 {
  "date": "2026-05-31",
  "eff": "",
  "who": "United States (BIS)",
  "bloc": "us",
  "ref": "BIS guidance, 2026-05-31",
  "nodes": [
   "accel"
  ],
  "kind": "guidance",
  "title": "Guidance Regarding Enforcement of License Requirements for Advanced Computing Items for Entities Headquartered in Country Group D:5 and Macau",
  "text": "States that the license requirement under 15 CFR 742.6(a)(6)(iii)(A) for 3A090.a/4A090.a items going to entities headquartered in D:5 or Macau (or with such an ultimate parent), wherever located, is still enforced despite AI Diffusion non-enforcement; bona fide data-center operators need not stop current use until further notice.",
  "status": "in force; requirement moved to § 744.23(a)(3)(i)(A) by RIN 0694-AK50 effective 19 Nov 2026",
  "url": "https://www.bis.gov/media/documents/bis-guidance-may-31-2026.pdf",
  "verified": true,
  "later": [
   [
    "2026-11-19",
    "requirement moved to § 744.23(a)(3)(i)(A) effective 19 Nov 2026 (FR Doc 2026-23529)"
   ]
  ]
 },
 {
  "date": "2026-07-10",
  "eff": "2026-07-10",
  "who": "United States (BIS)",
  "bloc": "us",
  "ref": "91 FR 43034; FR Doc 2026-14132; RIN 0694-AK54",
  "nodes": [
   "accel"
  ],
  "kind": "rule",
  "title": "Enhanced Favorable Treatment for the United Arab Emirates Under the Export Administration Regulations",
  "text": "Moved the UAE from Country Groups D:3/D:4 to A:5 and gave the UAE Government and approved UAE companies license-free access to advanced computing items, citing the May 2025 U.S.-UAE AI cooperation framework.",
  "status": "in force",
  "url": "https://www.federalregister.gov/documents/2026/07/14/2026-14132/enhanced-favorable-treatment-for-the-united-arab-emirates-under-the-export-administration",
  "verified": true
 },
 {
  "date": "2026-08-06",
  "eff": "2026-12-04 (12:01 a.m. ET)",
  "who": "United States (White House)",
  "bloc": "us",
  "ref": "Proclamation 11052; 91 FR 51975; FR Doc 2026-16400. BIS anti-stockpiling rule 91 FR 60505 (FR Doc 2026-19537)",
  "nodes": [
   "wafers"
  ],
  "kind": "tariff",
  "status": "pending: applies from 4 Dec 2026",
  "title": "Adjusting Imports of Polysilicon and Its Derivatives Into the United States",
  "text": "Section 232 action on polysilicon, which the proclamation calls \"the base material for semiconductors\" and solar products. From 4 Dec 2026, imports of the polysilicon products listed in its annexes face minimum import prices ($21/kg for polysilicon, $100/kg for polysilicon ingots and wafers) and an additional 15% duty on ingots and derivative products. A BIS temporary final rule (91 FR 60505) sets out how BIS will restrict companies found stockpiling before that date. The annex tariff lines were not checked for semiconductor-grade wafers.",
  "url": "https://www.federalregister.gov/documents/2026/08/11/2026-16400/adjusting-imports-of-polysilicon-and-its-derivatives-into-the-united-states",
  "verified": true,
  "later": [
   [
    "2026-12-04",
    "in force since 4 Dec 2026"
   ]
  ]
 },
 {
  "date": "2026-08-31",
  "eff": "2026-09-01",
  "who": "South Korea",
  "bloc": "al",
  "ref": "MOTIR Notice No. 2026-101 (31 Aug 2026), amending the Strategic Items Import/Export Notice (전략물자 수출입고시); draft Public Notice 2026-496 of 13 Jul 2026",
  "nodes": [
   "dep",
   "etch",
   "clean",
   "cmp",
   "metro",
   "track",
   "euv",
   "duv",
   "accel",
   "design"
  ],
  "kind": "licence",
  "title": "",
  "text": "Updates Korea's dual-use and military lists in line with the regimes and multilateral coordination, effective 2026-09-01. Per law-firm reporting, the national semiconductor entries 3A901-3A903 become 3A501-3A504 and add AI ICs, FPGA-based assemblies (3A502.i) and specified lithography, etch and deposition tools. The exporter's undertaking form is also abolished.",
  "status": "in force",
  "url": "https://www.motir.go.kr/kor/article/ATCL0c554f816/65082/view",
  "verified": true
 },
 {
  "date": "2026-09-14",
  "eff": "",
  "who": "EU",
  "bloc": "al",
  "ref": "Commission Delegated Regulation C(2026) 6323 of 14 September 2026 updating Annex I of Regulation (EU) 2021/821 (2026 update)",
  "nodes": [
   "dep",
   "etch",
   "clean",
   "cmp",
   "metro",
   "track",
   "euv",
   "duv",
   "wafers",
   "resist",
   "accel",
   "maskinsp"
  ],
  "kind": "rule",
  "title": "",
  "text": "The 2026 Annex I update adds Mo/Ru ALD tools, EUV mask and reticle development and inspection equipment, single-wafer cleaning tools, and further advanced-computing ICs and assemblies. It takes effect on Official Journal publication after the two-month scrutiny period.",
  "status": "pending",
  "url": "https://policy.trade.ec.europa.eu/news/2026-update-eu-control-list-dual-use-items-2026-09-14_en",
  "verified": true
 },
 {
  "date": "2026-10-16",
  "eff": "2026-10-16",
  "who": "China",
  "bloc": "cn",
  "ref": "MOFCOM/MOST Announcement 2026 No. 48 (draft revision of the Catalogue of Technologies Prohibited/Restricted from Export; interim pre-export registration)",
  "nodes": [
   "accel"
  ],
  "kind": "rule",
  "title": "",
  "text": "Proposes 40 AI, biomedicine and photovoltaic technologies for the export-prohibited or restricted catalogue, including 23 AI items covering large models, agents, compute clusters and information processing. Comments closed 2026-11-15. Exports of the listed technologies must be registered beforehand in the meantime.",
  "status": "draft catalogue pending; interim pre-export registration in force since 2026-10-16",
  "url": "https://aqygzj.mofcom.gov.cn/flzc/gzjgfxwj/art/2026/art_c99f95ca0cd043829ac9991495fc283c.html",
  "verified": true
 },
 {
  "date": "2026-10-26",
  "eff": "",
  "who": "United States (Treasury)",
  "bloc": "us",
  "ref": "91 FR 67396; FR Doc 2026-21786 (proposed rule, Outbound Investment Security Program Regulations)",
  "nodes": [
   "design",
   "eda",
   "euv",
   "duv",
   "track",
   "dep",
   "etch",
   "clean",
   "cmp",
   "implant",
   "metro",
   "foundry",
   "hbm",
   "cowos",
   "accel"
  ],
  "kind": "rule",
  "title": "Outbound Investment Security Program Regulations",
  "text": "Proposed rule implementing Subtitle C of the COINS Act: U.S. persons would notify Treasury of certain transactions with foreign persons engaged in notifiable technologies and be prohibited from certain transactions with those engaged in prohibited technologies. It carries over definitions from 31 CFR part 850 where consistent with the Act. Comments due 7 Dec 2026.",
  "status": "proposed; comments due 7 Dec 2026",
  "url": "https://www.federalregister.gov/documents/2026/10/26/2026-21786/outbound-investment-security-program-regulations",
  "verified": true,
  "later": [
   [
    "2026-12-08",
    "proposed; comment period closed 7 Dec 2026"
   ]
  ]
 },
 {
  "date": "2026-10-29",
  "eff": "2026-12-01",
  "who": "UK",
  "bloc": "al",
  "ref": "The Export Control (Amendment) Regulations 2026, S.I. 2026/1150",
  "nodes": [
   "dep",
   "etch",
   "clean",
   "cmp",
   "metro",
   "track",
   "euv",
   "duv",
   "maskinsp"
  ],
  "kind": "rule",
  "title": "",
  "text": "Adds new 3B501 items: Mo/Ru deposition tools, EUV photoresist coat/develop equipment, EUV mask-blank defect inspection, single-wafer cleaning, EUV pattern-shaping, and EUV mask multilayer-reflector deposition tools. It also adds wide-bandgap power semiconductors (3A501.h) and extends software control 3D002 to the new tools.",
  "status": "pending: in force 1 Dec 2026",
  "url": "https://www.legislation.gov.uk/uksi/2026/1150/made",
  "verified": true,
  "later": [
   [
    "2026-12-01",
    "in force since 1 Dec 2026"
   ]
  ]
 },
 {
  "date": "2026-11-05",
  "eff": "2026-11-09",
  "who": "United States (BIS)",
  "bloc": "us",
  "ref": "91 FR 70789; FR Doc 2026-22793; RIN 0694-AK34",
  "nodes": [
   "design",
   "dep",
   "etch",
   "clean",
   "cmp",
   "metro",
   "track",
   "foundry",
   "accel"
  ],
  "kind": "suspend",
  "title": "Extension of the Suspension of Expansion of End-User Controls for Affiliates of Certain Listed Entities",
  "text": "Extended the Affiliates Rule suspension, set to end 2026-11-09, through 2027-01-10.",
  "status": "in force",
  "url": "https://www.federalregister.gov/documents/2026/11/09/2026-22793/extension-of-the-suspension-of-expansion-of-end-user-controls-for-affiliates-of-certain-listed",
  "verified": true
 },
 {
  "date": "2026-11-09",
  "eff": "2026-11-11",
  "who": "China",
  "bloc": "cn",
  "ref": "MOFCOM/GACC Announcement 2026 No. 58 (continued suspension of 2025 Nos. 55-58 and MOFCOM 2025 Nos. 61-62)",
  "nodes": [
   "ree",
   "wafers",
   "foundry",
   "hbm"
  ],
  "kind": "suspend",
  "title": "",
  "text": "Continues the suspension of MOFCOM/GACC 2025 Nos. 55, 56, 57 and 58 and MOFCOM 2025 Nos. 61 and 62 from 11 Nov 2026 to 10 Jan 2027. These include the No. 61 extraterritorial rare-earth rule with its 14 nm / 256-layer case-by-case review. The No. 70 suspension therefore did not lapse.",
  "status": "in force",
  "url": "https://www.mofcom.gov.cn/zcfb/zc/art/2026/art_2120417f1e21472bbe3efafdfcbd3f43.html",
  "verified": true,
  "later": [
   [
    "2027-01-11",
    "suspension period ended 10 Jan 2027; check MOFCOM for an extension"
   ]
  ]
 },
 {
  "date": "2026-11-16",
  "eff": "2026-11-19 (on FR publication)",
  "who": "United States (BIS)",
  "bloc": "us",
  "ref": "RIN 0694-AK50; FR Doc 2026-23529 (filed for public inspection 2026-11-16 16:15 ET; publication 2026-11-19); docket BIS-2026-0628",
  "nodes": [
   "accel",
   "foundry",
   "cowos",
   "design"
  ],
  "kind": "rule",
  "title": "Addressing Remote Access to Advanced Semiconductors",
  "text": "Interim final rule filed for Federal Register public inspection on 16 Nov 2026 as FR Doc 2026-23529, for publication on 19 Nov 2026, the date it takes effect (\"This rule is effective [INSERT DATE OF PUBLICATION IN THE FEDERAL REGISTER]\"). New § 744.24 requires a licence to supply data centers anywhere that give companies headquartered in D:5 countries or Macau access to more than 12,000,000 aggregate TPP. New licence requirement for advanced chips to Indonesia, Malaysia, Singapore, Thailand and Brazil, excluding companies headquartered in, or with an ultimate parent headquartered in, the United States, if the exporter files reports under new § 743.10. New § 744.23(a)(3)(i)(C) requires a licence when a front-end fabricator or OSAT exports applicable advanced-node 3A090.a chips designed by a company that is neither an approved nor an authorized IC designer. Formally rescinds the AI Diffusion Rule, including ECCN 4E091, and removes the Data Center VEU authorization. Moves the licence requirement for advanced computing items going to entities headquartered in D:5 or Macau from § 742.6(a)(6)(iii)(A) to § 744.23(a)(3)(i)(A). Comments are due 60 days after publication.",
  "status": "filed 16 Nov 2026; effective on publication 19 Nov 2026",
  "url": "https://public-inspection.federalregister.gov/2026-23529.pdf",
  "verified": true,
  "later": [
   [
    "2026-11-19",
    "in force since 19 Nov 2026 (FR Doc 2026-23529)"
   ]
  ]
 }
];

export const CONTROLS_ASOF = '18 November 2026';
// Day in America/New_York; a control's `later` steps switch its status on the dates they name.
export const todayET = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
export function statusOn(c, day) { let s = c.status0 ?? c.status; for (const [d, t] of c.later || []) if (day >= d) s = t; return s; }
const _day = todayET();
for (const c of CONTROLS) { c.status0 = c.status; c.status = statusOn(c, _day); }
export const CONTROLS_NOTE = "Status reflects what the linked sources showed on 16 November 2026 (entries added 18 November 2026). Statuses with a known start or end date switch on that date, U.S. Eastern time, and say so; after an end date the entry asks you to check for an extension rather than assume one. The BIS interim final rule RIN 0694-AK50 was filed for Federal Register public inspection on 16 November 2026 as FR Doc 2026-23529 and takes effect on its publication date, 19 November 2026; entries it removes or rescinds (the Data Center VEU, the AI Diffusion Rule) switch to their new status on that date. China's suspension of MOFCOM/GACC 2025 Nos. 55\u201358 and MOFCOM 2025 Nos. 61 and 62 runs to 10 January 2027 (2026 No. 58), and its suspension of the 2024 presumptive denial of gallium, germanium and antimony exports to the U.S. ends 27 November 2026 with no extension published yet; recheck after that date. Japanese entries link METI texts hosted by CISTEC because meti.go.jp refused automated access. The CHIPS Act guardrails and the outbound investment program are investment controls, listed with the export controls because they target the same stages.";
