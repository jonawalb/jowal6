// The five fictional organizations a team can defend. Money is in thousands of US dollars.
// revPerHour: what an hour at zero operations costs (revenue lost plus extra operating cost). Notional.
// offlineHit / encryptHit / otHit: operations points lost while core IT is off the internet, while systems are
//   encrypted, or while operational technology is disrupted. continuity (downtime procedures) softens each by 25%.
// clocks: reporting duties. trigger:
//   aware    the organization knows (or should know) it has a real intrusion: incident declared, or a confirmed
//            malicious foothold has been on the board for a turn
//   material the disclosure committee has determined the incident is material (public companies)
//   disrupt  the incident has seriously disrupted operations (operations below 60)
//   breach   personal or controlled data is known to have left the network
//   paid     a ransom or extortion payment was made
//   ot       operational technology was disrupted
//   encrypt  ransomware encrypted systems holding the data (HHS presumes encryption of patient data is a breach)
//   A clock with a list of triggers starts at the first of them.
// hours, or bdays (business days, ending 17:30 on the last day, as for an SEC filing). via: 'file' (regulator) or
// 'people' (the individuals or customers affected). `src` keys point into data/sources.js.
export const SECTORS = [
  {
    id: 'hospital', label: 'Regional hospital system', org: 'Harbor Valley Health',
    blurb: 'Three hospitals and 40 clinics, 9,000 staff, a nonprofit. Lives depend on the electronic health record staying up.',
    crown: 'the electronic health record (EHR)', data: 'patient records', ot: 'building-automation and medical-device networks',
    people: 'patients', revPerHour: 270, offlineHit: 45, encryptHit: 70, otHit: 25, costScale: 9000, public: false,
    safety: 'Ambulances are diverted and procedures postponed while clinical systems are down.',
    clocks: [
      { id: 'hipaa-ind', label: 'HIPAA notice to affected patients', who: 'Patients', trigger: ['breach', 'encrypt'], hours: 60 * 24, via: 'people', src: 'hipaa' },
      { id: 'hipaa-hhs', label: 'HIPAA notice to HHS (500 or more people)', who: 'HHS Office for Civil Rights', trigger: ['breach', 'encrypt'], hours: 60 * 24, via: 'file', src: 'hipaa' },
      { id: 'hipaa-media', label: 'HIPAA media notice (more than 500 residents of a state)', who: 'Prominent media outlets', trigger: ['breach', 'encrypt'], hours: 60 * 24, via: 'people', src: 'hipaa' },
    ],
  },
  {
    id: 'water', label: 'Regional water utility', org: 'Tri-County Water Authority',
    blurb: 'A public authority serving 420,000 people. Its treatment plants run on SCADA that touches the business network.',
    crown: 'the SCADA system that runs treatment and pumping', data: 'customer billing records', ot: 'treatment-plant SCADA and pump-station controllers',
    people: 'customers', revPerHour: 25, offlineHit: 30, encryptHit: 50, otHit: 60, costScale: 3000, public: false,
    safety: 'Operators run the plants by hand. Losing control of treatment means a boil-water notice.',
    clocks: [
      { id: 'state-ops', label: 'State cyber-incident report (operations affected)', who: 'State IT office (modeled on Indiana SEA 459, which reports to the Indiana Office of Technology)', trigger: 'disrupt', hours: 24, via: 'file', src: 'indiana' },
      { id: 'state-cyber', label: 'State cyber-incident report', who: 'State IT office (modeled on Indiana SEA 459, which reports to the Indiana Office of Technology)', trigger: 'aware', bdays: 2, via: 'file', src: 'indiana' },
      { id: 'state-breach', label: 'State breach notice to customers (Indiana: 45 days)', who: 'Customers', trigger: 'breach', hours: 45 * 24, via: 'people', src: 'statebreach' },
    ],
  },
  {
    id: 'dib', label: 'Defense manufacturer', org: 'Kestrel Precision Components',
    blurb: 'A private, 1,800-person maker of guidance-system parts for the Department of Defense. Its engineering files are controlled unclassified information (CUI).',
    crown: 'the engineering vault of CUI drawings', data: 'CUI engineering drawings', ot: 'plant-floor CNC and test-stand controllers',
    people: 'employees', revPerHour: 70, offlineHit: 40, encryptHit: 65, otHit: 35, costScale: 5000, public: false,
    safety: 'Deliveries on defense contracts slip, with penalties and a hard conversation with the program office.',
    clocks: [
      { id: 'dfars', label: 'DFARS 7012 report to DoD (DIBNet)', who: 'DoD, via DIBNet (dibnet.dod.mil)', trigger: 'aware', hours: 72, via: 'file', src: 'dfars' },
      { id: 'state-breach', label: 'State breach notice to employees', who: 'Employees', trigger: 'breach', hours: 30 * 24, via: 'people', src: 'statebreach' },
    ],
  },
  {
    id: 'bank', label: 'Listed regional bank', org: 'Ashford Bancorp',
    blurb: 'A New York-chartered, publicly traded bank with $28 billion in assets, 120 branches and an online-banking platform.',
    crown: 'the core banking and payments platform', data: 'customer account records', ot: 'branch, ATM and payment-switch networks',
    people: 'customers', revPerHour: 130, offlineHit: 40, encryptHit: 70, otHit: 30, costScale: 12000, public: true,
    safety: 'Customers cannot reach their money. Regulators ask hourly.',
    clocks: [
      { id: 'bank36', label: '36-hour notice to the primary federal regulator', who: 'Primary federal regulator (Federal Reserve or FDIC)', trigger: 'disrupt', hours: 36, via: 'file', src: 'bank36' },
      { id: 'nydfs72', label: 'NYDFS Part 500 cybersecurity-incident notice', who: 'NY Department of Financial Services', trigger: 'aware', hours: 72, via: 'file', src: 'nydfs' },
      { id: 'nydfs-pay', label: 'NYDFS notice of an extortion payment', who: 'NY Department of Financial Services', trigger: 'paid', hours: 24, via: 'file', src: 'nydfs' },
      { id: 'sec8k', label: 'SEC Form 8-K, Item 1.05', who: 'Investors, via SEC EDGAR', trigger: 'material', bdays: 4, via: 'file', src: 'sec' },
      { id: 'cust', label: 'Customer notice (NY GBL 899-aa: 30 days)', who: 'Customers', trigger: 'breach', hours: 30 * 24, via: 'people', src: 'nybreach' },
    ],
  },
  {
    id: 'saas', label: 'Listed software company', org: 'Brightline Software',
    blurb: 'A publicly traded SaaS firm with 2,600 business customers in the US and EU. Its customers\' data lives in its cloud.',
    crown: 'the production cloud and customer tenant databases', data: 'customer tenant data, including EU personal data', ot: 'the production cloud control plane',
    people: 'customers', revPerHour: 105, offlineHit: 55, encryptHit: 75, otHit: 45, costScale: 10000, public: true,
    safety: 'Every customer is down with you, and their contracts have notice clauses.',
    clocks: [
      { id: 'sec8k', label: 'SEC Form 8-K, Item 1.05', who: 'Investors, via SEC EDGAR', trigger: 'material', bdays: 4, via: 'file', src: 'sec' },
      // For customer tenant data the SaaS firm is a GDPR processor: it must tell its customers (the controllers) without
      // undue delay, and they notify the authority within 72 hours. 48 hours stands in for "without undue delay".
      { id: 'gdpr', label: 'GDPR Art. 33(2) notice to customers as data controllers', who: 'Business customers (data controllers)', trigger: 'breach', hours: 48, via: 'people', src: 'gdpr' },
    ],
  },
];

export const sectorById = id => SECTORS.find(s => s.id === id) || SECTORS[0];
