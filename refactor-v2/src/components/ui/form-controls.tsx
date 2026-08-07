import { Check, Minus, Plus, Search } from 'lucide-react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

export type OptionLike<TId extends string = string> = {
  id: TId;
  label: string;
  categoryId?: string;
  description?: string;
  hex?: string;
};

export function FieldLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('mb-2 block text-xs font-semibold uppercase tracking-[0.11em] text-muted-foreground', className)}>{children}</span>;
}

export function SearchInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="focus-within:ring-2 focus-within:ring-ring/70 flex min-h-11 items-center gap-3 rounded-2xl border border-border bg-input px-3 transition">
      <Search className="size-4 shrink-0 text-muted-foreground" />
      <input {...props} className={cn('min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground', props.className)} type="search" />
    </label>
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
              aria-pressed={selected}
              className={cn(
                'focus-ring relative min-h-12 rounded-2xl border px-3 py-2 text-left text-sm transition',
                selected ? 'border-primary/55 bg-primary-soft text-foreground' : 'border-border bg-input text-foreground hover:bg-surface-strong',
              )}
              key={option.id}
              onClick={() => onChange(option.id)}
              type="button"
            >
              <span className="flex items-center gap-2 pr-4">
                {option.hex ? <span className="size-4 shrink-0 rounded-full border border-border" style={{ background: option.hex }} /> : null}
                <span>{option.label}</span>
              </span>
              {selected ? <Check className="absolute right-2 top-2 size-4 text-primary" /> : null}
            </button>
          );
        })}
      </div>
    </div>
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
        <span className="text-sm font-semibold tabular-nums text-foreground">{value} {unit}</span>
      </div>
      <div className="flex items-center gap-3">
        <button aria-label={`Уменьшить ${label}`} className="focus-ring grid size-11 shrink-0 place-items-center rounded-2xl border border-border bg-input text-foreground transition hover:bg-surface-strong" onClick={() => setClamped(value - step)} type="button">
          <Minus className="size-4" />
        </button>
        <input className="range-control h-2 min-w-0 flex-1 cursor-pointer" max={max} min={min} onChange={(event) => setClamped(Number(event.target.value))} step={step} type="range" value={value} />
        <button aria-label={`Увеличить ${label}`} className="focus-ring grid size-11 shrink-0 place-items-center rounded-2xl border border-border bg-input text-foreground transition hover:bg-surface-strong" onClick={() => setClamped(value + step)} type="button">
          <Plus className="size-4" />
        </button>
      </div>
      <div className="mt-2 flex justify-between text-[10px] tabular-nums text-muted-foreground"><span>{min}</span><span>{max}</span></div>
    </div>
  );
}

export function Toggle({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button aria-checked={checked} className="focus-ring flex min-h-14 w-full items-center justify-between gap-4 rounded-2xl border border-border bg-input px-4 py-3 text-left transition hover:bg-surface-strong" onClick={() => onChange(!checked)} role="switch" type="button">
      <span>
        <span className="block text-sm font-medium text-foreground">{label}</span>
        {description ? <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{description}</span> : null}
      </span>
      <span className={cn('relative h-7 w-12 shrink-0 rounded-full transition', checked ? 'bg-primary' : 'bg-control')}>
        <span className={cn('absolute top-1 size-5 rounded-full bg-white shadow transition', checked ? 'left-6' : 'left-1')} />
      </span>
    </button>
  );
}

export function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <textarea className="focus-ring min-h-28 w-full resize-y rounded-2xl border border-border bg-input px-4 py-3 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground" onChange={(event) => onChange(event.target.value)} placeholder={placeholder} value={value} />
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
          <button
            aria-pressed={selected.has(option.id)}
            className={cn('focus-ring min-h-10 rounded-full border px-3 text-sm transition', selected.has(option.id) ? 'border-primary/45 bg-primary-soft text-primary-strong' : 'border-border bg-input text-muted-foreground hover:bg-surface-strong hover:text-foreground')}
            key={option.id}
            onClick={() => toggle(option.id)}
            type="button"
          >
            {selected.has(option.id) ? '✓ ' : ''}{option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
