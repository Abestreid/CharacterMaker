import type { CharacterState } from '../../domain';
import type { PersonaPhotoAdapterId } from '../ai-generation/ai-registry';
import { buildFlux2DevPersonaPhotoPrompt } from '../cloudflare-ai/flux2-dev.persona-adapter';
import {
  FLUX2_KLEIN_CANONICAL_OUTFIT,
  buildFlux2KleinPersonaPhotoPrompt,
} from '../cloudflare-ai/flux2-klein-4b.persona-adapter';
import type { PersonaPhotoModelPreset } from '../cloudflare-ai/persona-photo-models';

export type CharacterPhotoRole = 'face_closeup' | 'portrait' | 'full_front' | 'full_back' | 'profile_left';

export type CharacterPhotoStep = {
  role: CharacterPhotoRole;
  label: string;
  shortLabel: string;
  description: string;
  contextLabel: string;
  width: number;
  height: number;
};

export const CHARACTER_PHOTO_STEPS = [
  { role: 'face_closeup', label: 'Лицо крупно', shortLabel: 'Лицо', description: 'Фронтальный крупный план. Формирует основной канон лицевой идентичности.', contextLabel: 'Только лицо и идентичность', width: 768, height: 768 },
  { role: 'portrait', label: 'Портрет / торс', shortLabel: 'Торс', description: 'Фронтальный портрет от головы примерно до талии. Уточняет лицо и верхнюю часть тела.', contextLabel: 'Лицо + верхняя часть тела', width: 768, height: 1024 },
  { role: 'full_front', label: 'Полный рост спереди', shortLabel: 'Спереди', description: 'Нейтральная стойка, полностью видны голова, корпус, ноги и стопы.', contextLabel: 'Лицо + все параметры тела', width: 768, height: 1024 },
  { role: 'full_back', label: 'Полный рост сзади', shortLabel: 'Сзади', description: 'Нейтральная стойка строго спиной к камере для канона силуэта и пропорций.', contextLabel: 'Идентичность + все параметры тела со спины', width: 768, height: 1024 },
  { role: 'profile_left', label: 'Профиль в полный рост', shortLabel: 'Профиль', description: 'Левый боковой профиль в полный рост без перспективных искажений.', contextLabel: 'Лицо в профиль + все параметры тела', width: 768, height: 1024 },
] as const satisfies readonly CharacterPhotoStep[];

export const DEFAULT_CANONICAL_OUTFIT = FLUX2_KLEIN_CANONICAL_OUTFIT;

const ADAPTER_SUFFIX: Partial<Record<PersonaPhotoAdapterId, string>> = {
  'aihorde-sd': 'AI Horde adapter: keep the requested identity, proportions, framing and realistic photographic appearance consistent. Use the first source image as the primary visual reference when supplied.',
  'pollinations-klein': 'Pollinations Klein adapter: keep identity and saved proportions consistent with all supplied references and instructions.',
  'pollinations-gptimage': 'Pollinations GPT Image adapter: use supplied references as strict identity constraints and keep all saved physical proportions consistent.',
  'pollinations-gptimage-large': 'Pollinations GPT Image Large adapter: prioritize high identity fidelity, stable proportions and natural photographic detail.',
  'pollinations-kontext': 'Pollinations Kontext adapter: use reference images as primary context and preserve stable identity while changing only what the requested frame requires.',
  'pollinations-flux': 'Pollinations Flux adapter: follow the complete normalized character description literally and keep realistic anatomy and neutral photography.',
  'pollinations-zimage': 'Pollinations Z-Image adapter: follow the complete normalized character description literally with neutral lens perspective and realistic photography.',
};

export function buildCharacterPhotoPromptForAdapter(input: {
  character: CharacterState;
  role: CharacterPhotoRole;
  adapter: PersonaPhotoAdapterId;
  personaName?: string | null;
  referenceRoles?: readonly string[];
}): string {
  if (input.adapter === 'flux2-dev') {
    return buildFlux2DevPersonaPhotoPrompt({
      character: input.character,
      role: input.role,
      ...(input.referenceRoles ? { referenceRoles: input.referenceRoles } : {}),
    });
  }

  const base = buildFlux2KleinPersonaPhotoPrompt({
    character: input.character,
    role: input.role,
    ...(input.referenceRoles ? { referenceRoles: input.referenceRoles } : {}),
  });
  const suffix = ADAPTER_SUFFIX[input.adapter];
  return suffix ? `${base}\n\n${suffix}` : base;
}

export function buildCharacterPhotoPrompt(input: {
  character: CharacterState;
  role: CharacterPhotoRole;
  modelPreset: PersonaPhotoModelPreset;
  personaName?: string | null;
  referenceRoles?: readonly string[];
}): string {
  return buildCharacterPhotoPromptForAdapter({
    character: input.character,
    role: input.role,
    adapter: input.modelPreset === 'experimental' ? 'flux2-dev' : 'flux2-klein',
    ...(input.personaName !== undefined ? { personaName: input.personaName } : {}),
    ...(input.referenceRoles ? { referenceRoles: input.referenceRoles } : {}),
  });
}
