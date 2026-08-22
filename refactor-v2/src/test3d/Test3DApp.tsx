import { useEffect, useMemo, useRef, useState } from 'react';
import {
  OxiHumanScene,
  type BodyParams,
  type CameraView,
  type Gender,
  type OxiFitResult,
  type OxiLoadProgress,
} from './oxiHumanScene';
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

type ControlSpec = {
  key: NumericKey;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  exactFit?: boolean;
};

const CONTROLS: ControlSpec[] = [
  { key: 'height', label: 'Рост', min: 140, max: 220, step: 1, unit: 'см', exactFit: true },
  { key: 'weight', label: 'Вес', min: 40, max: 150, step: 1, unit: 'кг' },
  { key: 'bust', label: 'Грудь', min: 70, max: 140, step: 1, unit: 'см', exactFit: true },
  { key: 'waist', label: 'Талия', min: 50, max: 120, step: 1, unit: 'см', exactFit: true },
  { key: 'hips', label: 'Бедра', min: 70, max: 140, step: 1, unit: 'см', exactFit: true },
  { key: 'bodyFat', label: 'Жир', min: 8, max: 45, step: 1, unit: '%' },
];

const MUSCLE_LABELS = ['Мягкая', 'Тонизированная', 'Атлетическая', 'Мускулистая'];
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function classify(params: BodyParams) {
  if (params.gender === 'female') {
    const topBottom = Math.abs(params.bust - params.hips);
    const waistContrast = Math.min(params.bust, params.hips) - params.waist;
    if (waistContrast >= 24 && topBottom <= 10) return 'Песочные часы';
    if (params.hips - params.bust >= 10) return 'Груша';
    if (params.bust - params.hips >= 10) return 'Перевернутый треугольник';
    if (waistContrast < 15) return 'Прямоугольная';
    return 'Сбалансированная';
  }
  const upper = params.bust - params.waist;
  if (upper >= 24) return 'V-образная';
  if (upper < 12) return 'Прямоугольная';
  return 'Средняя мужская';
}

function fmt(value: number | null, digits = 1) {
  return value == null || !Number.isFinite(value) ? '—' : value.toFixed(digits);
}

function deltaClass(delta: number | null) {
  if (delta == null) return '';
  const abs = Math.abs(delta);
  if (abs <= 1) return 'good';
  if (abs <= 3) return 'warn';
  return 'bad';
}

function deltaText(actual: number | null, target: number) {
  if (actual == null) return '—';
  const delta = actual - target;
  return `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}`;
}

