import paper from 'paper';
import { svgPathProperties } from 'svg-path-properties';
import { useEffect, useMemo, useState } from 'react';

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
const VIEW_HEIGHT = 1819.369;
const CENTER_X = VIEW_WIDTH / 2;
const HEAD_END_Y = 330;
const HIP_Y = 930;

const BASE: BodyParams = {
  height: 170,
  weight: 60,
  bust: 90,
  waist: 65,
  hips: 95,
  bodyFat: 22,
  muscle: 1,
};

const paperScope = new paper.PaperScope();
paperScope.setup(new paperScope.Size(VIEW_WIDTH, VIEW_HEIGHT));

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

  if (waistContrast >= 22 && Math.abs(bustHipDiff) <= 10) {
    return ['Песочные часы', 'Выраженная талия при близких объемах груди и бедер.'] as const;
  }
  if (params.hips - params.bust >= 10) {
    return ['Груша', 'Нижняя часть тела заметно шире верхней.'] as const;
  }
  if (params.bust - params.hips >= 10) {
    return ['Перевернутый треугольник', 'Верх корпуса заметно шире таза и бедер.'] as const;
  }
  if (waistContrast < 15) {
    return ['Прямоугольная', 'Перепад между грудью, талией и бедрами небольшой.'] as const;
  }
  return ['Сбалансированная', 'Умеренный контраст талии и близкие пропорции верха и низа.'] as const;
}

function sampleSvgPath(pathData: string, count = 360): Point[] {
  const properties = new svgPathProperties(pathData);
  const total = properties.getTotalLength();
  const result: Point[] = [];
  for (let index = 0; index < count; index += 1) {
    const point = properties.getPointAtLength((total * index) / count);
    result.push({ x: point.x, y: point.y });
  }
  return result;
}

function verticalPosition(y: number, params: BodyParams) {
  const delta = (params.height - BASE.height) / BASE.height;
  const torsoScale = clamp(1 + delta * 0.32, 0.9, 1.13);
  const legScale = clamp(1 + delta * 0.78, 0.78, 1.28);

  if (y <= HEAD_END_Y) return y;
  const transformedHip = HEAD_END_Y + (HIP_Y - HEAD_END_Y) * torsoScale;
  if (y <= HIP_Y) return HEAD_END_Y + (y - HEAD_END_Y) * torsoScale;
  return transformedHip + (y - HIP_Y) * legScale;
}

function buildMorphGeometry(source: Point[], params: BodyParams): Point[] {
  const metrics = calculateMetrics(params);
  const baseMetrics = calculateMetrics(BASE);

  const bustDelta = params.bust - BASE.bust;
  const waistDelta = params.waist - BASE.waist;
  const hipsDelta = params.hips - BASE.hips;
  const bmiDelta = metrics.bmi - baseMetrics.bmi;
  const fatDelta = params.bodyFat - BASE.bodyFat;
  const muscleDelta = params.muscle - BASE.muscle;

  // Сантиметры должны быть заметны визуально. Рост влияет на вертикальные пропорции,
  // но больше не гасит изменение обхватов.
  const chestScale = clamp(1 + bustDelta * 0.008 + bmiDelta * 0.004 + muscleDelta * 0.025, 0.62, 1.58);
  const waistScale = clamp(1 + waistDelta * 0.009 + bmiDelta * 0.006 + fatDelta * 0.003, 0.55, 1.68);
  const hipScale = clamp(1 + hipsDelta * 0.0085 + bmiDelta * 0.004 + fatDelta * 0.0035, 0.6, 1.62);
  const shoulderScale = clamp(1 + bustDelta * 0.0015 + muscleDelta * 0.05, 0.88, 1.18);
  const limbScale = clamp(1 + bmiDelta * 0.008 + fatDelta * 0.004 + muscleDelta * 0.045, 0.82, 1.3);

  return source.map((point) => {
    if (point.y < HEAD_END_Y) {
      return { x: point.x, y: point.y };
    }

    const dx = point.x - CENTER_X;
    const absDx = Math.abs(dx);
    const side = dx < 0 ? -1 : 1;

    const shoulderWeight = gaussian(point.y, 410, 82);
    const chestWeight = gaussian(point.y, 570, 112);
    const waistWeight = gaussian(point.y, 755, 82);
    const hipWeight = gaussian(point.y, 915, 125);

    const weightedScale = 1
      + (shoulderScale - 1) * shoulderWeight
      + (chestScale - 1) * chestWeight
      + (waistScale - 1) * waistWeight
      + (hipScale - 1) * hipWeight;

    let x = point.x;

    // Ноги: меняем толщину вокруг центра каждой ноги и расстояние между ногами.
    if (point.y >= 990) {
      const blend = smoothStep(990, 1120, point.y);
      const baseLegCenter = CENTER_X + side * 57;
      const targetLegCenter = CENTER_X + side * 57 * clamp(hipScale, 0.78, 1.28);
      const pelvisX = CENTER_X + dx * hipScale;
      const legX = targetLegCenter + (point.x - baseLegCenter) * limbScale;
      x = lerp(pelvisX, legX, blend);
    }
    // Руки не растягиваем вместе с торсом. Только сдвигаем наружу/внутрь и немного меняем массу.
    else if (point.y >= 345 && point.y <= 1040 && absDx > 160) {
      const torsoShift = (
        (shoulderScale - 1) * shoulderWeight * 78
        + (chestScale - 1) * chestWeight * 72
        + (waistScale - 1) * waistWeight * 42
        + (hipScale - 1) * hipWeight * 48
      );
      const armMass = (limbScale - 1) * 18;
      x = point.x + side * (torsoShift + armMass);
    }
    // Сам корпус.
    else {
      x = CENTER_X + dx * weightedScale;
    }

    return { x, y: verticalPosition(point.y, params) };
  });
}

