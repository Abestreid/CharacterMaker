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
    <header className="mb-4 flex items-start justify-between gap-3 sm:mb-5 sm:gap-4">
      <div className="min-w-0">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary sm:text-xs sm:tracking-[0.18em]">{eyebrow}</p>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        <p className="mt-1.5 max-w-2xl text-xs leading-5 text-muted-foreground sm:mt-2 sm:text-sm sm:leading-6">{description}</p>
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
    <section className={cn('surface rounded-2xl p-3.5 sm:rounded-3xl sm:p-5', className)}>
      <div className="mb-3 sm:mb-4">
        <h2 className="text-sm font-semibold text-foreground sm:text-base">{title}</h2>
        {description ? <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">{description}</p> : null}
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
    <div className="tabs-scroll -mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1.5 sm:mb-5 sm:gap-2 sm:pb-2">
      {items.map((item) => (
        <button
          aria-pressed={value === item.id}
          className={cn(
            'focus-ring min-h-10 shrink-0 rounded-full border px-3.5 text-xs font-medium transition sm:min-h-11 sm:px-4 sm:text-sm',
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
