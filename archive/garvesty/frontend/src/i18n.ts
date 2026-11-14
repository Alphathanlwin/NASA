// Centralized i18n for Garvesty — English & Burmese (Myanmar Unicode)
const en = {
  appName: 'Garvesty',
  appSub: 'EARTH & FARM SYSTEMS',
  tagline: 'Rotation planning with NASA Earth observation data',
  challengeTag: 'NASA Space Apps Challenge 2026',

  // Modes & Navigation
  farmerMode: 'Farmer Mode',
  analystMode: 'Analyst Mode',
  langSwitch: 'Language',

  // Farmer Screens
  f1Title: 'Mission Overview',
  f2Title: 'My Farm & Boundary',
  f3Title: 'Environment & Soil',
  f4Title: 'Rotation Comparison',
  f5Title: 'What-If Scenarios',
  f6Title: 'Decision Report',

  // Analyst Screens
  a1Title: 'Mission Overview',
  a2Title: 'Field Intelligence',
  a3Title: 'Data Catalogue',
  a4Title: 'Quality & ML Models',

  // General & Banner
  demoBanner: 'Twante, Yangon Region. Environmental layers sourced from NASA POWER & SoilGrids.',
  offlineBanner: 'Offline Mode: displaying verified snapshot cache.',
  tilesOffline: 'Map tiles unavailable. Field boundary vectors rendered offline.',

  // Map controls
  baseMap: 'Base Map',
  satellite: 'NASA Satellite',
  drawBoundary: 'Draw Field',
  finishDraw: 'Complete Boundary',
  undoPoint: 'Undo Point',
  cancelDraw: 'Cancel',
  clearBoundary: 'Clear',

  // Actions
  dispatchAgent: 'Dispatch Field Scout',
  agentEnRoute: 'Field Scout en route…',
  agentAnalyzing: 'Evaluating soil & climate fit…',
  agentComplete: 'Rotation Plan Ready',
  runAnalysis: 'Analyse Field',
  saveReport: 'Save to Device (Offline)',
  printReport: 'Print / Export PDF',
  resetScenarios: 'Reset to Baseline',

  // Metrics & Units
  monitoredArea: 'Monitored Area',
  acres: '{a} acres ({h} ha)',
  rain7: '7-Day Rainfall',
  rain30: 'Last 30 days: {v} mm. {month} average: {c} mm',
  temperature: 'Temperature',
  tempRange: 'Day range {min} to {max} °C',
  wetness: 'Root-Zone Wetness',
  wetnessHint: '0 = dry, 1 = saturated. Modelled, grid-cell scale',
  wetnessChange: '{v} over 7 days',
  soil: 'Topsoil pH',
  soilPh: 'Topsoil pH (0–5 cm)',
  soilTexture: 'Clay {clay}% · silt {silt}% · sand {sand}%',
  smap: 'Satellite soil moisture',
  smapMoisture: 'SMAP Soil Moisture',
  smapHint: 'District scale (9 km)',
  ndvi: 'Vegetation index (NDVI)',
  ndviVegetation: 'MODIS Vegetation (NDVI)',
  connected: 'Connected',
  notConnected: 'Not connected yet',
  noData: 'No data for this location',
  userProvided: 'User Drawn',
  unknown: 'Unknown',

  // Compare & Scenarios
  priorities: 'Your priorities',
  income: 'Income',
  soilHealth: 'Soil health',
  waterSaving: 'Water saving',
  returnsTitle: 'Your expected returns (optional)',
  returnsHint: 'Enter your own estimate per acre for each crop, in any currency. Without it, income counts the same for every plan.',
  plans: 'Rotations compared',
  plansSub: '{n} valid rotations scored. Top 3 plus your usual rotation.',
  existing: 'Your usual rotation',
  rank: 'Rank {n} of {total}',
  score: 'Score',
  why: 'Why it scores well',
  whyNot: 'What counts against it',
  evidence: 'Evidence used',
  gaps: 'Information gaps',
  checkLocally: 'Check locally',
  rejected: 'Rejected before scoring ({n})',
  dataSources: 'Data sources',
  asOf: 'as of {d}',
  loadError: 'Could not reach the Garvesty server.',
  adjustment: 'Climate fit',
  baselineRotation: 'Current Practice',
  topAlternative: 'Recommended Alternative',
  incomeScore: 'Income Fit',
  soilScore: 'Soil Health',
  waterScore: 'Water Saving',
  climateFit: 'Climate Fit',
  rainfallChange: 'Rainfall Deviation',
  plantingDelay: 'Planting Delay',
  irrigationStatus: 'Dry-Season Irrigation',
  drainageStatus: 'Soil Drainage',
  available: 'Available',
  unavailable: 'Unavailable',
  goodDrainage: 'Good',
  moderateDrainage: 'Moderate',
  poorDrainage: 'Poor',
  fertilizerStatus: 'Fertilizer',
  fertilizerNormal: 'Normal price',
  fertilizerExpensive: 'Expensive',
  fertilizerUnavailable: 'Unavailable',
  pesticideStatus: 'Pesticide',
  cashStatus: 'Cash',
  cashNormal: 'Normal',
  cashTight: 'Tight',
  farmerReportedNote: 'Farmer-reported: the satellite cannot see input prices or availability.',
  happeningNow: 'What is happening now',
  whatHappened: 'What happened',
  drySpell: 'Dry spell',
  wetSpell: 'Wet spell',
  ndviDrop: 'Vegetation drop',
  timeContextMissing: 'Time context not yet computed — regenerate the snapshot.',
  noEvents: 'No dry/wet spells or vegetation drops detected in the series.',
  whyGood: 'Favourable factors',
  whyAgainst: 'Risk factors & constraints',
  localChecks: 'Crucial Local Checks',
  dataGaps: 'Data & Model Limitations',
  disclaimer: 'Advisory decision support, not an agronomic guarantee. Verify with local township extension officers before investment.',
  conditions: 'Field conditions',
  usualRotation: 'Usual rotation',
  irrigated: 'Irrigated',
  rainfed: 'Rain-fed',
  pickField: 'Click a field on the map to send the agent.',
  pickFieldHint: 'The agent visits the field, reads the data for it and compares rotations.',
  eventLog: 'Agent log',
  simTime: 'sim time',
} as const

