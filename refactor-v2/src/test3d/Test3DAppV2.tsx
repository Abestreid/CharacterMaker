import { useEffect, useMemo, useRef, useState } from 'react';
import {
  OxiHumanSceneV2,
  type BodyParams,
  type CameraView,
  type Gender,
  type OxiFitResult,
  type OxiLoadProgress,
} from './oxiHumanSceneV2';
import './test3d.css';

const DEFAULTS: BodyParams = {
  gender: 'female',
  height: 170,
  weight: 60,
  bust: 90,
  waist: 65,
  hips: 95,
  bodyFat: 22,
  muscle: 1,
};

type NumericKey = Exclude<keyof BodyParams, 'gender'>;
type ControlSpec = { key: NumericKey; label: string; min: number; max: number; step: number; unit: string; fit?: boolean };

const CONTROLS: ControlSpec[] = [
  { key: 'height', label: 'Рост', min: 140, max: 220, step: 1, unit: 'см', fit: true },
  { key: 'weight', label: 'Вес', min: 40, max: 150, step: 1, unit: 'кг' },
  { key: 'bust', label: 'Грудь', min: 70, max: 140, step: 1, unit: 'см', fit: true },
  { key: 'waist', label: 'Талия', min: 50, max: 120, step: 1, unit: 'см', fit: true },
  { key: 'hips', label: 'Бедра', min: 70, max: 140, step: 1, unit: 'см', fit: true },
  { key: 'bodyFat', label: 'Жир', min: 8, max: 45, step: 1, unit: '%' },
];

const MUSCLE_LABELS = ['Мягкая', 'Тонизированная', 'Атлетическая', 'Мускулистая'];
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const fmt = (value: number | null, digits = 1) => value == null || !Number.isFinite(value) ? '—' : value.toFixed(digits);

