// Rhetoric Search: readable names for source and stream ids (shared by the Search and Trends pages).
// Ids and their outlets are described in ~/Projects/rhetoric-corpus/SOURCES.md. An id missing here is shown
// with its underscores turned into spaces, so a newly added source still displays.

export const SOURCE = {
  // Russia
  kremlin_en: 'Kremlin transcripts (Putin)', kremlin_events_en: 'Kremlin events (English)', kremlin_ru: 'Kremlin transcripts (Russian)',
  mid_en: 'Russian Foreign Ministry (English)', mid_ru: 'Russian Foreign Ministry (Russian)', scrf_ru: 'Russian Security Council',
  mil_ru: 'Russian Defence Ministry (mil.ru)', government_ru: 'Russian Government', government_archive_ru: 'Russian Government (archive site)',
  premier_archive_ru: 'Prime Minister\'s site, 2008–2012 (archive)', duma_ru: 'State Duma', council_ru: 'Federation Council',
  telegram_ru: 'Telegram: verified official channels (Foreign and Defence Ministries, Government, Zakharova, Medvedev, Volodin)',
  telegram_unofficial_ru: 'Telegram: forwarded posts and unverified channels (not official)', telegram_media_ru: 'Telegram: RIA Novosti and TASS channels',
  ria_ru: 'RIA Novosti', tass_com: 'TASS (English)', tass_ru: 'TASS (Russian)', rt_com: 'RT (English)', rt_ru: 'RT (Russian)',
  sputnik_en: 'Sputnik (English)', rg_ru: 'Rossiyskaya Gazeta', vesti_ru: 'Vesti (VGTRK)', '1tv_ru': 'Channel One',
  tvzvezda_ru: 'TV Zvezda (Defence Ministry TV)', redstar_ru: 'Krasnaya Zvezda (Defence Ministry daily)',
  // China
  mfa_cn: 'PRC Foreign Ministry', mfa_cn_archive: 'PRC Foreign Ministry (site archive)', mfa_cn_live: 'PRC Foreign Ministry (press conferences, live)',
  mnd_cn: 'PRC Defense Ministry', mnd_cn_live: 'PRC Defense Ministry (spokesperson pages)', tao_cn: 'Taiwan Affairs Office',
  tao_cn_live: 'Taiwan Affairs Office (site archive)', cn_govcn: 'PRC State Council (gov.cn)', cn_embassy: 'PRC embassies',
  cn_ccg: 'China Coast Guard', cn_qiushi: 'Qiushi', prc_statemedia: 'PRC state media', prc_statemedia_headlines: 'PRC state media (headlines)',
  cn_xinhua: 'Xinhua', cn_peoples_daily: 'People\'s Daily', cn_globaltimes: 'Global Times', cn_huanqiu: 'Huanqiu (Global Times Chinese)',
  cn_cgtn: 'CGTN', cn_chinadaily: 'China Daily', cn_chinamil: 'PLA Daily and China Military Online', cn_chinanews: 'China News Service',
  cn_ecns: 'ECNS (China News Service English)', cn_cctv_en: 'CCTV (English)', cn_cctv_zh: 'CCTV (Chinese)', cn_cctv_xwlb: 'CCTV Xinwen Lianbo',
  cn_guancha: 'Guancha',
  // Iran
  iran_mfa_en: 'Iran Foreign Ministry: Statements feed', ir_mfa_en: 'Iran Foreign Ministry: other pages (archived copies)',
  ir_khamenei_en: 'Khamenei.ir (English)', ir_khamenei_fa: 'Khamenei.ir (Persian)',
  ir_leader_en: 'Leader.ir (English)', ir_leader_fa: 'Leader.ir (Persian)',
  ir_president_en: 'Iranian President (English)', ir_president_fa: 'Iranian President (Persian)', ir_irannewspaper_fa: 'Iran newspaper (government daily)',
  ir_presstv: 'Press TV', ir_iribnews_fa: 'IRIB News', ir_yjc_fa: 'Young Journalists Club (IRIB)', ir_jamejam_fa: 'Jam-e Jam (IRIB daily)',
  ir_parstoday_en: 'Pars Today (English)', ir_parstoday_fa: 'Pars Today (Persian)', ir_tasnim_en: 'Tasnim (English)', ir_tasnim_fa: 'Tasnim (Persian)',
  ir_mashregh_fa: 'Mashregh News', ir_javan_fa: 'Javan', ir_sobhesadegh_fa: 'Sobh-e Sadegh', ir_defapress_en: 'Defa Press (English)',
  ir_defapress_fa: 'Defa Press (Persian)', ir_snn_fa: 'Student News Network', ir_basijnews_fa: 'Basij News', ir_mizan_fa: 'Mizan (Judiciary)',
  ir_icana_fa: 'ICANA (Majlis news agency)', ir_kayhan_en: 'Kayhan (English)', ir_kayhan_fa: 'Kayhan (Persian)', ir_nournews_en: 'Nour News (English)',
  ir_nournews_fa: 'Nour News (Persian)', ir_iqna_en: 'IQNA Quran news agency (English)', ir_iqna_fa: 'IQNA Quran news agency (Persian)',
  ir_shana_fa: 'Shana (Oil Ministry)', ir_abna_en: 'AhlulBayt News Agency (English)', ir_abna_fa: 'AhlulBayt News Agency (Persian)',
  ir_hawzah_fa: 'Hawzah News', ir_quds_fa: 'Quds daily', ir_ettelaat_fa: 'Ettelaat', ir_rasa_en: 'Rasa News (English)', ir_rasa_fa: 'Rasa News (Persian)',
  ir_khabaronline_fa: 'Khabar Online', ir_hamshahri_fa: 'Hamshahri',
  // Other countries
  kp_kcna_en: 'KCNA (English)', kp_rodong_en: 'Rodong Sinmun (English)',
  by_president_en: 'Belarus President (English)', by_president_ru: 'Belarus President (Russian)', by_mfa_en: 'Belarus Foreign Ministry (English)',
  by_mfa_ru: 'Belarus Foreign Ministry (Russian)', belta_en: 'BelTA (English)',
  whitehouse: 'White House', state_dept: 'State Department', us_dod: 'Defense Department', us_usun: 'US Mission to the UN',
  pk_mofa: 'Pakistan Foreign Ministry', pk_ispr: 'Pakistan military (ISPR)', in_mea: 'India Ministry of External Affairs',
  tr_mfa_en: 'Türkiye Foreign Ministry (English)', tr_mfa_tr: 'Türkiye Foreign Ministry (Turkish)', tr_tccb_en: 'Türkiye Presidency (English)',
  tr_tccb_tr: 'Türkiye Presidency (Turkish)', tr_aa_en: 'Anadolu Agency (English)', tr_aa_tr: 'Anadolu Agency (Turkish)',
  sana_en: 'SANA (English)', mofaex_ar: 'Syria Foreign Ministry', mppre_es: 'Venezuela Foreign Ministry', minrex_en: 'Cuba Foreign Ministry (English)',
  granma_en: 'Granma (English)', tw_mofa_en: 'Taiwan Foreign Ministry (English)', tw_mofa_zh: 'Taiwan Foreign Ministry (Chinese)',
  tw_ey_en: 'Taiwan Executive Yuan (English)', tw_ey_zh: 'Taiwan Executive Yuan (Chinese)', tw_mac_zh: 'Taiwan Mainland Affairs Council',
  tw_president_en: 'Taiwan President (English)', tw_president_zh: 'Taiwan President (Chinese)', tw_cna: 'Central News Agency (Chinese)',
  tw_focustaiwan: 'Focus Taiwan (CNA English)', tw_taipeitimes: 'Taipei Times (privately owned)',
};