function smoothPath(points: Point[]) {
  if (!points.length) return '';
  const path = new paperScope.Path();
  path.closed = true;
  for (const point of points) path.add(new paperScope.Point(point.x, point.y));
  path.simplify(1.1);
  path.smooth({ type: 'catmull-rom', factor: 0.34 });
  const result = path.pathData;
  path.remove();
  return result;
}

function boundsOf(points: Point[]) {
  if (!points.length) return { minX: 0, minY: 0, width: VIEW_WIDTH, height: VIEW_HEIGHT };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}

function bodyWidthAt(points: Point[], y: number) {
  const candidates = points.filter((point) => Math.abs(point.y - y) <= 16 && Math.abs(point.x - CENTER_X) < 190);
  const left = candidates.filter((point) => point.x < CENTER_X).sort((a, b) => a.x - b.x)[0];
  const right = candidates.filter((point) => point.x > CENTER_X).sort((a, b) => b.x - a.x)[0];
  return {
    x1: left?.x ?? CENTER_X - 95,
    x2: right?.x ?? CENTER_X + 95,
  };
}

function buildMeasures(points: Point[], params: BodyParams): Measure[] {
  const defs = [
    ['Грудь', params.bust, verticalPosition(570, params)],
    ['Талия', params.waist, verticalPosition(755, params)],
    ['Бедра', params.hips, verticalPosition(915, params)],
  ] as const;
  return defs.map(([label, value, y]) => {
    const width = bodyWidthAt(points, y);
    return { label, value, y, x1: width.x1, x2: width.x2 };
  });
}

