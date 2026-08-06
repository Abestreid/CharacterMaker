export interface CharacterProfile {
  gender: string;
  age: number;
  bust: number;
  waist: number;
  hips: number;
  height: number;
  weight: number;
  hairLength: string;
  hairType: string;
  hairstyle: string;
  hairColor: string;
  eyeColor: string;
  hasMakeup: boolean;
  eyelinerStyle: string;
  eyeshadowColor: string;
  lipstickColor: string;
  skinTone: string;
  ethnicity: string;
  imageStyle: string;
  physiqueDescription?: string;

  // New body composition fields
  bodyFat: number; // as percentage
  muscleMass: string;
  breastShape: string;
  breastFirmness: string;
  buttockShape: string;
  buttockFirmness: string;

  // New facial features
  headShape: string;
  foreheadSize: string;
  eyebrowShape: string;
  eyebrowThickness: string;
  eyeShape: string;
  eyeSize: string;
  eyeSpacing: string;
  noseShape: string;
  noseSize: string;
  lipShape: string;
  cheekbones: string;
  chinShape: string;

  // New detailed clothing profile
  clothingPreset: string;
  baseLayerType: string;
  baseLayerColor: string;
  baseLayerMaterial: string;
  topType: string;
  topColor: string;
  topMaterial: string;
  bottomType: string;
  bottomColor: string;
  bottomMaterial: string;
  outerwearType: string;
  outerwearColor: string;
  outerwearMaterial: string;
  footwearType: string;
  footwearColor: string;
  footwearMaterial: string;
  
  // New structured accessories & tattoos
  hasAccessories: boolean;
  accessories: string[];
  accessoriesCustom: string;
  hasTattoos: boolean;
  tattooDescription: string;
}

export interface ImageResult {
  type: 'Портрет' | 'Полный Рост' | 'Вид Сзади' | 'Сцена';
  src: string;
  origin: 'generated' | 'uploaded';
}

export interface SceneResult {
  id: string;
  src: string;
  isUpscaling: boolean;
  error: string | null;
}

export interface ClothingPreset {
  name: string;
  category: 'Повседневная' | 'Работа/Униформа' | 'События/Вечеринки' | 'Спорт/Активности' | 'Фэнтези/Научная фантастика' | 'Другое';
  suggestedBackground: string;
  baseLayerType: string;
  baseLayerColor: string;
  baseLayerMaterial: string;
  topType: string;
  topColor: string;
  topMaterial: string;
  bottomType: string;
  bottomColor: string;
  bottomMaterial: string;
  outerwearType: string;
  outerwearColor: string;
  outerwearMaterial: string;
  footwearType: string;
  footwearColor: string;
  footwearMaterial: string;
  accessories: string[];
  accessoriesCustom: string;
}

export interface PhotoshootPreset {
    name: string;
    pose: string;
    shotType: string;
    background: string;
    aspectRatio: string;
    cameraVertical: string;
    cameraHorizontal: string;
    characterOrientation: string;
    emotion: string;
    imageStyle: string;
    lightingType: 'natural' | 'studio';
    naturalLight: string;
    studioLightSetup: string;
    studioMainLightColor: string;
    studioAccentLightColor: string;
    colorTemperature: number;
    filter: string;
}
