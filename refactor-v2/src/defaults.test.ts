import { describe, expect, it } from 'vitest';
import {
  CHARACTER_DEFAULTS,
  SCENE_DEFAULTS,
  WARDROBE_DEFAULTS,
  validateCharacterState,
  validateSceneState,
  validateWardrobeState,
} from './domain';

describe('default states', () => {
  it('validates character defaults', () => {
    expect(() => validateCharacterState(CHARACTER_DEFAULTS)).not.toThrow();
  });

  it('validates wardrobe defaults', () => {
    expect(() => validateWardrobeState(WARDROBE_DEFAULTS)).not.toThrow();
  });

  it('validates scene defaults', () => {
    expect(() => validateSceneState(SCENE_DEFAULTS)).not.toThrow();
  });
});
