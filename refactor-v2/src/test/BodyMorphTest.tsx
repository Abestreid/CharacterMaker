import { interpolate } from 'flubber';
import paper from 'paper';
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

type Measure = {
  label: string;
  value: number;
  y: number;
  x1: number;
  x2: number;
};

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
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const gaussian = (value: number, center: number, width: number) => {
  const z = (value - center) / width;
  return Math.exp(-0.5 * z * z);
};
const smoothStep = (min: number, max: number, value: number) => {
  const t = clamp((value - min) / (max - min), 0, 1);
  return t * t * (3 - 2 * t);
};

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

function sampleSvgPath(pathData: string, count = 900): Point[] {
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
  const heightDelta = (params.height - BASE.height) / BASE.height;
  const torsoScale = clamp(1 + heightDelta * 0.2, 0.94, 1.08);
  const legScale = clamp(1 + heightDelta * 0.48, 0.88, 1.16);

  if (y <= HEAD_END_Y) return y;

  const transformedHip = HEAD_END_Y + (HIP_Y - HEAD_END_Y) * torsoScale;
  if (y <= HIP_Y) {
    return HEAD_END_Y + (y - HEAD_END_Y) * torsoScale;
  }

  return transformedHip + (y - HIP_Y) * legScale;
}

function buildMorphGeometry(source: Point[], params: BodyParams): Point[] {
  const current = calculateMetrics(params);
  const base = calculateMetrics(BASE);
  const bustRatio = current.bhr / base.bhr;
  const waistRatio = current.whtr / base.whtr;
  const hipRatio = current.hhr / base.hhr;
  const bmiDelta = current.bmi - base.bmi;
  const fatDelta = (params.bodyFat - BASE.bodyFat) / 20;
  const muscleDelta = (params.muscle - BASE.muscle) / 2;

  const chestScale = clamp(1 + (bustRatio - 1) * 0.88 + muscleDelta * 0.025, 0.7, 1.48);
  const waistScale = clamp(1 + (waistRatio - 1) * 0.92 + fatDelta * 0.025, 0.62, 1.52);
  const hipScale = clamp(1 + (hipRatio - 1) * 0.92 + fatDelta * 0.035, 0.68, 1.52);
  const shoulderScale = clamp(1 + (bustRatio - 1) * 0.18 + muscleDelta * 0.08, 0.86, 1.2);
  const limbScale = clamp(1 + bmiDelta * 0.012 + fatDelta * 0.11 + muscleDelta * 0.075, 0.78, 1.3);

  return source.map((point) => {
    const dx = point.x - CENTER_X;
    const absDx = Math.abs(dx);
    const side = dx < 0 ? -1 : 1;
    const shoulderWeight = gaussian(point.y, 410, 95);
    const chestWeight = gaussian(point.y, 570, 145);
    const waistWeight = gaussian(point.y, 760, 105);
    const hipWeight = gaussian(point.y, 925, 165);

    const localScale = 1
      + (shoulderScale - 1) * shoulderWeight
      + (chestScale - 1) * chestWeight
      + (waistScale - 1) * waistWeight
      + (hipScale - 1) * hipWeight;

    let x: number;

    if (point.y >= 980) {
      const blend = smoothStep(980, 1120, point.y);
      const baseLegCenter = CENTER_X + side * 57;
      const targetLegCenter = CENTER_X + side * 57 * clamp(hipScale, 0.82, 1.22);
      const torsoX = CENTER_X + dx * hipScale;
      const legX = targetLegCenter + (point.x - baseLegCenter) * limbScale;
      x = lerp(torsoX, legX, blend);
    } else if (point.y >= 345 && point.y <= 1020 && absDx > 155) {
      const attachmentDelta = (localScale - 1) * 145 * side;
      const armMassDelta = (limbScale - 1) * 10 * side;
      x = point.x + attachmentDelta * 0.68 + armMassDelta;
    } else if (point.y < 330) {
      x = point.x;
    } else {
      x = CENTER_X + dx * localScale;
    }

    return {
      x,
      y: verticalPosition(point.y, params),
    };
  });
}

function smoothPath(points: Point[]) {
  const path = new paperScope.Path();
  path.closed = true;

  for (const point of points) {
    path.add(new paperScope.Point(point.x, point.y));
  }

  path.smooth({ type: 'catmull-rom', factor: 0.5 });
  const result = path.pathData;
  path.remove();
  return result;
}

