import {
  AGE_PARAMETER,
  CHARACTER_MEASUREMENTS,
  COLOR_TEMPERATURE_PARAMETER,
} from '../catalog';

export const NUMERIC_PARAMETERS = {
  character: {
    age: AGE_PARAMETER,
    ...CHARACTER_MEASUREMENTS,
  },
  scene: {
    colorTemperature: COLOR_TEMPERATURE_PARAMETER,
  },
} as const;
