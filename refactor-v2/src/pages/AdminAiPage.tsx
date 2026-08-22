import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import { useEffect, useState } from 'react';
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
  saveAiSettings,
  type AiCredential,
  type AiSettings,
} from '../features/ai-generation/ai-settings';
import {
  fetchServerAiSettings,
  resetServerAiSettings,
  saveServerAiSettings,
} from '../features/ai-generation/ai-settings.server';

const PROVIDERS: AiProviderId[] = ['cloudflare', 'aihorde', 'pollinations'];
const MODES: PersonaPhotoGenerationMode[] = ['fast', 'quality', 'experimental'];

type VerifyState = { status: 'idle' | 'busy' | 'ok' | 'error'; message: string };
type PageBusy = 'idle' | 'loading' | 'saving' | 'resetting';

export function AdminAiPage() {
  const [settings, setSettings] = useState<AiSettings>(() => loadAiSettings());
  const [verifyState, setVerifyState] = useState<Record<string, VerifyState>>({});
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<PageBusy>('loading');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setBusy('loading');
    void fetchServerAiSettings()
      .then((serverSettings) => {
        if (cancelled) return;
        const cached = saveAiSettings(serverSettings);
        setSettings(cached);
        setError('');
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(errorMessage(reason));
      })
      .finally(() => {
        if (!cancelled) setBusy('idle');
      });
    return () => { cancelled = true; };
  }, []);

  function patch(next: AiSettings) {
    setSettings(next);
    setMessage('Есть несохраненные изменения.');
  }

  function addCredential(provider: AiProviderId) {
    patch({ ...settings, credentials: [...settings.credentials, createAiCredential(provider)] });
  }

  function patchCredential(id: string, credentialPatch: Partial<AiCredential>) {
    patch({
      ...settings,
      credentials: settings.credentials.map((credential) => credential.id === id
        ? { ...credential, ...credentialPatch }
        : credential),
    });
    setVerifyState((current) => ({ ...current, [id]: { status: 'idle', message: '' } }));
  }

  function removeCredential(id: string) {
    patch({ ...settings, credentials: settings.credentials.filter((credential) => credential.id !== id) });
    setVerifyState((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  async function saveAll() {
    setBusy('saving');
    setError('');
    setMessage('');
    try {
      const saved = await saveServerAiSettings(settings);
      setSettings(saveAiSettings(saved));
      setMessage('AI настройки сохранены на сервере. Ключи будут использоваться автоматически.');
    } catch (reason: unknown) {
      setError(errorMessage(reason));
    } finally {
      setBusy('idle');
    }
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
        [credential.id]: { status: 'error', message: errorMessage(reason) },
      }));
    }
  }

  async function reset() {
    if (!window.confirm('Сбросить серверные AI credentials, model overrides и привязки режимов?')) return;
    setBusy('resetting');
    setError('');
    setMessage('');
    try {
      const next = await resetServerAiSettings();
      setSettings(saveAiSettings(next));
      setVerifyState({});
      setVisibleKeys({});
      setMessage('AI настройки сброшены к базовой конфигурации.');
    } catch (reason: unknown) {
      setError(errorMessage(reason));
    } finally {
      setBusy('idle');
    }
  }

  const pageBusy = busy !== 'idle';

  return (
    <div>
      <PageIntro
        description="Единая серверная конфигурация AI provider layer. Нормализатор Персоны остается общим, а выбранная модель автоматически определяет provider, transport и model-specific prompt adapter."
        eyebrow="Admin"
        title="AI провайдеры и модели"
      />

      <div className="space-y-3 sm:space-y-4">
        <SectionCard
          description="API keys хранятся на сервере InfinityFree и не возвращаются обратно в браузер. После сохранения генератор использует их автоматически."
          title="Серверная AI конфигурация"
        >
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-3 text-xs leading-5 text-emerald-700 dark:text-emerald-300">
            Введите ключ один раз и нажмите «Сохранить на сервере». После этого поле будет пустым с отметкой «ключ сохранен» - это нормально, секрет не раскрывается клиенту.
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button disabled={pageBusy} onClick={() => void saveAll()}>
              {busy === 'saving' ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Сохранить на сервере
            </Button>
            <Button disabled={pageBusy} onClick={() => void reset()} variant="secondary">
              {busy === 'resetting' ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
              Сбросить AI настройки
            </Button>
          </div>
          {busy === 'loading' ? <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-4 animate-spin" />Загрузка серверной конфигурации...</div> : null}
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
                    disabled={pageBusy}
                    onChange={(event) => patch({ ...settings, modeModels: { ...settings.modeModels, [mode]: event.target.value as AiImageModelKey } })}
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
          description="Registry задает provider и adapter. API model ID можно переопределить без изменения кода."
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
                        disabled={pageBusy}
                        onChange={(event) => patch({ ...settings, enabledModels: { ...settings.enabledModels, [key]: event.target.checked } })}
                        type="checkbox"
                      />
                      Включена
                    </label>
                  </div>
                  <label className="mt-3 block">
                    <FieldLabel>API model override</FieldLabel>
                    <input
                      className="focus-ring min-h-11 w-full rounded-xl border border-border bg-background px-3 font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground"
                      disabled={pageBusy}
                      onChange={(event) => patch({ ...settings, modelOverrides: { ...settings.modelOverrides, [key]: event.target.value } })}
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
                  const keyAvailable = credential.apiKey.trim() !== '' || credential.hasApiKey === true;
                  return (
                    <div className="rounded-2xl border border-border bg-input p-3" key={credential.id}>
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                          <input checked={credential.enabled} disabled={pageBusy} onChange={(event) => patchCredential(credential.id, { enabled: event.target.checked })} type="checkbox" />
                          Использовать в fallback pool
                        </label>
                        <button className="focus-ring grid size-9 place-items-center rounded-xl text-danger hover:bg-danger/10" disabled={pageBusy} onClick={() => removeCredential(credential.id)} type="button"><Trash2 className="size-4" /></button>
                      </div>

                      <div className={cn('grid gap-3', provider === 'cloudflare' ? 'lg:grid-cols-2' : '')}>
                        <label className="block">
                          <FieldLabel>Название</FieldLabel>
                          <input className="focus-ring min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none" disabled={pageBusy} onChange={(event) => patchCredential(credential.id, { label: event.target.value })} value={credential.label} />
                        </label>
                        {provider === 'cloudflare' ? (
                          <label className="block">
                            <FieldLabel>Account ID</FieldLabel>
                            <input autoCapitalize="none" className="focus-ring min-h-11 w-full rounded-xl border border-border bg-background px-3 font-mono text-xs text-foreground outline-none" disabled={pageBusy} onChange={(event) => patchCredential(credential.id, { accountId: event.target.value.trim() })} placeholder="32 символа" spellCheck={false} value={credential.accountId} />
                          </label>
                        ) : null}
                      </div>

                      <label className="mt-3 block">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <FieldLabel>{provider === 'cloudflare' ? 'API Token' : 'API key'}</FieldLabel>
                          {credential.hasApiKey && !credential.apiKey ? <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Ключ сохранен на сервере</span> : null}
                        </div>
                        <div className="focus-within:ring-2 focus-within:ring-ring/70 flex min-h-11 items-center rounded-xl border border-border bg-background px-3">
                          <input
                            autoCapitalize="none"
                            autoComplete="off"
                            className="min-w-0 flex-1 bg-transparent font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground"
                            disabled={pageBusy}
                            onChange={(event) => patchCredential(credential.id, {
                              apiKey: event.target.value.trim(),
                              hasApiKey: Boolean(event.target.value.trim()) || credential.hasApiKey === true,
                            })}
                            placeholder={credential.hasApiKey ? 'Оставьте пустым, чтобы сохранить текущий ключ' : provider === 'cloudflare' ? 'cfut_...' : provider === 'pollinations' ? 'sk_...' : 'AI Horde key'}
                            spellCheck={false}
                            type={visible ? 'text' : 'password'}
                            value={credential.apiKey}
                          />
                          <button className="focus-ring ml-2 grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-surface-strong" disabled={pageBusy} onClick={() => setVisibleKeys((current) => ({ ...current, [credential.id]: !visible }))} type="button">
                            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                      </label>

                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Button disabled={!keyAvailable || status.status === 'busy' || pageBusy || (provider === 'cloudflare' && !credential.accountId.trim())} onClick={() => void verify(credential)} size="sm" variant="secondary">
                          {status.status === 'busy' ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                          Проверить credential
                        </Button>
                        {status.message ? <CredentialStatus state={status} /> : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button disabled={pageBusy} onClick={() => addCredential(provider)} variant="secondary"><Plus className="size-4" />Добавить credential</Button>
            </SectionCard>
          );
        })}

        {message ? <div className="flex items-start gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-3 text-xs leading-5 text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="mt-0.5 size-4 shrink-0" />{message}</div> : null}
        {error ? <div className="flex items-start gap-2 rounded-2xl border border-danger/25 bg-danger/8 p-3 text-xs leading-5 text-danger"><TriangleAlert className="mt-0.5 size-4 shrink-0" />{error}</div> : null}
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
  if (provider === 'cloudflare') return 'Пары Account ID + API Token сохраняются на сервере. Порядок карточек является порядком fallback: при ошибке первого credential клиент пробует следующий.';
  if (provider === 'aihorde') return 'AI Horde API key сохраняется на сервере. Для anonymous режима допустим ключ 0000000000, но очередь будет с минимальным приоритетом.';
  return 'Pollinations sk_ key сохраняется на сервере. Генерация идет через image API, секрет не возвращается в браузер.';
}

function detailText(details: Record<string, unknown>): string {
  const entries = Object.entries(details).filter(([, value]) => value !== null && value !== undefined && value !== '');
  if (!entries.length) return '';
  return ` · ${entries.map(([key, value]) => `${key}: ${String(value)}`).join(' · ')}`;
}

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : 'Неизвестная ошибка AI settings.';
}
