import {parse as parseIngredient} from 'recipe-ingredient-parser-v3';
import {formatQuantity} from 'format-quantity';
import {Annotation} from './slate-automerge';

export type AnnotationType = {
  _type: string;
  color: { r: number; g: number; b: number };
  icon: string;
  visibleFields?: string[];
};

export const INGREDIENT_TYPE = "Ingredient"
export const SCALE_FACTOR_TYPE = "Scale Factor"

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
    _type: "Duration",
    icon: "🕓",
    color: { r: 50, g: 250, b: 50 },
  },
  {
    _type: "Step",
    icon: "🔢",
    color: { r: 250, g: 50, b: 50 },
  },
  {
    _type: SCALE_FACTOR_TYPE,
    icon: "🍴",
    color: { r: 65, g: 155, b: 204 }
  },
  {
    _type: "Tag",
    icon: "🏷",
    color: { r: 16, g: 176, b: 165 },
  },
];

