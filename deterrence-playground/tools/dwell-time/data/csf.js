// NIST Cybersecurity Framework 2.0 Functions and the Categories the game uses (NIST CSWP 29, Feb 2024).
// NIST SP 800-61 Rev. 3 (Apr 2025) organizes incident response around these.
export const CSF = {
  functions: { GV: 'Govern', ID: 'Identify', PR: 'Protect', DE: 'Detect', RS: 'Respond', RC: 'Recover' },
  categories: {
    'GV.OC': 'Organizational Context', 'GV.RM': 'Risk Management Strategy', 'GV.RR': 'Roles, Responsibilities, and Authorities',
    'GV.PO': 'Policy', 'GV.OV': 'Oversight', 'GV.SC': 'Cybersecurity Supply Chain Risk Management',
    'ID.AM': 'Asset Management', 'ID.RA': 'Risk Assessment', 'ID.IM': 'Improvement',
    'PR.AA': 'Identity Management, Authentication, and Access Control', 'PR.AT': 'Awareness and Training', 'PR.DS': 'Data Security',
    'PR.PS': 'Platform Security', 'PR.IR': 'Technology Infrastructure Resilience',
    'DE.CM': 'Continuous Monitoring', 'DE.AE': 'Adverse Event Analysis',
    'RS.MA': 'Incident Management', 'RS.AN': 'Incident Analysis', 'RS.CO': 'Incident Response Reporting and Communication', 'RS.MI': 'Incident Mitigation',
    'RC.RP': 'Incident Recovery Plan Execution', 'RC.CO': 'Incident Recovery Communication',
  },
};
