export type DemoState = { pump: boolean; valve: boolean }
export type DemoAction = 'pump' | 'valve'

// This models the demonstration only; real equipment needs independent hardware interlocks.
export function toggleDemo(state: DemoState, action: DemoAction): DemoState {
  if (action === 'pump') return state.pump ? { ...state, pump: false } : { pump: true, valve: true }
  return state.valve ? { pump: false, valve: false } : { ...state, valve: true }
}
