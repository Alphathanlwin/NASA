// AI-assisted: Claude Code
// Left navigation (desktop) that becomes a bottom bar on phones.
import { t } from '../i18n'
import type { Key } from '../i18n'

export type Page = 'home' | 'fields' | 'field3d' | 'planner' | 'scenarios' | 'log'

const ICONS: Record<Page, string> = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  fields: 'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15',
  field3d: 'M12 2l9 5v10l-9 5-9-5V7zM12 12l9-5M12 12v10M12 12L3 7',
  planner: 'M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM8 12h3M8 16h6',
  scenarios: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  log: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
}

export function Icon({ d, size = 22 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
  )
}

const PAGES: Page[] = ['home', 'fields', 'field3d', 'planner', 'scenarios', 'log']

export function Sidebar({ page, onPage }: { page: Page; onPage: (p: Page) => void }) {
  return (
    <aside className="side">
      <div className="side-brand">
        <img className="side-logo" src={`${import.meta.env.BASE_URL}garvesty-logo.png`} alt={t('app.name')} width={720} height={333} />
      </div>

      <nav className="side-nav" aria-label={t('nav.sections')}>
        {PAGES.map((p) => (
          <button key={p} className={page === p ? 'active' : ''} aria-current={page === p ? 'page' : undefined}
            onClick={() => onPage(p)}>
            <Icon d={ICONS[p]} />
            <span>
              <b>{t(`side.${p}` as Key)}</b>
            </span>
          </button>
        ))}
      </nav>

    </aside>
  )
}
