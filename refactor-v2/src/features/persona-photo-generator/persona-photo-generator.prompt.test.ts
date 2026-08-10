import { describe, expect, it } from 'vitest';
import { CHARACTER_DEFAULTS, type CharacterState } from '../../domain';
import { buildCharacterPhotoPrompt } from './persona-photo-generator.prompt';

const character = (): CharacterState => JSON.parse(JSON.stringify(CHARACTER_DEFAULTS)) as CharacterState;

describe('buildCharacterPhotoPrompt for FLUX.2 Klein', () => {
  it('uses an English natural-language face prompt without body measurements', () => {
    const state = character();
    state.appearance.skinDetails = 'light freckles';
    state.appearance.hair.details = 'center part';
    state.permanentFeatures = 'small mole below left eye';
    state.tattoos = { enabled: true, description: 'large tattoo on lower back' };

    const prompt = buildCharacterPhotoPrompt({ character: state, role: 'face_closeup', modelPreset: 'quality', personaName: 'Ксения' });

    expect(prompt).toContain('Canonical close-up portrait');
    expect(prompt).toContain('Identity appearance:');
    expect(prompt).toContain('Face: oval head shape');
    expect(prompt).toContain('Hair: long, wavy, loose, brunette.');
    expect(prompt).toContain('Skin detail: light freckles.');
    expect(prompt).toContain('Permanent identity feature: small mole below left eye.');
    expect(prompt).not.toContain('Canonical measurement anchors:');
    expect(prompt).not.toContain('Body geometry:');
    expect(prompt).not.toContain('large tattoo on lower back');
    expect(prompt).not.toMatch(/[А-Яа-яЁё]/);
  });

  it('keeps portrait context focused on upper-body geometry', () => {
    const state = character();
    state.tattoos = { enabled: true, description: 'small rose on left shoulder' };

    const prompt = buildCharacterPhotoPrompt({ character: state, role: 'portrait', modelPreset: 'quality' });

    expect(prompt).toContain('Canonical frontal upper-body portrait');
    expect(prompt).toContain('Upper-body geometry:');
    expect(prompt).toContain('Canonical upper-body anchors: bust 90 cm, waist 65 cm, body fat 22%.');
    expect(prompt).toContain('bust-to-height 0.529');
    expect(prompt).toContain('bust-to-waist 1.385');
    expect(prompt).toContain('Visible tattoo identity marks: small rose on left shoulder.');
    expect(prompt).not.toContain('Canonical measurement anchors: height');
    expect(prompt).not.toContain('bust/waist/hips');
    expect(prompt).not.toContain('buttock shape');
  });

  it('sends full anthropometry, ratios and a waist-readable calibration outfit for full body', () => {
    const state = character();
    state.tattoos = { enabled: true, description: 'small rose on left shoulder' };

    const prompt = buildCharacterPhotoPrompt({ character: state, role: 'full_front', modelPreset: 'quality' });

    expect(prompt).toContain('Canonical strict front-view full-body photograph');
    expect(prompt).toContain('Body geometry:');
    expect(prompt).toContain('Canonical measurement anchors: height 170 cm, weight 60 kg, bust/waist/hips 90/65/95 cm, body fat 22%.');
    expect(prompt).toContain('bust-to-height 0.529');
    expect(prompt).toContain('waist-to-height 0.382');
    expect(prompt).toContain('hips-to-height 0.559');
    expect(prompt).toContain('bust-to-waist 1.385');
    expect(prompt).toContain('hips-to-waist 1.462');
    expect(prompt).toContain('waist-to-hips 0.684');
    expect(prompt).toContain('Body composition:');
    expect(prompt).toContain('round buttock shape');
    expect(prompt).toContain('Visible tattoo identity marks: small rose on left shoulder.');
    expect(prompt).toContain('opaque fitted beige athletic crop top ending clearly above the natural waist');
    expect(prompt).toContain('low-to-mid-rise short fitted beige athletic shorts');
    expect(prompt).toContain('the natural waist, upper hip line and waist-to-hip transition remain fully visible');
    expect(prompt).not.toContain('Do not');
    expect(prompt).not.toContain('BREAST_SIZE');
  });

  it('turns Ksenia-like 160 / 80-64-98 measurements into explicit visual geometry', () => {
    const state = character();
    state.body.height = 160;
    state.body.weight = 58;
    state.body.bust = 80;
    state.body.waist = 64;
    state.body.hips = 98;

    const prompt = buildCharacterPhotoPrompt({ character: state, role: 'full_front', modelPreset: 'fast', personaName: 'Ксения' });

    expect(prompt).toContain('pear-shaped silhouette with a fuller lower body');
    expect(prompt).toContain('pronounced narrow waist');
    expect(prompt).toContain('small bust circumference relative to height');
    expect(prompt).toContain('moderate hip circumference relative to height');
    expect(prompt).toContain('hips and lower body visibly fuller than upper torso');
    expect(prompt).toContain('bust-to-height 0.5');
    expect(prompt).toContain('waist-to-height 0.4');
    expect(prompt).toContain('hips-to-height 0.613');
    expect(prompt).toContain('bust-to-waist 1.25');
    expect(prompt).toContain('hips-to-waist 1.531');
    expect(prompt).toContain('waist-to-hips 0.653');
    expect(prompt).toContain('bust-to-hips 0.816');
    expect(prompt).not.toMatch(/[А-Яа-яЁё]/);
  });

  it('assigns a clear role to each Cloudflare multi-reference image', () => {
    const prompt = buildCharacterPhotoPrompt({
      character: character(),
      role: 'full_back',
      modelPreset: 'quality',
      referenceRoles: ['full_front', 'face_closeup', 'portrait'],
    });

    expect(prompt).toContain('image 0 (full_front): canonical full-body proportions and front silhouette');
    expect(prompt).toContain('image 1 (face_closeup): primary facial identity and facial proportions');
    expect(prompt).toContain('image 2 (portrait): facial identity and upper-body proportions');
    expect(prompt).toContain('current prompt defines the requested camera, pose, calibration clothing and studio setup');
    expect(prompt).toContain('Canonical strict back-view full-body photograph');
  });

  it('uses a modest calibration outfit for a minor preset', () => {
    const state = character();
    state.identity.age = 17;

    const prompt = buildCharacterPhotoPrompt({ character: state, role: 'full_front', modelPreset: 'quality' });

    expect(prompt).toContain('opaque modest beige athletic T-shirt');
    expect(prompt).toContain('beige knee-length athletic shorts');
    expect(prompt).not.toContain('low-to-mid-rise short fitted beige athletic shorts');
  });
});

