declare module 'flubber' {
  export interface InterpolateOptions {
    maxSegmentLength?: number;
    string?: boolean;
  }

  export function interpolate(
    fromShape: string | number[][],
    toShape: string | number[][],
    options?: InterpolateOptions,
  ): (t: number) => string;
}
