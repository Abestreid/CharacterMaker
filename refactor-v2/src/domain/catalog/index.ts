export * from './core';
export * from './shared';
export * from './character';
export * from './wardrobe';
export * from './scene';

import * as shared from './shared';
import * as character from './character';
import * as wardrobe from './wardrobe';
import * as scene from './scene';

export const CATALOG = {
  shared,
  character,
  wardrobe,
  scene,
} as const;
