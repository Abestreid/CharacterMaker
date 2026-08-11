export type AiProviderId = 'cloudflare' | 'aihorde' | 'pollinations';
export type PersonaPhotoGenerationMode = 'fast' | 'quality' | 'experimental';
export type PersonaPhotoAdapterId = 'flux2-klein' | 'flux2-dev' | 'aihorde-sd' | 'pollinations-klein';

export type AiImageModelConfig = {
  key: string;
  provider: AiProviderId;
  apiModel: string;
  label: string;
  description: string;
  adapter: PersonaPhotoAdapterId;
  maxReferences: number;
  guidance?: number;
};

export const AI_PROVIDER_LABELS: Record<AiProviderId, string> = {
  cloudflare: 'Cloudflare Workers AI',
  aihorde: 'AI Horde',
  pollinations: 'Pollinations AI',
};

export const AI_IMAGE_MODELS = {
  'cloudflare-flux-2-klein-4b': {
    key: 'cloudflare-flux-2-klein-4b',
    provider: 'cloudflare',
    apiModel: '@cf/black-forest-labs/flux-2-klein-4b',
    label: 'Cloudflare · FLUX.2 Klein 4B',
    description: 'Быстрый Workers AI режим для черновиков и предварительных вариантов.',
    adapter: 'flux2-klein',
    maxReferences: 4,
    guidance: 1.0,
  },
  'cloudflare-flux-2-klein-9b': {
    key: 'cloudflare-flux-2-klein-9b',
    provider: 'cloudflare',
    apiModel: '@cf/black-forest-labs/flux-2-klein-9b',
    label: 'Cloudflare · FLUX.2 Klein 9B',
    description: 'Основной Workers AI режим для канонических фотографий.',
    adapter: 'flux2-klein',
    maxReferences: 4,
    guidance: 1.0,
  },
  'cloudflare-flux-2-dev': {
    key: 'cloudflare-flux-2-dev',
    provider: 'cloudflare',
    apiModel: '@cf/black-forest-labs/flux-2-dev',
    label: 'Cloudflare · FLUX.2 Dev',
    description: 'Экспериментальный Workers AI режим с отдельным BodyDNA prompt adapter.',
    adapter: 'flux2-dev',
    maxReferences: 4,
    guidance: 1.0,
  },
  'pollinations-klein': {
    key: 'pollinations-klein',
    provider: 'pollinations',
    apiModel: 'klein',
    label: 'Pollinations · Klein',
    description: 'Pollinations image model с поддержкой reference images. Использует Klein BodyDNA adapter.',
    adapter: 'pollinations-klein',
    maxReferences: 4,
  },
  'pollinations-nanobanana-2': {
    key: 'pollinations-nanobanana-2',
    provider: 'pollinations',
    apiModel: 'nanobanana-2',
    label: 'Pollinations · Nano Banana 2',
    description: 'Альтернативная image/edit модель Pollinations с reference image support.',
    adapter: 'pollinations-klein',
    maxReferences: 4,
  },
  'pollinations-gptimage': {
    key: 'pollinations-gptimage',
    provider: 'pollinations',
    apiModel: 'gptimage',
    label: 'Pollinations · GPT Image',
    description: 'Image/edit модель Pollinations для сравнительных генераций.',
    adapter: 'pollinations-klein',
    maxReferences: 4,
  },
  'aihorde-auto': {
    key: 'aihorde-auto',
    provider: 'aihorde',
    apiModel: '',
    label: 'AI Horde · Auto / active model',
    description: 'AI Horde выбирает доступный image worker. В /admin можно указать точное имя модели.',
    adapter: 'aihorde-sd',
    maxReferences: 1,
  },
} as const satisfies Record<string, AiImageModelConfig>;

export type AiImageModelKey = keyof typeof AI_IMAGE_MODELS;

export const AI_IMAGE_MODEL_KEYS = Object.keys(AI_IMAGE_MODELS) as AiImageModelKey[];

export const DEFAULT_MODE_MODELS: Record<PersonaPhotoGenerationMode, AiImageModelKey> = {
  fast: 'cloudflare-flux-2-klein-4b',
  quality: 'cloudflare-flux-2-klein-9b',
  experimental: 'cloudflare-flux-2-dev',
};

export const GENERATION_MODE_META: Record<PersonaPhotoGenerationMode, { label: string; shortDescription: string }> = {
  fast: { label: 'Быстро', shortDescription: 'Черновик' },
  quality: { label: 'Качество', shortDescription: 'Основной режим' },
  experimental: { label: 'Экспериментальный', shortDescription: 'Сравнение' },
};

export function getAiImageModel(modelKey: string): AiImageModelConfig | null {
  return AI_IMAGE_MODELS[modelKey as AiImageModelKey] ?? null;
}
