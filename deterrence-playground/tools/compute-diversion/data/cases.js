// Case cards: public DOJ and BIS enforcement actions on AI chip, server, EDA and chipmaking-tool exports.
// Each item was read on the official page (justice.gov, bis.gov; some via the Wayback Machine where justice.gov
// blocked automated reads) on the 'checked' date. Charges are allegations unless a plea, conviction or settlement is stated.
// Countries and hubs appear only as the official release names them. Quotes are verbatim.
export const CASES = [
 {
  "id": "operation-gatekeeper",
  "date": "2025-12-08",
  "agency": "DOJ",
  "title": "Operation Gatekeeper: Nvidia H100/H200 GPU smuggling network (S.D. Tex.)",
  "defendants": "Alan Hao Hsu (aka Haochun Hsu) and Hao Global LLC; separately charged: Benlin Yuan, Fanyue Gong (aka Tom Gong)",
  "items": "Nvidia H100 and H200 Tensor Core GPUs",
  "value": "At least $160 million exported or attempted (Hsu); more than $50 million in Nvidia technologies and cash seized",
  "route": "US → PRC, Hong Kong and other destinations (Hsu); co-conspirators shipped or attempted to ship to the PRC and Hong Kong (Gong complaint)",
  "tactics": [
   "falsified-docs",
   "mislabeling",
   "false-end-user",
   "front-company"
  ],
  "status": "Hsu and Hao Global pleaded guilty to smuggling and unlawful export activities on 2025-10-10 (sentencing was set for Feb. 18; no official sentencing release found as of 2026-11-16). Yuan and Gong: charged (Yuan: conspiracy to violate ECRA; Gong: conspiracy to smuggle); allegations, presumed innocent; status per 2025-12-08 release.",
  "url": "https://www.justice.gov/opa/pr/us-authorities-shut-down-major-china-linked-ai-tech-smuggling-network",
  "quote": "Hsu and others falsified shipping paperwork, misclassifying the true nature of the goods and their recipients to conceal the ultimate destination of the GPUs.",
  "checked": "2026-11-16"
 },
 {
  "id": "janford-realtor-mdfl",
  "date": "2025-11-20",
  "agency": "DOJ",
  "title": "Tampa 'realtor' front company GPU exports via Malaysia and Thailand (M.D. Fla.)",
  "defendants": "Hon Ning Ho (aka Mathew Ho), Brian Curtis Raymond, Cham Li (aka Tony Li), Jing Chen (aka Harry Chen); company Janford Realtor, LLC",
  "items": "400 Nvidia A100 GPUs exported; attempted: ten HPE supercomputers containing Nvidia H100 GPUs and 50 Nvidia H200 GPUs",
  "value": "Release states over $3.89 million in wire transfers from the PRC funded the scheme (no total export value stated)",
  "route": "US → Malaysia, Thailand → PRC",
  "tactics": [
   "front-company",
   "falsified-docs",
   "false-end-user",
   "transshipment",
   "payments-structuring"
  ],
  "status": "Charged (indictment unsealed 2025-11-19); allegations, presumed innocent. No later official release found as of 2026-11-16.",
  "url": "https://www.justice.gov/opa/pr/us-citizens-and-chinese-nationals-arrested-exporting-artificial-intelligence-technology",
  "quote": "Despite its name, Janford Realtor, LLC, was never involved in any real estate transactions.",
  "checked": "2026-11-16"
 },
 {
  "id": "alx-solutions-cdca",
  "date": "2025-08-05",
  "agency": "DOJ",
  "title": "ALX Solutions GPU exports through Singapore and Malaysia (C.D. Cal.)",
  "defendants": "Chuan Geng, Shiwei Yang; company ALX Solutions Inc.",
  "items": "GPUs requiring a license for export to China (release describes the chip as made by 'a manufacturer of high-performance AI chips')",
  "value": "'tens of millions of dollars' worth' (no exact figure)",
  "route": "US → shipping/freight-forwarding companies in Singapore and Malaysia → China; payments from Hong Kong and China",
  "tactics": [
   "transshipment",
   "mislabeling",
   "false-end-user"
  ],
  "status": "Charged by criminal complaint (ECRA violation); allegations, presumed innocent. Release last updated 2025-11-07; no later official plea or sentencing release found as of 2026-11-16.",
  "url": "https://www.justice.gov/usao-cdca/pr/two-chinese-nationals-arrested-federal-complaint-alleging-they-illegally-shipped-china",
  "quote": "shipping and freight-forwarding companies in Singapore and Malaysia, which commonly are used as transshipment points to conceal illegal shipments to China.",
  "checked": "2026-11-16"
 },
 {
  "id": "ai-server-diversion-sdny",
  "date": "2026-03-19",
  "agency": "DOJ",
  "title": "AI server diversion via Southeast Asian pass-through buyer and dummy servers (S.D.N.Y.)",
  "defendants": "Yih-Shyan 'Wally' Liaw, Ruei-Tsang 'Steven' Chang, Ting-Wei 'Willy' Sun (release refers to the employer only as 'the U.S. Manufacturer')",
  "items": "US-assembled high-performance servers integrating controlled AI GPUs",
  "value": "About $2.5 billion in servers purchased by Company-1 (2024-2025); at least about $510 million diverted to China between late April and mid-May 2025",
  "route": "US → U.S. Manufacturer's facilities in Taiwan → Company-1 elsewhere in Southeast Asia → China (repackaged in unmarked boxes)",
  "tactics": [
   "false-end-user",
   "falsified-docs",
   "front-company",
   "mislabeling",
   "transshipment"
  ],
  "status": "Charged (indictment unsealed 2026-03-19): conspiracy to violate ECRA, to smuggle, and to defraud the US; Chang a fugitive; allegations, presumed innocent. A reported Oct. 2026 guilty plea by Sun is media-only (see unverified).",
  "url": "https://www.justice.gov/usao-sdny/pr/three-charged-conspiring-unlawfully-divert-us-artificial-intelligence-technology-china",
  "quote": "the defendants staged thousands of “dummy” servers—non-working, physical replicas of the U.S. Manufacturer’s servers—for inspection",
  "checked": "2026-11-16"
 },
 {
  "id": "thailand-servers-ndga",
  "date": "2026-03-25",
  "agency": "DOJ",
  "title": "Attempted AI server purchases for China using Thailand-based front buyers (N.D. Ga.)",
  "defendants": "Stanley Yi Zheng, Matthew Kelly, Tommy Shad English",
  "items": "Computer servers containing export-controlled chips (600 of 750 ordered servers contained a CCL-controlled chip)",
  "value": "Oct. 2023 order of 750 servers for about $170 million (not completed); over $20 million partial payment",
  "route": "US → Thailand (purported purchasers) → China (intended); deals not completed",
  "tactics": [
   "false-end-user",
   "falsified-docs",
   "front-company"
  ],
  "status": "Charged by criminal complaints issued 2026-03-20 (conspiracy to commit smuggling and export control violations); allegations, presumed innocent. No later official release found as of 2026-11-16.",
  "url": "https://www.justice.gov/opa/pr/chinese-national-and-two-us-citizens-charged-conspiring-smuggle-artificial-intelligence",
  "quote": "English signed an “Advanced Computing Certification,” certifying that the computer servers were not destined for China",
  "checked": "2026-11-16"
 },
 {
  "id": "earthmade-cdca",
  "date": "2026-10-01",
  "agency": "DOJ",
  "title": "Earthmade Computer GPU servers via Malaysia and Singapore (C.D. Cal.)",
  "defendants": "Greg Lui (aka Yiu Kong Lui); company Earthmade Computer Inc.",
  "items": "High-end computer servers containing US-manufactured GPUs",
  "value": "More than $300 million; Earthmade received more than $176 million from two Malaysia-based shipment companies (Jan.-Oct. 2024)",
  "route": "US (Los Angeles) → Malaysia (Kuala Lumpur), Singapore → China",
  "tactics": [
   "transshipment",
   "false-end-user",
   "falsified-docs",
   "payments-structuring"
  ],
  "status": "Charged (three-count indictment returned 2026-09-29; arrested 2026-10-01); allegations, presumed innocent.",
  "url": "https://www.justice.gov/opa/pr/california-man-arrested-smuggling-more-300-million-export-controlled-computer-servers-china",
  "quote": "they shipped these items to countries such as Malaysia and Singapore, where no such license is required, then illegally re-exported them to China.",
  "checked": "2026-11-16"
 },
 {
  "id": "cadence-nudt",
  "date": "2025-07-28",
  "agency": "DOJ+BIS",
  "title": "Cadence EDA exports to NUDT through an alias",
  "defendants": "Cadence Design Systems Inc.; subsidiary Cadence Design Systems Management (Shanghai) Co. Ltd.",
  "items": "EDA hardware, software and semiconductor design IP/technology",
  "value": "Aggregate net criminal and civil penalties and forfeiture of more than $140 million (DOJ); BIS: items valued at $45,305,317.41",
  "route": "US → PRC (NUDT via alias Central South CAD Center; later transfers to Phytium)",
  "tactics": [
   "front-company",
   "false-end-user"
  ],
  "status": "DOJ: criminal information and plea agreement filed 2025-07-28 (agreed to plead guilty; criminal penalties of nearly $118 million). BIS: settled 2025-07-28, $95 million civil penalty; admitted 56 EAR violations.",
  "statusUrl": "https://www.bis.gov/press-release/cadence-design-systems-pay-95-million-penalty-bis-unauthorized-exports-chinese-entities-tied-development",
  "url": "https://www.justice.gov/usao-ndca/pr/cadence-design-systems-agrees-plead-guilty-and-pay-over-140-million-unlawfully",
  "quote": "With this plea, Cadence has admitted to unlawfully exporting its semiconductor design technology to a restricted PRC military university using a front company",
  "checked": "2026-11-16"
 },
 {
  "id": "applied-materials-smic",
  "date": "2026-02-12",
  "agency": "BIS",
  "title": "Applied Materials ion implanters routed via Korea to an Entity List company",
  "defendants": "Applied Materials Inc. (AMAT); Applied Materials Korea, Ltd. (AMK)",
  "items": "Semiconductor manufacturing equipment (ion implanters)",
  "value": "Penalty about $252 million (twice transaction value); merchandise about $126 million",
  "route": "US → Korea (AMK, assembly) → China (Entity List company; the BIS release does not name it)",
  "tactics": [
   "transshipment"
  ],
  "status": "Settled with BIS 2026-02-12: about $252 million civil penalty (statutory maximum) plus compliance audits and annual certifications.",
  "url": "https://www.bis.gov/press-release/applied-materials-pay-252-million-penalty-bis-illegally-exporting-semiconductor-manufacturing-equipment",
  "quote": "Today’s penalty of $252 million – twice the transaction value – is the maximum allowed by statute.",
  "checked": "2026-11-16"
 },
 {
  "id": "kirakosyan-wdtx",
  "date": "2026-04-15",
  "agency": "DOJ",
  "title": "Armenian straw purchaser for Russia; goods included semiconductor-manufacturing items (W.D. Tex.)",
  "defendants": "Kamo Kirakosyan",
  "items": "Goods subject to the EAR, including items that could be used for semiconductor manufacturing",
  "value": null,
  "route": "US → Armenia → Russia",
  "tactics": [
   "false-end-user",
   "transshipment"
  ],
  "status": "Pleaded guilty 2026-04-15 to one count of conspiracy to violate federal law (max 5 years). A reported 26-month sentence (Sept. 2026) is media-only (see unverified).",
  "url": "https://www.justice.gov/usao-wdtx/pr/armenian-man-pleads-guilty-smuggling-controlled-goods-russia",
  "quote": "Kirakosyan represented himself to U.S. companies as the Armenian buyer of goods and did not provide truthful information about the end users",
  "checked": "2026-11-16"
 }
];
