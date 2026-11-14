// Every user-facing string in the UI goes through t(). Adding Burmese later is
// a second dictionary, not a refactor. Sentences produced by the rules engine
// come from the backend in English for now.
const en = {
  appName: 'Field Shift',
  tagline: 'Rotation planning with NASA data',
  demoBanner:
    'Demo fields near Twante, Yangon Region. Values are real data for these coordinates unless badged DEMO.',
  offlineBanner: 'No connection to NASA POWER. Showing cached data.',
  tilesOffline: 'Map tiles unavailable. Field outlines are still shown.',
  pickField: 'Click a field on the map to send the agent.',
  pickFieldHint: 'The agent visits the field, reads the data for it and compares rotations.',
  agentEnRoute: 'Agent en route…',
  eventLog: 'Agent log',
  simTime: 'sim time',
  baseMap: 'Map',
  satellite: 'NASA satellite',
  usualRotation: 'Usual rotation',
  irrigated: 'Irrigated',
  rainfed: 'Rain-fed',
  conditions: 'Field conditions',
  rain7: 'Rain, last 7 days',
  rain30: 'Last 30 days: {v} mm. {month} average: {c} mm',
  temperature: 'Temperature',
  tempRange: 'Day range {min} to {max} °C',
  wetness: 'Root-zone wetness',
  wetnessHint: '0 = dry, 1 = saturated. Modelled, grid-cell scale',
  wetnessChange: '{v} over 7 days',
  soil: 'Topsoil pH',
  soilTexture: 'Clay {clay}% · silt {silt}% · sand {sand}%',
  smap: 'Satellite soil moisture',
  smapHint: 'District scale (9 km)',
  ndvi: 'Vegetation index (NDVI)',
  notConnected: 'Not connected yet',
  noData: 'No data for this location',
  priorities: 'Your priorities',
  income: 'Income',
  soilHealth: 'Soil health',
  waterSaving: 'Water saving',
  returnsTitle: 'Your expected returns (optional)',
  returnsHint:
    'Enter your own estimate per acre for each crop, in any currency. Without it, income counts the same for every plan.',
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
  disclaimer: 'Decision support, not a yield forecast. It does not replace your judgment or local advice.',
  dataSources: 'Data sources',
  asOf: 'as of {d}',
  loadError: 'Could not reach the Field Shift server.',
  acres: '{a} acres ({h} ha)',
  adjustment: 'Climate fit',
} as const

export type Key = keyof typeof en
const dictionaries = { en } as const
let lang: keyof typeof dictionaries = 'en'

export function t(key: Key, params?: Record<string, string | number | null | undefined>): string {
  let s: string = dictionaries[lang][key] ?? en[key]
  if (params) for (const [k, v] of Object.entries(params)) s = s.replace(`{${k}}`, v == null ? '–' : String(v))
  return s
}
