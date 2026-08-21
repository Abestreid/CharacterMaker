import { svgPathProperties } from 'svg-path-properties';
import { useEffect, useMemo, useRef, useState } from 'react';

type PreviewMode = 'torso' | 'full';
type BodyParams = {
  height: number;
  weight: number;
  bust: number;
  waist: number;
  hips: number;
  bodyFat: number;
  muscle: number;
};
type Point = { x: number; y: number };
type Measure = { label: string; value: number; y: number; x1: number; x2: number };

const VIEW_WIDTH = 837.483;
const CENTER_X = VIEW_WIDTH / 2;
const HEAD_END_Y = 330;
const HIP_Y = 930;
const FULL_VIEW_BOX = '-80 -60 1000 2220';
const TORSO_VIEW_BOX = '60 300 720 820';

const BASE: BodyParams = {
  height: 170,
  weight: 60,
  bust: 90,
  waist: 65,
  hips: 95,
  bodyFat: 22,
  muscle: 1,
};

const EXTREME: BodyParams = {
  height: 170,
  weight: 70,
  bust: 140,
  waist: 50,
  hips: 140,
  bodyFat: 25,
  muscle: 1,
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const gaussian = (value: number, center: number, width: number) => {
  const z = (value - center) / width;
  return Math.exp(-0.5 * z * z);
};
const smoothStep = (min: number, max: number, value: number) => {
  const t = clamp((value - min) / (max - min), 0, 1);
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function calculateMetrics(params: BodyParams) {
  const heightM = params.height / 100;
  return {
    bmi: params.weight / (heightM * heightM),
    whtr: params.waist / params.height,
    whr: params.waist / params.hips,
    bwr: params.bust / params.waist,
    bhr: params.bust / params.height,
    hhr: params.hips / params.height,
  };
}

function classifyFigure(params: BodyParams) {
  const bustHipDiff = params.bust - params.hips;
  const waistContrast = Math.min(params.bust, params.hips) - params.waist;
  if (waistContrast >= 22 && Math.abs(bustHipDiff) <= 10) return ['Песочные часы', 'Выраженная талия при близких объемах груди и бедер.'] as const;
  if (params.hips - params.bust >= 10) return ['Груша', 'Нижняя часть тела заметно шире верхней.'] as const;
  if (params.bust - params.hips >= 10) return ['Перевернутый треугольник', 'Верх корпуса заметно шире таза и бедер.'] as const;
  if (waistContrast < 15) return ['Прямоугольная', 'Перепад между грудью, талией и бедрами небольшой.'] as const;
  return ['Сбалансированная', 'Умеренный контраст талии и близкие пропорции верха и низа.'] as const;
}

function sampleSvgPath(pathData: string, count = 260): Point[] {
  const properties = new svgPathProperties(pathData);
  const total = properties.getTotalLength();
  const points: Point[] = [];
  for (let index = 0; index < count; index += 1) {
    const point = properties.getPointAtLength((total * index) / count);
    points.push({ x: point.x, y: point.y });
  }
  return points;
}

function verticalPosition(y: number, params: BodyParams) {
  const heightDelta = (params.height - BASE.height) / BASE.height;
  const torsoScale = clamp(1 + heightDelta * 0.34, 0.88, 1.14);
  const legScale = clamp(1 + heightDelta * 0.8, 0.75, 1.3);
  if (y <= HEAD_END_Y) return y;
  const hip = HEAD_END_Y + (HIP_Y - HEAD_END_Y) * torsoScale;
  if (y <= HIP_Y) return HEAD_END_Y + (y - HEAD_END_Y) * torsoScale;
  return hip + (y - HIP_Y) * legScale;
}

function buildMorphGeometry(source: Point[], params: BodyParams): Point[] {
  const baseBmi = calculateMetrics(BASE).bmi;
  const bmiDelta = calculateMetrics(params).bmi - baseBmi;
  const bustDelta = (params.bust - BASE.bust) / BASE.bust;
  const waistDelta = (params.waist - BASE.waist) / BASE.waist;
  const hipDelta = (params.hips - BASE.hips) / BASE.hips;
  const fatDelta = (params.bodyFat - BASE.bodyFat) / 20;
  const muscleDelta = params.muscle - BASE.muscle;

  // Намеренно выраженная реакция: изменение обхвата должно быть видно без увеличения.
  const shoulderScale = clamp(1 + bustDelta * 0.18 + muscleDelta * 0.045, 0.84, 1.22);
  const chestScale = clamp(1 + bustDelta * 0.72 + bmiDelta * 0.004 + muscleDelta * 0.025, 0.65, 1.48);
  const waistScale = clamp(1 + waistDelta * 0.78 + bmiDelta * 0.004 + fatDelta * 0.035, 0.52, 1.68);
  const hipScale = clamp(1 + hipDelta * 0.74 + bmiDelta * 0.003 + fatDelta * 0.04, 0.64, 1.5);
  const limbScale = clamp(1 + bmiDelta * 0.007 + fatDelta * 0.08 + muscleDelta * 0.05, 0.8, 1.28);

  return source.map((point) => {
    if (point.y < HEAD_END_Y) return point;

    const dx = point.x - CENTER_X;
    const absDx = Math.abs(dx);
    const side = dx < 0 ? -1 : 1;
    const shoulderWeight = gaussian(point.y, 410, 78);
    const chestWeight = gaussian(point.y, 565, 112);
    const waistWeight = gaussian(point.y, 755, 84);
    const hipWeight = gaussian(point.y, 910, 128);
    const localScale = 1
      + (shoulderScale - 1) * shoulderWeight
      + (chestScale - 1) * chestWeight
      + (waistScale - 1) * waistWeight
      + (hipScale - 1) * hipWeight;

    let x = point.x;

    if (point.y >= 990) {
      const blend = smoothStep(990, 1120, point.y);
      const baseLegCenter = CENTER_X + side * 57;
      const targetLegCenter = CENTER_X + side * 57 * clamp(hipScale, 0.8, 1.28);
      const pelvisX = CENTER_X + dx * hipScale;
      const legX = targetLegCenter + (point.x - baseLegCenter) * limbScale;
      x = lerp(pelvisX, legX, blend);
    } else if (point.y >= 345 && point.y <= 1040 && absDx > 158) {
      const torsoShift = side * (
        (shoulderScale - 1) * shoulderWeight * 88
        + (chestScale - 1) * chestWeight * 82
        + (waistScale - 1) * waistWeight * 38
        + (hipScale - 1) * hipWeight * 52
      );
      x = point.x + torsoShift + side * (limbScale - 1) * 16;
    } else {
      x = CENTER_X + dx * localScale;
    }

    return { x, y: verticalPosition(point.y, params) };
  });
}

function pointsToPath(points: Point[]) {
  if (!points.length) return '';
  return `${points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ')} Z`;
}

function bodyWidthAt(points: Point[], y: number) {
  const candidates = points.filter((point) => Math.abs(point.y - y) <= 18 && Math.abs(point.x - CENTER_X) < 205);
  const left = candidates.filter((point) => point.x < CENTER_X).sort((a, b) => a.x - b.x)[0];
  const right = candidates.filter((point) => point.x > CENTER_X).sort((a, b) => b.x - a.x)[0];
  return { x1: left?.x ?? CENTER_X - 95, x2: right?.x ?? CENTER_X + 95 };
}

function buildMeasures(points: Point[], params: BodyParams): Measure[] {
  const defs = [
    ['Грудь', params.bust, verticalPosition(565, params)],
    ['Талия', params.waist, verticalPosition(755, params)],
    ['Бедра', params.hips, verticalPosition(910, params)],
  ] as const;
  return defs.map(([label, value, y]) => {
    const width = bodyWidthAt(points, y);
    return { label, value, y, x1: width.x1, x2: width.x2 };
  });
}

function RangeControl({ label, value, min, max, unit, onInput }: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onInput: (value: number) => void;
}) {
  const apply = (raw: number) => onInput(clamp(raw, min, max));
  return (
    <div className="range-control">
      <div className="range-control__top">
        <span className="range-control__label">{label}</span>
        <strong className="range-control__value">{value} {unit}</strong>
      </div>
      <div className="range-control__row">
        <input
          data-body-range={label}
          aria-label={label}
          type="range"
          min={min}
          max={max}
          value={value}
          onInput={(event) => apply(Number(event.currentTarget.value))}
        />
        <input
          aria-label={`${label}, точное значение`}
          type="number"
          min={min}
          max={max}
          value={value}
          onInput={(event) => apply(Number(event.currentTarget.value))}
        />
      </div>
    </div>
  );
}

export function BodyMorphTest() {
  const [params, setParams] = useState<BodyParams>(BASE);
  const [sourcePath, setSourcePath] = useState('');
  const [sourceError, setSourceError] = useState('');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('torso');
  const [showMeasures, setShowMeasures] = useState(true);
  const [showGhost, setShowGhost] = useState(false);
  const pendingRef = useRef<BodyParams>(BASE);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('./female-body.svg')
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      })
      .then((svgText) => {
        if (cancelled) return;
        const documentNode = new DOMParser().parseFromString(svgText, 'image/svg+xml');
        const path = documentNode.querySelector('path')?.getAttribute('d') ?? '';
        if (!path) throw new Error('В SVG не найден path');
        setSourcePath(path);
      })
      .catch((error: unknown) => {
        if (!cancelled) setSourceError(error instanceof Error ? error.message : 'Не удалось загрузить SVG');
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
  }, []);

  const queueParams = (next: BodyParams) => {
    pendingRef.current = next;
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      setParams(pendingRef.current);
    });
  };

  const patchParam = (key: keyof BodyParams, value: number) => {
    queueParams({ ...pendingRef.current, [key]: value });
  };

  const applyPreset = (preset: BodyParams) => {
    pendingRef.current = preset;
    setParams(preset);
  };

  const sourcePoints = useMemo(() => sourcePath ? sampleSvgPath(sourcePath) : [], [sourcePath]);
  const morphedPoints = useMemo(() => buildMorphGeometry(sourcePoints, params), [sourcePoints, params]);
  const targetPath = useMemo(() => pointsToPath(morphedPoints), [morphedPoints]);
  const metrics = useMemo(() => calculateMetrics(params), [params]);
  const [figureType, figureDescription] = useMemo(() => classifyFigure(params), [params]);
  const measures = useMemo(() => buildMeasures(morphedPoints, params), [morphedPoints, params]);
  const viewBox = previewMode === 'torso' ? TORSO_VIEW_BOX : FULL_VIEW_BOX;

  return (
    <main className="body-lab">
      <header className="body-lab__header">
        <div>
          <h1>2D Body Lab - mobile fast</h1>
          <p>Без Paper.js и Flubber в drag-loop. Фиксированная камера, прямое обновление SVG не чаще одного раза за кадр.</p>
        </div>
        <div className="body-lab__badge">/dev/test</div>
      </header>

      <div className="body-lab__layout">
        <section className="lab-card controls-card">
          <h2 className="section-title">Параметры тела</h2>
          <p className="section-sub">Сначала проверьте три обхвата. На крайних значениях изменение должно быть очевидным.</p>

          <div className="control-group">
            <h3 className="control-group__title">Обхваты</h3>
            <RangeControl label="Обхват груди" value={params.bust} min={70} max={140} unit="см" onInput={(v) => patchParam('bust', v)} />
            <RangeControl label="Обхват талии" value={params.waist} min={50} max={120} unit="см" onInput={(v) => patchParam('waist', v)} />
            <RangeControl label="Обхват бедер" value={params.hips} min={70} max={140} unit="см" onInput={(v) => patchParam('hips', v)} />
          </div>

          <div className="control-group">
            <h3 className="control-group__title">Габариты</h3>
            <RangeControl label="Рост" value={params.height} min={140} max={220} unit="см" onInput={(v) => patchParam('height', v)} />
            <RangeControl label="Вес" value={params.weight} min={40} max={150} unit="кг" onInput={(v) => patchParam('weight', v)} />
            <RangeControl label="Процент жира" value={params.bodyFat} min={8} max={45} unit="%" onInput={(v) => patchParam('bodyFat', v)} />
            <div className="select-control">
              <label htmlFor="muscle">Мышечная масса</label>
              <select id="muscle" value={params.muscle} onChange={(event) => patchParam('muscle', Number(event.target.value))}>
                <option value={0}>Мягкая</option>
                <option value={1}>Тонизированная</option>
                <option value={2}>Атлетическая</option>
                <option value={3}>Мускулистая</option>
              </select>
            </div>
          </div>

          <details className="metrics-disclosure">
            <summary>Расчетные коэффициенты</summary>
            <div className="metrics-grid">
              <div className="metric"><span>BMI</span><strong>{metrics.bmi.toFixed(1)}</strong></div>
              <div className="metric"><span>Талия / рост</span><strong>{metrics.whtr.toFixed(3)}</strong></div>
              <div className="metric"><span>Талия / бедра</span><strong>{metrics.whr.toFixed(3)}</strong></div>
              <div className="metric"><span>Грудь / талия</span><strong>{metrics.bwr.toFixed(2)}</strong></div>
              <div className="metric"><span>Грудь / рост</span><strong>{metrics.bhr.toFixed(3)}</strong></div>
              <div className="metric"><span>Бедра / рост</span><strong>{metrics.hhr.toFixed(3)}</strong></div>
            </div>
          </details>

          <div className="preset-row">
            <button className="preset-button" type="button" onClick={() => applyPreset(BASE)}>База 90-65-95</button>
            <button className="preset-button" type="button" onClick={() => applyPreset(EXTREME)}>Контраст 140-50-140</button>
          </div>
        </section>

        <section className="lab-card preview-card">
          <div className="preview-head">
            <div className="preview-head__copy">
              <h2 className="section-title">Живой силуэт</h2>
              <p className="section-sub">Камера больше не подстраивается под ширину тела - изменение масштаба фигуры не маскируется.</p>
            </div>
            <div className="preview-toolbar">
              <div className="segmented">
                <button type="button" className={previewMode === 'torso' ? 'is-active' : ''} onClick={() => setPreviewMode('torso')}>Корпус</button>
                <button type="button" className={previewMode === 'full' ? 'is-active' : ''} onClick={() => setPreviewMode('full')}>Весь рост</button>
              </div>
              <button className={`tool-button ${showMeasures ? 'is-active' : ''}`} type="button" onClick={() => setShowMeasures((value) => !value)}>Мерки</button>
              <button className={`tool-button ${showGhost ? 'is-active' : ''}`} type="button" onClick={() => setShowGhost((value) => !value)}>Сравнение</button>
            </div>
          </div>

          <div className="stage">
            {sourceError ? <div className="loading-state">Ошибка SVG: {sourceError}</div> : !targetPath ? <div className="loading-state">Загрузка контура...</div> : (
              <svg viewBox={viewBox} role="img" aria-label="Параметрический женский силуэт">
                {showGhost && <path className="ghost-path" d={sourcePath} />}
                <path className="body-path" d={targetPath} />
                {showMeasures && measures.map((measure) => (
                  <g key={measure.label}>
                    <line className="measure-line" x1={measure.x1} x2={measure.x2} y1={measure.y} y2={measure.y} />
                    <text className="measure-text" x={Math.min(measure.x2 + 18, 650)} y={measure.y + 8}>{measure.label} {measure.value} см</text>
                  </g>
                ))}
              </svg>
            )}
          </div>

          <div className="preview-summary">
            <div className="summary-box"><span>Тип фигуры</span><strong>{figureType}</strong><p>{figureDescription}</p></div>
            <div className="summary-box"><span>Параметры</span><strong>{params.height} см · {params.weight} кг · {params.bust}-{params.waist}-{params.hips}</strong><p>Жир: {params.bodyFat}%</p></div>
          </div>
        </section>
      </div>
    </main>
  );
}
