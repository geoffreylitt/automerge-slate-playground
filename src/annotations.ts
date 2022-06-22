export type AnnotationType = {
  _type: string;
  color: { r: number; g: number; b: number };
  icon: string;
  visibleFields?: string[];
};

export const INGREDIENT_TYPE = "Ingredient";
export const SCALE_FACTOR_TYPE = "Scale Factor";
export const DURATION_TYPE = "Duration";

export const ANNOTATION_TYPES: AnnotationType[] = [
  {
    _type: INGREDIENT_TYPE,
    color: { r: 253, g: 253, b: 85 },
    icon: "🥕",
    visibleFields: ["quantity", "unit", "ingredient"],
  },
  {
    _type: "Ingredient Quantity",
    icon: "🥄",
    color: { r: 204, g: 65, b: 135 },
  },
  {
    _type: "Ingredient Name",
    icon: "🍅",
    color: { r: 204, g: 98, b: 65 },
  },
  {
    _type: DURATION_TYPE,
    icon: "🕓",
    color: { r: 50, g: 250, b: 50 },
    visibleFields: [
      "text",
      "totalSeconds",
      "remainingSeconds",
      "isRunning",
      "isInProgress",
      "isFinished",
      "isPaused",
      "minutesDigits",
      "secondsDigits",
    ],
  },
  {
    _type: "Step",
    icon: "🔢",
    color: { r: 250, g: 50, b: 50 },
  },
  {
    _type: SCALE_FACTOR_TYPE,
    icon: "🍴",
    color: { r: 65, g: 155, b: 204 },
  },
  {
    _type: "Tag",
    icon: "🏷",
    color: { r: 16, g: 176, b: 165 },
  },
];
