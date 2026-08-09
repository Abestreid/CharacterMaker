import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Loader2,
  Save,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, FieldLabel, SectionCard, cn } from '../../components/ui';
import { characterMakerService } from '../../core/character-maker.service';
import type { PresetAsset } from '../../infrastructure/supabase/preset-assets.repository';
import { useEditorStore } from '../../store/editor-store';
import {
  generateCloudflareImage,
  getRememberedCloudflareToken,
  prepareCloudflareReference,
  rememberCloudflareToken,
  verifyCloudflareToken,
} from '../cloudflare-ai/cloudflare-ai.client';
import {
  CHARACTER_PHOTO_STEPS,
  buildCharacterPhotoPrompt,
  type CharacterPhotoRole,
} from './persona-photo-generator.prompt';

type GeneratedPhoto = {
  role: CharacterPhotoRole;
  src: string;
  file: File;
  width: number;
  height: number;
  mimeType: string;
};

export function PersonaPhotoGenerator() {
  const character = useEditorStore((state) => state.character);
  const activeCharacterId = useEditorStore((state) => state.activeCharacterId);
  const [assets, setAssets] = useState<PresetAsset[]>([]);
  const [personaName, setPersonaName] = useState('Персона');
  const [selectedRole, setSelectedRole] = useState<CharacterPhotoRole>('face_closeup');
  const [token, setToken] = useState(() => getRememberedCloudflareToken());
  const [tokenStatus, setTokenStatus] = useState<'idle' | 'active' | 'invalid'>('idle');
  const [result, setResult] = useState<GeneratedPhoto | null>(null);
  const [busy, setBusy] = useState<'idle' | 'loading' | 'verifying' | 'generating' | 'saving'>('idle');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!activeCharacterId) {
      setAssets([]);
      setPersonaName('Персона');
      return;
    }
    const [nextAssets, characters] = await Promise.all([
      characterMakerService.presets.assets('character', activeCharacterId),
      characterMakerService.characters.list(),
    ]);
    setAssets(nextAssets);
    setPersonaName(characters.find((item) => item.id === activeCharacterId)?.name ?? 'Персона');
  }, [activeCharacterId]);

  useEffect(() => {
    setResult(null);
    setSelectedRole('face_closeup');
    if (!activeCharacterId) return;
    setBusy('loading');
    setError('');
    void refresh()
      .catch((reason: unknown) => setError(errorMessage(reason)))
      .finally(() => setBusy('idle'));
  }, [activeCharacterId, refresh]);

  const selectedStep = CHARACTER_PHOTO_STEPS.find((step) => step.role === selectedRole) ?? CHARACTER_PHOTO_STEPS[0];
  const selectedIndex = CHARACTER_PHOTO_STEPS.findIndex((step) => step.role === selectedRole);
  const referenceAssets = useMemo(() => selectReferenceAssets(assets, selectedRole), [assets, selectedRole]);
  const prompt = useMemo(() => buildCharacterPhotoPrompt({
    character,
    role: selectedRole,
    personaName,
    referenceRoles: referenceAssets.map((asset) => asset.role),
  }), [character, personaName, referenceAssets, selectedRole]);
  const currentAsset = useMemo(() => bestAssetForRole(assets, selectedRole), [assets, selectedRole]);
  const selectedUnlocked = isStepUnlocked(selectedRole, assets);
  const anyBusy = busy !== 'idle';

  async function handleVerifyToken() {
    const cleanToken = token.trim();
    if (!cleanToken) {
      setTokenStatus('invalid');
      setError('Вставьте Cloudflare API Token.');
      return;
    }
    setBusy('verifying');
    setError('');
    setMessage('');
    try {
      const response = await verifyCloudflareToken(cleanToken);
      setTokenStatus(response.active ? 'active' : 'invalid');
      setMessage(response.active ? 'Workers AI доступен.' : `Статус токена: ${response.status}.`);
    } catch (reason: unknown) {
      setTokenStatus('invalid');
      setError(errorMessage(reason));
    } finally {
      setBusy('idle');
    }
  }

  async function handleGenerate() {
    if (!activeCharacterId) {
      setError('Сначала сохраните или загрузите Персону как пресет. Канонические фото должны иметь character_id в Supabase.');
      return;
    }
    const cleanToken = token.trim();
    if (!cleanToken) {
      setError('Вставьте Cloudflare API Token.');
      return;
    }
    if (!selectedUnlocked && !currentAsset) {
      setError('Сначала завершите предыдущие канонические кадры. Генератор намеренно работает по очереди.');
      return;
    }

    setBusy('generating');
    setError('');
    setMessage('');
    setResult(null);
    rememberCloudflareToken(cleanToken);
    try {
      const references = await Promise.all(referenceAssets.map(assetToCloudflareFile));
      const response = await generateCloudflareImage({
        token: cleanToken,
        prompt,
        width: selectedStep.width,
        height: selectedStep.height,
        references,
      });
      const file = base64ToFile(
        response.imageBase64,
        response.mimeType,
        `${slugFileName(personaName)}-${selectedRole}-${Date.now()}.${extensionForMime(response.mimeType)}`,
      );
      setResult({
        role: selectedRole,
        src: `data:${response.mimeType};base64,${response.imageBase64}`,
        file,
        width: response.width,
        height: response.height,
        mimeType: response.mimeType,
      });
      setTokenStatus('active');
      setMessage('Кадр сгенерирован. Проверьте его и сохраните как канонический или перегенерируйте.');
    } catch (reason: unknown) {
      setError(errorMessage(reason));
    } finally {
      setBusy('idle');
    }
  }

  async function handleSaveCanonical() {
    if (!activeCharacterId || !result || result.role !== selectedRole) return;
    const existing = assets.filter((asset) => asset.role === selectedRole && asset.referenceStatus !== 'rejected');
    if (existing.length > 0 && !window.confirm(`В слоте «${selectedStep.label}» уже есть фото. Заменить его новым каноническим кадром?`)) return;

    setBusy('saving');
    setError('');
    setMessage('');
    try {
      const newAssetId = await characterMakerService.assets.upload({
        file: result.file,
        kind: 'character',
        ownerId: activeCharacterId,
        role: selectedRole,
        isPrimary: selectedRole === 'face_closeup' || selectedRole === 'full_front',
        referenceStatus: 'canonical',
      });

      const afterUpload = await characterMakerService.presets.assets('character', activeCharacterId);
      const obsolete = afterUpload.filter((asset) => asset.role === selectedRole && asset.id !== newAssetId);
      const cleanup = await Promise.allSettled(obsolete.map((asset) => characterMakerService.assets.remove(asset)));
      const cleanupFailures = cleanup.filter((item) => item.status === 'rejected').length;

      await refresh();
      setResult(null);
      const next = CHARACTER_PHOTO_STEPS[selectedIndex + 1];
      if (next) setSelectedRole(next.role);
      setMessage(cleanupFailures
        ? 'Новый канон сохранен. Часть старых файлов не удалось удалить автоматически - проверьте слот в менеджере пресета.'
        : next
          ? `Канон сохранен. Переходим к следующему шагу: ${next.label}.`
          : 'Пятый канонический кадр сохранен. Базовый комплект Персоны завершен.');
    } catch (reason: unknown) {
      setError(errorMessage(reason));
    } finally {
      setBusy('idle');
    }
  }

  function changeStep(role: CharacterPhotoRole) {
    if (!isStepUnlocked(role, assets) && !bestAssetForRole(assets, role)) return;
    setSelectedRole(role);
    setResult(null);
    setError('');
    setMessage('');
  }

  if (!activeCharacterId) {
    return (
      <SectionCard
        description="Фото являются assets сохраненной Персоны и должны иметь постоянный character_id. Это предотвращает сиротские файлы и дубли в Supabase."
        title="Канонические фото"
      >
        <div className="rounded-2xl border border-dashed border-border bg-input/40 p-5 text-sm leading-6 text-muted-foreground">
          Сначала сохраните текущие параметры через верхнюю панель «Сохранить как пресет» или загрузите существующую Персону. После этого здесь появится пошаговая генерация пяти канонических фотографий.
        </div>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <SectionCard
        description="Пять кадров создаются последовательно. Каждый сохраненный канон становится референсом для следующих шагов, поэтому лицо и пропорции стабилизируются по мере прохождения мастера."
        title={`Канонические фото · ${personaName}`}
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {CHARACTER_PHOTO_STEPS.map((step, index) => {
            const saved = bestAssetForRole(assets, step.role);
            const unlocked = isStepUnlocked(step.role, assets) || Boolean(saved);
            const active = step.role === selectedRole;
            return (
              <button
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'focus-ring min-h-20 rounded-2xl border p-2.5 text-left transition',
                  active ? 'border-primary/55 bg-primary-soft' : 'border-border bg-input hover:bg-surface-strong',
                  !unlocked && 'cursor-not-allowed opacity-45',
                )}
                disabled={!unlocked}
                key={step.role}
                onClick={() => changeStep(step.role)}
                type="button"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Шаг {index + 1}</span>
                  {saved ? <CheckCircle2 className="size-4 text-emerald-500" /> : unlocked ? <span className="size-2 rounded-full bg-primary" /> : <span className="size-2 rounded-full bg-border" />}
                </div>
                <div className="mt-2 text-xs font-semibold leading-4 text-foreground">{step.shortLabel}</div>
                <div className="mt-1 text-[10px] text-muted-foreground">{saved?.referenceStatus === 'canonical' ? 'Канон сохранен' : saved ? 'Фото есть' : unlocked ? 'Готов' : 'Заблокирован'}</div>
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        description="Токен не записывается в Supabase, GitHub или persistent store. Он нужен только браузеру для текущей сессии Workers AI."
        title="Cloudflare Workers AI"
      >
        <label className="block">
          <FieldLabel>API Token</FieldLabel>
          <input
            autoCapitalize="none"
            autoComplete="off"
            className="focus-ring min-h-12 w-full rounded-2xl border border-border bg-input px-3 font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground"
            onChange={(event) => {
              const value = event.target.value;
              setToken(value);
              rememberCloudflareToken(value);
              setTokenStatus('idle');
            }}
            placeholder="cfut_..."
            spellCheck={false}
            type="password"
            value={token}
          />
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button disabled={anyBusy || !token.trim()} onClick={() => void handleVerifyToken()} variant="secondary">
            {busy === 'verifying' ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            Проверить токен
          </Button>
          {tokenStatus === 'active' ? <span className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400"><Check className="size-4" />Токен активен</span> : null}
        </div>
      </SectionCard>

      <SectionCard description={selectedStep.description} title={`${selectedIndex + 1}. ${selectedStep.label}`}>
        <div className="grid gap-2 sm:grid-cols-3">
          <InfoCell label="Контекст" value={selectedStep.contextLabel} />
          <InfoCell label="Референсы" value={referenceAssets.length ? referenceAssets.map((asset) => asset.role).join(', ') : 'Нет - стартовый кадр'} />
          <InfoCell label="Формат" value={`${selectedStep.width}x${selectedStep.height}`} />
        </div>

        {selectedRole !== 'face_closeup' ? (
          <div className="rounded-2xl border border-border bg-input/50 p-3 text-xs leading-5 text-muted-foreground">
            Базовая одежда мастера: непрозрачный бежевый спортивный короткий топ и короткие облегающие шорты, без логотипов, аксессуаров и верхней одежды. Комплект используется только для чтения фигуры и не меняет сохраненный Образ.
          </div>
        ) : null}

        {!selectedUnlocked && !currentAsset ? (
          <div className="flex items-start gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/8 p-3 text-xs leading-5 text-amber-700 dark:text-amber-300">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            Сначала сохраните все предыдущие шаги. Следующий кадр использует их как визуальные референсы.
          </div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          {result && result.role === selectedRole ? (
            <img alt={`Новый кадр: ${selectedStep.label}`} className="max-h-[72dvh] w-full object-contain" src={result.src} />
          ) : currentAsset?.publicUrl ? (
            <img alt={`Сохраненный кадр: ${selectedStep.label}`} className="max-h-[72dvh] w-full object-contain" src={currentAsset.publicUrl} />
          ) : (
            <div className="grid min-h-56 place-items-center p-5 text-center text-xs leading-5 text-muted-foreground">
              <div><ImagePlus className="mx-auto mb-2 size-7" />В этом слоте пока нет канонического изображения.</div>
            </div>
          )}
        </div>

        {result && result.role === selectedRole ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <Button disabled={anyBusy} onClick={() => void handleGenerate()} variant="secondary">
              {busy === 'generating' ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Перегенерировать
            </Button>
            <Button disabled={anyBusy} onClick={() => void handleSaveCanonical()}>
              {busy === 'saving' ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Сохранить как канон
            </Button>
          </div>
        ) : (
          <Button className="w-full" disabled={anyBusy || !token.trim() || (!selectedUnlocked && !currentAsset)} onClick={() => void handleGenerate()} size="lg">
            {busy === 'generating' ? <Loader2 className="size-5 animate-spin" /> : <Sparkles className="size-5" />}
            {currentAsset ? 'Сгенерировать новый вариант' : 'Сгенерировать этот кадр'}
          </Button>
        )}

        <div className="flex items-center justify-between gap-2">
          <Button disabled={selectedIndex <= 0 || anyBusy} onClick={() => {
            const previous = CHARACTER_PHOTO_STEPS[selectedIndex - 1];
            if (previous) changeStep(previous.role);
          }} size="sm" variant="ghost">
            <ChevronLeft className="size-4" />Назад
          </Button>
          <Button disabled={selectedIndex >= CHARACTER_PHOTO_STEPS.length - 1 || anyBusy || !isStepUnlocked(CHARACTER_PHOTO_STEPS[selectedIndex + 1]?.role ?? selectedRole, assets)} onClick={() => {
            const next = CHARACTER_PHOTO_STEPS[selectedIndex + 1];
            if (next) changeStep(next.role);
          }} size="sm" variant="ghost">
            Дальше<ChevronRight className="size-4" />
          </Button>
        </div>

        <details className="rounded-2xl border border-border bg-input/40 p-3">
          <summary className="cursor-pointer text-xs font-semibold text-foreground">Показать фактический prompt</summary>
          <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words text-[10px] leading-5 text-muted-foreground">{prompt}</pre>
        </details>
      </SectionCard>

      {message ? <div className="flex items-start gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-3 text-xs leading-5 text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="mt-0.5 size-4 shrink-0" />{message}</div> : null}
      {error ? <div className="flex items-start gap-2 rounded-2xl border border-danger/25 bg-danger/8 p-3 text-xs leading-5 text-danger"><TriangleAlert className="mt-0.5 size-4 shrink-0" />{error}</div> : null}
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-input p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div className="mt-1 break-words text-xs font-medium leading-5 text-foreground">{value}</div>
    </div>
  );
}

function isStepUnlocked(role: CharacterPhotoRole, assets: readonly PresetAsset[]): boolean {
  const index = CHARACTER_PHOTO_STEPS.findIndex((step) => step.role === role);
  if (index <= 0) return true;
  return CHARACTER_PHOTO_STEPS.slice(0, index).every((step) => Boolean(bestAssetForRole(assets, step.role)));
}

function bestAssetForRole(assets: readonly PresetAsset[], role: CharacterPhotoRole): PresetAsset | null {
  return [...assets]
    .filter((asset) => asset.role === role && asset.referenceStatus !== 'rejected')
    .sort((a, b) => assetRank(b) - assetRank(a))[0] ?? null;
}

function selectReferenceAssets(assets: readonly PresetAsset[], targetRole: CharacterPhotoRole): PresetAsset[] {
  const rolePriority: Record<CharacterPhotoRole, readonly string[]> = {
    face_closeup: ['face_closeup', 'portrait', 'profile_left', 'profile_right', 'reference', 'full_front'],
    portrait: ['face_closeup', 'portrait', 'reference', 'full_front'],
    full_front: ['face_closeup', 'portrait', 'full_front', 'reference', 'profile_left', 'profile_right'],
    full_back: ['full_front', 'face_closeup', 'portrait', 'reference', 'full_back'],
    profile_left: ['face_closeup', 'full_front', 'portrait', 'profile_left', 'reference'],
  };
  const priorities = rolePriority[targetRole];
  return [...assets]
    .filter((asset) => asset.referenceStatus !== 'rejected' && Boolean(asset.publicUrl) && priorities.includes(asset.role))
    .sort((a, b) => {
      const roleDelta = priorities.indexOf(a.role) - priorities.indexOf(b.role);
      if (roleDelta !== 0) return roleDelta;
      return assetRank(b) - assetRank(a);
    })
    .filter((asset, index, rows) => rows.findIndex((candidate) => candidate.id === asset.id) === index)
    .slice(0, 4);
}

function assetRank(asset: PresetAsset): number {
  const status = asset.referenceStatus === 'canonical' ? 4000
    : asset.referenceStatus === 'approved' ? 3000
      : asset.referenceStatus === 'reference_only' ? 2000
        : 1000;
  return status + (asset.isPrimary ? 100 : 0) - asset.sortOrder;
}

async function assetToCloudflareFile(asset: PresetAsset): Promise<File> {
  if (!asset.publicUrl) throw new Error(`У референса ${asset.role} нет публичного URL.`);
  const response = await fetch(asset.publicUrl, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Не удалось загрузить референс ${asset.role}: HTTP ${response.status}.`);
  const blob = await response.blob();
  const type = asset.mimeType || blob.type || 'image/jpeg';
  const file = new File([blob], asset.fileName || `${asset.role}.${extensionForMime(type)}`, { type, lastModified: Date.now() });
  return prepareCloudflareReference(file);
}

function base64ToFile(base64: string, mimeType: string, fileName: string): File {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new File([bytes], fileName, { type: mimeType, lastModified: Date.now() });
}

function extensionForMime(mimeType: string): string {
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  if (mimeType.includes('webp')) return 'webp';
  return 'png';
}

function slugFileName(value: string): string {
  return value.toLocaleLowerCase('ru').replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-+|-+$/g, '') || 'persona';
}

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : 'Неизвестная ошибка генератора.';
}
