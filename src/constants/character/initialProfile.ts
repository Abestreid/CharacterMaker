import { CharacterProfile } from '../../types';
import { CLOTHING_PRESETS } from '../clothing/presets';

const initialClothing = CLOTHING_PRESETS[0];
export const INITIAL_PROFILE: CharacterProfile = {
  gender: 'Женский',
  age: 25,
  bust: 90,
  waist: 65,
  hips: 95,
  height: 170,
  weight: 60,
  hairLength: 'Длинные',
  hairType: 'Волнистые',
  hairstyle: 'Распущенные',
  hairColor: 'Брюнет',
  eyeColor: 'Карие',
  hasMakeup: true,
  eyelinerStyle: 'Тонкая',
  eyeshadowColor: 'Нейтральный коричневый',
  lipstickColor: 'Натуральный',
  skinTone: 'Светлая',
  ethnicity: 'Европеоид',
  imageStyle: 'Гиперреалистичная фотография',
  physiqueDescription: 'Персонаж имеет стройное и подтянутое телосложение. Телосложение определяется грудью среднего размера, тонкой талией и бедрами средней ширины. Эта комбинация создает выраженную фигуру "песочные часы".',

  // Body composition
  bodyFat: 22,
  muscleMass: 'Тонизированная',
  breastShape: 'Круглая',
  breastFirmness: 'Упругая',
  buttockShape: 'Круглая',
  buttockFirmness: 'Упругая',

  // Facial features
  headShape: 'Овальная',
  foreheadSize: 'Средний',
  eyebrowShape: 'Изогнутые',
  eyebrowThickness: 'Средние',
  eyeShape: 'Миндалевидные',
  eyeSize: 'Средние',
  eyeSpacing: 'Среднее расстояние',
  noseShape: 'Прямой',
  noseSize: 'Средний',
  lipShape: 'Полные',
  cheekbones: 'Высокие скулы',
  chinShape: 'Острый',

  // Initialize with the first clothing preset
  clothingPreset: initialClothing.name,
  baseLayerType: initialClothing.baseLayerType,
  baseLayerColor: initialClothing.baseLayerColor,
  baseLayerMaterial: initialClothing.baseLayerMaterial,
  topType: initialClothing.topType,
  topColor: initialClothing.topColor,
  topMaterial: initialClothing.topMaterial,
  bottomType: initialClothing.bottomType,
  bottomColor: initialClothing.bottomColor,
  bottomMaterial: initialClothing.bottomMaterial,
  outerwearType: initialClothing.outerwearType,
  outerwearColor: initialClothing.outerwearColor,
  outerwearMaterial: initialClothing.outerwearMaterial,
  footwearType: initialClothing.footwearType,
  footwearColor: initialClothing.footwearColor,
  footwearMaterial: initialClothing.footwearMaterial,
  accessories: initialClothing.accessories,
  accessoriesCustom: initialClothing.accessoriesCustom,

  // Tattoos & Accessories
  hasAccessories: false,
  hasTattoos: false,
  tattooDescription: '',
};
