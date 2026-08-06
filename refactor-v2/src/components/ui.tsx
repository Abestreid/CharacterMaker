import {
  Check,
  ChevronRight,
  Minus,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

export type OptionLike<TId extends string = string> = {
  id: TId;
  label: string;
  categoryId?: string;
  description?: string;
  hex?: string;
};

export const cn = (...values: Array<string | false | null | undefined>): string =>
  values.filter(Boolean).join(' ');

export function PageIntro({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-5 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">{eyebrow}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">{description}</p>
      </div>
      {action}
    </header>
  );
}

export function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="surface rounded-3xl p-4 sm:p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-5 text-zinc-500">{description}</p> : null}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function SectionTabs<T extends string>({
  items,
  value,
  onChange,
}: {
  items: readonly { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none]">
      {items.map((item) => (
        <button
          className={cn(
            'focus-ring min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition',
            value === item.id
              ? 'border-violet-400/60 bg-violet-500/20 text-violet-100'
              : 'border-zinc-800 bg-zinc-900/70 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200',
          )}
          key={item.id}
          onClick={() => onChange(item.id)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function ChoiceGrid<TId extends string>({
  label,
  options,
  value,
  onChange,
  columns = 2,
}: {
  label: string;
  options: readonly OptionLike<TId>[];
  value: TId | null;
  onChange: (value: TId) => void;
  columns?: 2 | 3 | 4;
}) {
  const gridClass = columns === 4 ? 'grid-cols-2 sm:grid-cols-4' : columns === 3 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2';

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className={cn('grid gap-2', gridClass)}>
        {options.map((option) => {
          const selected = value === option.id;
          return (
            <button
              className={cn(
                'focus-ring relative min-h-12 rounded-2xl border px-3 py-2 text-left text-sm transition',
                selected
                  ? 'border-violet-400/70 bg-violet-500/16 text-violet-50'
                  : 'border-zinc-800 bg-zinc-950/55 text-zinc-300 hover:border-zinc-700',
              )}
              key={option.id}
              onClick={() => onChange(option.id)}
              type="button"
            >
              <span className="flex items-center gap-2">
                {option.hex ? <span className="size-4 shrink-0 rounded-full border border-white/20" style={{ background: option.hex }} /> : null}
                <span>{option.label}</span>
              </span>
              {selected ? <Check className="absolute right-2 top-2 size-4 text-violet-300" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CatalogField<TId extends string>({
  label,
  options,
  value,
  onChange,
  placeholder = 'Выберите значение',
}: {
  label: string;
  options: readonly OptionLike<TId>[];
  value: TId | null;
  onChange: (value: TId) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.id === value) ?? null;

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <button
        className="focus-ring flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/55 px-4 text-left transition hover:border-zinc-700"
        onClick={() => setOpen(true)}
        type="button"
      >
        <span className={cn('flex min-w-0 items-center gap-2 text-sm', selected ? 'text-zinc-100' : 'text-zinc-500')}>
          {selected?.hex ? <span className="size-5 shrink-0 rounded-full border border-white/20" style={{ background: selected.hex }} /> : null}
          <span className="truncate">{selected?.label ?? placeholder}</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-zinc-500" />
      </button>
      <CatalogSheet
        label={label}
        onChange={(next) => {
          onChange(next);
          setOpen(false);
        }}
        onClose={() => setOpen(false)}
        open={open}
        options={options}
        value={value}
      />
    </div>
  );
}

function CatalogSheet<TId extends string>({
  label,
  options,
  value,
  open,
  onClose,
  onChange,
}: {
  label: string;
  options: readonly OptionLike<TId>[];
  value: TId | null;
  open: boolean;
  onClose: () => void;
  onChange: (value: TId) => void;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');
  const categories = useMemo(
    () => Array.from(new Set(options.map((option) => option.categoryId).filter((item): item is string => Boolean(item)))),
    [options],
  );
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ru');
    return options.filter((option) => {
      const categoryMatch = category === 'all' || option.categoryId === category;
      const queryMatch = !normalized || option.label.toLocaleLowerCase('ru').includes(normalized) || option.id.includes(normalized);
      return categoryMatch && queryMatch;
    });
  }, [category, options, query]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setCategory('all');
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={onClose} role="presentation">
      <div
        aria-label={label}
        aria-modal="true"
        className="surface safe-bottom max-h-[88dvh] w-full overflow-hidden rounded-t-[2rem] sm:max-w-2xl sm:rounded-[2rem]"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-zinc-700 sm:hidden" />
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-4 sm:px-5">
          <div>
            <h3 className="font-semibold text-zinc-100">{label}</h3>
            <p className="mt-0.5 text-xs text-zinc-500">{options.length} вариантов</p>
          </div>
          <button aria-label="Закрыть" className="focus-ring grid size-10 place-items-center rounded-full bg-zinc-900 text-zinc-400 hover:text-white" onClick={onClose} type="button">
            <X className="size-5" />
          </button>
        </div>
        <div className="space-y-3 border-b border-zinc-800 p-4 sm:px-5">
          <label className="flex min-h-11 items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/70 px-3">
            <Search className="size-4 text-zinc-500" />
            <input
              autoFocus
              className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск по названию или id"
              type="search"
              value={query}
            />
          </label>
          {categories.length ? (
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              <CategoryChip active={category === 'all'} label="Все" onClick={() => setCategory('all')} />
              {categories.map((item) => <CategoryChip active={category === item} key={item} label={item.replaceAll('_', ' ')} onClick={() => setCategory(item)} />)}
            </div>
          ) : null}
        </div>
        <div className="max-h-[58dvh] overflow-y-auto p-2 sm:p-3">
          {filtered.length ? filtered.map((option) => {
            const selected = option.id === value;
            return (
              <button
                className={cn(
                  'focus-ring flex min-h-13 w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition',
                  selected ? 'bg-violet-500/16 text-violet-50' : 'text-zinc-300 hover:bg-zinc-900',
                )}
                key={option.id}
                onClick={() => onChange(option.id)}
                type="button"
              >
                {option.hex ? <span className="size-7 shrink-0 rounded-full border border-white/20" style={{ background: option.hex }} /> : <span className="grid size-7 shrink-0 place-items-center rounded-full bg-zinc-900 text-[10px] font-semibold text-zinc-500">{option.label.slice(0, 1)}</span>}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{option.label}</span>
                  <span className="block truncate text-xs text-zinc-600">{option.id}</span>
                </span>
                {selected ? <Check className="size-5 text-violet-300" /> : null}
              </button>
            );
          }) : <p className="py-12 text-center text-sm text-zinc-500">Ничего не найдено</p>}
        </div>
      </div>
    </div>
  );
}

function CategoryChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button className={cn('focus-ring min-h-9 shrink-0 rounded-full border px-3 text-xs capitalize transition', active ? 'border-violet-400/60 bg-violet-500/20 text-violet-100' : 'border-zinc-800 bg-zinc-950 text-zinc-500')} onClick={onClick} type="button">
      {label}
    </button>
  );
}

export function NumberControl({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  const setClamped = (next: number) => onChange(Math.min(max, Math.max(min, next)));
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
        <FieldLabel className="mb-0">{label}</FieldLabel>
        <span className="text-sm font-semibold tabular-nums text-zinc-200">{value} {unit}</span>
      </div>
      <div className="flex items-center gap-3">
        <button aria-label={`Уменьшить ${label}`} className="focus-ring grid size-11 shrink-0 place-items-center rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-300" onClick={() => setClamped(value - step)} type="button">
          <Minus className="size-4" />
        </button>
        <input className="h-2 min-w-0 flex-1 cursor-pointer accent-violet-500" max={max} min={min} onChange={(event) => setClamped(Number(event.target.value))} step={step} type="range" value={value} />
        <button aria-label={`Увеличить ${label}`} className="focus-ring grid size-11 shrink-0 place-items-center rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-300" onClick={() => setClamped(value + step)} type="button">
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function Toggle({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button className="focus-ring flex min-h-14 w-full items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/55 px-4 py-3 text-left" onClick={() => onChange(!checked)} role="switch" type="button" aria-checked={checked}>
      <span>
        <span className="block text-sm font-medium text-zinc-100">{label}</span>
        {description ? <span className="mt-0.5 block text-xs leading-5 text-zinc-500">{description}</span> : null}
      </span>
      <span className={cn('relative h-7 w-12 shrink-0 rounded-full transition', checked ? 'bg-violet-500' : 'bg-zinc-700')}>
        <span className={cn('absolute top-1 size-5 rounded-full bg-white shadow transition', checked ? 'left-6' : 'left-1')} />
      </span>
    </button>
  );
}

export function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <textarea className="focus-ring min-h-28 w-full resize-y rounded-2xl border border-zinc-800 bg-zinc-950/55 px-4 py-3 text-sm leading-6 text-zinc-100 outline-none placeholder:text-zinc-600" onChange={(event) => onChange(event.target.value)} placeholder={placeholder} value={value} />
    </label>
  );
}

export function MultiChoice<TId extends string>({ label, options, values, onChange }: { label: string; options: readonly OptionLike<TId>[]; values: readonly TId[]; onChange: (values: TId[]) => void }) {
  const selected = new Set(values);
  const toggle = (id: TId) => onChange(selected.has(id) ? values.filter((value) => value !== id) : [...values, id]);
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button className={cn('focus-ring min-h-10 rounded-full border px-3 text-sm transition', selected.has(option.id) ? 'border-violet-400/60 bg-violet-500/20 text-violet-100' : 'border-zinc-800 bg-zinc-950/60 text-zinc-400')} key={option.id} onClick={() => toggle(option.id)} type="button">
            {selected.has(option.id) ? '✓ ' : ''}{option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function FieldLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('mb-2 block text-xs font-semibold uppercase tracking-[0.11em] text-zinc-500', className)}>{children}</span>;
}