describe('buildCharacterPhotoPrompt for FLUX.2 Dev', () => {
  it('uses the dedicated natural-language BodyDNA adapter', () => {
    const state = character();
    state.body.height = 160;
    state.body.weight = 58;
    state.body.bust = 80;
    state.body.waist = 64;
    state.body.hips = 98;

    const prompt = buildCharacterPhotoPrompt({
      character: state,
      role: 'full_front',
      modelPreset: 'experimental',
      referenceRoles: ['face_closeup', 'full_front'],
    });

    expect(prompt).toContain('BodyDNA:');
    expect(prompt).toContain('The canonical physical anchors are 160 cm height, 58 kg weight and 80/64/98 cm bust-waist-hips');
    expect(prompt).toContain('do not average these proportions toward a generic body');
    expect(prompt).toContain('Use these images as hard identity and anatomy references');
    expect(prompt).toContain('Do not slim, enlarge, stylize or normalize the saved body geometry.');
    expect(prompt).not.toContain('Canonical measurement anchors:');
    expect(prompt).not.toContain('Composition anchors: BMI');
    expect(prompt).not.toMatch(/[А-Яа-яЁё]/);
  });

  it('drops Cyrillic free-text details instead of leaking them into the English-only dev prompt', () => {
    const state = character();
    state.appearance.skinDetails = 'светлые веснушки';
    state.appearance.hair.details = 'пробор по центру';
    state.permanentFeatures = 'родинка под левым глазом';

    const prompt = buildCharacterPhotoPrompt({ character: state, role: 'face_closeup', modelPreset: 'experimental' });

    expect(prompt).not.toMatch(/[А-Яа-яЁё]/);
    expect(prompt).not.toContain('светлые веснушки');
    expect(prompt).not.toContain('пробор по центру');
  });
});
