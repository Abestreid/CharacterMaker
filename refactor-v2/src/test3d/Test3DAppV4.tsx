import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BREAST_FIRMNESS_OPTIONS,
  BREAST_SHAPES,
  BREAST_SIZE_OPTIONS,
  BUTTOCK_FIRMNESS_OPTIONS,
  BUTTOCK_SHAPES,
  CHARACTER_MEASUREMENTS,
  MUSCLE_MASS_OPTIONS,
  type BreastFirmnessId,
  type BreastShapeId,
  type BreastSizeId,
  type ButtockFirmnessId,
  type ButtockShapeId,
  type MuscleMassId,
} from '../domain/catalog/character/body';
import {
  CharacterBodyEngine,
  type BodyParams,
  type CameraView,
  type CharacterBodyFitResult,
  type OxiLoadProgress,
} from '../lib/body3d';
import './test3d.css';

type NumericKey = 'height' | 'weight' | 'bust' | 'waist' | 'hips' | 'bodyFat';
type ControlSpec = {
  key: NumericKey;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  fit: boolean;
};

const DEFAULTS: BodyParams = {
  gender: 'female',
  height: CHARACTER_MEASUREMENTS.height.defaultValue,
  weight: CHARACTER_MEASUREMENTS.weight.defaultValue,
  bust: CHARACTER_MEASUREMENTS.bust.defaultValue,
  waist: CHARACTER_MEASUREMENTS.waist.defaultValue,
  hips: CHARACTER_MEASUREMENTS.hips.defaultValue,
  bodyFat: CHARACTER_MEASUREMENTS.bodyFat.defaultValue,
  muscleMassId: 'toned',
  breastSizeId: 'medium',
  breastShapeId: 'teardrop',
  breastFirmnessId: 'natural',
  buttockShapeId: 'round',
  buttockFirmnessId: 'natural',
};

const CONTROLS: ControlSpec[] = [
  { key: 'height', ...CHARACTER_MEASUREMENTS.height, fit: true },
  { key: 'weight', ...CHARACTER_MEASUREMENTS.weight, fit: false },
  { key: 'bust', ...CHARACTER_MEASUREMENTS.bust, fit: true },
  { key: 'waist', ...CHARACTER_MEASUREMENTS.waist, fit: true },
  { key: 'hips', ...CHARACTER_MEASUREMENTS.hips, fit: true },
  { key: 'bodyFat', ...CHARACTER_MEASUREMENTS.bodyFat, fit: false },
];

const BUST = CONTROLS.find((item) => item.key === 'bust')!;
const OTHER_CONTROLS = CONTROLS.filter((item) => item.key !== 'bust');
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const fmt = (value: number | null, digits = 1) => value == null || !Number.isFinite(value) ? '—' : value.toFixed(digits);
const labelFor = (options: readonly { id: string; label: string }[], value: string | null) =>
  options.find((option) => option.id === value)?.label ?? '—';

