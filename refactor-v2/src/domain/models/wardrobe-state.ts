import type {
  AccessoryId,
  BaseLayerTypeId,
  BottomTypeId,
  ClothingColorId,
  ClothingMaterialId,
  FootwearTypeId,
  OuterwearTypeId,
  TopTypeId,
} from '../catalog';

export interface ClothingLayerState<TTypeId extends string> {
  typeId: TTypeId;
  colorId: ClothingColorId | null;
  materialId: ClothingMaterialId | null;
}

export interface WardrobeState {
  baseLayer: ClothingLayerState<BaseLayerTypeId>;
  top: ClothingLayerState<TopTypeId>;
  bottom: ClothingLayerState<BottomTypeId>;
  outerwear: ClothingLayerState<OuterwearTypeId>;
  footwear: ClothingLayerState<FootwearTypeId>;
  accessoryIds: AccessoryId[];
  customDescription: string;
}
