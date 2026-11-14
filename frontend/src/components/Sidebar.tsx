// AI-assisted: Claude Code
// Left navigation (desktop) that becomes a bottom bar on phones.
import { t } from '../i18n'
import type { Key } from '../i18n'
import { LogoMark } from './Logo'

export type Page = 'home' | 'fields' | 'field3d' | 'planner' | 'scenarios' | 'log' | 'quality'

const ICONS: Record<Page, string> = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  fields: 'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15',
  field3d: 'M12 2l9 5v10l-9 5-9-5V7zM12 12l9-5M12 12v10M12 12L3 7',
  planner: 'M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM8 12h3M8 16h6',
  scenarios: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  log: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  quality: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6',
}

export function Icon({ d, size = 22 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
  )
}

const PAGES: Page[] = ['home', 'fields', 'field3d', 'planner', 'scenarios', 'log', 'quality']

export function Sidebar({ page, onPage, online }: { page: Page; onPage: (p: Page) => void; online: boolean }) {
  return (
    <aside className="side">
      <div className="side-brand">
        <LogoMark size={42} />
        <div>
          <b>{t('app.name')}</b>
          <span>{t('app.tagline')}</span>
        </div>
      </div>

      <nav className="side-nav" aria-label={t('nav.sections')}>
        {PAGES.map((p) => (
          <button key={p} className={page === p ? 'active' : ''} aria-current={page === p ? 'page' : undefined}
            onClick={() => onPage(p)}>
            <Icon d={ICONS[p]} />
            <span>
              <b>{t(`side.${p}` as Key)}</b>
              <small>{t(`side.${p}Sub` as Key)}</small>
            </span>
          </button>
        ))}
      </nav>

      <div className={`side-status ${online ? 'on' : 'off'}`}>
        <Icon d={online ? 'M5 12l4 4 10-10' : 'M7 18a4 4 0 0 1-.6-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z'} />
        <span>
          <b>{online ? t('side.online') : t('side.offline')}</b>
          <small>{online ? t('side.onlineSub') : t('side.offlineSub')}</small>
        </span>
      </div>
    </aside>
  )
}