type TranslationKeys = { [K in keyof typeof en]: string }

const my: TranslationKeys = {
  appName: 'ဂါဗက်စ်တီ (Garvesty)',
  appSub: 'မြေပြင်နှင့် စိုက်ပျိုးရေးစနစ်',
  tagline: 'နာဆာ ဂြိုဟ်တုအချက်အလက်များဖြင့် သီးနှံသံသရာ ရွေးချယ်မှု စနစ်',
  challengeTag: 'နာဆာ အာကာသ အက်ပ်ပြိုင်ပွဲ ၂၀၂၆',

  farmerMode: 'တောင်သူသုံး မုဒ်',
  analystMode: 'ပညာရှင်သုံး မုဒ်',
  langSwitch: 'ဘာသာစကား',

  f1Title: 'ခြုံငုံသုံးသပ်ချက်',
  f2Title: 'မိမိလယ်ယာနှင့် နယ်နိမိတ်',
  f3Title: 'ရာသီဥတုနှင့် မြေဆီလွှာ',
  f4Title: 'သီးနှံသံသရာ နှိုင်းယှဉ်ချက်',
  f5Title: 'အခြေအနေ ဆန်းစစ်မှု',
  f6Title: 'ဆုံးဖြတ်ချက် အစီရင်ခံစာ',

  a1Title: 'စောင့်ကြည့်ရေး မစ်ရှင်',
  a2Title: 'ကွင်းဆင်းအချက်အလက် စစ်ဆေးမှု',
  a3Title: 'ဒေတာ ကတ်တလောက်',
  a4Title: 'အရည်အသွေးနှင့် မော်ဒယ်များ',

  demoBanner: 'တွံတေးမြို့နယ်၊ ရန်ကုန်တိုင်း။ နာဆာ POWER နှင့် SoilGrids မှ အချက်အလက်များ။',
  offlineBanner: 'အင်တာနက်မရှိပါ - သိမ်းဆည်းထားသော အချက်အလက်များကို ပြသနေသည်။',
  tilesOffline: 'မြေပုံဖွင့်မရပါ - လယ်ကွက်နယ်နိမိတ်မျဉ်းများကို ပြသထားသည်။',

  baseMap: 'သာမန်မြေပုံ',
  satellite: 'နာဆာ ဂြိုဟ်တုပုံရိပ်',
  drawBoundary: 'လယ်ကွက်ဆွဲမည်',
  finishDraw: 'နယ်နိမိတ် အတည်ပြုမည်',
  undoPoint: 'နောက်ဆုံးအမှတ် ဖျက်မည်',
  cancelDraw: 'ပယ်ဖျက်မည်',
  clearBoundary: 'ရှင်းလင်းမည်',

  dispatchAgent: 'ကွင်းဆင်းအေးဂျင့် စေလွှတ်မည်',
  agentEnRoute: 'အေးဂျင့် ကွင်းဆင်းစစ်ဆေးနေသည်…',
  agentAnalyzing: 'ရာသီဥတုနှင့် မြေဆီလွှာ ကိုက်ညီမှု တွက်ချက်နေသည်…',
  agentComplete: 'အကြံပြုချက် အဆင်သင့်ဖြစ်ပါပြီ',
  runAnalysis: 'တွက်ချက်ဆန်းစစ်မည်',
  saveReport: 'စက်ထဲတွင် သိမ်းဆည်းမည်',
  printReport: 'အစီရင်ခံစာ ပရင့်ထုတ်မည်',
  resetScenarios: 'မူလအခြေအနေသို့ ပြန်ထားမည်',

  monitoredArea: 'လယ်မြေဧရိယာ',
  acres: '{a} ဧက ({h} ဟက်တာ)',
  rain7: '၇ ရက်အတွင်း မိုးရေချိန်',
  rain30: 'ရက် ၃၀ မိုးရေချိန်: {v} မမ (ပျမ်းမျှ: {c} မမ)',
  temperature: 'အပူချိန်',
  tempRange: '{min}° မှ {max}°C',
  wetness: 'မြေဆီလွှာ အစိုဓာတ်',
  wetnessHint: '၀ = ခြောက်သွေ့၊ ၁ = ရေဝပ် (NASA POWER 0.5°)',
  wetnessChange: '၇ ရက်အတွင်း {v}',
  soil: 'မြေဆီလွှာ ချဉ်ဖန်ကိန်း',
  soilPh: 'မြေဆီလွှာ ချဉ်ဖန်ကိန်း (pH)',
  soilTexture: 'ရွှံ့စေး {clay}% · နုန်း {silt}% · သဲ {sand}%',
  smap: 'SMAP ဂြိုဟ်တုမြေစိုဓာတ်',
  smapMoisture: 'SMAP ဂြိုဟ်တုမြေစိုဓာတ်',
  smapHint: 'ခရိုင်အဆင့် (၉ ကီလိုမီတာ)',
  ndvi: 'သီးနှံစိမ်းလန်းမှုညွှန်းကိန်း (NDVI)',
  ndviVegetation: 'သီးနှံစိမ်းလန်းမှုညွှန်းကိန်း (NDVI)',
  connected: 'ချိတ်ဆက်ထားသည်',
  notConnected: 'မချိတ်ဆက်ရသေးပါ',
  noData: 'အချက်အလက် မရှိပါ',
  userProvided: 'ကိုယ်တိုင်ရေးဆွဲထားသည်',
  unknown: 'မသိရှိရပါ',

  priorities: 'ဦးစားပေးချက်များ',
  income: 'ဝင်ငွေ',
  soilHealth: 'မြေဆီလွှာ ကျန်းမာရေး',
  waterSaving: 'ရေချွေတာရေး',
  returnsTitle: 'မျှော်မှန်းဝင်ငွေ',
  returnsHint: 'သီးနှံအလိုက် တစ်ဧကမျှော်မှန်းဝင်ငွေ ထည့်သွင်းနိုင်ပါသည်။',
  plans: 'နှိုင်းယှဉ်ထားသော သီးနှံသံသရာများ',
  plansSub: 'ကိုက်ညီသော သီးနှံသံသရာ {n} မျိုး တွက်ချက်ထားသည်။',
  existing: 'လက်ရှိစိုက်ပျိုးနေကျ သီးနှံသံသရာ',
  rank: 'အဆင့် {n} / {total}',
  score: 'ကိုက်ညီမှုရမှတ်',
  why: 'သင့်လျော်သောအချက်များ',
  whyNot: 'စိုးရိမ်ရသောအချက်များ',
  evidence: 'အသုံးပြုထားသော အထောက်အထားများ',
  gaps: 'အချက်အလက် ကန့်သတ်ချက်များ',
  checkLocally: 'ဒေသတွင်း စစ်ဆေးရန်',
  rejected: 'ပယ်ဖျက်ထားသော သီးနှံသံသရာများ ({n})',
  dataSources: 'ဒေတာရင်းမြစ်များ',
  asOf: '{d} ရက်စွဲအရ',
  loadError: 'ဆာဗာသို့ ချိတ်ဆက်၍ မရပါ။',
  adjustment: 'ရာသီဥတုကိုက်ညီမှု',
  baselineRotation: 'လက်ရှိစိုက်ပျိုးနေကျ သီးနှံသံသရာ',
  topAlternative: 'အကောင်းဆုံး အကြံပြုသီးနှံ',
  incomeScore: 'ဝင်ငွေရလဒ်',
  soilScore: 'မြေဆီလွှာကောင်းမွန်မှု',
  waterScore: 'ရေချွေတာနိုင်မှု',
  climateFit: 'ရာသီဥတုကိုက်ညီမှု',
  rainfallChange: 'မိုးရေချိန် ပြောင်းလဲမှု',
  plantingDelay: 'စိုက်ပျိုးချိန် နောက်ကျမှု',
  irrigationStatus: 'ဆည်ရေ/မြေအောက်ရေ ရရှိမှု',
  drainageStatus: 'ရေထုတ်စနစ် ကောင်းမွန်မှု',
  available: 'ရရှိနိုင်ပါသည်',
  unavailable: 'မရရှိနိုင်ပါ',
  goodDrainage: 'ကောင်းမွန်',
  moderateDrainage: 'အသင့်အတင့်',
  poorDrainage: 'ညံ့ဖျင်း / ရေဝပ်လွယ်',
  fertilizerStatus: 'ဓာတ်မြေဩဇာ',
  fertilizerNormal: 'ပုံမှန်ဈေး',
  fertilizerExpensive: 'ဈေးကြီးသည်',
  fertilizerUnavailable: 'မရရှိနိုင်ပါ',
  pesticideStatus: 'ပိုးသတ်ဆေး',
  cashStatus: 'ငွေကြေး',
  cashNormal: 'ပုံမှန်',
  cashTight: 'ငွေကျပ်သည်',
  farmerReportedNote: 'တောင်သူကိုယ်တိုင် ဖြည့်ရမည် — ဂြိုဟ်တုက ဈေးနှုန်းနှင့် ရရှိနိုင်မှုကို မမြင်နိုင်ပါ။',
  happeningNow: 'ယခု ဖြစ်နေသည်များ',
  whatHappened: 'ဖြစ်ခဲ့သည်များ',
  drySpell: 'ခြောက်သွေ့သောကာလ',
  wetSpell: 'ရေများသောကာလ',
  ndviDrop: 'အပင်အစိမ်းရောင် ကျဆင်းမှု',
  timeContextMissing: 'အချိန်အခြေအနေ မတွက်ချက်ရသေးပါ — snapshot ကို ပြန်လည်ထုတ်ပါ။',
  noEvents: 'ခြောက်သွေ့ခြင်း၊ ရေများခြင်း သို့မဟုတ် အပင်ကျဆင်းမှု မတွေ့ရှိပါ။',
  whyGood: 'သင့်လျော်သောအချက်များ',
  whyAgainst: 'စိုးရိမ်ရသောအချက်များနှင့် အခက်အခဲများ',
  localChecks: 'ဒေသတွင်း မဖြစ်မနေ စစ်ဆေးရမည့်အချက်များ',
  dataGaps: 'အချက်အလက် ကန့်သတ်ချက်များ',
  disclaimer: 'ဤစနစ်သည် အထောက်အကူပြု အကြံပြုချက်သာဖြစ်ပြီး အထွက်နှုန်းအာမခံချက်မဟုတ်ပါ။ ရင်းနှီးမြှုပ်နှံခြင်းမပြုမီ မြို့နယ်စိုက်ပျိုးရေးဦးစီးဌာနနှင့် တိုင်ပင်ပါ။',
  conditions: 'ကွင်းဆင်းအခြေအနေ',
  usualRotation: 'ပုံမှန်သီးနှံသံသရာ',
  irrigated: 'ဆည်ရေသောက်',
  rainfed: 'မိုးကောင်းသောက်',
  pickField: 'အေးဂျင့်စေလွှတ်ရန် လယ်ကွက်ကို နှိပ်ပါ။',
  pickFieldHint: 'အေးဂျင့်သည် လယ်ကွက်သို့ သွားရောက်ကာ အချက်အလက်များကို ဆန်းစစ်ပေးမည်ဖြစ်သည်။',
  eventLog: 'အေးဂျင့် မှတ်တမ်း',
  simTime: 'အချိန်',
}

export type Key = keyof typeof en
export type Lang = 'en' | 'my'

let currentLang: Lang = 'en'
const listeners = new Set<(l: Lang) => void>()

export function setLanguage(l: Lang) {
  currentLang = l
  listeners.forEach((fn) => fn(l))
}

export function getLanguage(): Lang {
  return currentLang
}

export function subscribeLanguage(fn: (l: Lang) => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function t(key: Key, params?: Record<string, string | number | null | undefined>): string {
  const dict = currentLang === 'my' ? my : en
  let s: string = dict[key] ?? en[key] ?? String(key)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.replace(`{${k}}`, v == null ? '–' : String(v))
    }
  }
  return s
}
