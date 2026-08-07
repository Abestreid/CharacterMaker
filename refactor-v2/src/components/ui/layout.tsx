import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

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
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {action}
    </header>
  );
}

export function SectionCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('surface rounded-3xl p-4 sm:p-5', className)}>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p> : null}
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
    <div className="tabs-scroll -mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-2">
      {items.map((item) => (
        <button
          aria-pressed={value === item.id}
          className={cn(
            'focus-ring min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition',
            value === item.id
              ? 'border-primary/45 bg-primary-soft text-primary-strong'
              : 'border-border bg-surface text-muted-foreground hover:bg-surface-strong hover:text-foreground',
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

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="surface flex min-h-64 flex-col items-center justify-center rounded-3xl p-6 text-center">
      {icon ? <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">{icon}</div> : null}
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
