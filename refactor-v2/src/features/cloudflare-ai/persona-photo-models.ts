export type PersonaPhotoModelPreset = 'fast' | 'quality' | 'experimental';

export type PersonaPhotoModelConfig = {
  id: string;
  label: string;
  shortDescription: string;
  description: string;
  guidance: number;
  adapter: 'flux2-klein' | 'flux2-dev';
};

export const DEFAULT_PERSONA_PHOTO_MODEL_PRESET: PersonaPhotoModelPreset = 'quality';

export const PERSONA_PHOTO_MODELS = {
  fast: {
    id: '@cf/black-forest-labs/flux-2-klein-4b',
    label: 'Быстро',
    shortDescription: 'Черновик',
    description: 'FLUX.2 Klein 4B - быстрые пробы и предварительные варианты.',
    guidance: 1.0,
    adapter: 'flux2-klein',
  },
  quality: {
    id: '@cf/black-forest-labs/flux-2-klein-9b',
    label: 'Качество',
    shortDescription: 'Основной режим',
    description: 'FLUX.2 Klein 9B - основной режим для пяти канонических фотографий.',
    guidance: 1.0,
    adapter: 'flux2-klein',
  },
  experimental: {
    id: '@cf/black-forest-labs/flux-2-dev',
    label: 'Экспериментальное',
    shortDescription: 'Сравнение',
    description: 'FLUX.2 Dev - более тяжелый режим для тестов идентичности, силуэта и анатомии.',
    guidance: 1.0,
    adapter: 'flux2-dev',
  },
} as const satisfies Record<PersonaPhotoModelPreset, PersonaPhotoModelConfig>;
