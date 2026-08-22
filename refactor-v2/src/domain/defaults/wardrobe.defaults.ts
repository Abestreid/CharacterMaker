import type { WardrobeState } from '../models';

export const WARDROBE_DEFAULTS: WardrobeState = {
  baseLayer: { typeId: 'none', colorId: null, materialId: null },
  top: { typeId: 'none', colorId: null, materialId: null },
  bottom: { typeId: 'none', colorId: null, materialId: null },
  outerwear: { typeId: 'none', colorId: null, materialId: null },
  footwear: { typeId: 'none', colorId: null, materialId: null },
  accessoryIds: [],
  customDescription: '',
};
