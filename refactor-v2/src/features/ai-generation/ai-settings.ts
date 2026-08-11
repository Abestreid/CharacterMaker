import {
  AI_IMAGE_MODEL_KEYS,
  DEFAULT_MODE_MODELS,
  type AiImageModelKey,
  type AiProviderId,
  type PersonaPhotoGenerationMode,
} from './ai-registry';

export type AiCredential = {
  id: string;
  provider: AiProviderId;
  label: string;
  enabled: boolean;
  apiKey: string;
  hasApiKey?: boolean;
  accountId: string;
};

export type AiSettings = {
  version: 1;
  credentials: AiCredential[];
  modeModels: Record<PersonaPhotoGenerationMode, AiImageModelKey>;
  enabledModels: Record<AiImageModelKey, boolean>;
  modelOverrides: Partial<Record<AiImageModelKey, string>>;
};

const STORAGE_KEY = 'charmaker.ai.settings.v1';

export const DEFAULT_AI_SETTINGS: AiSettings = {
  version: 1,
  credentials: [],
  modeModels: { ...DEFAULT_MODE_MODELS },
  enabledModels: Object.fromEntries(AI_IMAGE_MODEL_KEYS.map((key) => [key, true])) as Record<AiImageModelKey, boolean>,
  modelOverrides: {},
};

export function createAiCredential(provider: AiProviderId): AiCredential {
  return {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${provider}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    provider,
    label: provider === 'cloudflare' ? 'Cloudflare account' : provider === 'aihorde' ? 'AI Horde key' : 'Pollinations key',
    enabled: true,
    apiKey: '',
    hasApiKey: false,
    accountId: '',
  };
}

export function loadAiSettings(): AiSettings {
  if (typeof window === 'undefined') return cloneDefaults();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneDefaults();
    return normalizeSettings(JSON.parse(raw) as Partial<AiSettings>);
  } catch {
    return cloneDefaults();
  }
}

export function saveAiSettings(settings: AiSettings): AiSettings {
  const normalized = normalizeSettings(settings);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent('charactermaker:ai-settings-changed'));
  }
  return normalized;
}

export function resetAiSettings(): AiSettings {
  const defaults = cloneDefaults();
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('charactermaker:ai-settings-changed'));
  }
  return defaults;
}

export function getEnabledCredentials(provider: AiProviderId, settings = loadAiSettings()): AiCredential[] {
  return settings.credentials.filter((credential) => credential.provider === provider
    && credential.enabled
    && (credential.apiKey.trim() !== '' || credential.hasApiKey === true));
}

export function resolveApiModel(modelKey: AiImageModelKey, defaultModel: string, settings = loadAiSettings()): string {
  const override = settings.modelOverrides[modelKey]?.trim();
  return override || defaultModel;
}

function normalizeSettings(input: Partial<AiSettings>): AiSettings {
  const defaults = cloneDefaults();
  const credentials = Array.isArray(input.credentials)
    ? input.credentials.filter(isCredentialLike).map((credential) => ({
      id: String(credential.id || `${credential.provider}-${Date.now()}-${Math.random().toString(36).slice(2)}`),
      provider: credential.provider,
      label: String(credential.label || ''),
      enabled: credential.enabled !== false,
      apiKey: String(credential.apiKey || ''),
      hasApiKey: credential.hasApiKey === true || Boolean(String(credential.apiKey || '').trim()),
      accountId: String(credential.accountId || ''),
    }))
    : [];

  const modeModels = { ...defaults.modeModels };
  (Object.keys(modeModels) as PersonaPhotoGenerationMode[]).forEach((mode) => {
    const candidate = input.modeModels?.[mode];
    if (candidate && AI_IMAGE_MODEL_KEYS.includes(candidate)) modeModels[mode] = candidate;
  });

  const enabledModels = { ...defaults.enabledModels };
  AI_IMAGE_MODEL_KEYS.forEach((key) => {
    const candidate = input.enabledModels?.[key];
    if (typeof candidate === 'boolean') enabledModels[key] = candidate;
  });

  const modelOverrides: Partial<Record<AiImageModelKey, string>> = {};
  AI_IMAGE_MODEL_KEYS.forEach((key) => {
    const value = input.modelOverrides?.[key];
    if (typeof value === 'string' && value.trim()) modelOverrides[key] = value.trim();
  });

  return { version: 1, credentials, modeModels, enabledModels, modelOverrides };
}

function isCredentialLike(value: unknown): value is AiCredential {
  if (!value || typeof value !== 'object') return false;
  const provider = (value as { provider?: unknown }).provider;
  return provider === 'cloudflare' || provider === 'aihorde' || provider === 'pollinations';
}

function cloneDefaults(): AiSettings {
  return {
    version: 1,
    credentials: [],
    modeModels: { ...DEFAULT_AI_SETTINGS.modeModels },
    enabledModels: { ...DEFAULT_AI_SETTINGS.enabledModels },
    modelOverrides: {},
  };
}
