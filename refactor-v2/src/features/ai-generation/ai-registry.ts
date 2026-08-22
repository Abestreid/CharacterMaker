export type AiProviderId = 'cloudflare' | 'aihorde' | 'pollinations';
export type PersonaPhotoGenerationMode = 'fast' | 'quality' | 'experimental';
export type PersonaPhotoAdapterId =
  | 'flux2-klein'
  | 'flux2-dev'
  | 'aihorde-sd'
  | 'pollinations-klein'
  | 'pollinations-gptimage'
  | 'pollinations-gptimage-large'
  | 'pollinations-kontext'
  | 'pollinations-flux'
  | 'pollinations-zimage';

export type AiImageModelConfig = {
  key: string;
  provider: AiProviderId;
  apiModel: string;
  label: string;
  description: string;
  adapter: PersonaPhotoAdapterId;
  maxReferences: number;
  guidance: number;
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
    description: 'Быстрый Workers AI вариант.',
    adapter: 'flux2-klein',
    maxReferences: 4,
    guidance: 1.0,
  },
  'cloudflare-flux-2-klein-9b': {
    key: 'cloudflare-flux-2-klein-9b',
    provider: 'cloudflare',
    apiModel: '@cf/black-forest-labs/flux-2-klein-9b',
    label: 'Cloudflare · FLUX.2 Klein 9B',
    description: 'Основная Workers AI модель для канонических фотографий.',
    adapter: 'flux2-klein',
    maxReferences: 4,
    guidance: 1.0,
  },
  'cloudflare-flux-2-dev': {
    key: 'cloudflare-flux-2-dev',
    provider: 'cloudflare',
    apiModel: '@cf/black-forest-labs/flux-2-dev',
    label: 'Cloudflare · FLUX.2 Dev',
    description: 'FLUX.2 Dev с отдельным BodyDNA prompt adapter.',
    adapter: 'flux2-dev',
    maxReferences: 4,
    guidance: 1.0,
  },
  'pollinations-klein': {
    key: 'pollinations-klein',
    provider: 'pollinations',
    apiModel: 'klein',
    label: 'Pollinations · Klein',
    description: 'Pollinations Klein с reference images.',
    adapter: 'pollinations-klein',
    maxReferences: 4,
    guidance: 1.0,
  },
  'pollinations-gptimage': {
    key: 'pollinations-gptimage',
    provider: 'pollinations',
    apiModel: 'gptimage',
    label: 'Pollinations · GPT Image',
    description: 'Pollinations GPT Image с reference images.',
    adapter: 'pollinations-gptimage',
    maxReferences: 4,
    guidance: 1.0,
  },
  'pollinations-gptimage-large': {
    key: 'pollinations-gptimage-large',
    provider: 'pollinations',
    apiModel: 'gptimage-large',
    label: 'Pollinations · GPT Image Large',
    description: 'Увеличенный GPT Image вариант с reference images.',
    adapter: 'pollinations-gptimage-large',
    maxReferences: 4,
    guidance: 1.0,
  },
  'pollinations-kontext': {
    key: 'pollinations-kontext',
    provider: 'pollinations',
    apiModel: 'kontext',
    label: 'Pollinations · Kontext',
    description: 'Pollinations Kontext для reference/edit задач.',
    adapter: 'pollinations-kontext',
    maxReferences: 4,
    guidance: 1.0,
  },
  'pollinations-flux': {
    key: 'pollinations-flux',
    provider: 'pollinations',
    apiModel: 'flux',
    label: 'Pollinations · Flux',
    description: 'Pollinations Flux text-to-image.',
    adapter: 'pollinations-flux',
    maxReferences: 0,
    guidance: 1.0,
  },
  'pollinations-zimage': {
    key: 'pollinations-zimage',
    provider: 'pollinations',
    apiModel: 'zimage',
    label: 'Pollinations · Z-Image',
    description: 'Pollinations Z-Image text-to-image.',
    adapter: 'pollinations-zimage',
    maxReferences: 0,
    guidance: 1.0,
  },
  'aihorde-auto': {
    key: 'aihorde-auto',
    provider: 'aihorde',
    apiModel: '',
    label: 'AI Horde · Auto',
    description: 'AI Horde выбирает доступный image worker.',
    adapter: 'aihorde-sd',
    maxReferences: 1,
    guidance: 7.0,
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
