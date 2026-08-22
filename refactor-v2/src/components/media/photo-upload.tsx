import { ImagePlus, Trash2, Upload } from 'lucide-react';
import { useRef, type ChangeEvent } from 'react';
import { Button } from '../ui';

export type LocalPhoto = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
  createdAt: string;
};

export function PhotoUpload({
  value,
  onChange,
  label = 'Добавить фотографию',
  description = 'PNG, JPEG, WebP и другие изображения, поддерживаемые браузером',
  accept = 'image/*',
}: {
  value: LocalPhoto | null;
  onChange: (value: LocalPhoto | null) => void;
  label?: string;
  description?: string;
  accept?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      onChange({
        id: crypto.randomUUID(),
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        dataUrl: reader.result,
        createdAt: new Date().toISOString(),
      });
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  if (!value) {
    return (
      <label className="focus-within:ring-2 focus-within:ring-ring/70 flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-input p-6 text-center transition hover:bg-surface">
        <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary"><ImagePlus className="size-6" /></span>
        <span className="mt-3 text-sm font-semibold text-foreground">{label}</span>
        <span className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{description}</span>
        <input accept={accept} className="sr-only" onChange={handleFile} type="file" />
      </label>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-input">
      <div className="relative aspect-[4/3] bg-surface">
        <img alt={value.name} className="h-full w-full object-contain" src={value.dataUrl} />
      </div>
      <div className="flex items-center gap-3 p-3 sm:p-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{value.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{value.mimeType} · {formatBytes(value.size)}</p>
        </div>
        <input accept={accept} className="sr-only" onChange={handleFile} ref={inputRef} type="file" />
        <Button aria-label="Заменить изображение" onClick={() => inputRef.current?.click()} size="icon" variant="secondary"><Upload className="size-4" /></Button>
        <Button aria-label="Удалить изображение" onClick={() => onChange(null)} size="icon" variant="danger"><Trash2 className="size-4" /></Button>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}
