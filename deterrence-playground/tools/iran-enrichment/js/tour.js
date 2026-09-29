// Guided walkthrough: fixed states with short explanations. Each step sets the report, view and event.
export const STEPS = [
  { title: 'Under the deal',
    body: 'From January 2016 the nuclear deal capped Iran\'s stockpile at 300 kg of UF6 enriched to 3.67 percent, which is 202.8 kg of uranium. The IAEA\'s reports said the cap held but printed no figures until 2018. In February 2018 the stock was 109.5 kg.',
    set: { report: 'GOV/2018/7', view: 'all', ev: 'impl-day' } },
  { title: 'Past the limit',
    body: 'The United States left the deal in May 2018. On 1 July 2019 the IAEA verified that Iran had gone over the 300 kg cap, and Iran began enriching above 3.67 percent a week later. By November 2019 the stockpile was 372.3 kg.',
    set: { report: 'GOV/2019/55', view: 'all', ev: 'over-limit' } },
  { title: '20 and 60 percent, and less verification',
    body: 'Iran began enriching to 20 percent in January 2021 and to 60 percent in April 2021. From February 2021 it stopped the extra JCPOA monitoring, and the IAEA began estimating the stockpile, partly from Iran\'s own figures. The panel labels each report verified or estimated.',
    set: { report: 'GOV/2021/28', view: 'heu', ev: 'sixty' } },
  { title: 'The 60 percent stock',
    body: 'Switch to "60% only". The stock of uranium enriched up to 60 percent rose from 2.4 kg in May 2021 to 440.9 kg by 13 June 2025. The breakout estimates in the panel fell from a year under the deal to "one or two weeks" in 2024.',
    set: { report: 'GOV/2025/50', view: 'sixty', ev: null } },
  { title: 'June 2025: strikes and a blackout',
    body: 'Israel attacked Iran\'s nuclear sites from 13 June 2025 and the United States struck Fordow, Natanz and Isfahan on 22 June. The IAEA stopped verification. Its last estimate is dated 13 June 2025. The shaded band marks everything since: no verified figure.',
    set: { report: 'GOV/2025/50', view: 'all', ev: 'strikes-2025' } },
  { title: 'Where is the uranium?',
    body: 'In 2026 the IAEA reported that it "cannot provide any information on the current size, composition or whereabouts" of the stockpile. Grossi said about 200 kg of the 60 percent material had been at Isfahan. On 9 September 2026 the Board reported Iran to the UN Security Council.',
    set: { report: 'GOV/2026/50', view: 'all', ev: 'referral' } },
];

export function createTour(apply) {
  let i = -1;
  const card = document.createElement('div');
  card.className = 'ie-tour';
  card.hidden = true;
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'Guided walkthrough');
  document.body.appendChild(card);
  const show = () => {
    const s = STEPS[i];
    apply(s.set);
    card.innerHTML = `<div class="th"><span>Walkthrough ${i + 1} / ${STEPS.length}</span><button type="button" class="x" aria-label="Close walkthrough">×</button></div>
      <h3>${s.title}</h3><p>${s.body}</p>
      <div class="tn"><button type="button" class="btn" ${i === 0 ? 'disabled' : ''} data-d="-1">Back</button>
      <button type="button" class="btn solid" data-d="1">${i === STEPS.length - 1 ? 'Finish' : 'Next'}</button></div>`;
    card.querySelector('.x').onclick = stop;
    card.querySelectorAll('[data-d]').forEach(b => b.onclick = () => {
      const n = i + Number(b.dataset.d);
      if (n >= STEPS.length) stop(); else { i = n; show(); }
    });
    card.querySelector('.solid').focus({ preventScroll: true });
  };
  const start = () => { i = 0; card.hidden = false; show(); };
  const stop = () => { card.hidden = true; i = -1; };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden) stop(); });
  return { start, stop };
}
