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

  if (input.adapter === 'aihorde-sd') {
    return `${base}\n\nAI Horde Stable Diffusion adapter: prioritize photorealistic human anatomy, identity consistency, exact saved silhouette and clean neutral studio photography. Treat the first supplied source image as the strongest identity reference when one is present.`;
  }

  if (input.adapter === 'pollinations-klein') {
    return `${base}\n\nPollinations image adapter: preserve identity and exact BodyDNA geometry from the prompt and supplied reference images; prefer a realistic photographic result over stylization.`;
  }

  return base;
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
