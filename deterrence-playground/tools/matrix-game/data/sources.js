// Sources for the Baltic Matrix Game. Every URL was opened on 2026-09-29 and checked to say what the page claims.
// Census figures were pulled from the Statistics Estonia PxWeb API (tables RL21422, RL21429, RL21434, Narva city,
// all ages, both sexes) and are reproduced in data/scenario.js.
export const SOURCES = {
  engleHistory: {
    label: 'Chris Engle, "A short history of matrix games," PAXsims, 26 July 2016',
    url: 'https://paxsims.wordpress.com/2016/07/26/engle-a-short-history-of-matrix-games/',
    note: 'Engle dates the invention to January 1988 and describes players making arguments about what happens next.',
  },
  engleSimple: {
    label: 'Chris Engle, "Proposal for a simplified matrix game," PAXsims, 29 July 2016',
    url: 'https://paxsims.wordpress.com/2016/07/29/engle-proposal-for-a-simplified-matrix-game/',
    note: 'Actions may be made as arguments ("an action, a result, and three reasons why") but, Engle adds, "don\'t have to be"; all sessions should end with a debriefing.',
  },
  mouatAdj: {
    label: 'Tom Mouat, "Adjudication in matrix games," PAXsims, 30 July 2018',
    url: 'https://paxsims.wordpress.com/2018/07/30/adjudication-in-matrix-games/',
    note: 'Weighted probabilities: 2d6, 7 or more succeeds (58.3%), each strong PRO +1 and each strong CON -1, extreme totals give extreme outcomes. Suggests at least six moves.',
  },
  magck: {
    label: 'PAXsims, "MaGCK: The Matrix Game Construction Kit" (product page)',
    url: 'https://paxsims.wordpress.com/magck/',
    note: 'The kit whose weighted-probabilities rule this game uses; its development and publication were supported by the UK Defence Science and Technology Laboratory (Dstl). The NATO Wargaming Handbook (footnote 14) recommends it.',
  },
  handbook: {
    label: 'John Curry, Chris Engle and Peter Perla (eds.), The Matrix Games Handbook: Professional Applications from Education to Analysis and Wargaming (History of Wargaming Project, 2018)',
    url: 'http://www.wargaming.co/professional/details/matrixgameshandbook.htm',
    note: 'Publisher page. Contents include a sample game on NATO and Russian posturing in the Baltic Sea.',
  },
  handbookNews: {
    label: 'Rex Brynen, "The Matrix Games Handbook now available," PAXsims, 1 August 2018',
    url: 'https://paxsims.wordpress.com/2018/08/01/the-matrix-game-handbook-now-available/',
    note: 'Chapter list, including "Baltic Challenge: NATO and Russian posturing in the Baltic Sea".',
  },
  curryPrice: {
    label: 'Rex Brynen, review of John Curry and Tim Price, Matrix Games for Modern Wargaming (History of Wargaming Project, 2014), PAXsims, 20 September 2014',
    url: 'https://paxsims.wordpress.com/2014/09/20/review-matrix-games-for-modern-wargaming/',
    note: 'Players argue what they want to do, why it would succeed and its effects; others give counter-arguments; an umpire adjudicates with or without dice.',
  },
  ukHandbook: {
    label: 'UK Ministry of Defence, Development, Concepts and Doctrine Centre, Wargaming Handbook (August 2017), para. 3.6 "Matrix game"',
    url: 'https://www.gov.uk/government/publications/defence-wargaming-handbook',
    note: 'Matrix games "demand that players provide several specific arguments for the success of a proposed action"; others counter-argue; an umpire adjudicates.',
  },
  natoHandbook: {
    label: 'NATO Allied Command Transformation, NATO Wargaming Handbook, first version (2023), copy hosted by PAXsims',
    url: 'https://paxsims.wordpress.com/wp-content/uploads/2023/09/nato-wargaming-handbook-202309.pdf',
    note: 'Lists matrix wargames among the less rigid types, adjudicated by player consensus on the probability of success; footnote 14 recommends the Matrix Game Construction Kit.',
  },
  natoEfp: {
    label: 'NATO, "Strengthening NATO\'s eastern flank" (topic page)',
    url: 'https://www.nato.int/cps/en/natohq/topics_136388.htm',
    note: 'Warsaw Summit 2016 decision on enhanced Forward Presence; battlegroups operational in Estonia, Latvia, Lithuania and Poland by August 2017; Estonia host, United Kingdom framework nation; Madrid 2022 agreement to scale up to brigade-size units where and when required.',
  },
  statLang: {
    label: 'Statistics Estonia, 2021 census table RL21434: population by mother tongue and place of residence (Narva city)',
    url: 'https://andmed.stat.ee/en/stat/rahvaloendus__rel2021__rahvastiku-demograafilised-ja-etno-kultuurilised-naitajad__rahvus-emakeel/RL21434',
  },
  statEthnic: {
    label: 'Statistics Estonia, 2021 census table RL21429: population by ethnic nationality and place of residence (Narva city)',
    url: 'https://andmed.stat.ee/en/stat/rahvaloendus__rel2021__rahvastiku-demograafilised-ja-etno-kultuurilised-naitajad__rahvus-emakeel/RL21429',
  },
  statCit: {
    label: 'Statistics Estonia, 2021 census table RL21422: population by citizenship and place of residence (Narva city)',
    url: 'https://andmed.stat.ee/en/stat/rahvaloendus__rel2021__rahvastiku-demograafilised-ja-etno-kultuurilised-naitajad__kodakondsus/RL21422',
  },
  bbcKohver: {
    label: 'BBC News, "Estonia angry at Russia \'abduction\' on border," 5 September 2014',
    url: 'https://www.bbc.com/news/world-europe-29078400',
    note: 'An Internal Security Service officer was taken near the Luhamaa checkpoint; Estonia says inside Estonia, Russia\'s FSB says on Russian territory.',
  },
  bbcBuoys: {
    label: 'BBC News, "Russia\'s removal of border markers \'unacceptable\' - EU," 24 May 2024',
    url: 'https://www.bbc.com/news/articles/c899844ypj2o',
    note: '24 of 50 buoys marking Narva River sailing routes removed; Russia disputed about half of 250 planned buoy locations; EU called it unacceptable; Estonia summoned Russia\'s charge d\'affaires.',
  },
};
