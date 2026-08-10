import type { CharacterState } from '../../domain';
import {
  FLUX2_KLEIN_CANONICAL_OUTFIT,
  buildFlux2KleinPersonaPhotoPrompt,
} from '../cloudflare-ai/flux2-klein-4b.persona-adapter';

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

export function buildCharacterPhotoPrompt(input: {
  character: CharacterState;
  role: CharacterPhotoRole;
  personaName?: string | null;
  referenceRoles?: readonly string[];
}): string {
  return buildFlux2KleinPersonaPhotoPrompt({
    character: input.character,
    role: input.role,
    ...(input.referenceRoles ? { referenceRoles: input.referenceRoles } : {}),
  });
}
