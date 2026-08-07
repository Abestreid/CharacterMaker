import { Laptop, Moon, Sun } from 'lucide-react';
import { useTheme, type Theme } from './theme-provider';
import { cn } from '../lib/utils';

const options: Array<{ id: Theme; label: string; icon: typeof Sun }> = [
  { id: 'light', label: 'Светлая тема', icon: Sun },
  { id: 'dark', label: 'Темная тема', icon: Moon },
  { id: 'system', label: 'Системная тема', icon: Laptop },
];

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();

  if (compact) {
    const index = options.findIndex((option) => option.id === theme);
    const next = options[(index + 1) % options.length];
    const CurrentIcon = options[index]?.icon ?? Laptop;
    return (
      <button
        aria-label={`${options[index]?.label ?? 'Тема'}. Переключить на: ${next.label}`}
        className="focus-ring grid size-10 place-items-center rounded-xl border border-border bg-surface text-muted-foreground transition hover:bg-surface-strong hover:text-foreground"
        onClick={() => setTheme(next.id)}
        title={options[index]?.label}
        type="button"
      >
        <CurrentIcon className="size-4" />
      </button>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-surface p-1" aria-label="Цветовая тема">
      {options.map(({ id, label, icon: Icon }) => (
        <button
          aria-pressed={theme === id}
          className={cn(
            'focus-ring flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-xs font-medium transition',
            theme === id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-surface-strong hover:text-foreground',
          )}
          key={id}
          onClick={() => setTheme(id)}
          type="button"
        >
          <Icon className="size-4" />
          <span className="hidden xl:inline">{label.replace(' тема', '')}</span>
        </button>
      ))}
    </div>
  );
}