function SelectRow(props: {
  label: string;
  value: string | null;
  options: readonly { id: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="lab3d-select-row">
      <span>{props.label}</span>
      <select value={props.value ?? ''} onChange={(event) => props.onChange(event.currentTarget.value)}>
        {props.options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    </label>
  );
}

function NumericControl(props: { control: ControlSpec; value: number; onChange: (value: number) => void }) {
  const { control, value, onChange } = props;
  return (
    <label className="lab3d-control">
      <span className="lab3d-control-head">
        <span>{control.label}{control.fit ? <sup>fit</sup> : null}</span>
        <strong>{value} {control.unit}</strong>
      </span>
      <span className="lab3d-control-row">
        <input type="range" min={control.min} max={control.max} step={control.step} value={value}
          onChange={(event) => onChange(Number(event.currentTarget.value))} />
        <input type="number" min={control.min} max={control.max} step={control.step} value={value}
          onChange={(event) => onChange(Number(event.currentTarget.value))} />
      </span>
    </label>
  );
}

export function Test3DAppV4() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<CharacterBodyEngine | null>(null);
  const latestRef = useRef<BodyParams>(DEFAULTS);
  const fitTimerRef = useRef<number | null>(null);
  const fitRunningRef = useRef(false);

  const [params, setParams] = useState(DEFAULTS);
  const [view, setView] = useState<CameraView>('front');
  const [showGrid, setShowGrid] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [ready, setReady] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [fitError, setFitError] = useState<string | null>(null);
  const [fitState, setFitState] = useState<'idle' | 'pending' | 'fitting' | 'ready' | 'error'>('idle');
  const [fitResult, setFitResult] = useState<CharacterBodyFitResult | null>(null);
  const [loadProgress, setLoadProgress] = useState<OxiLoadProgress>({ phase: 'wasm', progress: 0, label: 'Запускаю CharacterBody Engine' });
  latestRef.current = params;

  const summary = useMemo(() => ({
    size: labelFor(BREAST_SIZE_OPTIONS, params.breastSizeId),
    shape: labelFor(BREAST_SHAPES, params.breastShapeId),
    firmness: labelFor(BREAST_FIRMNESS_OPTIONS, params.breastFirmnessId),
  }), [params.breastFirmnessId, params.breastShapeId, params.breastSizeId]);

  const metrics = useMemo(() => {
    const hm = params.height / 100;
    return {
      bmi: params.weight / (hm * hm),
      whtr: params.waist / params.height,
      whr: params.waist / params.hips,
      bwr: params.bust / params.waist,
    };
  }, [params]);

  const runFit = async (target = latestRef.current) => {
    const engine = engineRef.current;
    if (!engine || fitRunningRef.current) return;
    fitRunningRef.current = true;
    setFitState('fitting');
    setFitError(null);
    try {
      const result = await engine.fit(target);
      setFitResult(result);
      setFitState('ready');
    } catch (error) {
      setFitError(error instanceof Error ? error.message : String(error));
      setFitState('error');
    } finally {
      fitRunningRef.current = false;
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let cancelled = false;
    let local: CharacterBodyEngine | null = null;
    void (async () => {
      try {
        local = await CharacterBodyEngine.create(canvas, (progress) => {
          if (!cancelled) setLoadProgress(progress);
        });
      } catch (error) {
        if (!cancelled) setEngineError(error instanceof Error ? error.message : String(error));
        return;
      }
      if (cancelled || !local) {
        local?.dispose();
        return;
      }
      engineRef.current = local;
      local.setGridVisible(showGrid);
      local.setAutoRotate(autoRotate);
      local.setView(view);
      local.preview(latestRef.current);
      setReady(true);
      void runFit(latestRef.current);
    })();
    return () => {
      cancelled = true;
      if (fitTimerRef.current != null) window.clearTimeout(fitTimerRef.current);
      local?.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !ready) return undefined;
    engine.preview(params);
    setFitState('pending');
    if (fitTimerRef.current != null) window.clearTimeout(fitTimerRef.current);
    fitTimerRef.current = window.setTimeout(() => {
      fitTimerRef.current = null;
      void runFit(latestRef.current);
    }, 650);
    return () => {
      if (fitTimerRef.current != null) window.clearTimeout(fitTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, ready]);

  useEffect(() => { engineRef.current?.setView(view); }, [view]);
  useEffect(() => { engineRef.current?.setGridVisible(showGrid); }, [showGrid]);
  useEffect(() => { engineRef.current?.setAutoRotate(autoRotate); }, [autoRotate]);

  const setNumeric = (key: NumericKey, value: number) => {
    const spec = CONTROLS.find((item) => item.key === key)!;
    setParams((current) => ({ ...current, [key]: clamp(Number.isFinite(value) ? value : spec.min, spec.min, spec.max) }));
  };

  const measured = fitResult?.measurements ?? null;
  const diagnostics = fitResult?.diagnostics ?? null;
  const delta = (actual: number | null, target: number) => actual == null ? '—' : `${actual - target >= 0 ? '+' : ''}${(actual - target).toFixed(1)}`;

  return (
    <main className="lab3d-page">
      <header className="lab3d-header">
        <div>
          <div className="lab3d-eyebrow">CharacterMaker /dev/test3d · V4</div>
          <h1>CharacterBody Engine</h1>
          <p>Настоящие MakeHuman cup/firmness macro morphs + OxiHuman measurement fitter + параметры CharacterMaker.</p>
        </div>
        <div className={`lab3d-engine-badge ${ready ? 'ready' : ''}`}>
          {ready ? `CharacterBody v4 · OxiHuman ${fitResult?.version ?? ''}` : 'engine loading'}
        </div>
      </header>

      <section className="lab3d-layout">
        <div className="lab3d-preview-card">
          <div className="lab3d-preview-toolbar">
            <div className="lab3d-view-buttons">
              {(['front', 'side', 'back', 'free'] as CameraView[]).map((item) => (
                <button key={item} type="button" className={view === item ? 'active' : ''} onClick={() => setView(item)}>
                  {item === 'front' ? 'Спереди' : item === 'side' ? 'Сбоку' : item === 'back' ? 'Сзади' : 'Свободно'}
                </button>
              ))}
            </div>
            <div className="lab3d-toolbar-toggles">
              <button type="button" className={showMeasurements ? 'active' : ''} onClick={() => setShowMeasurements((v) => !v)}>Мерки</button>
              <button type="button" className={showGrid ? 'active' : ''} onClick={() => setShowGrid((v) => !v)}>Сетка</button>
              <button type="button" className={autoRotate ? 'active' : ''} onClick={() => setAutoRotate((v) => !v)}>Авто</button>
            </div>
          </div>

          <div className="lab3d-stage">
            {!ready && !engineError ? <div className="lab3d-loading"><strong>{loadProgress.label}</strong><span>{Math.round(loadProgress.progress * 100)}%</span><div className="lab3d-loading-track"><i style={{ width: `${Math.round(loadProgress.progress * 100)}%` }} /></div></div> : null}
            {engineError ? <div className="lab3d-error"><strong>CharacterBody Engine не загрузился</strong><span>{engineError}</span></div> : null}
            <canvas ref={canvasRef} aria-label="CharacterMaker CharacterBody 3D model" />
            {showMeasurements && measured ? (
              <div className="lab3d-measure-overlay">
                <div><span>Рост</span><strong>{fmt(measured.heightCm)} см</strong><em>Δ {delta(measured.heightCm, params.height)}</em></div>
                <div><span>Грудь</span><strong>{fmt(measured.chestCm)} см</strong><em>Δ {delta(measured.chestCm, params.bust)}</em></div>
                <div><span>Талия</span><strong>{fmt(measured.waistCm)} см</strong><em>Δ {delta(measured.waistCm, params.waist)}</em></div>
                <div><span>Бедра</span><strong>{fmt(measured.hipCm)} см</strong><em>Δ {delta(measured.hipCm, params.hips)}</em></div>
              </div>
            ) : null}
            <div className="lab3d-stage-hint">1 палец — вращение · щипок — масштаб</div>
          </div>

          <div className="lab3d-metrics">
            <div><span>BMI</span><strong>{metrics.bmi.toFixed(1)}</strong></div>
            <div><span>Талия / рост</span><strong>{metrics.whtr.toFixed(3)}</strong></div>
            <div><span>Талия / бедра</span><strong>{metrics.whr.toFixed(3)}</strong></div>
            <div><span>Грудь / талия</span><strong>{metrics.bwr.toFixed(2)}</strong></div>
            <div className="wide"><span>Runtime</span><strong>CharacterBody v4 · OxiHuman + MakeHuman CC0</strong></div>
          </div>

          {diagnostics ? (
            <details className="lab3d-note">
              <summary><strong>Диагностика morph solver</strong></summary>
              <p>cupsize <b>{diagnostics.cupsize.toFixed(2)}</b> · firmness <b>{diagnostics.breastFirmness.toFixed(2)}</b> · solver bust <b>{diagnostics.solverBustCm.toFixed(1)} см</b> · passes <b>{diagnostics.solverPasses}</b> · final Δ <b>{diagnostics.bustErrorCm == null ? '—' : diagnostics.bustErrorCm.toFixed(2)} см</b></p>
            </details>
          ) : null}
        </div>

        <aside className="lab3d-controls-card">
          <div className="lab3d-section-head">
            <div><h2>Параметры CharacterMaker</h2><p>{params.height} см · {params.weight} кг · {params.bust}-{params.waist}-{params.hips}</p></div>
            <button type="button" className="lab3d-reset" onClick={() => setParams(DEFAULTS)}>Сбросить</button>
          </div>

          <div className="lab3d-gender">
            <button type="button" className={params.gender === 'female' ? 'active' : ''} onClick={() => setParams((current) => ({ ...current, gender: 'female', breastSizeId: current.breastSizeId ?? 'medium', breastShapeId: current.breastShapeId ?? 'teardrop', breastFirmnessId: current.breastFirmnessId ?? 'natural' }))}>Женский</button>
            <button type="button" className={params.gender === 'male' ? 'active' : ''} onClick={() => setParams((current) => ({ ...current, gender: 'male', breastSizeId: null, breastShapeId: null, breastFirmnessId: null }))}>Мужской</button>
          </div>

          <div className={`lab3d-fit-state ${fitState}`}>
            <span className="dot" />
            <div><strong>{fitState === 'fitting' ? 'Подгоняю мерки…' : fitState === 'error' ? 'Ошибка fit' : fitState === 'pending' ? 'Форма изменена' : fitState === 'ready' ? 'Mesh готов' : 'CharacterBody'}</strong><small>{fitError ?? (fitResult ? `Последний fit ${(fitResult.elapsedMs / 1000).toFixed(2)} с` : 'Инициализация')}</small></div>
            <button type="button" disabled={!ready || fitState === 'fitting'} onClick={() => void runFit()}>Fit сейчас</button>
          </div>

          {params.gender === 'female' ? (
            <section className="lab3d-breast-card">
              <div className="lab3d-breast-head"><div><h3>Грудь</h3><p>{params.bust} см · {summary.size} · {summary.shape} · {summary.firmness}</p></div><span>{summary.size}</span></div>
              <NumericControl control={BUST} value={params.bust} onChange={(value) => setNumeric('bust', value)} />
              <div className="lab3d-breast-selects">
                <SelectRow label="Размер груди" value={params.breastSizeId} options={BREAST_SIZE_OPTIONS} onChange={(value) => setParams((current) => ({ ...current, breastSizeId: value as BreastSizeId }))} />
                <SelectRow label="Тип / форма" value={params.breastShapeId} options={BREAST_SHAPES} onChange={(value) => setParams((current) => ({ ...current, breastShapeId: value as BreastShapeId }))} />
                <SelectRow label="Упругость" value={params.breastFirmnessId} options={BREAST_FIRMNESS_OPTIONS} onChange={(value) => setParams((current) => ({ ...current, breastFirmnessId: value as BreastFirmnessId }))} />
              </div>
            </section>
          ) : null}

          <div className="lab3d-controls-list lab3d-body-controls">
            {(params.gender === 'female' ? OTHER_CONTROLS : CONTROLS).map((control) => <NumericControl key={control.key} control={control} value={params[control.key]} onChange={(value) => setNumeric(control.key, value)} />)}
          </div>

          <div className="lab3d-shape-section">
            <h3>Композиция тела</h3>
            <SelectRow label="Мышечная масса" value={params.muscleMassId} options={MUSCLE_MASS_OPTIONS} onChange={(value) => setParams((current) => ({ ...current, muscleMassId: value as MuscleMassId }))} />
          </div>
          <div className="lab3d-shape-section">
            <h3>Ягодицы</h3>
            <SelectRow label="Форма" value={params.buttockShapeId} options={BUTTOCK_SHAPES} onChange={(value) => setParams((current) => ({ ...current, buttockShapeId: value as ButtockShapeId }))} />
            <SelectRow label="Упругость" value={params.buttockFirmnessId} options={BUTTOCK_FIRMNESS_OPTIONS} onChange={(value) => setParams((current) => ({ ...current, buttockFirmnessId: value as ButtockFirmnessId }))} />
          </div>

          <div className="lab3d-note"><strong>V4: размер груди теперь настоящий macro morph</strong><p>«Маленькая / Средняя / Большая / Очень крупная» управляет MakeHuman <b>cupsize</b>, а «Мягкая / Естественная / Упругая / Подтянутая» — отдельной осью <b>firmness</b>. Обхват груди остаётся независимой целевой меркой solver.</p></div>
        </aside>
      </section>
    </main>
  );
}
