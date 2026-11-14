import React from 'react'
import { t } from '../i18n'
import type { Lang } from '../i18n'
import type { Provenance } from '../api'

export type Mode = 'farmer' | 'analyst'
export type FarmerScreen = 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6'
export type AnalystScreen = 'A1' | 'A2' | 'A3' | 'A4'
export type ActiveScreen = FarmerScreen | AnalystScreen

interface Props {
  mode: Mode
  activeScreen: ActiveScreen
  layers: (Provenance & { layer: string })[]
  currentLang: Lang
  onSelectMode: (m: Mode) => void
  onSelectScreen: (s: ActiveScreen) => void
  onToggleLang: () => void
}

export const Sidebar: React.FC<Props> = ({
  mode,
  activeScreen,
  layers,
  currentLang,
  onSelectMode,
  onSelectScreen,
  onToggleLang,
}) => {
  const farmerNav = [
    { id: 'F1' as const, num: '01', label: t('f1Title') },
    { id: 'F2' as const, num: '02', label: t('f2Title') },
    { id: 'F3' as const, num: '03', label: t('f3Title') },
    { id: 'F4' as const, num: '04', label: t('f4Title') },
    { id: 'F5' as const, num: '05', label: t('f5Title') },
    { id: 'F6' as const, num: '06', label: t('f6Title') },
  ]

  const analystNav = [
    { id: 'A1' as const, num: '01', label: t('a1Title') },
    { id: 'A2' as const, num: '02', label: t('a2Title') },
    { id: 'A3' as const, num: '03', label: t('a3Title') },
    { id: 'A4' as const, num: '04', label: t('a4Title') },
  ]

  return (
    <aside className="garvesty-sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-logo-wrap">
          <span className="brand-title">GARVESTY</span>
          <span className="brand-sub">EARTH & FARM SYSTEMS</span>
        </div>
        <button
          className="lang-pill"
          onClick={onToggleLang}
          title="Switch Language (English / မြန်မာ)"
        >
          {currentLang === 'en' ? 'မြန်မာ' : 'EN'}
        </button>
      </div>

      <div className="brand-divider" />

      {/* Mode Switcher */}
      <div className="sidebar-section">
        <span className="section-label">WORKSPACE MODE</span>
        <div className="mode-selector">
          <button
            className={`mode-btn ${mode === 'farmer' ? 'active' : ''}`}
            onClick={() => {
              onSelectMode('farmer')
              onSelectScreen('F1')
            }}
          >
            🌾 {t('farmerMode')}
          </button>
          <button
            className={`mode-btn ${mode === 'analyst' ? 'active' : ''}`}
            onClick={() => {
              onSelectMode('analyst')
              onSelectScreen('A1')
            }}
          >
            🛰️ {t('analystMode')}
          </button>
        </div>
      </div>

      {/* Operations Navigation */}
      <div className="sidebar-section">
        <span className="section-label">
          {mode === 'farmer' ? 'FARM OPERATIONS' : 'MISSION INTELLIGENCE'}
        </span>
        <nav className="nav-list">
          {(mode === 'farmer' ? farmerNav : analystNav).map((item) => {
            const isActive = activeScreen === item.id
            return (
              <button
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectScreen(item.id)}
              >
                <span className="nav-num">{item.num}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      <div className="brand-divider" />

      {/* Connected Sources */}
      <div className="sidebar-section sources-section">
        <span className="section-label">CONNECTED SOURCES ({layers.length || 4})</span>
        <div className="sources-list">
          <div className="source-row">
            <span className="source-dot live" />
            <span className="source-name">NASA POWER (0.5°)</span>
          </div>
          <div className="source-row">
            <span className="source-dot live" />
            <span className="source-name">ISRIC SoilGrids (250m)</span>
          </div>
          <div className="source-row">
            <span className="source-dot live" />
            <span className="source-name">NASA GIBS VIIRS</span>
          </div>
          <div className="source-row">
            <span className="source-dot muted" />
            <span className="source-name">AppEEARS SMAP (Gated)</span>
          </div>
        </div>
      </div>

      {/* Status & Footer */}
      <div className="sidebar-footer">
        <div className="system-status">
          <span className="status-dot live" />
          <span className="status-text">All systems operational</span>
        </div>
        <div className="brand-divider" />
        <div className="workspace-meta">
          <span className="meta-title">Twante Township</span>
          <span className="meta-sub">Yangon Region, Myanmar · 16.7°N, 95.9°E</span>
        </div>
      </div>
    </aside>
  )
}
