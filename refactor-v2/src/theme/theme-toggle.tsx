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
    const currentIndex = index >= 0 ? index : options.length - 1;
    const next = options[(currentIndex + 1) % options.length] ?? options[0]!;
    const CurrentIcon = options[currentIndex]?.icon ?? Laptop;
    return (
      <button
        aria-label={`${options[currentIndex]?.label ?? 'Тема'}. Переключить на: ${next.label}`}
        className="focus-ring grid size-10 place-items-center rounded-xl border border-border bg-surface text-muted-foreground transition hover:bg-surface-strong hover:text-foreground"
        onClick={() => setTheme(next.id)}
        title={options[currentIndex]?.label}
        type="button"
      >
        <CurrentIcon className="size-4" />
      </button>
    );
  }

  return (
    <div className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background/55 px-2" aria-label="Цветовая тема">
      <span className="min-w-0 flex-1 text-xs font-medium text-muted-foreground">Тема</span>
      <div className="flex items-center gap-1">
        {options.map(({ id, label, icon: Icon }) => (
          <button
            aria-label={label}
            aria-pressed={theme === id}
            className={cn(
              'focus-ring grid size-8 place-items-center rounded-lg transition',
              theme === id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-surface-strong hover:text-foreground',
            )}
            key={id}
            onClick={() => setTheme(id)}
            title={label}
            type="button"
          >
            <Icon className="size-3.5" />
          </button>
        ))}
      </div>
    </div>
  );
}