// Streams whose collection has stopped, and why (rhetoric-corpus SOURCES.md, checked 2026-10-06).
export const STOPPED = {
  cn_ccg: 'No longer collected: the site blocks the collector and archived copies end in May 2024.',
  mil_ru: 'No longer collected: mil.ru does not answer and archived copies end in April 2025.',
  pk_ispr: 'No longer collected: the site blocks the collector and archived copies end in July 2024.',
  government_archive_ru: 'Closed archive site: no new items.',
  premier_archive_ru: 'Closed archive site: no new items.',
};

const LANG = { en: 'English', ru: 'Russian', zh: 'Chinese', fa: 'Persian', ko: 'Korean', be: 'Belarusian', ur: 'Urdu', hi: 'Hindi', tr: 'Turkish', ar: 'Arabic', es: 'Spanish' };
// Selection regimes (rhetoric-corpus release docs, `sample` field).
const REGIME = { all: '', section: 'whole sections', section_random: 'random sample of sections', random: 'random sample',
  recent: 'recent window', rss: 'feed items', sitemap: 'sitemap-listed', cdx: 'archive-listed' };

export const sourceName = (id) => SOURCE[id] || String(id ?? '').replace(/_/g, ' ');

/** A Trends stream id "source|lang|regime" as "Source, language, regime"; a bare source id as its name. */
export function streamName(id) {
  const [src, lang, regime] = String(id ?? '').split('|');
  const name = sourceName(src);
  if (lang == null) return name;
  const bits = [];
  if (lang && !name.includes(`(${LANG[lang]})`)) bits.push(LANG[lang] || lang);
  if (regime && REGIME[regime] !== '') bits.push(REGIME[regime] || regime);
  if (!bits.length) return name;
  return name.endsWith(')') ? `${name.slice(0, -1)}, ${bits.join(', ')})` : `${name} (${bits.join(', ')})`;
}
