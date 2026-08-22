import { Dialog } from '@base-ui/react/dialog';
import { Drawer } from '@base-ui/react/drawer';
import { Check, ChevronRight, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { cn } from '../../lib/utils';
import { FieldLabel, SearchInput, type OptionLike } from './form-controls';

function useDesktop() {
  const [desktop, setDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 640px)');
    const update = () => setDesktop(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return desktop;
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
        aria-expanded={open}
        className="focus-ring flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-border bg-input px-4 text-left transition hover:bg-surface-strong"
        onClick={() => setOpen(true)}
        type="button"
      >
        <span className={cn('flex min-w-0 items-center gap-2 text-sm', selected ? 'text-foreground' : 'text-muted-foreground')}>
          {selected?.hex ? <span className="size-5 shrink-0 rounded-full border border-border" style={{ background: selected.hex }} /> : null}
          <span className="truncate">{selected?.label ?? placeholder}</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </button>
      <ResponsiveCatalogPicker
        label={label}
        onChange={(next) => {
          onChange(next);
          setOpen(false);
        }}
        onOpenChange={setOpen}
        open={open}
        options={options}
        value={value}
      />
    </div>
  );
}

function ResponsiveCatalogPicker<TId extends string>(props: {
  label: string;
  options: readonly OptionLike<TId>[];
  value: TId | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (value: TId) => void;
}) {
  const desktop = useDesktop();
  if (desktop) return <DesktopCatalogPicker {...props} />;
  return <MobileCatalogPicker {...props} />;
}

function DesktopCatalogPicker<TId extends string>({ open, onOpenChange, ...panelProps }: PickerProps<TId>) {
  return (
    <Dialog.Root onOpenChange={onOpenChange} open={open}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-overlay/70 backdrop-blur-sm transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <Dialog.Popup className="surface max-h-[82dvh] w-full max-w-2xl overflow-hidden rounded-[2rem] shadow-2xl transition data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
            <CatalogPanel {...panelProps} onClose={() => onOpenChange(false)} />
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function MobileCatalogPicker<TId extends string>({ open, onOpenChange, ...panelProps }: PickerProps<TId>) {
  return (
    <Drawer.Root onOpenChange={onOpenChange} open={open} swipeDirection="down">
      <Drawer.VirtualKeyboardProvider>
        <Drawer.Portal>
          <Drawer.Backdrop className="fixed inset-0 z-50 bg-overlay/70 backdrop-blur-sm transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
          <Drawer.Viewport className="fixed inset-0 z-50 flex items-end">
            <Drawer.Popup className="safe-bottom surface max-h-[92dvh] w-full overflow-hidden rounded-t-[2rem] shadow-2xl transition-transform data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full">
              <Drawer.Content>
                <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-control" />
                <CatalogPanel {...panelProps} onClose={() => onOpenChange(false)} />
              </Drawer.Content>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.VirtualKeyboardProvider>
    </Drawer.Root>
  );
}

type PickerProps<TId extends string> = {
  label: string;
  options: readonly OptionLike<TId>[];
  value: TId | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (value: TId) => void;
};

function CatalogPanel<TId extends string>({
  label,
  options,
  value,
  onChange,
  onClose,
}: Omit<PickerProps<TId>, 'open' | 'onOpenChange'> & { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const categories = useMemo(
    () => Array.from(new Set(options.map((option) => option.categoryId).filter((item): item is string => Boolean(item)))),
    [options],
  );
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ru');
    return options.filter((option) => {
      const categoryMatch = category === 'all' || option.categoryId === category;
      const queryMatch = !normalized || `${option.label} ${option.id}`.toLocaleLowerCase('ru').includes(normalized);
      return categoryMatch && queryMatch;
    });
  }, [category, options, query]);

  return (
    <div className="flex max-h-[88dvh] flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
        <div>
          <h3 className="font-semibold text-foreground">{label}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{options.length} вариантов</p>
        </div>
        <button aria-label="Закрыть" className="focus-ring grid size-10 place-items-center rounded-full bg-surface text-muted-foreground transition hover:bg-surface-strong hover:text-foreground" onClick={onClose} type="button">
          <X className="size-5" />
        </button>
      </div>
      <div className="space-y-3 border-b border-border p-4 sm:px-5">
        <SearchInput autoFocus onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по названию или id" value={query} />
        {categories.length ? (
          <div className="tabs-scroll flex gap-2 overflow-x-auto pb-1">
            <CategoryChip active={category === 'all'} label="Все" onClick={() => setCategory('all')} />
            {categories.map((item) => <CategoryChip active={category === item} key={item} label={item.replaceAll('_', ' ')} onClick={() => setCategory(item)} />)}
          </div>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 sm:p-3">
        {filtered.length ? filtered.map((option) => {
          const selected = option.id === value;
          return (
            <button
              className={cn('focus-ring flex min-h-13 w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition', selected ? 'bg-primary-soft text-foreground' : 'text-foreground hover:bg-surface-strong')}
              key={option.id}
              onClick={() => onChange(option.id)}
              type="button"
            >
              {option.hex ? <span className="size-7 shrink-0 rounded-full border border-border" style={{ background: option.hex }} /> : <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-strong text-[10px] font-semibold text-muted-foreground">{option.label.slice(0, 1)}</span>}
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{option.label}</span>
                {option.description ? <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{option.description}</span> : null}
                <span className="block truncate font-mono text-[10px] text-subtle-foreground">{option.id}</span>
              </span>
              {selected ? <Check className="size-5 shrink-0 text-primary" /> : null}
            </button>
          );
        }) : <p className="py-12 text-center text-sm text-muted-foreground">Ничего не найдено</p>}
      </div>
    </div>
  );
}

function CategoryChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button className={cn('focus-ring min-h-9 shrink-0 rounded-full border px-3 text-xs capitalize transition', active ? 'border-primary/45 bg-primary-soft text-primary-strong' : 'border-border bg-input text-muted-foreground hover:bg-surface-strong')} onClick={onClick} type="button">
      {label}
    </button>
  );
}
