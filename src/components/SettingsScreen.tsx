import { useState, lazy, Suspense } from 'react';
import type { SimulationParams } from '../types/simulation';
import { DEFAULT_PARAMS } from '../engine/physics';
import { useI18n } from '../i18n/context';
import type { RenderMode } from '../App';
import './SettingsScreen.css';

const VenusBackground = lazy(() => import('./VenusBackground'));

interface Props {
  onStart: (params: SimulationParams) => void;
  renderMode: RenderMode;
  onRenderModeChange: (m: RenderMode) => void;
}

function Slider({ label, value, min, max, step, unit, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="slider-row">
      <label className="slider-label">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider-input"
      />
      <span className="slider-value">{value} {unit}</span>
    </div>
  );
}

export default function SettingsScreen({ onStart, renderMode, onRenderModeChange }: Props) {
  const [params, setParams] = useState<SimulationParams>({ ...DEFAULT_PARAMS });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { lang, setLang, t } = useI18n();

  const update = (key: keyof SimulationParams, value: number) => {
    setParams((p) => ({ ...p, [key]: value }));
  };

  return (
    <div className="settings-screen">
      <Suspense fallback={null}>
        <VenusBackground />
      </Suspense>
      <div className="settings-container">
        <div className="settings-header">
          <div className="lang-switcher">
            <button
              className={`lang-btn ${lang === 'ru' ? 'active' : ''}`}
              onClick={() => setLang('ru')}
            >
              RU
            </button>
            <button
              className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
              onClick={() => setLang('en')}
            >
              EN
            </button>
          </div>
          <h1 className="settings-title">{t('settings.title')}</h1>
          <p className="settings-subtitle">{t('settings.subtitle')}</p>
        </div>

        <div className="settings-panel render-mode-panel">
          <h2 className="panel-title">{t('render.title')}</h2>
          <div className="render-mode-grid">
            <button
              className={`render-mode-card ${renderMode === '3d' ? 'active' : ''}`}
              onClick={() => onRenderModeChange('3d')}
              type="button"
            >
              <span className="render-mode-icon">◊</span>
              <span className="render-mode-label">{t('render.cinematic')}</span>
            </button>
            <button
              className={`render-mode-card ${renderMode === '2d' ? 'active' : ''}`}
              onClick={() => onRenderModeChange('2d')}
              type="button"
            >
              <span className="render-mode-icon">▭</span>
              <span className="render-mode-label">{t('render.classic')}</span>
            </button>
          </div>
        </div>

        <div className="settings-panel">
          <h2 className="panel-title">{t('settings.panelTitle')}</h2>

          <Slider
            label={t('settings.mass')}
            value={params.mass}
            min={500} max={1000} step={10}
            unit="kg"
            onChange={(v) => update('mass', v)}
          />

          <Slider
            label={t('settings.fuel')}
            value={params.fuelMass}
            min={30} max={150} step={5}
            unit="kg"
            onChange={(v) => update('fuelMass', v)}
          />

          <Slider
            label={t('settings.entrySpeed')}
            value={params.entrySpeed}
            min={8000} max={12000} step={100}
            unit="m/s"
            onChange={(v) => update('entrySpeed', v)}
          />

          <Slider
            label={t('settings.entryAltitude')}
            value={params.entryAltitude / 1000}
            min={100} max={150} step={5}
            unit="km"
            onChange={(v) => update('entryAltitude', v * 1000)}
          />

          <button
            className="advanced-toggle"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? '▼' : '▶'} {t('settings.advanced')}
          </button>

          {showAdvanced && (
            <div className="advanced-settings">
              <Slider
                label={t('settings.heatShieldMass')}
                value={params.heatShieldMass}
                min={20} max={100} step={5}
                unit="kg"
                onChange={(v) => update('heatShieldMass', v)}
              />
              <Slider
                label={t('settings.crossSection')}
                value={params.crossSection}
                min={1} max={5} step={0.1}
                unit="m²"
                onChange={(v) => update('crossSection', v)}
              />
              <Slider
                label={t('settings.engineThrust')}
                value={params.engineThrust}
                min={3000} max={15000} step={500}
                unit="N"
                onChange={(v) => update('engineThrust', v)}
              />
              <Slider
                label={t('settings.engineIsp')}
                value={params.engineIsp}
                min={200} max={400} step={10}
                unit="s"
                onChange={(v) => update('engineIsp', v)}
              />
            </div>
          )}
        </div>

        <div className="venus-info">
          <h3>{t('settings.venusTitle')}</h3>
          <ul>
            <li>{t('settings.venusFact1')}</li>
            <li>{t('settings.venusFact2')}</li>
            <li>{t('settings.venusFact3')}</li>
            <li>{t('settings.venusFact4')}</li>
            <li>{t('settings.venusFact5')}</li>
          </ul>
          <p className="venus-source">
            {t('settings.source')}{' '}
            <a href="https://nssdc.gsfc.nasa.gov/planetary/factsheet/venusfact.html" target="_blank" rel="noopener noreferrer">
              NASA Planetary Fact Sheet
            </a>
          </p>
        </div>

        <button className="start-btn" onClick={() => onStart(params)}>
          {t('settings.launch')}
        </button>
      </div>
    </div>
  );
}
