import { describe, expect, it } from 'vitest';
import { buildVisualPackage, type ContextAsset } from './context.service';

function asset(input: Partial<ContextAsset> & Pick<ContextAsset, 'id' | 'role'>): ContextAsset {
  return {
    id: input.id,
    role: input.role,
    isPrimary: input.isPrimary ?? false,
    sortOrder: input.sortOrder ?? 0,
    referenceStatus: input.referenceStatus ?? 'normal',
    publicUrl: input.publicUrl ?? `https://example.test/${input.id}.png`,
    mimeType: input.mimeType ?? 'image/png',
    width: input.width ?? 832,
    height: input.height ?? 1248,
  };
}

describe('generation-context-v2 visual package', () => {
  it('prefers canonical face identity over a normal primary portrait', () => {
    const normalPrimary = asset({ id: 'normal-primary', role: 'portrait', isPrimary: true, referenceStatus: 'normal' });
    const canonicalFace = asset({ id: 'canonical-face', role: 'face_closeup', referenceStatus: 'canonical', sortOrder: 10 });

    const visual = buildVisualPackage('character', [normalPrimary, canonicalFace]);

    expect(visual.referenceQuality).toBe('canonical');
    expect(visual.primaryFaceAsset?.id).toBe('canonical-face');
    expect(visual.recommendedAssetIds[0]).toBe('canonical-face');
  });

  it('selects a dedicated body reference separately from the face reference', () => {
    const face = asset({ id: 'face', role: 'face_closeup', referenceStatus: 'canonical' });
    const body = asset({ id: 'body', role: 'body_reference', referenceStatus: 'approved' });

    const visual = buildVisualPackage('character', [body, face]);

    expect(visual.primaryFaceAsset?.id).toBe('face');
    expect(visual.primaryBodyAsset?.id).toBe('body');
    expect(visual.recommendedAssetIds.slice(0, 2)).toEqual(['face', 'body']);
  });

  it('excludes rejected assets from generation recommendations', () => {
    const rejected = asset({ id: 'rejected', role: 'face_closeup', referenceStatus: 'rejected', isPrimary: true });
    const fallback = asset({ id: 'fallback', role: 'portrait', referenceStatus: 'normal' });

    const visual = buildVisualPackage('character', [rejected, fallback]);

    expect(visual.eligibleAssetCount).toBe(1);
    expect(visual.recommendedAssetIds).toEqual(['fallback']);
    expect(visual.recommendedAssetIds).not.toContain('rejected');
  });

  it('reports missing dedicated body reference instead of inventing one', () => {
    const face = asset({ id: 'face-only', role: 'face_closeup', referenceStatus: 'canonical' });

    const visual = buildVisualPackage('character', [face]);

    expect(visual.primaryBodyAsset).toBeNull();
    expect(visual.warnings.some((warning) => warning.includes('full-body'))).toBe(true);
  });

  it('uses semantic Outfit role priority after reference quality', () => {
    const detail = asset({ id: 'detail', role: 'detail', referenceStatus: 'approved' });
    const front = asset({ id: 'front', role: 'front', referenceStatus: 'approved' });

    const visual = buildVisualPackage('outfit', [detail, front]);

    expect(visual.recommendedAssetIds[0]).toBe('front');
  });
});
