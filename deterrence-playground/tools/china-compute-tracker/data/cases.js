// China Compute Tracker: DOJ and BIS public cases on smuggling or diversion of advanced chips and chipmaking tools.
// Sources: justice.gov and bis.gov releases listed per case. Built from scripts/curated/cases.json by build_curated.py.
export const CASES_CHECKED = "2026-11-18";
export const CASES = [
{
"id": "ndca-ding-google-tpu",
"date": "2024-03-06",
"title": "Former Google Engineer Found Guilty Of Economic Espionage And Theft Of Confidential AI Technology",
"agency": "DOJ",
"venue": "N.D. Cal.",
"parties": [
"Linwei Ding aka Leon Ding"
],
"type": "tech transfer",
"items": "Over 2,000 pages of Google AI trade secrets incl. TPU chip and GPU system architecture, SmartNIC and supercomputer orchestration software, taken while affiliated with PRC tech companies.",
"route": [
"US",
"China"
],
"hubs": null,
"value_usd": null,
"penalty": null,
"status": "sentenced (trade-secret counts; espionage counts vacated)",
"status_date": "2026-09-01",
"status_note": "A jury convicted Ding on 7 economic-espionage and 7 trade-secret counts on Jan. 29, 2026. In August 2026 Judge Chhabria vacated the economic-espionage convictions for insufficient evidence; the trade-secret convictions stand. Sentenced Sept. 1, 2026 to just under one year in prison and two years of supervised release (press report; no DOJ release on the sentence found). Scope note: AI chip and system design, not fab tooling.",
"sources": [
{
"label": "DOJ USAO N.D. Cal. press release, Jan 29, 2026",
"url": "https://www.justice.gov/usao-ndca/pr/former-google-engineer-found-guilty-economic-espionage-and-theft-confidential-ai",
"fetched": true,
"supports": "Verdict, trade-secret content, PRC affiliations"
},
{
"label": "DOJ USAO N.D. Cal. press release, Mar 6, 2024 (listing only)",
"url": "https://www.justice.gov/usao-ndca/pr/chinese-national-residing-california-arrested-theft-artificial-intelligence-related",
"fetched": false,
"supports": "Initial arrest announcement date (title/date from DOJ API; body not fetched)"
},
{
"label": "KQED, Sept. 1, 2026 (press report of sentencing and vacatur)",
"url": "https://www.kqed.org/news/12097760",
"fetched": true,
"supports": "Espionage conviction vacated Aug. 2026; sentence of just under a year; trade-secret convictions stand"
}
],
"quote": null,
"official_release": true
},
{
"id": "ndca-gastone-wafer-scriber",
"date": "2024-04-25",
"title": "Chinese National Arrested in United States for Alleged Scheme to Illegally Export Semiconductor Manufacturing Machine",
"agency": "DOJ",
"venue": "N.D. Cal.",
"parties": [
"Han Li aka Anson Li",
"Lin Chen",
"Jiangsu Hantang International (JHI)",
"Chengdu GaStone Technology Co. (CGTC)"
],
"type": "chipmaking tools",
"items": "DTX-150 Automatic Diamond Scriber Breaker (silicon-wafer cutting machine) from Dynatex International, procured for Entity-Listed GaStone via intermediary JHI (2015-2018 conduct).",
"route": [
"US",
"China"
],
"hubs": "Intermediary Jiangsu Hantang International used as purported purchaser.",
"value_usd": null,
"penalty": null,
"status": "pleaded guilty",
"status_date": "2024-10-17",
"status_note": "Lin Chen pleaded guilty to one IEEPA count Oct. 17, 2024 (indicted Dec. 1, 2020); sentencing was set for Jan. 28, 2025; Han Li believed in the PRC. No release or report of a sentence found as of 2026-11-18.",
"sources": [
{
"label": "DOJ OPA press release, Apr 25, 2024",
"url": "https://www.justice.gov/archives/opa/pr/chinese-national-arrested-united-states-alleged-scheme-illegally-export-semiconductor",
"fetched": true,
"supports": "Indictment, machine, entity"
},
{
"label": "DOJ USAO N.D. Cal. press release, Apr 25, 2024",
"url": "https://www.justice.gov/usao-ndca/pr/chinese-national-arrested-us-alleged-role-scheme-illegally-export-semiconductor",
"fetched": true,
"supports": "Same announcement (USAO version)"
},
{
"label": "DOJ USAO N.D. Cal. press release, Oct 17, 2024",
"url": "https://www.justice.gov/usao-ndca/pr/chinese-national-pleads-guilty-illegally-exporting-semiconductor-manufacturing-machine",
"fetched": true,
"supports": "Guilty plea and sentencing date"
}
],
"quote": "As alleged, the defendants sought to evade export controls to obtain U.S. semiconductor manufacturing technology for a prohibited Chinese company",
"official_release": true
},
{
"id": "bis-globalfoundries-sjs",
"date": "2024-11-01",
"title": "BIS Imposes $500,000 Mitigated Penalty Against GlobalFoundries For 74 Shipments to Entity Listed Chinese Firm",
"agency": "BIS",
"venue": "BIS administrative",
"parties": [
"GlobalFoundries U.S. Inc.",
"GlobalFoundries U.S. 2 LLC",
"SJ Semiconductor (SJS)"
],
"type": "EDA and other",
"items": "74 shipments of semiconductor wafers (~$17.1M), Feb 2021-Oct 2022, to SMIC-related OSAT SJ Semiconductor without a license; voluntarily disclosed.",
"route": [
"US",
"China"
],
"hubs": null,
"value_usd": 500000,
"penalty": "$500,000 civil penalty",
"status": "settled (BIS administrative)",
"status_date": "2024-11-01",
"status_note": "Wafers, not AI chips or tools; included as semiconductor-to-PRC enforcement, filter if out of scope.",
"sources": [
{
"label": "BIS press release, Nov 1, 2024",
"url": "https://www.bis.gov/press-release/bis-imposes-500000-mitigated-penalty-against-globalfoundries-74-shipments-entity-listed-chinese-firm",
"fetched": true,
"supports": "Penalty, items, value, SJS"
}
],
"quote": "We want U.S. companies to be hypervigilant when sending semiconductor materials to Chinese parties",
"official_release": true
},
{
"id": "cadence-nudt",
"date": "2025-07-28",
"title": "Cadence Design Systems Agrees to Plead Guilty and Pay Over $140 Million for Unlawfully Exporting Semiconductor Design Tools to a Restricted PRC Military University",
"agency": "DOJ+BIS",
"venue": "N.D. Cal. + BIS administrative",
"parties": [
"Cadence Design Systems Inc.",
"Cadence Design Systems Management (Shanghai) Co. Ltd.",
"National University of Defense Technology (NUDT)",
"Central South CAD Center (CSCC)",
"Phytium"
],
"type": "EDA and other",
"items": "EDA hardware, software and semiconductor design IP exported to NUDT via alias CSCC and later Phytium, 2015-2021; BIS valued exports at ~$45.3M.",
"route": [
"US",
"China"
],
"hubs": "Front/alias CSCC on NUDT campus; transfers to Phytium.",
"value_usd": 140000000,
"penalty": "DOJ criminal penalties of nearly $118M plus BIS civil penalty of $95M (with cross-credits); aggregate net >$140M incl. $45M forfeiture",
"status": "plea agreement; court acceptance not confirmed",
"status_date": "2025-07-28",
"status_note": "Company agreed to plead guilty to one count of conspiracy (criminal information) and settled with BIS the same day; the dollar figure shown is the aggregate net penalty. Cadence's 10-Q for the quarter ended Sept. 30, 2026 says it 'entered into a plea agreement with the DOJ pursuant to which Cadence agreed to plead guilty to one count', reports paying aggregate net penalties and forfeitures of $140.6 million in the quarter ended Sept. 30, 2025, and refers to \"our probation\". The plea agreement asked the court to accept the plea and impose sentence the same day, so acceptance is likely, but no court record of it was found and no later DOJ release was found as of Nov. 18, 2026.",
"sources": [
{
"label": "DOJ OPA press release, Jul 28, 2025",
"url": "https://www.justice.gov/opa/pr/cadence-design-systems-agrees-plead-guilty-and-pay-over-140-million-unlawfully-exporting",
"fetched": true,
"supports": "Plea agreement, criminal penalty, conduct"
},
{
"label": "DOJ USAO N.D. Cal. press release, Jul 28, 2025",
"url": "https://www.justice.gov/usao-ndca/pr/cadence-design-systems-agrees-plead-guilty-and-pay-over-140-million-unlawfully",
"fetched": true,
"supports": "Same announcement (USAO version)"
},
{
"label": "BIS press release, Jul 28, 2025",
"url": "https://www.bis.gov/press-release/cadence-design-systems-pay-95-million-penalty-bis-unauthorized-exports-chinese-entities-tied-development",
"fetched": true,
"supports": "$95M BIS penalty, 56+2 violations, $45.3M export value"
},
{
"label": "Cadence Design Systems 10-Q for quarter ended Sept. 30, 2026 (SEC), Note 15 Legal Proceedings",
"url": "https://www.sec.gov/Archives/edgar/data/813672/000081367226000121/cdns-20260930.htm",
"fetched": true,
"supports": "Plea agreement terms and payment of $140.6M; no court acceptance reported"
}
],
"quote": "Companies that violate export laws and compromise national security should face strong penalties that deter future wrongdoing.",
"official_release": true
},
{
"id": "cdca-alx-geng-yang",
"date": "2025-08-05",
"title": "Two Chinese Nationals Arrested on Federal Complaint Alleging They Illegally Shipped to China Sensitive Microchips Used in AI Applications",
"agency": "DOJ",
"venue": "C.D. Cal.",
"parties": [
"Chuan Geng",
"Shiwei Yang",
"ALX Solutions Inc."
],
"type": "AI chips",
"items": "Export-controlled GPUs ('tens of millions of dollars' worth, alleged) shipped Oct 2022-Jul 2025 without licenses; at least 21 shipments to freight forwarders in Singapore and Malaysia; $1M payment from a China-based company.",
"route": [
"US",
"Singapore",
"Malaysia",
"China"
],
"hubs": "Singapore and Malaysia freight forwarders alleged as transshipment points; payments from Hong Kong and China.",
"value_usd": null,
"penalty": null,
"status": "charged",
"status_date": "2025-08-04",
"status_note": "Complaint Aug. 4, 2025; later charging document not confirmed from DOJ. Arrested on a criminal complaint; initial appearance Aug. 4, 2025, arraignment set for Sept. 11, 2025. Latest status not re-checked. No later release found as of 2026-11-18.",
"sources": [
{
"label": "DOJ USAO C.D. Cal. press release, Aug 5, 2025",
"url": "https://www.justice.gov/usao-cdca/pr/two-chinese-nationals-arrested-federal-complaint-alleging-they-illegally-shipped-china",
"fetched": true,
"supports": "Complaint, conduct, route, hearing dates"
}
],
"quote": null,
"official_release": true
},
{
"id": "mdfl-janford-a100",
"date": "2025-11-20",
"title": "U.S. Citizens and Chinese Nationals Arrested for Exporting Artificial Intelligence Technology to China",
"agency": "DOJ",
"venue": "M.D. Fla.",
"parties": [
"Hon Ning Ho aka Mathew Ho",
"Brian Curtis Raymond",
"Cham Li aka Tony Li",
"Jing Chen aka Harry Chen",
"Janford Realtor, LLC"
],
"type": "AI chips",
"items": "400 NVIDIA A100 GPUs exported Oct 2024-Jan 2025 (alleged); disrupted attempts involving 10 HPE supercomputers with NVIDIA H100 GPUs and 50 NVIDIA H200 GPUs; $3.89M in wire transfers from the PRC.",
"route": [
"US",
"Malaysia",
"Thailand",
"China"
],
"hubs": "Malaysia and Thailand alleged as transshipment points; Janford Realtor LLC alleged front company.",
"value_usd": 3890000,
"penalty": null,
"status": "indicted",
"status_date": "2025-11-19",
"status_note": "Indictment unsealed and all four arrested Nov. 19, 2025; value is PRC wire transfers alleged; forfeiture of 50 H200 GPUs sought. Latest status not re-checked. No later release found as of 2026-11-18.",
"sources": [
{
"label": "DOJ OPA press release, Nov 20, 2025",
"url": "https://www.justice.gov/opa/pr/us-citizens-and-chinese-nationals-arrested-exporting-artificial-intelligence-technology",
"fetched": true,
"supports": "Defendants, items, route, value, arrests"
},
{
"label": "DOJ USAO M.D. Fla. press release, Nov 21, 2025",
"url": "https://www.justice.gov/usao-mdfl/pr/us-citizens-and-chinese-nationals-arrested-exporting-artificial-intelligence",
"fetched": true,
"supports": "Same announcement (USAO version)"
}
],
"quote": "The indictment unsealed yesterday alleges a deliberate and deceptive effort to transship controlled NVIDIA GPUs to China by falsifying paperwork, creating fake contracts, and misleading U.S. authorities",
"official_release": true
},
{
"id": "sdtx-gatekeeper-hsu",
"date": "2025-12-08",
"title": "U.S. authorities shut down major China-linked AI tech smuggling network",
"agency": "DOJ",
"venue": "S.D. Tex.",
"parties": [
"Alan Hao Hsu aka Haochun Hsu",
"Hao Global LLC"
],
"type": "AI chips",
"items": "At least $160 million of NVIDIA H100 and H200 Tensor Core GPUs exported or attempted to be exported Oct 2024-May 2025 (alleged); paperwork allegedly falsified; >$50M in wire transfers from the PRC.",
"route": [
"US",
"Hong Kong",
"China"
],
"hubs": "Shipped to the PRC, Hong Kong and other destinations, per the indictment.",
"value_usd": 160000000,
"penalty": null,
"status": "pleaded guilty",
"status_date": "2025-10-10",
"status_note": "Hsu and Hao Global pleaded guilty Oct. 10, 2025 (announced Dec. 8); sentencing was set for Feb. 18, 2026, but no release or report of a sentence was found as of 2026-11-18. Value is the alleged export value; the operation also seized more than $50M in GPUs.",
"sources": [
{
"label": "DOJ USAO S.D. Tex. press release, Dec 8, 2025",
"url": "https://www.justice.gov/usao-sdtx/pr/us-authorities-shut-down-major-china-linked-ai-tech-smuggling-network",
"fetched": true,
"supports": "Plea, items, value, route, sentencing date"
},
{
"label": "DOJ OPA press release, Dec 8, 2025",
"url": "https://www.justice.gov/opa/pr/us-authorities-shut-down-major-china-linked-ai-tech-smuggling-network",
"fetched": true,
"supports": "Same announcement (OPA version)"
}
],
"quote": "These chips are the building blocks of AI superiority and are integral to modern military applications.",
"official_release": true,
"matter": "sdtx-gatekeeper"
},
{
"id": "sdtx-gatekeeper-gong-yuan",
"date": "2025-12-08",
"title": "U.S. authorities shut down major China-linked AI tech smuggling network",
"agency": "DOJ",
"venue": "S.D. Tex.",
"parties": [
"Fanyue Gong aka Tom Gong",
"Benlin Yuan"
],
"type": "AI chips",
"items": "NVIDIA GPUs allegedly obtained via straw purchasers, relabeled 'SANDKYAN' and misdeclared as generic computer parts; Yuan allegedly organized inspections for a Hong Kong logistics company and planned false statements to authorities.",
"route": [
"US",
"Hong Kong",
"China"
],
"hubs": "Hong Kong-based logistics company; U.S. warehouses used for relabeling.",
"value_usd": null,
"penalty": null,
"status": "charged",
"status_date": "2025-12-08",
"status_note": "Charged on criminal complaints, per the DOJ release (\"A criminal complaint is a formal accusation\"), announced Dec. 8, 2025; Yuan was arrested Nov. 28 and Gong Dec. 3, 2025, and both were in custody per the release. No later DOJ release found as of Nov. 18, 2026.",
"sources": [
{
"label": "DOJ USAO S.D. Tex. press release, Dec 8, 2025",
"url": "https://www.justice.gov/usao-sdtx/pr/us-authorities-shut-down-major-china-linked-ai-tech-smuggling-network",
"fetched": true,
"supports": "Charges, arrests, conduct alleged"
}
],
"quote": "Operation Gatekeeper has exposed a sophisticated smuggling network that threatens our Nation’s security by funneling cutting-edge AI technology to those who would use it against American interests",
"official_release": true,
"matter": "sdtx-gatekeeper"
},
{
"id": "bis-exyte-smic",
"date": "2026-01-07",
"title": "BIS Imposes Administrative Penalty on Exyte Management GmbH",
"agency": "BIS",
"venue": "BIS administrative",
"parties": [
"Exyte Management GmbH",
"Exyte Shanghai Ltd.",
"Semiconductor Manufacturing International (Beijing) Corporation (SMIC Beijing)"
],
"type": "chipmaking tools",
"items": "Exyte's China affiliate caused in-country transfer of ~884 EAR99 fab-related items (~$2.85M) to Entity-Listed SMIC Beijing, Mar 2021-Mar 2022.",
"route": [
"China"
],
"hubs": "In-country transfers from China-based suppliers/distributors.",
"value_usd": 1500000,
"penalty": "$1,500,000 civil penalty",
"status": "settled (BIS administrative)",
"status_date": "2026-01-07",
"status_note": "Order and settlement announced Jan. 7, 2026; the dollar figure shown is the penalty (items valued ~$2.85M).",
"sources": [
{
"label": "BIS press release, Jan 7, 2026",
"url": "https://www.bis.gov/press-release/bis-imposes-administrative-penalty-exyte-management-gmbh",
"fetched": true,
"supports": "Announcement date"
},
{
"label": "BIS order (PDF)",
"url": "https://www.bis.gov/media/documents/exyte-order-final.pdf",
"fetched": true,
"supports": "Penalty amount, items, SMIC Beijing, dates"
}
],
"quote": null,
"official_release": true
},
{
"id": "bis-applied-materials",
"date": "2026-02-12",
"title": "Applied Materials to Pay $252 Million Penalty to BIS for Illegally Exporting Semiconductor Manufacturing Equipment",
"agency": "BIS",
"venue": "BIS administrative",
"parties": [
"Applied Materials Inc.",
"Applied Materials Korea, Ltd."
],
"type": "chipmaking tools",
"items": "Ion implanters (~$126M) shipped 2021-2022 to AMK in Korea for assembly and then to an Entity-Listed company in China without a license.",
"route": [
"US",
"South Korea",
"China"
],
"hubs": "Korea (Applied Materials Korea assembly) used as intermediate step.",
"value_usd": 252000000,
"penalty": "~$252M civil penalty (twice transaction value); compliance audits and annual certifications",
"status": "settled (BIS administrative)",
"status_date": "2026-02-12",
"status_note": "Settlement announced Feb. 12, 2026; the dollar figure shown is the penalty.",
"sources": [
{
"label": "BIS press release, Feb 12, 2026",
"url": "https://www.bis.gov/press-release/applied-materials-pay-252-million-penalty-bis-illegally-exporting-semiconductor-manufacturing-equipment",
"fetched": true,
"supports": "Penalty, items, route, value"
}
],
"quote": "When companies export their products around the world, they must follow the law or face stiff penalties.",
"official_release": true
},
{
"id": "sdny-supermicro-liaw",
"date": "2026-03-19",
"title": "Three Charged With Conspiring To Unlawfully Divert U.S. Artificial Intelligence Technology To China",
"agency": "DOJ",
"venue": "S.D.N.Y.",
"parties": [
"Yih-Shyan “Wally” Liaw",
"Ruei-Tsang “Steven” Chang"
],
"type": "AI chips",
"items": "Servers with controlled AI GPUs from a U.S. server manufacturer (unnamed in release); ~$2.5B in servers bought by a Southeast Asian company 2024-2025, at least ~$510M diverted to China Apr-May 2025 (alleged); 'dummy' servers staged for audits and a Commerce inspection.",
"route": [
"US",
"Taiwan",
"Southeast Asia",
"China"
],
"hubs": "Servers shipped via the manufacturer's Taiwan facilities to 'Company-1' in Southeast Asia, then repackaged into unmarked boxes for China.",
"value_usd": 2500000000,
"penalty": null,
"status": "indicted",
"status_date": "2026-03-19",
"status_note": "Indictment unsealed Mar. 19, 2026 (DOJ). Liaw pleaded not guilty on Apr. 1, 2026 (Bloomberg News report of the Manhattan hearing); Chang is a fugitive per the indictment release. Co-defendant Ting-Wei Sun is listed as a separate row because he pleaded guilty. Value is the alleged order total.",
"sources": [
{
"label": "DOJ USAO S.D.N.Y. press release, Mar 19, 2026",
"url": "https://www.justice.gov/usao-sdny/pr/three-charged-conspiring-unlawfully-divert-us-artificial-intelligence-technology-china",
"fetched": true,
"supports": "Indictment, conduct, values, arrests, Chang fugitive"
},
{
"label": "DOJ OPA press release, Mar 19, 2026",
"url": "https://www.justice.gov/opa/pr/three-charged-conspiring-unlawfully-divert-cutting-edge-us-artificial-intelligence",
"fetched": true,
"supports": "Same announcement (OPA version)"
},
{
"label": "Bloomberg News (via Bloomberg Government), Apr. 1, 2026",
"url": "https://news.bgov.com/litigation/super-micro-co-founder-pleads-not-guilty-in-china-smuggling-case",
"fetched": true,
"supports": "Liaw not-guilty plea at Apr. 1, 2026 hearing (press report; no DOJ release)"
}
],
"quote": "Diversion schemes like those disrupted today generate billions of dollars in ill-gotten gains and pose a direct threat to U.S. national security.",
"official_release": true,
"matter": "sdny-supermicro"
},
{
"id": "sdny-supermicro-sun",
"date": "2026-03-19",
"title": "Three Charged With Conspiring To Unlawfully Divert U.S. Artificial Intelligence Technology To China",
"agency": "DOJ",
"venue": "S.D.N.Y.",
"parties": [
"Ting-Wei “Willy” Sun"
],
"type": "AI chips",
"items": "Servers with controlled AI GPUs from a U.S. server manufacturer (unnamed in release); ~$2.5B in servers bought by a Southeast Asian company 2024-2025, at least ~$510M diverted to China Apr-May 2025 (alleged); 'dummy' servers staged for audits and a Commerce inspection.",
"route": [
"US",
"Taiwan",
"Southeast Asia",
"China"
],
"hubs": "Servers shipped via the manufacturer's Taiwan facilities to 'Company-1' in Southeast Asia, then repackaged into unmarked boxes for China.",
"value_usd": 2500000000,
"penalty": null,
"status": "pleaded guilty",
"status_date": "2026-10-08",
"status_note": "Press reports (Reuters/CNA citing court filings); no DOJ release. Bloomberg News reports Sun pleaded guilty on Thursday, Oct. 8, 2026, at a hearing in federal court in New York under an agreement with prosecutors, citing court filings; CNA (relaying Reuters) cites the court record. Co-defendants Liaw and Chang are in a separate row. Value is the alleged order total for the whole scheme.",
"sources": [
{
"label": "DOJ USAO S.D.N.Y. press release, Mar 19, 2026",
"url": "https://www.justice.gov/usao-sdny/pr/three-charged-conspiring-unlawfully-divert-us-artificial-intelligence-technology-china",
"fetched": true,
"supports": "Indictment, conduct, values, arrests, Chang fugitive"
},
{
"label": "DOJ OPA press release, Mar 19, 2026",
"url": "https://www.justice.gov/opa/pr/three-charged-conspiring-unlawfully-divert-cutting-edge-us-artificial-intelligence",
"fetched": true,
"supports": "Same announcement (OPA version)"
},
{
"label": "Bloomberg News (via Bloomberg Government), Oct. 9, 2026",
"url": "https://news.bgov.com/artificial-intelligence/super-micro-case-fixer-pleads-guilty-to-diverting-ai-tech-1",
"fetched": true,
"supports": "Sun guilty plea, citing court filings (press report; no DOJ release)"
},
{
"label": "CNA (Central News Agency, relaying Reuters), Oct. 10, 2026 (Chinese)",
"url": "https://cna.com.tw/news/aopl/202610100023.aspx",
"fetched": true,
"supports": "Sun guilty plea per court record (press report)"
}
],
"quote": "Diversion schemes like those disrupted today generate billions of dollars in ill-gotten gains and pose a direct threat to U.S. national security.",
"official_release": false,
"matter": "sdny-supermicro"
},
{
"id": "ndga-zheng-kelly-english",
"date": "2026-03-25",
"title": "Chinese National and Two U.S. Citizens Charged with Conspiring to Smuggle Artificial Intelligence Technology to China",
"agency": "DOJ",
"venue": "N.D. Ga.",
"parties": [
"Stanley Yi Zheng",
"Matthew Kelly",
"Tommy Shad English"
],
"type": "AI chips",
"items": "Attempted purchases of servers with export-controlled AI chips: Oct 2023 order of 750 servers (~$170M; 600 with controlled chips; >$20M paid) and an Apr 2024 attempt for 500 servers; both deals failed (alleged).",
"route": [
"US",
"Thailand",
"China"
],
"hubs": "Thailand-based companies named as purported purchasers.",
"value_usd": 170000000,
"penalty": null,
"status": "charged",
"status_date": "2026-03-25",
"status_note": "Complaints Mar. 20, 2026; later charging document not confirmed from DOJ. Complaints issued Mar. 20, 2026; Zheng arrested Mar. 22, Kelly and English surrendered Mar. 25. Value is the alleged Oct 2023 order size. Latest status not re-checked. No later release found as of 2026-11-18.",
"sources": [
{
"label": "DOJ OPA press release, Mar 25, 2026",
"url": "https://www.justice.gov/opa/pr/chinese-national-and-two-us-citizens-charged-conspiring-smuggle-artificial-intelligence",
"fetched": true,
"supports": "Complaints, orders, route, arrests"
},
{
"label": "DOJ USAO N.D. Ga. press release, Mar 25, 2026",
"url": "https://www.justice.gov/usao-ndga/pr/chinese-national-and-two-us-citizens-charged-conspiring-smuggle-artificial",
"fetched": true,
"supports": "Same announcement (USAO version)"
}
],
"quote": "Keeping sensitive tech from falling into the wrong hands is a matter of utmost importance to our national security and U.S. competitiveness",
"official_release": true
},
{
"id": "bis-coastal-pva-smic",
"date": "2026-04-14",
"title": "BIS Reaches Administrative Enforcement Settlement with Coastal PVA Technology, Inc.",
"agency": "BIS",
"venue": "BIS administrative",
"parties": [
"Coastal PVA Technology, Inc.",
"SMIC Beijing",
"SMIC North"
],
"type": "chipmaking tools",
"items": "PVA brushes used to clean post-etch wafers (~$400K, 18 shipments, May 2021-May 2024) sold via two China-based distributors to Entity-Listed SMIC Beijing and SMIC North.",
"route": [
"US",
"China"
],
"hubs": "Two third-party distributors in China.",
"value_usd": 1700000,
"penalty": "$1,700,000 civil penalty, fully suspended for one year (limited ability to pay)",
"status": "settled (BIS administrative)",
"status_date": "2026-04-12",
"status_note": "Order issued Apr. 12, 2026 (OCR of scanned order), announced Apr. 14; consumable rather than a tool.",
"sources": [
{
"label": "BIS press release, Apr 14, 2026",
"url": "https://www.bis.gov/press-release/bis-reaches-administrative-enforcement-settlement-coastal-pva-technology-inc.",
"fetched": true,
"supports": "Announcement"
},
{
"label": "BIS order and charging letter (PDF)",
"url": "https://www.bis.gov/media/documents/coastal-pva-technology-inc-4-13-2026-rev.pdf",
"fetched": true,
"supports": "Penalty, suspension, items, SMIC parties"
}
],
"quote": null,
"official_release": true
},
{
"id": "cdca-earthmade-lui",
"date": "2026-10-01",
"title": "California Man Arrested for Smuggling More Than $300 Million in Export-Controlled Computer Servers to China",
"agency": "DOJ",
"venue": "C.D. Cal.",
"parties": [
"Greg Lui aka Yiu Kong Lui",
"Earthmade Computer Inc."
],
"type": "AI chips",
"items": "More than $300M of servers containing U.S.-made GPUs (2023-2024, alleged); e.g. 27 GPU servers (~$7.6M) shipped LA to Kuala Lumpur and transshipped to China; >$176M received from two Malaysia-based shipment companies.",
"route": [
"US",
"Malaysia",
"Singapore",
"China"
],
"hubs": "Malaysia and Singapore alleged as re-export points.",
"value_usd": 300000000,
"penalty": null,
"status": "indicted",
"status_date": "2026-09-29",
"status_note": "Three-count indictment returned Sept. 29, 2026 (conspiracy to violate ECRA/EAR, outbound smuggling, conspiracy to commit money laundering); Lui arrested Oct. 1, 2026 and expected to be arraigned that afternoon, per the DOJ release. Earthmade is not named as a defendant. Value alleged. No later release found as of 2026-11-18.",
"sources": [
{
"label": "DOJ OPA press release, Oct 1, 2026",
"url": "https://www.justice.gov/opa/pr/california-man-arrested-smuggling-more-300-million-export-controlled-computer-servers-china",
"fetched": true,
"supports": "Indictment, arrest, value, route"
},
{
"label": "DOJ USAO C.D. Cal. press release, Oct 1, 2026",
"url": "https://www.justice.gov/usao-cdca/pr/san-gabriel-man-arrested-federal-charges-alleging-he-smuggled-china-more-300-million",
"fetched": true,
"supports": "Same announcement (USAO version)"
}
],
"quote": "SI is the defining technology of the era [DOJ's wording; SI = 'Super Intelligence']",
"official_release": true
}
];
