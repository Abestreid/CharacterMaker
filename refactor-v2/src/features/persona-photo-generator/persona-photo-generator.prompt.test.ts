import { describe, expect, it } from 'vitest';
import { CHARACTER_DEFAULTS, type CharacterState } from '../../domain';
import { buildCharacterPhotoPrompt } from './persona-photo-generator.prompt';

const character = (): CharacterState => JSON.parse(JSON.stringify(CHARACTER_DEFAULTS)) as CharacterState;

describe('buildCharacterPhotoPrompt', () => {
  it('sends face parameters only for face_closeup', () => {
    const state = character();
    state.appearance.skinDetails = 'light freckles';
    state.appearance.hair.details = 'center part';
    state.permanentFeatures = 'small mole below left eye';
    state.tattoos = { enabled: true, description: 'large tattoo on lower back' };

    const prompt = buildCharacterPhotoPrompt({ character: state, role: 'face_closeup', personaName: 'Test Persona' });

    expect(prompt).toContain('IDENTITY_AND_FACE_PARAMETERS');
    expect(prompt).toContain('HEAD_SHAPE:');
    expect(prompt).toContain('EYE_COLOR:');
    expect(prompt).toContain('MAKEUP_ENABLED: yes');
    expect(prompt).toContain('SKIN_DETAILS: light freckles');
    expect(prompt).toContain('HAIR_DETAILS: center part');
    expect(prompt).toContain('PERMANENT_FEATURES: small mole below left eye');
    expect(prompt).not.toContain('UPPER_BODY_PARAMETERS');
    expect(prompt).not.toContain('FULL_BODY_PARAMETERS');
    expect(prompt).not.toContain('HEIGHT_CM:');
    expect(prompt).not.toContain('WEIGHT_KG:');
    expect(prompt).not.toContain('BUST_CM:');
    expect(prompt).not.toContain('WAIST_CM:');
    expect(prompt).not.toContain('HIPS_CM:');
    expect(prompt).not.toContain('BUTTOCK_SHAPE:');
    expect(prompt).not.toContain('large tattoo on lower back');
  });

  it('adds only upper-body measurements for portrait', () => {
    const state = character();
    state.tattoos = { enabled: true, description: 'small rose on left shoulder' };

    const prompt = buildCharacterPhotoPrompt({ character: state, role: 'portrait' });

    expect(prompt).toContain('IDENTITY_AND_FACE_PARAMETERS');
    expect(prompt).toContain('UPPER_BODY_PARAMETERS');
    expect(prompt).toContain('BUST_CM: 90');
    expect(prompt).toContain('WAIST_CM: 65');
    expect(prompt).toContain('BODY_FAT_PERCENT: 22');
    expect(prompt).toContain('MUSCLE_MASS:');
    expect(prompt).toContain('VISIBLE_TATTOOS:');
    expect(prompt).not.toContain('FULL_BODY_PARAMETERS');
    expect(prompt).not.toContain('HEIGHT_CM:');
    expect(prompt).not.toContain('WEIGHT_KG:');
    expect(prompt).not.toContain('HIPS_CM:');
    expect(prompt).not.toContain('BUTTOCK_SHAPE:');
  });

  it('adds full anthropometry and waist-readable temporary beige sports outfit for full body', () => {
    const state = character();
    state.tattoos = { enabled: true, description: 'small rose on left shoulder' };

    const prompt = buildCharacterPhotoPrompt({ character: state, role: 'full_front' });

    expect(prompt).toContain('FULL_BODY_PARAMETERS');
    expect(prompt).toContain('HEIGHT_CM: 170');
    expect(prompt).toContain('WEIGHT_KG: 60');
    expect(prompt).toContain('BUST_CM: 90');
    expect(prompt).toContain('WAIST_CM: 65');
    expect(prompt).toContain('HIPS_CM: 95');
    expect(prompt).toContain('BODY_FAT_PERCENT: 22');
    expect(prompt).toContain('BUTTOCK_SHAPE:');
    expect(prompt).toContain('TATTOOS: small rose on left shoulder');
    expect(prompt).toContain('opaque fitted beige athletic crop top ending clearly above the natural waist');
    expect(prompt).toContain('low-to-mid-rise short fitted beige athletic shorts');
    expect(prompt).toContain('CALIBRATION_VISIBILITY_RULE:');
    expect(prompt).toContain('waist-to-hip transition must be plainly visible');
    expect(prompt).toContain('must not cover the waist, use a high waistband');
  });

  it('describes sequential reference roles without importing their incidental scene details', () => {
    const prompt = buildCharacterPhotoPrompt({
      character: character(),
      role: 'full_back',
      referenceRoles: ['full_front', 'face_closeup', 'portrait'],
    });

    expect(prompt).toContain('- image 0: full_front.');
    expect(prompt).toContain('- image 1: face_closeup.');
    expect(prompt).toContain('- image 2: portrait.');
    expect(prompt).toContain('Do not copy background, lighting, pose or accidental clothing details');
    expect(prompt).toContain('strict back view');
  });

  it('uses a modest calibration outfit for a minor preset', () => {
    const state = character();
    state.identity.age = 17;

    const prompt = buildCharacterPhotoPrompt({ character: state, role: 'full_front' });

    expect(prompt).toContain('opaque modest beige athletic T-shirt');
    expect(prompt).toContain('beige knee-length athletic shorts');
    expect(prompt).not.toContain('low-to-mid-rise short fitted beige athletic shorts');
    expect(prompt).not.toContain('CALIBRATION_VISIBILITY_RULE:');
  });
});