export function Test3DApp() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<OxiHumanScene | null>(null);
  const latestParamsRef = useRef<BodyParams>(DEFAULTS);
  const fitTimerRef = useRef<number | null>(null);
  const fittingRef = useRef(false);

  const [params, setParams] = useState<BodyParams>(DEFAULTS);
  const [view, setView] = useState<CameraView>('front');
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [loadProgress, setLoadProgress] = useState<OxiLoadProgress>({
    phase: 'wasm',
    progress: 0,
    label: 'Запускаю OxiHuman',
  });
  const [engineReady, setEngineReady] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [fitState, setFitState] = useState<'idle' | 'pending' | 'fitting' | 'ready' | 'error'>('idle');
  const [fitError, setFitError] = useState<string | null>(null);
  const [fitResult, setFitResult] = useState<OxiFitResult | null>(null);

  latestParamsRef.current = params;

  const performFit = async (target: BodyParams) => {
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

  const fitNow = () => {
    if (fitTimerRef.current != null) window.clearTimeout(fitTimerRef.current);
    fitTimerRef.current = null;
    void performFit(latestParamsRef.current);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let cancelled = false;
    let localScene: OxiHumanScene | null = null;

    const boot = async () => {
      try {
        const scene = await OxiHumanScene.create(canvas, (progress) => {
          if (!cancelled) setLoadProgress(progress);
        });
        if (cancelled) {
          scene.dispose();
          return;
        }

        localScene = scene;
        sceneRef.current = scene;
        scene.setGridVisible(showGrid);
        scene.setAutoRotate(autoRotate);
        scene.setView(view);
        setEngineReady(true);
        setEngineError(null);
        setFitState('fitting');

        const result = await scene.fit(latestParamsRef.current);
        if (!cancelled) {
          setFitResult(result);
          setFitState('ready');
        }
      } catch (error) {
        if (!cancelled) {
          setEngineError(error instanceof Error ? error.message : String(error));
          setFitState('error');
        }
      }
    };

    void boot();

    return () => {
      cancelled = true;
      if (fitTimerRef.current != null) window.clearTimeout(fitTimerRef.current);
      localScene?.dispose();
      sceneRef.current = null;
    };
    // Initial engine boot only. Live state is synchronized by effects below.
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
      void performFit(latestParamsRef.current);
    }, 650);

    return () => {
      if (fitTimerRef.current != null) window.clearTimeout(fitTimerRef.current);
    };
    // performFit intentionally reads the latest scene through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, engineReady]);

  useEffect(() => {
    sceneRef.current?.setView(view);
  }, [view]);

  useEffect(() => {
    sceneRef.current?.setGridVisible(showGrid);
  }, [showGrid]);

  useEffect(() => {
    sceneRef.current?.setAutoRotate(autoRotate);
  }, [autoRotate]);

  const metrics = useMemo(() => {
    const heightM = params.height / 100;
    return {
      bmi: params.weight / (heightM * heightM),
      whtr: params.waist / params.height,
      whr: params.waist / params.hips,
      bwr: params.bust / params.waist,
      type: classify(params),
    };
  }, [params]);

  const setNumeric = (key: NumericKey, raw: number) => {
    const spec = CONTROLS.find((item) => item.key === key);
    if (key === 'muscle') {
      setParams((current) => ({ ...current, muscle: clamp(raw, 0, 3) }));
      return;
    }
    if (!spec) return;
    const value = clamp(Number.isFinite(raw) ? raw : spec.min, spec.min, spec.max);
    setParams((current) => ({ ...current, [key]: value }));
  };

  const setGender = (gender: Gender) => setParams((current) => ({ ...current, gender }));
  const measured = fitResult?.measurements ?? null;

  return (
    <main className="lab3d-page">
      <header className="lab3d-header">
        <div>
          <div className="lab3d-eyebrow">CharacterMaker /dev/test3d</div>
          <h1>OxiHuman 3D Body Lab</h1>
          <p>
            Теперь здесь настоящий параметрический human mesh. Рост, грудь, талия и бедра подгоняются OxiHuman по
            сантиметрам, после чего движок повторно измеряет уже получившуюся геометрию.
          </p>
        </div>
        <div className={`lab3d-engine-badge ${engineReady ? 'ready' : ''}`}>
          {fitResult ? `OxiHuman ${fitResult.version}` : engineReady ? 'OxiHuman ready' : 'OxiHuman loading'}
        </div>
      </header>

      <section className="lab3d-layout">
        <div className="lab3d-preview-card">
          <div className="lab3d-preview-toolbar">
            <div className="lab3d-view-buttons" role="group" aria-label="Положение камеры">
              {(['front', 'side', 'back', 'free'] as CameraView[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={view === item ? 'active' : ''}
                  onClick={() => setView(item)}
                >
                  {item === 'front' ? 'Спереди' : item === 'side' ? 'Сбоку' : item === 'back' ? 'Сзади' : 'Свободно'}
                </button>
              ))}
            </div>
            <div className="lab3d-toolbar-toggles">
              <button type="button" className={showMeasurements ? 'active' : ''} onClick={() => setShowMeasurements((v) => !v)}>
                Мерки
              </button>
              <button type="button" className={showGrid ? 'active' : ''} onClick={() => setShowGrid((v) => !v)}>
                Сетка
              </button>
              <button type="button" className={autoRotate ? 'active' : ''} onClick={() => setAutoRotate((v) => !v)}>
                Авто
              </button>
            </div>
          </div>

          <div className="lab3d-stage">
            {!engineReady && !engineError ? (
              <div className="lab3d-loading">
                <strong>{loadProgress.label}</strong>
                <span>{Math.round(loadProgress.progress * 100)}%</span>
                <div className="lab3d-loading-track"><i style={{ width: `${Math.round(loadProgress.progress * 100)}%` }} /></div>
                <small>WASM + локальный core pack, без серверной генерации</small>
              </div>
            ) : null}

            {engineError ? (
              <div className="lab3d-error">
                <strong>OxiHuman не запустился</strong>
                <span>{engineError}</span>
              </div>
            ) : null}

            <canvas ref={canvasRef} aria-label="Интерактивная OxiHuman 3D модель тела" />

            {showMeasurements && measured ? (
              <div className="lab3d-measure-overlay">
                <div><span>Рост</span><strong>{fmt(measured.heightCm)} см</strong><em className={deltaClass(measured.heightCm == null ? null : measured.heightCm - params.height)}>Δ {deltaText(measured.heightCm, params.height)}</em></div>
                <div><span>Грудь</span><strong>{fmt(measured.chestCm)} см</strong><em className={deltaClass(measured.chestCm == null ? null : measured.chestCm - params.bust)}>Δ {deltaText(measured.chestCm, params.bust)}</em></div>
                <div><span>Талия</span><strong>{fmt(measured.waistCm)} см</strong><em className={deltaClass(measured.waistCm == null ? null : measured.waistCm - params.waist)}>Δ {deltaText(measured.waistCm, params.waist)}</em></div>
                <div><span>Бедра</span><strong>{fmt(measured.hipCm)} см</strong><em className={deltaClass(measured.hipCm == null ? null : measured.hipCm - params.hips)}>Δ {deltaText(measured.hipCm, params.hips)}</em></div>
              </div>
            ) : null}

            <div className="lab3d-stage-hint">1 палец - вращение · щипок - масштаб</div>
          </div>

          <div className="lab3d-metrics">
            <div><span>BMI</span><strong>{metrics.bmi.toFixed(1)}</strong></div>
            <div><span>Талия / рост</span><strong>{metrics.whtr.toFixed(3)}</strong></div>
            <div><span>Талия / бедра</span><strong>{metrics.whr.toFixed(3)}</strong></div>
            <div><span>Грудь / талия</span><strong>{metrics.bwr.toFixed(2)}</strong></div>
            <div className="wide"><span>Тип фигуры</span><strong>{metrics.type}</strong></div>
          </div>

          {fitResult ? (
            <div className="lab3d-engine-meta">
              <span>{fitResult.vertexCount.toLocaleString('ru-RU')} вершин</span>
              <span>{fitResult.indexCount.toLocaleString('ru-RU')} индексов</span>
              <span>fit {(fitResult.elapsedMs / 1000).toFixed(2)} с</span>
              <span>{fitResult.iterations} итераций</span>
              <span className={fitResult.converged ? 'ok' : 'warn'}>{fitResult.converged ? 'converged' : 'iteration cap'}</span>
            </div>
          ) : null}
        </div>

        <aside className="lab3d-controls-card">
          <div className="lab3d-section-head">
            <div>
              <h2>Параметры тела</h2>
              <p>{params.height} см · {params.weight} кг · {params.bust}-{params.waist}-{params.hips}</p>
            </div>
            <button type="button" className="lab3d-reset" onClick={() => setParams(DEFAULTS)}>Сбросить</button>
          </div>

          <div className="lab3d-gender" role="group" aria-label="Пол">
            <button type="button" className={params.gender === 'female' ? 'active' : ''} onClick={() => setGender('female')}>Женский</button>
            <button type="button" className={params.gender === 'male' ? 'active' : ''} onClick={() => setGender('male')}>Мужской</button>
          </div>

          <div className={`lab3d-fit-state ${fitState}`}>
            <span className="dot" />
            <div>
              <strong>
                {fitState === 'fitting' ? 'Подгоняю настоящий mesh…' : fitState === 'pending' ? 'Размеры изменены' : fitState === 'error' ? 'Ошибка fit' : fitState === 'ready' ? 'Mesh измерен' : 'OxiHuman'}
              </strong>
              <small>
                {fitState === 'fitting' ? 'OxiHuman оптимизирует геометрию по сантиметрам.' : fitState === 'pending' ? 'Автоподгонка запустится после остановки ползунка.' : fitState === 'error' ? fitError : fitResult ? `Последний fit: ${(fitResult.elapsedMs / 1000).toFixed(2)} с` : 'Инициализация.'}
              </small>
            </div>
            <button type="button" onClick={fitNow} disabled={!engineReady || fitState === 'fitting'}>Fit сейчас</button>
          </div>

          <div className="lab3d-controls-list">
            {CONTROLS.map((control) => (
              <label className="lab3d-control" key={control.key}>
                <span className="lab3d-control-head">
                  <span>{control.label}{control.exactFit ? <sup>fit</sup> : null}</span>
                  <strong>{params[control.key]} {control.unit}</strong>
                </span>
                <span className="lab3d-control-row">
                  <input
                    type="range"
                    min={control.min}
                    max={control.max}
                    step={control.step}
                    value={params[control.key]}
                    onChange={(event) => setNumeric(control.key, Number(event.currentTarget.value))}
                    onPointerUp={control.exactFit ? fitNow : undefined}
                  />
                  <input
                    type="number"
                    min={control.min}
                    max={control.max}
                    step={control.step}
                    value={params[control.key]}
                    onChange={(event) => setNumeric(control.key, Number(event.currentTarget.value))}
                    onBlur={control.exactFit ? fitNow : undefined}
                    onKeyDown={(event) => {
                      if (control.exactFit && event.key === 'Enter') fitNow();
                    }}
                    aria-label={`${control.label}, точное значение`}
                  />
                </span>
              </label>
            ))}

            <label className="lab3d-control">
              <span className="lab3d-control-head">
                <span>Мышечная масса</span>
                <strong>{MUSCLE_LABELS[params.muscle] ?? MUSCLE_LABELS[1]}</strong>
              </span>
              <span className="lab3d-control-row muscle">
                <input
                  type="range"
                  min="0"
                  max="3"
                  step="1"
                  value={params.muscle}
                  onChange={(event) => setNumeric('muscle', Number(event.currentTarget.value))}
                />
                <input
                  type="number"
                  min="0"
                  max="3"
                  step="1"
                  value={params.muscle}
                  onChange={(event) => setNumeric('muscle', Number(event.currentTarget.value))}
                  aria-label="Мышечная масса, уровень от 0 до 3"
                />
              </span>
            </label>
          </div>

          <div className="lab3d-note">
            <strong>Что теперь настоящее</strong>
            <p><b>Рост, грудь, талия и бедра</b> идут в `fit_to_measurements()` OxiHuman и затем повторно измеряются по итоговой сетке.</p>
            <p>Вес, процент жира и мышечность пока используются как композиционный prior для macro morph. Это отдельный следующий слой калибровки CharacterMaker.</p>
            <p>OxiHuman: Apache-2.0. Core anthropometric pack: CC0.</p>
          </div>
        </aside>
      </section>
    </main>
  );
}
