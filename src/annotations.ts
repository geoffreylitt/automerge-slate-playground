import {parse as parseIngredient} from 'recipe-ingredient-parser-v3';
import {formatQuantity} from 'format-quantity';
import {Annotation} from './slate-automerge';

export type AnnotationType = {
  _type: string;
  color: { r: number; g: number; b: number };
  icon: string;
  parseStructuredData?: (text: string) => any;
  visibleFields?: string[];

  /** Given the annotation data, produce a transformed string */
  transform?: (
    annotation: Annotation,
    allAnnotations: Annotation[]
  ) => string | undefined;
};


// This is a hardcoded version of a scaling plugin.
// Given the annotations for a doc, it returns the desired scale factor.
const getScaleFactor = (annotations: Annotation[]): number | undefined => {
  const scaleAnnotations = annotations.filter(
    (a) => a._type === "Scale Factor"
  );
  if (scaleAnnotations.length === 0) {
    return undefined;
  }
  const result = scaleAnnotations[0]!.data.scaleFactor;
  console.log({ result });
  return result;
};

export const INGREDIENT_TYPE = "Ingredient"

export const ANNOTATION_TYPES: AnnotationType[] = [
  {
    _type: INGREDIENT_TYPE,
    color: { r: 253, g: 253, b: 85 },
    icon: "🥕",
    visibleFields: ["quantity", "unit", "ingredient"],
    transform: (annotation, allAnnotations) => {
      const scaleFactor = getScaleFactor(allAnnotations);
      if (scaleFactor === undefined) {
        return undefined;
      }
      // A hardcoded transformation function that scales by 2x
      return `${formatQuantity(annotation.data.quantity * scaleFactor, true)} ${
        annotation.data.unitPlural
      }`;
    },
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
    _type: "Scale Factor",
    icon: "🍴",
    color: { r: 65, g: 155, b: 204 },
    // We take advantage of a little hack here for convenience:
    // parseFloat will turn "2x" into the number 2.
    parseStructuredData: (text: string) => ({ scaleFactor: parseFloat(text) }),
  },
  {
    _type: "Tag",
    icon: "🏷",
    color: { r: 16, g: 176, b: 165 },
  },
];

