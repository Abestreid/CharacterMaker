import {
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  ShieldCheck,
  Sparkles,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import { useState, type ChangeEvent } from 'react';
import { Button, FieldLabel, PageIntro, SectionCard, TextArea, cn } from '../components/ui';
import {
  CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_IMAGE_MODEL,
  generateCloudflareImage,
  prepareCloudflareReference,
  verifyCloudflareToken,
} from '../features/cloudflare-ai/cloudflare-ai.client';

const SIZE_OPTIONS = [
  { id: '768x1024', label: '3:4', width: 768, height: 1024 },
  { id: '1024x1024', label: '1:1', width: 1024, height: 1024 },
  { id: '1024x768', label: '4:3', width: 1024, height: 768 },
] as const;

type PreparedReference = {
  file: File;
  preview: string;
};

const DEFAULT_PROMPT = 'Photorealistic smartphone photograph, natural skin texture, realistic proportions, soft natural daylight, detailed face, high photographic quality.';

export function CloudflareAiPage() {
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<'idle' | 'active' | 'invalid'>('idle');
  const [tokenMessage, setTokenMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [sizeId, setSizeId] = useState<(typeof SIZE_OPTIONS)[number]['id']>('768x1024');
  const [references, setReferences] = useState<PreparedReference[]>([]);
  const [isPreparingReferences, setIsPreparingReferences] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{ src: string; mimeType: string; width: number; height: number } | null>(null);
  const [error, setError] = useState('');

  const selectedSize = SIZE_OPTIONS.find((item) => item.id === sizeId) ?? SIZE_OPTIONS[0];
  const busy = isVerifying || isPreparingReferences || isGenerating;

  async function handleVerify() {
    const normalizedToken = token.trim();
    if (!normalizedToken) {
      setTokenStatus('invalid');
      setTokenMessage('Вставьте Cloudflare API Token.');
      return;
    }
    setIsVerifying(true);
    setError('');
    try {
      const response = await verifyCloudflareToken(normalizedToken);
      setTokenStatus(response.active ? 'active' : 'invalid');
      setTokenMessage(response.active ? 'Токен действителен и активен.' : `Статус токена: ${response.status}.`);
    } catch (caught) {
      setTokenStatus('invalid');
      setTokenMessage(caught instanceof Error ? caught.message : 'Не удалось проверить токен.');
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleReferenceInput(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!selected.length) return;
    const remainingSlots = Math.max(0, 4 - references.length);
    if (remainingSlots === 0) {
      setError('FLUX.2 Klein поддерживает максимум 4 референса.');
      return;
    }

    setIsPreparingReferences(true);
    setError('');
    try {
      const prepared = await Promise.all(selected.slice(0, remainingSlots).map(async (file) => {
        const resized = await prepareCloudflareReference(file);
        return { file: resized, preview: await fileToDataUrl(resized) };
      }));
      setReferences((current) => [...current, ...prepared].slice(0, 4));
      if (selected.length > remainingSlots) setError(`Добавлены первые ${remainingSlots} файла. Максимум - 4 референса.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось подготовить референсы.');
    } finally {
      setIsPreparingReferences(false);
    }
  }

  function removeReference(index: number) {
    setReferences((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function handleGenerate() {
    const normalizedToken = token.trim();
    const normalizedPrompt = prompt.trim();
    if (!normalizedToken) {
      setError('Сначала вставьте Cloudflare API Token.');
      return;
    }
    if (!normalizedPrompt) {
      setError('Введите описание изображения.');
      return;
    }

    setIsGenerating(true);
    setError('');
    setResult(null);
    try {
      const response = await generateCloudflareImage({
        token: normalizedToken,
        prompt: normalizedPrompt,
        width: selectedSize.width,
        height: selectedSize.height,
        references: references.map((item) => item.file),
      });
      setResult({
        src: `data:${response.mimeType};base64,${response.imageBase64}`,
        mimeType: response.mimeType,
        width: response.width,
        height: response.height,
      });
      setTokenStatus('active');
      setTokenMessage('Workers AI доступен. Последний запрос выполнен успешно.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Ошибка генерации изображения.');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div>
      <PageIntro
        description="Изолированный модуль для прямой проверки и генерации фотографий через Cloudflare Workers AI. Он не меняет Персону, Образ, Сцену или существующие пресеты."
        eyebrow="Генератор"
        title="Cloudflare AI"
      />

      <div className="space-y-3 sm:space-y-4">
        <SectionCard
          description="Токен хранится только в состоянии этой вкладки браузера. Он не записывается в Supabase, localStorage или GitHub."
          title="Подключение Workers AI"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <InfoCell label="Account ID" value={CLOUDFLARE_ACCOUNT_ID} />
            <InfoCell label="Модель" value={CLOUDFLARE_IMAGE_MODEL} />
          </div>

          <label className="block">
            <FieldLabel>Cloudflare API Token</FieldLabel>
            <div className="focus-within:ring-2 focus-within:ring-ring/70 flex min-h-12 items-center rounded-2xl border border-border bg-input px-3">
              <input
                autoCapitalize="none"
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground sm:text-sm"
                onChange={(event) => {
                  setToken(event.target.value);
                  setTokenStatus('idle');
                  setTokenMessage('');
                }}
                placeholder="cfut_..."
                spellCheck={false}
                type={showToken ? 'text' : 'password'}
                value={token}
              />
              <button
                aria-label={showToken ? 'Скрыть токен' : 'Показать токен'}
                className="focus-ring ml-2 grid size-9 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-surface-strong hover:text-foreground"
                onClick={() => setShowToken((value) => !value)}
                type="button"
              >
                {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </label>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button disabled={isVerifying || !token.trim()} onClick={handleVerify} variant="secondary">
              {isVerifying ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
              Проверить токен
            </Button>
            {tokenMessage ? <StatusMessage status={tokenStatus} text={tokenMessage} /> : null}
          </div>
        </SectionCard>

        <SectionCard
          description="Без референсов работает как text-to-image. С референсами FLUX может сохранить человека, стиль или композицию по указаниям в prompt."
          title="Параметры генерации"
        >
          <TextArea
            label="Prompt"
            onChange={setPrompt}
            placeholder="Опишите фотографию..."
            value={prompt}
          />

          <div>
            <FieldLabel>Размер / соотношение сторон</FieldLabel>
            <div className="grid grid-cols-3 gap-2">
              {SIZE_OPTIONS.map((size) => {
                const active = size.id === sizeId;
                return (
                  <button
                    aria-pressed={active}
                    className={cn(
                      'focus-ring min-h-14 rounded-2xl border px-2 py-2 text-center transition',
                      active ? 'border-primary/55 bg-primary-soft text-primary-strong' : 'border-border bg-input text-muted-foreground hover:bg-surface-strong hover:text-foreground',
                    )}
                    key={size.id}
                    onClick={() => setSizeId(size.id)}
                    type="button"
                  >
                    <span className="block text-sm font-semibold">{size.label}</span>
                    <span className="mt-0.5 block text-[10px] tabular-nums">{size.width}x{size.height}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          description="До 4 изображений. Большие фотографии автоматически уменьшаются до допустимого размера перед отправкой Cloudflare."
          title={`Референсы ${references.length}/4`}
        >
          {references.length ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {references.map((reference, index) => (
                <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-surface" key={`${reference.file.name}-${index}`}>
                  <img alt={`Референс ${index + 1}`} className="size-full object-cover" src={reference.preview} />
                  <div className="absolute left-2 top-2 rounded-full bg-background/85 px-2 py-1 text-[10px] font-semibold text-foreground backdrop-blur">image {index}</div>
                  <button
                    aria-label={`Удалить референс ${index + 1}`}
                    className="focus-ring absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-background/85 text-foreground backdrop-blur hover:bg-background"
                    onClick={() => removeReference(index)}
                    type="button"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-input/40 p-4 text-center text-xs leading-5 text-muted-foreground">
              Референсы необязательны. Для проверки API можно сначала сгенерировать изображение только по prompt.
            </div>
          )}

          <label className={cn('focus-ring flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-border bg-input px-4 text-sm font-semibold text-foreground transition hover:bg-surface-strong', (references.length >= 4 || isPreparingReferences) && 'pointer-events-none opacity-45')}>
            {isPreparingReferences ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
            {isPreparingReferences ? 'Подготовка фото...' : 'Добавить фотографии'}
            <input accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={references.length >= 4 || isPreparingReferences} multiple onChange={handleReferenceInput} type="file" />
          </label>
        </SectionCard>

        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-danger/25 bg-danger/8 p-3 text-sm text-danger">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0 break-words">{error}</span>
          </div>
        ) : null}

        <Button className="w-full" disabled={busy || !token.trim() || !prompt.trim()} onClick={handleGenerate} size="lg">
          {isGenerating ? <Loader2 className="size-5 animate-spin" /> : <Sparkles className="size-5" />}
          {isGenerating ? 'Cloudflare генерирует...' : 'Сгенерировать фото'}
        </Button>

        {result ? (
          <SectionCard description={`${result.width}x${result.height} · ${result.mimeType} · ${CLOUDFLARE_IMAGE_MODEL}`} title="Результат">
            <div className="overflow-hidden rounded-2xl border border-border bg-surface">
              <img alt="Результат Cloudflare Workers AI" className="h-auto w-full object-contain" src={result.src} />
            </div>
            <a className="focus-ring inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground transition hover:bg-surface-strong" download="charmaker-cloudflare-flux.png" href={result.src}>
              <Download className="size-4" />Скачать изображение
            </a>
          </SectionCard>
        ) : null}
      </div>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-input p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div className="mt-1 break-all font-mono text-xs text-foreground">{value}</div>
    </div>
  );
}

function StatusMessage({ status, text }: { status: 'idle' | 'active' | 'invalid'; text: string }) {
  const active = status === 'active';
  return (
    <div className={cn('flex min-w-0 items-start gap-2 text-xs leading-5', active ? 'text-emerald-600 dark:text-emerald-400' : 'text-danger')}>
      {active ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <TriangleAlert className="mt-0.5 size-4 shrink-0" />}
      <span className="break-words">{text}</span>
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Не удалось прочитать изображение.'));
    reader.onerror = () => reject(new Error('Не удалось прочитать изображение.'));
    reader.readAsDataURL(file);
  });
}
