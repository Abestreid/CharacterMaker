import { BookOpenText, Database, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PageIntro, cn, type OptionLike } from '../components/ui';
import { CATALOG } from '../domain';
import { fetchPublicCatalogs } from '../infrastructure/supabase/catalog.repository';

type CatalogEntry = {
  key: string;
  section: string;
  label: string;
  options: readonly OptionLike[];
  valueType?: string;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
};

const isOptionArray = (value: unknown): value is readonly OptionLike[] =>
  Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'object' && item !== null && 'id' in item && 'label' in item);

function collectCatalogs(value: unknown, path: string[] = []): CatalogEntry[] {
  if (isOptionArray(value)) {
    const key = path.join('.');
    return [{
      key,
      section: path[0] ?? 'other',
      label: (path.at(-1) ?? key).replaceAll('_', ' ').replace(/([a-z])([A-Z])/g, '$1 $2'),
      options: value,
    }];
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return [];
  return Object.entries(value).flatMap(([key, child]) => collectCatalogs(child, [...path, key]));
}

const localCatalogs = collectCatalogs(CATALOG).sort((a, b) => a.key.localeCompare(b.key));
const sectionLabels: Record<string, string> = {
  character: 'Персона',
  wardrobe: 'Одежда',
  background: 'Фоны',
  scene: 'Сцена',
  shared: 'Общие',
  generation: 'Генерация',
};

export function CatalogsPage() {
  const [query, setQuery] = useState('');
  const [section, setSection] = useState('all');
  const [catalogs, setCatalogs] = useState<CatalogEntry[]>(localCatalogs);
  const [source, setSource] = useState<'supabase' | 'fallback' | 'loading'>('loading');

  useEffect(() => {
    let active = true;
    fetchPublicCatalogs()
      .then((remoteCatalogs) => {
        if (!active || remoteCatalogs.length === 0) return;
        setCatalogs(remoteCatalogs.map((catalog) => ({
          key: catalog.key,
          section: catalog.section,
          label: catalog.label,
          valueType: catalog.valueType,
          unit: catalog.unit,
          min: catalog.min,
          max: catalog.max,
          step: catalog.step,
          options: catalog.options.map((option) => ({
            id: option.id,
            label: option.label,
            ...(option.categoryId ? { categoryId: option.categoryId } : {}),
            ...(option.hex ? { hex: option.hex } : {}),
          })),
        })));
        setSource('supabase');
      })
      .catch((error: unknown) => {
        console.warn('Supabase catalogs are unavailable, using local fallback.', error);
        if (active) setSource('fallback');
      });
    return () => { active = false; };
  }, []);

  const sections = useMemo(() => Array.from(new Set(catalogs.map((catalog) => catalog.section))), [catalogs]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ru');
    return catalogs
      .filter((catalog) => section === 'all' || catalog.section === section)
      .map((catalog) => ({
        ...catalog,
        options: normalized
          ? catalog.options.filter((option) => `${option.label} ${option.id} ${option.categoryId ?? ''}`.toLocaleLowerCase('ru').includes(normalized))
          : catalog.options,
      }))
      .filter((catalog) => catalog.options.length > 0 || !normalized || `${catalog.key} ${catalog.label}`.toLocaleLowerCase('ru').includes(normalized));
  }, [catalogs, query, section]);
  const totalOptions = catalogs.reduce((sum, catalog) => sum + catalog.options.length, 0);
  const visibleOptions = filtered.reduce((sum, catalog) => sum + catalog.options.length, 0);

  return (
    <div>
      <PageIntro
        description="Центральный реестр параметров CharacterMaker V2. Основной источник - Supabase PostgreSQL; локальные TypeScript-каталоги используются только как резерв при недоступности сети."
        eyebrow="Контроль данных"
        title="Все списки"
      />

      <section className="surface mb-4 rounded-3xl p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2 text-xs text-zinc-500">
          <Database className="size-4" />
          <span>{source === 'supabase' ? 'Источник: Supabase' : source === 'fallback' ? 'Источник: локальный fallback' : 'Подключение к Supabase...'}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/65 px-4">
            <Search className="size-4 text-zinc-500" />
            <input className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600" onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по всем названиям, id и категориям" type="search" value={query} />
          </label>
          <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
            <FilterChip active={section === 'all'} label="Все" onClick={() => setSection('all')} />
            {sections.map((item) => <FilterChip active={section === item} key={item} label={sectionLabels[item] ?? item} onClick={() => setSection(item)} />)}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-500">
          <Stat label="Каталогов" value={catalogs.length} />
          <Stat label="Всего значений" value={totalOptions} />
          <Stat label="Показано" value={visibleOptions} />
        </div>
      </section>

      <div className="space-y-3">
        {filtered.map((catalog) => (
          <details className="surface group overflow-hidden rounded-3xl" key={catalog.key} open={Boolean(query)}>
            <summary className="focus-ring flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 sm:px-5">
              <span className="flex min-w-0 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-500/12 text-violet-300"><BookOpenText className="size-4" /></span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-zinc-100">{catalog.label}</span>
                  <span className="block truncate text-xs text-zinc-600">{catalog.key}{catalog.valueType ? ` · ${catalog.valueType}` : ''}{catalog.unit ? ` · ${catalog.unit}` : ''}</span>
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-zinc-900 px-2.5 py-1 text-xs tabular-nums text-zinc-400">{catalog.options.length || 'параметр'}</span>
            </summary>
            <div className="border-t border-zinc-800 p-2 sm:p-3">
              {catalog.options.length ? (
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {catalog.options.map((option) => (
                    <div className="flex min-h-14 items-center gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-950/55 p-3" key={`${catalog.key}.${option.id}`}>
                      {option.hex ? <span className="size-8 shrink-0 rounded-full border border-white/15" style={{ background: option.hex }} /> : <span className="grid size-8 shrink-0 place-items-center rounded-full bg-zinc-900 text-xs font-semibold text-zinc-600">{option.label.slice(0, 1)}</span>}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-5 text-zinc-200">{option.label}</p>
                        <p className="mt-0.5 truncate font-mono text-[11px] text-zinc-600">{option.id}</p>
                      </div>
                      {option.categoryId ? <span className="max-w-24 truncate rounded-full bg-zinc-900 px-2 py-1 text-[10px] text-zinc-500">{option.categoryId}</span> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl bg-zinc-950/55 p-4 text-sm text-zinc-500">
                  Числовой/текстовый параметр{catalog.min !== undefined && catalog.max !== undefined ? `: ${catalog.min}-${catalog.max}${catalog.unit ? ` ${catalog.unit}` : ''}` : ''}{catalog.step !== undefined ? `, шаг ${catalog.step}` : ''}.
                </p>
              )}
            </div>
          </details>
        ))}
        {!filtered.length ? <div className="surface rounded-3xl py-16 text-center text-sm text-zinc-500">По запросу ничего не найдено</div> : null}
      </div>
    </div>
  );
}

function FilterChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return <button className={cn('focus-ring min-h-12 shrink-0 rounded-2xl border px-4 text-sm transition', active ? 'border-violet-400/60 bg-violet-500/18 text-violet-100' : 'border-zinc-800 bg-zinc-950/60 text-zinc-500')} onClick={onClick} type="button">{label}</button>;
}

function Stat({ label, value }: { label: string; value: number }) {
  return <span className="rounded-full border border-zinc-800 bg-zinc-950/55 px-3 py-1.5"><strong className="mr-1 text-zinc-300">{value}</strong>{label}</span>;
}