function boundsOf(points: Point[]) {
  if (points.length === 0) {
    return { minX: 0, minY: 0, width: VIEW_WIDTH, height: VIEW_HEIGHT };
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return { minX, minY, width: maxX - minX, height: maxY - minY };
}

function bodyWidthAt(points: Point[], y: number) {
  const candidates = points.filter((point) => Math.abs(point.y - y) <= 12);
  const left = candidates
    .filter((point) => point.x < CENTER_X)
    .sort((a, b) => b.x - a.x)[0];
  const right = candidates
    .filter((point) => point.x > CENTER_X)
    .sort((a, b) => a.x - b.x)[0];

  if (!left || !right) {
    return { x1: CENTER_X - 90, x2: CENTER_X + 90 };
  }

  return { x1: left.x, x2: right.x };
}

function buildMeasures(points: Point[], params: BodyParams): Measure[] {
  const definitions = [
    ['Грудь', params.bust, verticalPosition(570, params)],
    ['Талия', params.waist, verticalPosition(760, params)],
    ['Бедра', params.hips, verticalPosition(925, params)],
  ] as const;

  return definitions.map(([label, value, y]) => {
    const width = bodyWidthAt(points, y);
    return { label, value, y, x1: width.x1, x2: width.x2 };
  });
}

function RangeControl({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
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
        <input
          aria-label={label}
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(event) => apply(Number(event.target.value))}
        />
        <input
          aria-label={`${label}, точное значение`}
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(event) => apply(Number(event.target.value))}
        />
      </div>
    </div>
  );
}

