import {Annotation, getTextAtAutomergeSpan, MarkdownDoc} from "./slate-automerge"
import {cloneDeep} from "lodash"
import {parse as parseIngredient} from 'recipe-ingredient-parser-v3';
import {INGREDIENT_TYPE} from './annotations';


function getTextOfAnnotation(doc: MarkdownDoc, annotation: Annotation): string {
  return getTextAtAutomergeSpan(doc.content, annotation.range)
}

export const ingredientsPlugin : Plugin = {
  transform(annotations: Annotation[], doc: MarkdownDoc) {

    for (const annotation of annotations) {
      if (annotation._type === INGREDIENT_TYPE) {

        const text = getTextOfAnnotation(doc, annotation) // todo: make this a computed property
        const result = parseIngredient(text, "eng");
        const {ingredient, quantity, unit} = result


        annotation.data.ingredient = ingredient
        annotation.data.quantity = quantity
        annotation.data.unit = unit
      }
    }
  }
}


export type Plugin = {
  transform?: (annotations: Annotation[], doc: MarkdownDoc) => void
}


export function applyPluginTransforms(plugins: Plugin [], doc: MarkdownDoc, annotations: Annotation[]) : Annotation [] {
  annotations = cloneDeep(annotations)

  for (const plugin of plugins) {
    if (plugin.transform) {
      plugin.transform(annotations, doc)
    }
  }

  return annotations
}