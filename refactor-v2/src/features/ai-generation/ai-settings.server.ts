import { DEFAULT_AI_SETTINGS, type AiSettings } from './ai-settings';

const API_URL = './api/ai-settings.php';

type SettingsResponse = {
  ok?: boolean;
  settings: AiSettings;
  error?: string;
};

export async function fetchServerAiSettings(): Promise<AiSettings> {
  const response = await fetch(`${API_URL}?action=get`, { cache: 'no-store' });
  return readSettings(response);
}

export async function saveServerAiSettings(settings: AiSettings): Promise<AiSettings> {
  const response = await fetch(`${API_URL}?action=save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  return readSettings(response);
}

export async function resetServerAiSettings(): Promise<AiSettings> {
  const response = await fetch(`${API_URL}?action=reset`, { method: 'POST' });
  return readSettings(response);
}

async function readSettings(response: Response): Promise<AiSettings> {
  const payload = await response.json().catch(() => null) as SettingsResponse | null;
  if (!response.ok || !payload?.settings) {
    throw new Error(payload?.error || `AI settings API вернул HTTP ${response.status}.`);
  }

  return {
    ...payload.settings,
    modeModels: { ...DEFAULT_AI_SETTINGS.modeModels, ...payload.settings.modeModels },
    enabledModels: { ...DEFAULT_AI_SETTINGS.enabledModels, ...payload.settings.enabledModels },
    modelOverrides: { ...DEFAULT_AI_SETTINGS.modelOverrides, ...payload.settings.modelOverrides },
  };
}
