import { useEffect, useMemo, useRef, useState } from 'react';
import { BodyScene, type BodyParams, type CameraView, type Gender } from './bodyScene';
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
};

const CONTROLS: ControlSpec[] = [
  { key: 'height', label: 'Рост', min: 140, max: 220, step: 1, unit: 'см' },
  { key: 'weight', label: 'Вес', min: 40, max: 150, step: 1, unit: 'кг' },
  { key: 'bust', label: 'Грудь', min: 70, max: 140, step: 1, unit: 'см' },
  { key: 'waist', label: 'Талия', min: 50, max: 120, step: 1, unit: 'см' },
  { key: 'hips', label: 'Бедра', min: 70, max: 140, step: 1, unit: 'см' },
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

export function Test3DApp() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<BodyScene | null>(null);
  const [params, setParams] = useState<BodyParams>(DEFAULTS);
  const [view, setView] = useState<CameraView>('front');
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [webglError, setWebglError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    try {
      const bodyScene = new BodyScene(canvas);
      sceneRef.current = bodyScene;
      bodyScene.update(params, showMeasurements);
      bodyScene.setView('front');
      return () => {
        bodyScene.dispose();
        sceneRef.current = null;
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось запустить WebGL.';
      setWebglError(message);
      return undefined;
    }
    // Initial scene only. Parameter updates are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    sceneRef.current?.update(params, showMeasurements);
  }, [params, showMeasurements]);

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

  return (
    <main className="lab3d-page">
      <header className="lab3d-header">
        <div>
          <div className="lab3d-eyebrow">CharacterMaker /dev/test3d</div>
          <h1>3D Body Lab</h1>
          <p>
            Отдельный тест объемного тела. Модель можно вращать пальцем, а грудь, талия, бедра, рост, вес,
            процент жира и мышечность перестраиваются в реальном времени.
          </p>
        </div>
        <div className="lab3d-engine-badge">Three.js parametric v1</div>
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
            {webglError ? (
              <div className="lab3d-error">
                <strong>WebGL недоступен</strong>
                <span>{webglError}</span>
              </div>
            ) : null}
            <canvas ref={canvasRef} aria-label="Интерактивная 3D модель тела" />
            <div className="lab3d-stage-hint">1 палец - вращение · щипок - масштаб</div>
          </div>

          <div className="lab3d-metrics">
            <div><span>BMI</span><strong>{metrics.bmi.toFixed(1)}</strong></div>
            <div><span>Талия / рост</span><strong>{metrics.whtr.toFixed(3)}</strong></div>
            <div><span>Талия / бедра</span><strong>{metrics.whr.toFixed(3)}</strong></div>
            <div><span>Грудь / талия</span><strong>{metrics.bwr.toFixed(2)}</strong></div>
            <div className="wide"><span>Тип фигуры</span><strong>{metrics.type}</strong></div>
          </div>
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

          <div className="lab3d-controls-list">
            {CONTROLS.map((control) => (
              <label className="lab3d-control" key={control.key}>
                <span className="lab3d-control-head">
                  <span>{control.label}</span>
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
                  />
                  <input
                    type="number"
                    min={control.min}
                    max={control.max}
                    step={control.step}
                    value={params[control.key]}
                    onChange={(event) => setNumeric(control.key, Number(event.currentTarget.value))}
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
            <strong>Что проверяем сейчас</strong>
            <p>Удобство 3D, вращение на телефоне и читаемость изменения пропорций. Это renderer-стенд, а не финальная анатомическая модель.</p>
            <p>Следующий движок в этой же точке интеграции - OxiHuman с fit по реальным сантиметрам.</p>
          </div>
        </aside>
      </section>
    </main>
  );
}