export function Test3DAppV2() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<OxiHumanSceneV2 | null>(null);
  const latestRef = useRef<BodyParams>(DEFAULTS);
  const fitTimerRef = useRef<number | null>(null);
  const fittingRef = useRef(false);

  const [params, setParams] = useState(DEFAULTS);
  const [view, setView] = useState<CameraView>('front');
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [fitError, setFitError] = useState<string | null>(null);
  const [fitResult, setFitResult] = useState<OxiFitResult | null>(null);
  const [fitState, setFitState] = useState<'idle' | 'pending' | 'fitting' | 'ready' | 'error'>('idle');
  const [loadProgress, setLoadProgress] = useState<OxiLoadProgress>({ phase: 'wasm', progress: 0, label: 'Запускаю OxiHuman' });

  latestRef.current = params;

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
    const scene = sceneRef.current;
    if (!scene || fittingRef.current) return;
    fittingRef.current = true;
    setFitState('fitting');
    setFitError(null);
    try {
      const result = await scene.fit(target);
      setFitResult(result);
      setFitState('ready');
    } catch (error) {
      setFitError(error instanceof Error ? error.message : String(error));
      setFitState('error');
    } finally {
      fittingRef.current = false;
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let cancelled = false;
    let local: OxiHumanSceneV2 | null = null;

    void (async () => {
      try {
        local = await OxiHumanSceneV2.create(canvas, (progress) => {
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

      sceneRef.current = local;
      local.setGridVisible(showGrid);
      local.setAutoRotate(autoRotate);
      local.setView(view);
      local.preview(latestRef.current);
      setEngineError(null);
      setEngineReady(true);

      // Initial centimetre fit is deliberately outside engine-load error handling.
      // If it fails, the already loaded and rendered body remains usable.
      try {
        setFitState('fitting');
        const result = await local.fit(latestRef.current);
        if (!cancelled) {
          setFitResult(result);
          setFitError(null);
          setFitState('ready');
        }
      } catch (error) {
        if (!cancelled) {
          setFitError(error instanceof Error ? error.message : String(error));
          setFitState('error');
        }
      }
    })();

    return () => {
      cancelled = true;
      if (fitTimerRef.current != null) window.clearTimeout(fitTimerRef.current);
      local?.dispose();
      sceneRef.current = null;
    };
    // Boot only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !engineReady) return undefined;
    scene.preview(params);
    setFitState('pending');
    if (fitTimerRef.current != null) window.clearTimeout(fitTimerRef.current);
    fitTimerRef.current = window.setTimeout(() => {
      fitTimerRef.current = null;
      void runFit(latestRef.current);
    }, 700);
    return () => {
      if (fitTimerRef.current != null) window.clearTimeout(fitTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, engineReady]);

  useEffect(() => { sceneRef.current?.setView(view); }, [view]);
  useEffect(() => { sceneRef.current?.setGridVisible(showGrid); }, [showGrid]);
  useEffect(() => { sceneRef.current?.setAutoRotate(autoRotate); }, [autoRotate]);

  const setNumeric = (key: NumericKey, raw: number) => {
    if (key === 'muscle') {
      setParams((current) => ({ ...current, muscle: clamp(raw, 0, 3) }));
      return;
    }
    const spec = CONTROLS.find((item) => item.key === key);
    if (!spec) return;
    setParams((current) => ({ ...current, [key]: clamp(Number.isFinite(raw) ? raw : spec.min, spec.min, spec.max) }));
  };

  const setGender = (gender: Gender) => setParams((current) => ({ ...current, gender }));
  const measured = fitResult?.measurements ?? null;

  return (
    <main className="lab3d-page">
      <header className="lab3d-header">
        <div>
          <div className="lab3d-eyebrow">CharacterMaker /dev/test3d</div>
          <h1>OxiHuman 3D Body Lab · body-only</h1>
          <p>Рендерим только основной связный компонент тела. Служебные MakeHuman helper/proxy-части больше не должны попадать в кадр.</p>
        </div>
        <div className={`lab3d-engine-badge ${engineReady ? 'ready' : ''}`}>
          {engineReady ? `OxiHuman ${fitResult?.version ?? ''} · BODY ONLY` : 'OxiHuman loading'}
        </div>
      </header>

      <section className="lab3d-layout">
        <div className="lab3d-preview-card">
          <div className="lab3d-preview-toolbar">
            <div className="lab3d-view-buttons" role="group" aria-label="Положение камеры">
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
            {!engineReady && !engineError ? (
              <div className="lab3d-loading">
                <strong>{loadProgress.label}</strong>
                <span>{Math.round(loadProgress.progress * 100)}%</span>
                <div className="lab3d-loading-track"><i style={{ width: `${Math.round(loadProgress.progress * 100)}%` }} /></div>
              </div>
            ) : null}

            {engineError ? (
              <div className="lab3d-error"><strong>OxiHuman действительно не загрузился</strong><span>{engineError}</span></div>
            ) : null}

            <canvas ref={canvasRef} aria-label="OxiHuman body-only 3D model" />

            {showMeasurements && measured ? (
              <div className="lab3d-measure-overlay">
                <div><span>Рост</span><strong>{fmt(measured.heightCm)} см</strong></div>
                <div><span>Грудь</span><strong>{fmt(measured.chestCm)} см</strong></div>
                <div><span>Талия</span><strong>{fmt(measured.waistCm)} см</strong></div>
                <div><span>Бедра</span><strong>{fmt(measured.hipCm)} см</strong></div>
              </div>
            ) : null}
            <div className="lab3d-stage-hint">1 палец - вращение · щипок - масштаб</div>
          </div>

          <div className="lab3d-metrics">
            <div><span>BMI</span><strong>{metrics.bmi.toFixed(1)}</strong></div>
            <div><span>Талия / рост</span><strong>{metrics.whtr.toFixed(3)}</strong></div>
            <div><span>Талия / бедра</span><strong>{metrics.whr.toFixed(3)}</strong></div>
            <div><span>Грудь / талия</span><strong>{metrics.bwr.toFixed(2)}</strong></div>
            <div className="wide"><span>Renderer</span><strong>largest body component</strong></div>
          </div>

          {fitResult ? (
            <div className="lab3d-engine-meta">
              <span>source {fitResult.sourceVertexCount.toLocaleString('ru-RU')} вершин</span>
              <span>source {fitResult.sourceIndexCount.toLocaleString('ru-RU')} индексов</span>
              <span>body {fitResult.renderedIndexCount.toLocaleString('ru-RU')} индексов</span>
              <span>fit {(fitResult.elapsedMs / 1000).toFixed(2)} с</span>
            </div>
          ) : null}
        </div>

        <aside className="lab3d-controls-card">
          <div className="lab3d-section-head">
            <div><h2>Параметры тела</h2><p>{params.height} см · {params.weight} кг · {params.bust}-{params.waist}-{params.hips}</p></div>
            <button type="button" className="lab3d-reset" onClick={() => setParams(DEFAULTS)}>Сбросить</button>
          </div>

          <div className="lab3d-gender" role="group" aria-label="Пол">
            <button type="button" className={params.gender === 'female' ? 'active' : ''} onClick={() => setGender('female')}>Женский</button>
            <button type="button" className={params.gender === 'male' ? 'active' : ''} onClick={() => setGender('male')}>Мужской</button>
          </div>

          <div className={`lab3d-fit-state ${fitState}`}>
            <span className="dot" />
            <div>
              <strong>{fitState === 'fitting' ? 'Подгоняю размеры…' : fitState === 'error' ? 'Движок работает, ошибка только fit' : fitState === 'pending' ? 'Изменения применены' : fitState === 'ready' ? 'Body mesh готов' : 'OxiHuman'}</strong>
              <small>{fitState === 'error' ? fitError : fitState === 'fitting' ? 'Точная подгонка груди / талии / бедер.' : fitResult ? `OxiHuman ${fitResult.version}` : 'Инициализация.'}</small>
            </div>
            <button type="button" disabled={!engineReady || fitState === 'fitting'} onClick={() => void runFit()}>Fit сейчас</button>
          </div>

          <div className="lab3d-controls-list">
            {CONTROLS.map((control) => (
              <label className="lab3d-control" key={control.key}>
                <span className="lab3d-control-head"><span>{control.label}{control.fit ? <sup>fit</sup> : null}</span><strong>{params[control.key]} {control.unit}</strong></span>
                <span className="lab3d-control-row">
                  <input type="range" min={control.min} max={control.max} step={control.step} value={params[control.key]} onChange={(event) => setNumeric(control.key, Number(event.currentTarget.value))} />
                  <input type="number" min={control.min} max={control.max} step={control.step} value={params[control.key]} onChange={(event) => setNumeric(control.key, Number(event.currentTarget.value))} aria-label={`${control.label}, точное значение`} />
                </span>
              </label>
            ))}
            <label className="lab3d-control">
              <span className="lab3d-control-head"><span>Мышечная масса</span><strong>{MUSCLE_LABELS[params.muscle] ?? MUSCLE_LABELS[1]}</strong></span>
              <span className="lab3d-control-row muscle">
                <input type="range" min="0" max="3" step="1" value={params.muscle} onChange={(event) => setNumeric('muscle', Number(event.currentTarget.value))} />
                <input type="number" min="0" max="3" step="1" value={params.muscle} onChange={(event) => setNumeric('muscle', Number(event.currentTarget.value))} aria-label="Мышечная масса" />
              </span>
            </label>
          </div>

          <div className="lab3d-note">
            <strong>Что выяснили про OxiHuman</strong>
            <p>Core pack основан на MakeHuman-подобной сетке с body + helper/proxy geometry. В этой версии renderer оставляет только крупнейший связный компонент — само тело.</p>
            <p>OxiHuman также принципиально использует bodysuit safety model: детализированной анатомии гениталий этот движок не предоставляет. Для CharacterMaker нам нужен нейтральный body preview, поэтому helper/proxy части здесь скрываются.</p>
          </div>
        </aside>
      </section>
    </main>
  );
}
