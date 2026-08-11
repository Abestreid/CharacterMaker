import { prepareCloudflareReference } from '../cloudflare-ai/cloudflare-ai.client';
import { getAiImageModel, type AiImageModelKey } from './ai-registry';
import {
  getEnabledCredentials,
  loadAiSettings,
  resolveApiModel,
  type AiCredential,
} from './ai-settings';

const API_URL = './api/ai-image.php';
const AI_HORDE_POLL_INTERVAL_MS = 2500;
const AI_HORDE_MAX_POLLS = 72;

export type AiGenerateInput = {
  modelKey: AiImageModelKey;
  prompt: string;
  width: number;
  height: number;
  references: File[];
  guidance?: number;
  seed?: number;
};

export type AiGenerateResult = {
  imageBase64: string;
  mimeType: string;
  provider: string;
  model: string;
  modelKey: AiImageModelKey;
  credentialLabel: string;
  width: number;
  height: number;
};

export type AiCredentialVerification = {
  ok: boolean;
  provider: string;
  message: string;
  details?: Record<string, unknown>;
};

type ApiGenerateResponse = {
  async?: boolean;
  jobId?: string;
  imageBase64?: string;
  mimeType?: string;
  provider?: string;
  model?: string;
  width?: number;
  height?: number;
};

type ApiErrorBody = {
  error?: string;
  code?: string;
  details?: Record<string, unknown>;
};

export async function verifyAiCredential(credential: AiCredential): Promise<AiCredentialVerification> {
  const body = credentialFormData(credential);
  const response = await fetch(`${API_URL}?action=verify`, { method: 'POST', body });
  return readJson<AiCredentialVerification>(response);
}

export async function generateAiImage(input: AiGenerateInput): Promise<AiGenerateResult> {
  const settings = loadAiSettings();
  const config = getAiImageModel(input.modelKey);
  if (!config) throw new Error(`Неизвестная AI model config: ${input.modelKey}.`);
  if (!settings.enabledModels[input.modelKey]) throw new Error(`Модель «${config.label}» выключена в /admin.`);

  const credentials = getEnabledCredentials(config.provider, settings);
  if (!credentials.length) {
    throw new Error(`Для ${config.provider} нет активных credentials. Добавьте их в /admin.`);
  }

  const apiModel = resolveApiModel(input.modelKey, config.apiModel, settings);
  const errors: string[] = [];

  for (const credential of credentials) {
    try {
      const references = await prepareReferences(input.references, config.provider, config.maxReferences);
      const result = await generateWithCredential({
        ...input,
        references,
        apiModel,
        credential,
      });
      return {
        ...result,
        modelKey: input.modelKey,
        credentialLabel: credential.label || credential.id,
      };
    } catch (reason: unknown) {
      const message = reason instanceof Error ? reason.message : 'Неизвестная ошибка провайдера.';
      errors.push(`${credential.label || credential.id}: ${message}`);
    }
  }

  throw new Error(`Все credentials для ${config.provider} завершились ошибкой. ${errors.join(' | ')}`);
}

async function generateWithCredential(input: AiGenerateInput & {
  apiModel: string;
  credential: AiCredential;
}): Promise<Omit<AiGenerateResult, 'modelKey' | 'credentialLabel'>> {
  const body = credentialFormData(input.credential);
  body.append('model', input.apiModel);
  body.append('prompt', input.prompt);
  body.append('width', String(input.width));
  body.append('height', String(input.height));
  if (typeof input.guidance === 'number') body.append('guidance', String(input.guidance));
  if (typeof input.seed === 'number') body.append('seed', String(input.seed));
  input.references.forEach((file, index) => body.append(`input_image_${index}`, file, file.name));

  const response = await fetch(`${API_URL}?action=generate`, { method: 'POST', body });
  const payload = await readJson<ApiGenerateResponse>(response);

  if (payload.async && payload.jobId) {
    return pollAiHorde(payload.jobId, input.credential, input.width, input.height, input.apiModel);
  }

  if (!payload.imageBase64 || !payload.mimeType) throw new Error('AI provider не вернул изображение.');
  return {
    imageBase64: payload.imageBase64,
    mimeType: payload.mimeType,
    provider: payload.provider || input.credential.provider,
    model: payload.model || input.apiModel,
    width: payload.width || input.width,
    height: payload.height || input.height,
  };
}

async function pollAiHorde(jobId: string, credential: AiCredential, width: number, height: number, model: string): Promise<Omit<AiGenerateResult, 'modelKey' | 'credentialLabel'>> {
  for (let attempt = 0; attempt < AI_HORDE_MAX_POLLS; attempt += 1) {
    await delay(AI_HORDE_POLL_INTERVAL_MS);
    const body = credentialFormData(credential);
    body.append('job_id', jobId);
    const response = await fetch(`${API_URL}?action=status`, { method: 'POST', body });
    const payload = await readJson<ApiGenerateResponse & { done?: boolean; waiting?: number; queuePosition?: number }>(response);
    if (!payload.done) continue;
    if (!payload.imageBase64 || !payload.mimeType) throw new Error('AI Horde завершил задачу без изображения.');
    return {
      imageBase64: payload.imageBase64,
      mimeType: payload.mimeType,
      provider: 'aihorde',
      model: payload.model || model,
      width: payload.width || width,
      height: payload.height || height,
    };
  }
  throw new Error('AI Horde не завершил генерацию за 3 минуты. Попробуйте другую модель или повторите позже.');
}

async function prepareReferences(files: File[], provider: string, maxReferences: number): Promise<File[]> {
  const selected = files.slice(0, maxReferences);
  if (provider !== 'cloudflare') return selected;
  return Promise.all(selected.map((file) => prepareCloudflareReference(file)));
}

function credentialFormData(credential: AiCredential): FormData {
  const body = new FormData();
  body.append('provider', credential.provider);
  body.append('api_key', credential.apiKey.trim());
  if (credential.accountId.trim()) body.append('account_id', credential.accountId.trim());
  return body;
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null) as (T & ApiErrorBody) | null;
  if (!response.ok) {
    const suffix = payload?.code ? ` [${payload.code}]` : '';
    throw new Error(`${payload?.error || `AI API вернул HTTP ${response.status}.`}${suffix}`);
  }
  if (!payload) throw new Error('AI API вернул пустой ответ.');
  return payload;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
