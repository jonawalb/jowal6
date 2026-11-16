// Policy cards: the real tools behind the game's levers, with legal basis and status as checked on eCFR,
// federalregister.gov, bis.gov and the Congress.gov API. 'lever' links a card to a game lever.
export const POLICIES = [
 {
  "id": "entity-list",
  "name": "Entity List",
  "what": "BIS adds entities or high-diversion-risk addresses to Supplement No. 4 to Part 744 and imposes license requirements, limits on license exceptions, and license review policies for them.",
  "legalBasis": "15 CFR 744.11; Supp. No. 4 to 15 CFR Part 744; ECRA 50 U.S.C. 4801 et seq.",
  "url": "https://www.ecfr.gov/current/title-15/subtitle-B/chapter-VII/subchapter-C/part-744/section-744.11",
  "date": null,
  "status": "In force (eCFR current through 2026-11-09)",
  "checked": "2026-11-16",
  "lever": "list"
 },
 {
  "id": "affiliates-rule",
  "name": "Affiliates (50 percent) rule",
  "what": "Interim final rule making any entity at least 50 percent owned by one or more Entity List entities (and certain military end users and sanctioned parties) automatically subject to the same restrictions.",
  "legalBasis": "90 FR 47201 (Sept. 30, 2025); stayed by 90 FR 50857 (Nov. 12, 2025); stay extended by 91 FR 70789 (Nov. 9, 2026)",
  "url": "https://www.federalregister.gov/documents/2026/11/09/2026-22793/extension-of-the-suspension-of-expansion-of-end-user-controls-for-affiliates-of-certain-listed",
  "date": "Effective 2025-09-29; stayed from 2025-11-10",
  "status": "Suspended until 2027-01-10 (the one-year stay was due to end 2026-11-09, then extended)",
  "checked": "2026-11-16"
 },
 {
  "id": "end-use-checks",
  "name": "End-use checks (prelicense inspections and post-shipment verifications)",
  "what": "ECRA authorizes Commerce to conduct prelicense inspections and post-shipment verifications, including outside the United States (50 U.S.C. 4820(a)(7)). 15 CFR 734.11 is the general EAR provision on BIS activities outside the United States.",
  "legalBasis": "ECRA sec. 1761(a)(7), 50 U.S.C. 4820(a)(7); see also 15 CFR 734.11 (added 85 FR 73411, 73413, Nov. 18, 2020)",
  "url": "https://www.ecfr.gov/current/title-15/subtitle-B/chapter-VII/subchapter-C/part-734/section-734.11",
  "date": "2020-11-18",
  "status": "In force",
  "checked": "2026-11-16",
  "lever": "euc"
 },
 {
  "id": "unverified-list",
  "name": "Unverified List (UVL)",
  "what": "For parties on the UVL, exporters must obtain a signed UVL statement before license-free exports; in it the party agrees to cooperate with end-use checks, including post-shipment verification. License exceptions are not available when a UVL party is in the transaction (15 CFR 740.2(a)(17), cross-referenced in 744.15(a)).",
  "legalBasis": "15 CFR 744.15; Supp. No. 6 to Part 744",
  "url": "https://www.ecfr.gov/current/title-15/subtitle-B/chapter-VII/subchapter-C/part-744/section-744.15",
  "date": null,
  "status": "In force",
  "checked": "2026-11-16",
  "lever": "hub"
 },
 {
  "id": "advanced-computing-license",
  "name": "Advanced computing license requirements (3A090, 4A090)",
  "what": "A license is required for advanced computing chips (3A090) and computers containing them (4A090) to Macau and Country Group D:5 (including China) and, under 744.23, to entities headquartered there; the 2023 rules also covered D:1 and D:4 (excluding A:5/A:6). The AI Diffusion rule's worldwide (3A090.a) and wider (3A090.b) requirements remain in the CFR text but BIS has said it will not enforce them. D:5/Macau applications face a presumption of denial unless the Jan. 2026 case-by-case policy applies.",
  "legalBasis": "15 CFR 742.6(a)(6), 742.6(b)(10); 15 CFR 744.23; ECCNs 3A090, 4A090 (Supp. No. 1 to Part 774); first imposed by 87 FR 62186 (Oct. 13, 2022)",
  "url": "https://www.ecfr.gov/current/title-15/subtitle-B/chapter-VII/subchapter-C/part-742/section-742.6",
  "date": "2022-10-07 (first effective)",
  "status": "In force; China/Macau case-by-case carve-out added Jan. 2026 (see h200-case-by-case). Pending: RIN 0694-AK50 (released 2026-11-16, not yet published in the Federal Register as of 16 Nov 2026; effective on Federal Register publication) adds a license requirement for Indonesia, Malaysia, Singapore, Thailand and Brazil.",
  "checked": "2026-11-16"
 },
 {
  "id": "ai-diffusion",
  "name": "AI Diffusion rule and its rescission",
  "what": "January 2025 interim final rule set worldwide licensing, country TPP allocations, and License Exception AIA. On 2025-05-13 BIS announced its rescission, told enforcement officials not to enforce it, and said a regulation formalizing the rescission would follow.",
  "legalBasis": "90 FR 4544 (Jan. 15, 2025); BIS press release May 13, 2025",
  "url": "https://www.bis.gov/press-release/department-commerce-announces-rescission-biden-era-artificial-intelligence-diffusion-rule-strengthens",
  "date": "Effective 2025-01-13; compliance date 2025-05-15; rescission announced 2025-05-13",
  "status": "Not enforced per BIS (May 13, 2025). Formal rescission is in BIS interim final rule RIN 0694-AK50, released 2026-11-16, not yet published in the Federal Register as of 16 Nov 2026; effective on Federal Register publication. Until then the rule text (e.g. 740.27 License Exception AIA, 742.6(b)(10) country allocations) still appears in eCFR (current through 2026-11-09).",
  "checked": "2026-11-16"
 },
 {
  "id": "may-2025-guidance",
  "name": "May 2025 guidance: Huawei Ascend chips, diversion red flags, AI training",
  "what": "Alongside the rescission, BIS issued guidance on the risks of using PRC advanced computing ICs, including specific Huawei Ascend chips; on using US chips to train Chinese AI models; and on protecting supply chains against diversion.",
  "legalBasis": "BIS guidance (not a regulation), May 13, 2025",
  "url": "https://www.bis.gov/press-release/department-commerce-announces-rescission-biden-era-artificial-intelligence-diffusion-rule-strengthens",
  "date": "2025-05-13",
  "status": "Guidance issued; the press release lists it but the guidance texts were not separately fetched",
  "checked": "2026-11-16"
 },
 {
  "id": "h200-case-by-case",
  "name": "H200-class license review policy for China and Macau",
  "what": "Changes review of license applications for Nvidia H200-equivalent and less advanced chips to China and Macau from presumption of denial to case-by-case, if the chips are commercially available in the US and the exporter certifies US supply, no diversion of foundry capacity, recipient security procedures, and independent US third-party testing.",
  "legalBasis": "91 FR 1684 (Jan. 15, 2026); 15 CFR 742.6(b)(10)(iii)(A)(1) (TPP < 21,000 and total DRAM bandwidth < 6,500 GB/s; extra information under Supp. No. 2 to Part 748 para. (dd))",
  "url": "https://www.federalregister.gov/documents/2026/01/15/2026-00789/revision-to-license-review-policy-for-advanced-computing-commodities",
  "date": "2026-01-15",
  "status": "In force (in eCFR as of 2026-11-09)",
  "checked": "2026-11-16",
  "lever": "relax"
 },
 {
  "id": "sec232-chip-tariff",
  "name": "Section 232 tariff on certain advanced computing chips",
  "what": "Proclamation 11002 imposes a 25 percent ad valorem duty on imports of certain advanced computing chips and derivative products listed in its Annex, except when imported to support the US technology supply-chain buildout.",
  "legalBasis": "Proclamation 11002, 91 FR 2443 (Jan. 20, 2026); Section 232",
  "url": "https://www.federalregister.gov/documents/2026/01/20/2026-01052/adjusting-imports-of-semiconductors-semiconductor-manufacturing-equipment-and-their-derivative",
  "date": "Signed 2026-01-14",
  "status": "Issued; the proclamation text found does not mention China sales or a revenue share",
  "checked": "2026-11-16"
 },
 {
  "id": "iaas-kyc",
  "name": "Cloud (IaaS) know-your-customer proposed rule",
  "what": "Proposed rule requiring US IaaS providers to verify foreign customers' identities and to report when a foreign person trains a large AI model with potential malicious-cyber capabilities.",
  "legalBasis": "89 FR 5698 (Jan. 29, 2024) NPRM; EO 13984 (Jan. 19, 2021); EO 14110 (Oct. 30, 2023)",
  "url": "https://www.federalregister.gov/documents/2024/01/29/2024-01580/taking-additional-steps-to-address-the-national-emergency-with-respect-to-significant-malicious",
  "date": "2024-01-29 (comments closed 2024-04-29)",
  "status": "Proposed only; no final rule found in the Federal Register as of 2026-11-16. Separately, BIS interim final rule RIN 0694-AK50 (released 2026-11-16, not yet published in the Federal Register as of 16 Nov 2026; effective on Federal Register publication) controls exports of advanced chips to data centers that supply significant compute to D:5- or Macau-headquartered companies; see the remote-access card.",
  "checked": "2026-11-16",
  "lever": "kyc"
 },
 {
  "id": "remote-access-ifr",
  "name": "Remote access rule: data centers serving D:5 companies, and five higher-risk destinations",
  "what": "New 15 CFR 744.24 requires a license to export, reexport or transfer advanced computing items (3A090 except .c, 4A090 and related .z items) with knowledge they are destined to a data center anywhere that provides more than 12,000,000 aggregate TPP, at one site or through linked data centers, to companies headquartered (or with an ultimate parent headquartered) in Country Group D:5 or Macau; review is case-by-case, commercial recommender systems are excluded by the regulatory text (744.24(b)(2)), although the preamble says such operators must obtain a license after 90 days, and data centers already serving such companies must obtain a license within 90 days of the effective date. It also adds a license requirement for Indonesia, Malaysia, Singapore, Thailand and Brazil (case-by-case review), not applying to US-headquartered consignees or end users when 743.10 reporting is met, and formally rescinds the AI Diffusion rule's regulations.",
  "legalBasis": "BIS interim final rule, RIN 0694-AK50, \"Addressing Remote Access to Advanced Semiconductors\" (new 15 CFR 744.24; amended 742.6(a)(6)(iii)(A); new 743.10)",
  "url": "https://www.bis.gov/media/documents/rin-0694-ak50.pdf",
  "date": "Released 2026-11-16",
  "status": "Released 2026-11-16; not yet published in the Federal Register as of 16 Nov 2026. Effective on the date of Federal Register publication; comments due 60 days after publication.",
  "checked": "2026-11-16"
 },
 {
  "id": "chip-security-act",
  "name": "Chip Security Act (chip location verification)",
  "what": "Bill on technical security measures for advanced chips to detect and prevent smuggling, including location verification.",
  "legalBasis": "H.R. 3447 and S. 1705, 119th Congress",
  "url": "https://www.congress.gov/bill/119th-congress/house-bill/3447",
  "date": "Introduced 2025-05-08 (S.) / 2025-05-15 (H.R.)",
  "status": "Pending bill. H.R. 3447 ordered reported (amended) by House Foreign Affairs, 42-0, 2026-03-26; no floor action. S. 1705 referred to Senate Banking 2025-05-08; no further action (Congress.gov API, checked 2026-11-16). Not enacted.",
  "checked": "2026-11-16",
  "lever": "lv"
 },
 {
  "id": "ecra-penalties",
  "name": "ECRA penalties",
  "what": "Criminal: up to $1,000,000 fine and, for individuals, up to 20 years in prison per violation. Civil: per violation, the greater of the inflation-adjusted cap ($374,474) or twice the transaction value.",
  "legalBasis": "50 U.S.C. 4819(b) and (c); 15 CFR 6.3(c)(6) (adjusted from $364,992 to $374,474)",
  "url": "https://www.ecfr.gov/current/title-15/subtitle-A/part-6/section-6.3",
  "date": "Current 15 CFR 6.3 (adjustment published 89 FR 106308, Dec. 30, 2024, effective 2025-01-15)",
  "status": "In force; eCFR current through 2026-11-09 shows $374,474",
  "checked": "2026-11-16",
  "lever": "agents"
 },
 {
  "id": "foundry-due-diligence",
  "name": "Foundry due diligence rule",
  "what": "Interim final rule adding due diligence procedures for foundries and OSATs handling advanced computing ICs (approved or authorized IC designer framework referenced in Note 1 to 3A090.a).",
  "legalBasis": "90 FR 5298 (Jan. 16, 2025)",
  "url": "https://www.federalregister.gov/documents/2025/01/16/2025-00711/implementation-of-additional-due-diligence-measures-for-advanced-computing-integrated-circuits",
  "url2": "https://www.federalregister.gov/documents/2026/04/09/2026-06851",
  "date": "2025-01-16",
  "status": "In force (eCFR cross-references to 'approved or authorized integrated circuit designer' remain as of 2026-11-09); authorized IC designer trigger date and approved-designer application deadline extended to 2026-12-31 by 91 FR 17851 (Apr. 9, 2026)",
  "checked": "2026-11-16"
 }
];
export const TIMELINE = [
 {
  "date": "2022-10-13",
  "event": "BIS first advanced computing and semiconductor manufacturing controls (87 FR 62186; effective 2022-10-07)",
  "url": "https://www.federalregister.gov/documents/2022/10/13/2022-21658/implementation-of-additional-export-controls-certain-advanced-computing-and-semiconductor"
 },
 {
  "date": "2023-10-25",
  "event": "BIS updates advanced computing controls (88 FR 73458) and semiconductor manufacturing item controls (88 FR 73424); effective 2023-11-17",
  "url": "https://www.federalregister.gov/documents/2023/10/25/2023-23055/implementation-of-additional-export-controls-certain-advanced-computing-items-supercomputer-and"
 },
 {
  "date": "2024-01-29",
  "event": "Commerce proposes IaaS customer-identification and AI-training reporting rule (89 FR 5698)",
  "url": "https://www.federalregister.gov/documents/2024/01/29/2024-01580/taking-additional-steps-to-address-the-national-emergency-with-respect-to-significant-malicious"
 },
 {
  "date": "2024-12-05",
  "event": "Foreign direct product rule additions, SME and HBM controls (89 FR 96790; effective 2024-12-02)",
  "url": "https://www.federalregister.gov/documents/2024/12/05/2024-28270/foreign-produced-direct-product-rule-additions-and-refinements-to-controls-for-advanced-computing"
 },
 {
  "date": "2025-01-15",
  "event": "Framework for AI Diffusion interim final rule (90 FR 4544)",
  "url": "https://www.federalregister.gov/documents/2025/01/15/2025-00636/framework-for-artificial-intelligence-diffusion"
 },
 {
  "date": "2025-01-16",
  "event": "Foundry/OSAT due diligence rule for advanced computing ICs (90 FR 5298)",
  "url": "https://www.federalregister.gov/documents/2025/01/16/2025-00711/implementation-of-additional-due-diligence-measures-for-advanced-computing-integrated-circuits"
 },
 {
  "date": "2025-04-09",
  "event": "USG informs Nvidia that H20-class chips need a license for China (incl. Hong Kong and Macau) and D:5, citing diversion risk (Nvidia 8-K; no FR rule)",
  "url": "https://www.sec.gov/Archives/edgar/data/1045810/000104581025000082/nvda-20250409.htm"
 },
 {
  "date": "2025-05-13",
  "event": "BIS announces AI Diffusion rescission and non-enforcement; Huawei Ascend and diversion guidance",
  "url": "https://www.bis.gov/press-release/department-commerce-announces-rescission-biden-era-artificial-intelligence-diffusion-rule-strengthens"
 },
 {
  "date": "2025-09-30",
  "event": "Affiliates (50 percent) rule extends Entity List restrictions to majority-owned affiliates (90 FR 47201)",
  "url": "https://www.federalregister.gov/documents/2025/09/30/2025-19001/expansion-of-end-user-controls-to-cover-affiliates-of-certain-listed-entities"
 },
 {
  "date": "2025-11-12",
  "event": "Affiliates rule suspended for one year, effective 2025-11-10 (90 FR 50857)",
  "url": "https://www.federalregister.gov/documents/2025/11/12/2025-19846/one-year-suspension-of-expansion-of-end-user-controls-for-affiliates-of-certain-listed-entities"
 },
 {
  "date": "2026-01-15",
  "event": "H200-class chips to China/Macau move to case-by-case license review (91 FR 1684)",
  "url": "https://www.federalregister.gov/documents/2026/01/15/2026-00789/revision-to-license-review-policy-for-advanced-computing-commodities"
 },
 {
  "date": "2026-07-14",
  "event": "UAE moved to Country Group A:5 with license-free access to advanced computing items for the UAE Government and approved entities (91 FR 43034; effective 2026-07-10)",
  "url": "https://www.federalregister.gov/documents/2026/07/14/2026-14132/enhanced-favorable-treatment-for-the-united-arab-emirates-under-the-export-administration"
 },
 {
  "date": "2026-11-09",
  "event": "Affiliates rule suspension extended to 2027-01-10 (91 FR 70789)",
  "url": "https://www.federalregister.gov/documents/2026/11/09/2026-22793/extension-of-the-suspension-of-expansion-of-end-user-controls-for-affiliates-of-certain-listed"
 },
 {
  "date": "2026-11-16",
  "event": "BIS releases interim final rule RIN 0694-AK50 on remote access: license for chips going to data centers serving D:5/Macau-headquartered companies, new license requirement for Indonesia, Malaysia, Singapore, Thailand and Brazil, formal AI Diffusion rescission. Released, not yet published in the Federal Register as of 16 Nov 2026",
  "url": "https://www.bis.gov/media/documents/rin-0694-ak50.pdf"
 }
];
export const UNVERIFIED = [
 "Ting-Wei 'Willy' Sun guilty plea (reported Oct. 8-9, 2026, four counts incl. obstruction; sentencing reportedly 2027-09-08): Reuters/Bloomberg/DCD only, no justice.gov release found. Liaw reportedly pleaded not guilty.",
 "Alan Hao Hsu sentencing (set for Feb. 18 [2026]): no official sentencing release or report found.",
 "Benlin Yuan / Fanyue Gong: media say they pleaded not guilty and face trial in Houston; no official update found.",
 "Law360 (June 2026) reports a Chinese national sentenced to one year and one day in California for conspiring to export AI chips to China; defendant name and DOJ release not found (possibly the ALX Solutions case, unconfirmed).",
 "Kamo Kirakosyan sentenced to 26 months (reported Sept. 2-3, 2026): media only; justice.gov sentencing release not found.",
 "Cadence: no official confirmation found that the court accepted the plea or imposed sentence after the 2025-07-28 filing.",
 "H200 China sales revenue share (e.g. '25% U.S. cut'): not found in 91 FR 1684 or Proclamation 11002 text; media and law-firm reports only.",
 "May 2025 BIS-announced 'additional export licensing requirements for exports of SI chips to Malaysia and Thailand': no corresponding Federal Register rule found.",
 "Formal Federal Register rescission of the AI Diffusion rule: none found; eCFR still carries its text as of 2026-11-09.",
 "Any enacted chip location-verification requirement (e.g. FY2026 NDAA, GAIN AI Act): none confirmed; enacted NDAA text not checked.",
 "No rule restricting remote/cloud access to controlled chips was found beyond the 2024 IaaS NPRM (still proposed).",
 "No 2026 BIS temporary denial order specific to AI-chip diversion was identified.",
 "Applied Materials: the BIS release does not name the Entity List customer; SMIC is named only in secondary sources."
];
export const ASOF = '2026-11-16';
const ALIAS = {"penalties": "ecra-penalties", "allied-coordination": "unverified-list", "location-verification": "chip-security-act", "licensing": "h200-case-by-case"};
export const BY_POLICY = Object.fromEntries([...POLICIES.map(p => [p.id, p]), ...Object.entries(ALIAS).map(([a, id]) => [a, POLICIES.find(p => p.id === id)])]);
