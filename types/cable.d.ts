export interface Cable {
  id: string;
  /**
   * @minItems 2
   * @maxItems 2
   */
  endpoints: [string, string];
  media?: "SMF" | "MMF" | "copper" | "DAC" | "AOC";
  length_m?: number;
}
