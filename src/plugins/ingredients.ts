import { parse as parseIngredient } from "recipe-ingredient-parser-v3";
import { getTextOfAnnotation, Plugin } from "./index";
import { Annotation, MarkdownDoc } from "../slate-automerge";
import { INGREDIENT_TYPE } from "../annotations";

const ingredientsPlugin: Plugin = {
  transform(annotations: Annotation[], doc: MarkdownDoc) {
    for (const annotation of annotations) {
      if (annotation._type === INGREDIENT_TYPE) {
        const text = getTextOfAnnotation(doc, annotation);
        annotation.data = parseIngredient(text, "eng");
      }
    }
  },
};

export default ingredientsPlugin;
