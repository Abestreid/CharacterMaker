
export const SCENE_SHOT_TYPES = [
  { label: 'Экстремальный крупный план (глаза)', value: 'Extreme Close-Up (eyes only)' },
  { label: 'Крупный план (лицо)', value: 'Close-Up (face)' },
  { label: 'По грудь', value: 'Medium Close-Up (bust shot)' },
  { label: 'По пояс', value: 'Medium Shot (waist up)' },
  { label: 'По колени', value: 'Medium Long Shot (knees up)' },
  { label: 'Американский план (по щиколотки)', value: 'American Shot (ankles up)' },
  { label: 'В полный рост', value: 'Full Body Shot' }
];

export const ASPECT_RATIOS = [
  '1:1',
  '3:4',
  '4:3',
  '9:16',
  '16:9'
];

export const CAMERA_VERTICAL_POSITIONS = [
    { label: 'Сверху над персонажем (вид сверху)', value: 'top-down bird\'s-eye view' },
    { label: 'Высокий угол (сверху вниз)', value: 'high angle' },
    { label: 'Уровень глаз (прямо)', value: 'eye-level angle' },
    { label: 'Низкий угол (снизу вверх)', value: 'low angle' },
    { label: 'Снизу под персонажем (червячный ракурс)', value: 'worm\'s-eye view' }
];

export const CAMERA_HORIZONTAL_POSITIONS = [
    { label: 'Слева', value: 'from the left' },
    { label: 'По центру', value: 'from the center' },
    { label: 'Справа', value: 'from the right' }
];