function RangeControl({ label, value, min, max, unit, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  const apply = (raw: number) => onChange(clamp(raw, min, max));
  return (
    <div className="range-control">
      <div className="range-control__top">
        <span className="range-control__label">{label}</span>
        <strong className="range-control__value">{value} {unit}</strong>
      </div>
      <div className="range-control__row">
        <input aria-label={label} type="range" min={min} max={max} value={value} onChange={(e) => apply(Number(e.target.value))} />
        <input aria-label={`${label}, точное значение`} type="number" min={min} max={max} value={value} onChange={(e) => apply(Number(e.target.value))} />
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

  const sourcePoints = useMemo(() => sourcePath ? sampleSvgPath(sourcePath) : [], [sourcePath]);
  const morphedPoints = useMemo(() => buildMorphGeometry(sourcePoints, params), [sourcePoints, params]);
  const targetPath = useMemo(() => smoothPath(morphedPoints), [morphedPoints]);
  const metrics = useMemo(() => calculateMetrics(params), [params]);
  const [figureType, figureDescription] = useMemo(() => classifyFigure(params), [params]);
  const measures = useMemo(() => buildMeasures(morphedPoints, params), [morphedPoints, params]);
  const bounds = useMemo(() => boundsOf(morphedPoints), [morphedPoints]);

  const fullViewBox = `${bounds.minX - 30} ${bounds.minY - 30} ${bounds.width + 60} ${bounds.height + 60}`;
  const torsoTop = verticalPosition(300, params);
  const torsoBottom = verticalPosition(1040, params);
  const torsoViewBox = `95 ${torsoTop} 647 ${Math.max(620, torsoBottom - torsoTop)}`;
  const viewBox = previewMode === 'torso' ? torsoViewBox : fullViewBox;

  const setNumeric = (key: keyof Omit<BodyParams, 'muscle'>, value: number) => {
    setParams((current) => ({ ...current, [key]: value }));
  };

  return (
    <main className="body-lab">
      <header className="body-lab__header">
        <div>
          <h1>2D Body Lab - fast morph</h1>
          <p>Облегченная версия без Flubber-анимации во время движения ползунка. Обхваты теперь меняют соответствующие зоны напрямую и заметно.</p>
        </div>
        <div className="body-lab__badge">/dev/test</div>
      </header>

      <div className="body-lab__layout">
        <section className="lab-card controls-card">
          <h2 className="section-title">Параметры тела</h2>
          <p className="section-sub">Двигайте грудь, талию и бедра - контур должен реагировать сразу, без анимационной задержки.</p>

          <div className="control-group">
            <h3 className="control-group__title">Обхваты</h3>
            <RangeControl label="Обхват груди" value={params.bust} min={70} max={140} unit="см" onChange={(v) => setNumeric('bust', v)} />
            <RangeControl label="Обхват талии" value={params.waist} min={50} max={120} unit="см" onChange={(v) => setNumeric('waist', v)} />
            <RangeControl label="Обхват бедер" value={params.hips} min={70} max={140} unit="см" onChange={(v) => setNumeric('hips', v)} />
          </div>

          <div className="control-group">
            <h3 className="control-group__title">Габариты</h3>
            <RangeControl label="Рост" value={params.height} min={140} max={220} unit="см" onChange={(v) => setNumeric('height', v)} />
            <RangeControl label="Вес" value={params.weight} min={40} max={150} unit="кг" onChange={(v) => setNumeric('weight', v)} />
            <RangeControl label="Процент жира" value={params.bodyFat} min={8} max={45} unit="%" onChange={(v) => setNumeric('bodyFat', v)} />
            <div className="select-control">
              <label htmlFor="muscle">Мышечная масса</label>
              <select id="muscle" value={params.muscle} onChange={(e) => setParams((current) => ({ ...current, muscle: Number(e.target.value) }))}>
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

          <button className="reset-button" type="button" onClick={() => setParams(BASE)}>Сбросить к 170 / 60 / 90-65-95</button>
        </section>

        <section className="lab-card preview-card">
          <div className="preview-head">
            <div className="preview-head__copy">
              <h2 className="section-title">Живой силуэт</h2>
              <p className="section-sub">Paper.js сглаживает только итоговый контур. Во время drag нет покадрового morph-движка.</p>
            </div>
            <div className="preview-toolbar">
              <div className="segmented">
                <button type="button" className={previewMode === 'torso' ? 'is-active' : ''} onClick={() => setPreviewMode('torso')}>Корпус</button>
                <button type="button" className={previewMode === 'full' ? 'is-active' : ''} onClick={() => setPreviewMode('full')}>Весь рост</button>
              </div>
              <button className={`tool-button ${showMeasures ? 'is-active' : ''}`} type="button" onClick={() => setShowMeasures((v) => !v)}>Мерки</button>
              <button className={`tool-button ${showGhost ? 'is-active' : ''}`} type="button" onClick={() => setShowGhost((v) => !v)}>Сравнение</button>
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
                    <text className="measure-text" x={Math.min(measure.x2 + 18, CENTER_X + 220)} y={measure.y + 8}>{measure.label} {measure.value} см</text>
                  </g>
                ))}
              </svg>
            )}
          </div>

          <div className="preview-summary">
            <div className="summary-box">
              <span>Расчетный тип фигуры</span>
              <strong>{figureType}</strong>
              <p>{figureDescription}</p>
            </div>
            <div className="summary-box">
              <span>Текущие параметры</span>
              <strong>{params.height} см · {params.weight} кг · {params.bust}-{params.waist}-{params.hips}</strong>
              <p>Жир: {params.bodyFat}% · мышцы: {['мягкая', 'тонизированная', 'атлетическая', 'мускулистая'][params.muscle]}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
