import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import { useState } from 'react';
import { Button, FieldLabel, PageIntro, SectionCard, cn } from '../components/ui';
import { verifyAiCredential } from '../features/ai-generation/ai-image.client';
import {
  AI_IMAGE_MODELS,
  AI_IMAGE_MODEL_KEYS,
  AI_PROVIDER_LABELS,
  GENERATION_MODE_META,
  type AiImageModelKey,
  type AiProviderId,
  type PersonaPhotoGenerationMode,
} from '../features/ai-generation/ai-registry';
import {
  createAiCredential,
  loadAiSettings,
  resetAiSettings,
  saveAiSettings,
  type AiCredential,
  type AiSettings,
} from '../features/ai-generation/ai-settings';

const PROVIDERS: AiProviderId[] = ['cloudflare', 'aihorde', 'pollinations'];
const MODES: PersonaPhotoGenerationMode[] = ['fast', 'quality', 'experimental'];

type VerifyState = { status: 'idle' | 'busy' | 'ok' | 'error'; message: string };

export function AdminAiPage() {
  const [settings, setSettings] = useState<AiSettings>(() => loadAiSettings());
  const [verifyState, setVerifyState] = useState<Record<string, VerifyState>>({});
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});

  function persist(next: AiSettings) {
    setSettings(saveAiSettings(next));
  }

  function addCredential(provider: AiProviderId) {
    persist({ ...settings, credentials: [...settings.credentials, createAiCredential(provider)] });
  }

  function patchCredential(id: string, patch: Partial<AiCredential>) {
    persist({
      ...settings,
      credentials: settings.credentials.map((credential) => credential.id === id ? { ...credential, ...patch } : credential),
    });
    setVerifyState((current) => ({ ...current, [id]: { status: 'idle', message: '' } }));
  }

  function removeCredential(id: string) {
    persist({ ...settings, credentials: settings.credentials.filter((credential) => credential.id !== id) });
    setVerifyState((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  async function verify(credential: AiCredential) {
    setVerifyState((current) => ({ ...current, [credential.id]: { status: 'busy', message: 'Проверка...' } }));
    try {
      const result = await verifyAiCredential(credential);
      const details = result.details ? detailText(result.details) : '';
      setVerifyState((current) => ({
        ...current,
        [credential.id]: { status: result.ok ? 'ok' : 'error', message: `${result.message}${details}` },
      }));
    } catch (reason: unknown) {
      setVerifyState((current) => ({
        ...current,
        [credential.id]: { status: 'error', message: reason instanceof Error ? reason.message : 'Ошибка проверки.' },
      }));
    }
  }

  function reset() {
    if (!window.confirm('Сбросить все локальные AI credentials, model overrides и привязки режимов?')) return;
    setSettings(resetAiSettings());
    setVerifyState({});
    setVisibleKeys({});
  }

  return (
    <div>
      <PageIntro
        description="Единая конфигурация AI provider layer. Нормализатор Персоны остается общим, а выбранная модель автоматически определяет provider, transport и model-specific prompt adapter."
        eyebrow="Admin"
        title="AI провайдеры и модели"
      />

      <div className="space-y-3 sm:space-y-4">
        <SectionCard
          description="Настройки и ключи сохраняются только в localStorage этого браузера. Они не записываются в GitHub или Supabase. Для публичного production позже нужен серверный secrets store и авторизация admin."
          title="Безопасность конфигурации"
        >
          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/8 p-3 text-xs leading-5 text-amber-700 dark:text-amber-300">
            Не добавляйте реальные API keys в исходники. Эта страница предназначена для DEV и локального управления credentials. Cloudflare credential всегда хранится как пара Account ID + Token.
          </div>
          <Button onClick={reset} variant="secondary"><RotateCcw className="size-4" />Сбросить AI настройки</Button>
        </SectionCard>

        <SectionCard
          description="Это логические режимы интерфейса. Каждый режим указывает на model config, а model config уже выбирает provider и adapter."
          title="Режимы генерации"
        >
          <div className="grid gap-3 lg:grid-cols-3">
            {MODES.map((mode) => {
              const meta = GENERATION_MODE_META[mode];
              return (
                <label className="block rounded-2xl border border-border bg-input p-3" key={mode}>
                  <div className="text-sm font-semibold text-foreground">{meta.label}</div>
                  <div className="mb-2 text-[11px] text-muted-foreground">{meta.shortDescription}</div>
                  <select
                    className="focus-ring min-h-11 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground outline-none"
                    onChange={(event) => persist({ ...settings, modeModels: { ...settings.modeModels, [mode]: event.target.value as AiImageModelKey } })}
                    value={settings.modeModels[mode]}
                  >
                    {AI_IMAGE_MODEL_KEYS.map((key) => <option key={key} value={key}>{AI_IMAGE_MODELS[key].label}</option>)}
                  </select>
                </label>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard
          description="Registry задает provider и adapter. API model ID можно переопределить без изменения кода, если провайдер переименовал модель или для AI Horde нужно указать конкретную активную модель."
          title="Model registry"
        >
          <div className="space-y-2">
            {AI_IMAGE_MODEL_KEYS.map((key) => {
              const model = AI_IMAGE_MODELS[key];
              const override = settings.modelOverrides[key] ?? '';
              return (
                <div className="rounded-2xl border border-border bg-input p-3" key={key}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">{model.label}</div>
                      <div className="mt-1 text-[11px] leading-5 text-muted-foreground">{model.description}</div>
                      <div className="mt-1 font-mono text-[10px] text-subtle-foreground">provider={model.provider} · adapter={model.adapter} · refs={model.maxReferences}</div>
                    </div>
                    <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                      <input
                        checked={settings.enabledModels[key]}
                        onChange={(event) => persist({ ...settings, enabledModels: { ...settings.enabledModels, [key]: event.target.checked } })}
                        type="checkbox"
                      />
                      Включена
                    </label>
                  </div>
                  <label className="mt-3 block">
                    <FieldLabel>API model override</FieldLabel>
                    <input
                      className="focus-ring min-h-11 w-full rounded-xl border border-border bg-background px-3 font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground"
                      onChange={(event) => persist({ ...settings, modelOverrides: { ...settings.modelOverrides, [key]: event.target.value } })}
                      placeholder={model.apiModel || 'Пусто = provider auto model'}
                      value={override}
                    />
                  </label>
                </div>
              );
            })}
          </div>
        </SectionCard>

        {PROVIDERS.map((provider) => {
          const credentials = settings.credentials.filter((credential) => credential.provider === provider);
          return (
            <SectionCard
              description={providerDescription(provider)}
              key={provider}
              title={`${AI_PROVIDER_LABELS[provider]} · credentials ${credentials.length}`}
            >
              <div className="space-y-2">
                {credentials.map((credential) => {
                  const status = verifyState[credential.id] ?? { status: 'idle', message: '' };
                  const visible = Boolean(visibleKeys[credential.id]);
                  return (
                    <div className="rounded-2xl border border-border bg-input p-3" key={credential.id}>
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                          <input checked={credential.enabled} onChange={(event) => patchCredential(credential.id, { enabled: event.target.checked })} type="checkbox" />
                          Использовать в fallback pool
                        </label>
                        <button className="focus-ring grid size-9 place-items-center rounded-xl text-danger hover:bg-danger/10" onClick={() => removeCredential(credential.id)} type="button"><Trash2 className="size-4" /></button>
                      </div>

                      <div className={cn('grid gap-3', provider === 'cloudflare' ? 'lg:grid-cols-2' : '')}>
                        <label className="block">
                          <FieldLabel>Название</FieldLabel>
                          <input className="focus-ring min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none" onChange={(event) => patchCredential(credential.id, { label: event.target.value })} value={credential.label} />
                        </label>
                        {provider === 'cloudflare' ? (
                          <label className="block">
                            <FieldLabel>Account ID</FieldLabel>
                            <input autoCapitalize="none" className="focus-ring min-h-11 w-full rounded-xl border border-border bg-background px-3 font-mono text-xs text-foreground outline-none" onChange={(event) => patchCredential(credential.id, { accountId: event.target.value.trim() })} placeholder="32 символа" spellCheck={false} value={credential.accountId} />
                          </label>
                        ) : null}
                      </div>

                      <label className="mt-3 block">
                        <FieldLabel>{provider === 'cloudflare' ? 'API Token' : 'API key'}</FieldLabel>
                        <div className="focus-within:ring-2 focus-within:ring-ring/70 flex min-h-11 items-center rounded-xl border border-border bg-background px-3">
                          <input
                            autoCapitalize="none"
                            autoComplete="off"
                            className="min-w-0 flex-1 bg-transparent font-mono text-xs text-foreground outline-none"
                            onChange={(event) => patchCredential(credential.id, { apiKey: event.target.value.trim() })}
                            placeholder={provider === 'cloudflare' ? 'cfut_...' : provider === 'pollinations' ? 'sk_...' : 'AI Horde key'}
                            spellCheck={false}
                            type={visible ? 'text' : 'password'}
                            value={credential.apiKey}
                          />
                          <button className="focus-ring ml-2 grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-surface-strong" onClick={() => setVisibleKeys((current) => ({ ...current, [credential.id]: !visible }))} type="button">
                            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                      </label>

                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Button disabled={!credential.apiKey.trim() || status.status === 'busy' || (provider === 'cloudflare' && !credential.accountId.trim())} onClick={() => void verify(credential)} size="sm" variant="secondary">
                          {status.status === 'busy' ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                          Проверить пару
                        </Button>
                        {status.message ? <CredentialStatus state={status} /> : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button onClick={() => addCredential(provider)} variant="secondary"><Plus className="size-4" />Добавить credential</Button>
            </SectionCard>
          );
        })}
      </div>
    </div>
  );
}

function CredentialStatus({ state }: { state: VerifyState }) {
  const ok = state.status === 'ok';
  const busy = state.status === 'busy';
  return (
    <div className={cn('flex min-w-0 items-start gap-2 text-xs leading-5', ok ? 'text-emerald-600 dark:text-emerald-400' : busy ? 'text-muted-foreground' : 'text-danger')}>
      {ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : busy ? <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" /> : <TriangleAlert className="mt-0.5 size-4 shrink-0" />}
      <span className="break-words">{state.message}</span>
    </div>
  );
}

function providerDescription(provider: AiProviderId): string {
  if (provider === 'cloudflare') return 'Добавляйте пары Account ID + API Token. Порядок карточек является порядком перебора: при ошибке первого credential клиент пробует следующий.';
  if (provider === 'aihorde') return 'AI Horde использует API key. Для anonymous режима допустим ключ 0000000000, но очередь будет с минимальным приоритетом.';
  return 'Pollinations использует server-side sk_ API key. Проверка читает account balance, генерация идет через OpenAI-compatible image endpoint.';
}

function detailText(details: Record<string, unknown>): string {
  const entries = Object.entries(details).filter(([, value]) => value !== null && value !== undefined && value !== '');
  if (!entries.length) return '';
  return ` · ${entries.map(([key, value]) => `${key}: ${String(value)}`).join(' · ')}`;
}
