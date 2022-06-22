import { parse as parseIngredient } from "recipe-ingredient-parser-v3";
import { Plugin, getTextOfAnnotation } from "./index";
import { Annotation } from "../slate-automerge";
import { INGREDIENT_TYPE } from "../annotations";
import Automerge from 'automerge'

const ingredientsPlugin: Plugin = {
  transform(annotations: Annotation[], text: Automerge.Text) {
    for (const annotation of annotations) {
      if (annotation._type === INGREDIENT_TYPE) {
        const annotationText = getTextOfAnnotation(text, annotation);
        annotation.data = parseIngredient(annotationText, "eng");
      }
    }
  },
};

export default ingredientsPlugin;
