import { describe, expect, it } from 'vitest';
import {
  BACKGROUNDS,
  CHARACTER_DEFAULTS,
  SCENE_DEFAULTS,
  type CharacterState,
  type SceneState,
} from '../domain';
import { characterStateToPreset, sceneStateToPreset } from '../infrastructure/supabase/preset-mappers';
import { buildStatePatch } from './character-maker.service';

const clone = <T,>(value: T): T => structuredClone(value);
const identity = { name: 'Test', slug: 'test' } as const;

describe('Web preset partial updates', () => {
  it('sends only the changed Persona parameter and does not persist unchanged UI defaults', () => {
    const baseline = clone(CHARACTER_DEFAULTS);
    const current = clone(CHARACTER_DEFAULTS);
    current.appearance.eyeColorId = 'green';

    const patch = buildStatePatch(
      'character',
      characterStateToPreset(identity, baseline),
      characterStateToPreset(identity, current),
      identity,
      'character-state-v3',
    );

    expect(patch.age).toBeUndefined();
    expect(patch.height_cm).toBeUndefined();
    expect(patch.weight_kg).toBeUndefined();
    expect(patch.parameters).toEqual([
      { catalog_id: 'eye_color', option_id: 'green', position: 0 },
    ]);
  });

  it('does not create any state patch when only fallback/default state is displayed unchanged', () => {
    const state = clone(CHARACTER_DEFAULTS);
    const payload = characterStateToPreset(identity, state);

    const patch = buildStatePatch('character', payload, payload, identity, 'character-state-v3');

    expect(patch.parameters).toBeUndefined();
    expect(patch.age).toBeUndefined();
    expect(patch.height_cm).toBeUndefined();
    expect(patch.body_fat_percent).toBeUndefined();
  });

  it('removes female-only normalized parameters when Persona gender changes to male', () => {
    const baseline: CharacterState = clone(CHARACTER_DEFAULTS);
    const current: CharacterState = clone(CHARACTER_DEFAULTS);
    current.identity.genderId = 'male';

    const patch = buildStatePatch(
      'character',
      characterStateToPreset(identity, baseline),
      characterStateToPreset(identity, current),
      identity,
      'character-state-v3',
    );

    const byCatalog = new Map((patch.parameters ?? []).map((item) => [item.catalog_id, item]));
    expect(byCatalog.get('gender')).toMatchObject({ option_id: 'male' });
    expect(byCatalog.get('breast_shape')).toMatchObject({ delete: true });
    expect(byCatalog.get('breast_firmness')).toMatchObject({ delete: true });
    expect(byCatalog.get('buttock_shape')).toMatchObject({ delete: true });
    expect(byCatalog.get('buttock_firmness')).toMatchObject({ delete: true });
  });

  it('patches Scene background slug and normalized background parameter together', () => {
    const baseline: SceneState = clone(SCENE_DEFAULTS);
    const current: SceneState = clone(SCENE_DEFAULTS);
    const nextBackground = BACKGROUNDS.find((item) => item.id !== baseline.environment.backgroundId);
    if (!nextBackground) throw new Error('Test requires at least two background values.');
    current.environment.backgroundId = nextBackground.id;

    const patch = buildStatePatch(
      'scene',
      sceneStateToPreset(identity, baseline),
      sceneStateToPreset(identity, current),
      identity,
      'scene-state-v3',
    );

    expect(patch.background_slug).toBe(nextBackground.id);
    expect(patch.parameters).toContainEqual({
      catalog_id: 'background',
      option_id: nextBackground.id,
      position: 0,
    });
  });
});