export function BodyMorphTest() {
  const [params, setParams] = useState<BodyParams>(BASE);
  const [sourcePath, setSourcePath] = useState('');
  const [sourceError, setSourceError] = useState('');
  const [displayPath, setDisplayPath] = useState('');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('torso');
  const [showMeasures, setShowMeasures] = useState(true);
  const [showGhost, setShowGhost] = useState(false);
  const displayPathRef = useRef('');
  const animationRef = useRef<number | null>(null);

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
        setDisplayPath(path);
        displayPathRef.current = path;
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setSourceError(error instanceof Error ? error.message : 'Не удалось загрузить SVG');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const sourcePoints = useMemo(
    () => (sourcePath ? sampleSvgPath(sourcePath) : []),
    [sourcePath],
  );

  const morphedPoints = useMemo(
    () => buildMorphGeometry(sourcePoints, params),
    [sourcePoints, params],
  );

  const targetPath = useMemo(
    () => (morphedPoints.length ? smoothPath(morphedPoints) : ''),
    [morphedPoints],
  );

  useEffect(() => {
    if (!targetPath) return undefined;

    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
    }

    const fromPath = displayPathRef.current || targetPath;
    const morph = interpolate(fromPath, targetPath, { maxSegmentLength: 10 });
    const duration = 140;
    const startedAt = performance.now();

    const tick = (now: number) => {
      const progress = clamp((now - startedAt) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextPath = morph(eased);
      displayPathRef.current = nextPath;
      setDisplayPath(nextPath);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(tick);
      } else {
        animationRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [targetPath]);

  const metrics = calculateMetrics(params);
  const [figureType, figureDescription] = classifyFigure(params);
  const measures = useMemo(() => buildMeasures(morphedPoints, params), [morphedPoints, params]);
  const bounds = useMemo(() => boundsOf(morphedPoints), [morphedPoints]);

  const fullViewBox = `${bounds.minX - 28} ${bounds.minY - 28} ${bounds.width + 56} ${bounds.height + 56}`;
  const torsoViewBox = `95 ${verticalPosition(300, params)} 647 ${verticalPosition(1035, params) - verticalPosition(300, params)}`;
  const viewBox = previewMode === 'torso' ? torsoViewBox : fullViewBox;

  const setNumeric = (key: keyof Omit<BodyParams, 'muscle'>, value: number) => {
    setParams((current) => ({ ...current, [key]: value }));
  };

  return (
    <main className="body-lab">
      <header className="body-lab__header">
        <div>
          <h1>2D Body Lab - library morph</h1>
          <p>
            React/Vite тест CharacterMaker. Контур берется из женского SVG, измеряется через svg-path-properties,
            перестраивается через Paper.js и плавно морфится через Flubber.
          </p>
        </div>
        <div className="body-lab__badge">/dev/test</div>
      </header>

      <div className="body-lab__layout">
        <section className="lab-card controls-card">
          <h2 className="section-title">Параметры тела</h2>
          <p className="section-sub">Обхваты являются основными управляющими параметрами контура.</p>

          <div className="control-group">
            <h3 className="control-group__title">Обхваты</h3>
            <RangeControl label="Грудь" value={params.bust} min={70} max={140} unit="см" onChange={(value) => setNumeric('bust', value)} />
            <RangeControl label="Талия" value={params.waist} min={50} max={120} unit="см" onChange={(value) => setNumeric('waist', value)} />
            <RangeControl label="Бедра" value={params.hips} min={70} max={140} unit="см" onChange={(value) => setNumeric('hips', value)} />
          </div>

          <div className="control-group">
            <h3 className="control-group__title">Габариты</h3>
            <RangeControl label="Рост" value={params.height} min={140} max={220} unit="см" onChange={(value) => setNumeric('height', value)} />
            <RangeControl label="Вес" value={params.weight} min={40} max={150} unit="кг" onChange={(value) => setNumeric('weight', value)} />
          </div>

          <div className="control-group">
            <h3 className="control-group__title">Композиция</h3>
            <RangeControl label="Процент жира" value={params.bodyFat} min={8} max={45} unit="%" onChange={(value) => setNumeric('bodyFat', value)} />
            <div className="select-control">
              <label htmlFor="muscle">Мышечная масса</label>
              <select
                id="muscle"
                value={params.muscle}
                onChange={(event) => setParams((current) => ({ ...current, muscle: Number(event.target.value) }))}
              >
                <option value={0}>Мягкая</option>
                <option value={1}>Тонизированная</option>
                <option value={2}>Атлетическая</option>
                <option value={3}>Мускулистая</option>
              </select>
            </div>
          </div>

          <details className="metrics-disclosure">
            <summary>Расчетные коэффициенты и тип фигуры</summary>
            <div className="metrics-grid">
              <div className="metric"><span>BMI</span><strong>{metrics.bmi.toFixed(1)}</strong></div>
              <div className="metric"><span>Талия / рост</span><strong>{metrics.whtr.toFixed(3)}</strong></div>
              <div className="metric"><span>Талия / бедра</span><strong>{metrics.whr.toFixed(3)}</strong></div>
              <div className="metric"><span>Грудь / талия</span><strong>{metrics.bwr.toFixed(2)}</strong></div>
              <div className="metric"><span>Бедра / рост</span><strong>{metrics.hhr.toFixed(3)}</strong></div>
              <div className="metric"><span>Тип</span><strong>{figureType}</strong></div>
            </div>
          </details>

          <button className="reset-button" type="button" onClick={() => setParams(BASE)}>
            Сбросить к 170 / 60 / 90-65-95
          </button>
        </section>

        <section className="lab-card preview-card">
          <div className="preview-head">
            <div className="preview-head__copy">
              <h2 className="section-title">Живой силуэт</h2>
              <p className="section-sub">На телефоне сначала показывается крупный корпус, чтобы изменения были видны сразу.</p>
            </div>
            <div className="preview-toolbar">
              <div className="segmented" aria-label="Область просмотра">
                <button className={previewMode === 'torso' ? 'is-active' : ''} type="button" onClick={() => setPreviewMode('torso')}>Корпус</button>
                <button className={previewMode === 'full' ? 'is-active' : ''} type="button" onClick={() => setPreviewMode('full')}>Весь рост</button>
              </div>
              <button className={`tool-button ${showMeasures ? 'is-active' : ''}`} type="button" onClick={() => setShowMeasures((value) => !value)}>Мерки</button>
              <button className={`tool-button ${showGhost ? 'is-active' : ''}`} type="button" onClick={() => setShowGhost((value) => !value)}>Сравнение</button>
            </div>
          </div>

          <div className="stage">
            {sourceError ? (
              <div className="loading-state">Ошибка SVG: {sourceError}</div>
            ) : !displayPath ? (
              <div className="loading-state">Загрузка 2D-контура...</div>
            ) : (
              <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Параметрический женский силуэт">
                {showGhost && <path className="ghost-path" d={sourcePath} />}
                <path className="body-path" d={displayPath} />

                {showMeasures && measures.map((measure) => (
                  <g key={measure.label}>
                    <line className="measure-line" x1={measure.x1 - 8} x2={measure.x2 + 8} y1={measure.y} y2={measure.y} />
                    <text className="measure-text" x={measure.x2 + 18} y={measure.y + 8}>{measure.label} {measure.value} см</text>
                  </g>
                ))}

                {showMeasures && previewMode === 'full' && (
                  <g>
                    <line className="height-line" x1={bounds.minX - 18} x2={bounds.minX - 18} y1={bounds.minY} y2={bounds.minY + bounds.height} />
                    <text className="measure-text" x={bounds.minX - 30} y={bounds.minY + bounds.height / 2} transform={`rotate(-90 ${bounds.minX - 30} ${bounds.minY + bounds.height / 2})`}>
                      Рост {params.height} см
                    </text>
                  </g>
                )}
              </svg>
            )}
          </div>

          <div className="preview-summary">
            <div className="summary-box">
              <span>Расчетный тип</span>
              <strong>{figureType}</strong>
              <p>{figureDescription}</p>
            </div>
            <div className="summary-box">
              <span>Текущие параметры</span>
              <strong>{params.height} см · {params.weight} кг · {params.bust}-{params.waist}-{params.hips}</strong>
              <p>Жир {params.bodyFat}% · мышцы {['мягкая', 'тонизированная', 'атлетическая', 'мускулистая'][params.muscle]}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
