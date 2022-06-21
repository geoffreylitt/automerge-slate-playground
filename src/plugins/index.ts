import {Annotation, getTextAtAutomergeSpan, MarkdownDoc} from "../slate-automerge"
import {cloneDeep} from "lodash"

export type AnnotationView = (annotation: Annotation, allAnnotations: Annotation[]) => string | undefined

export type AnnotationExtension = {
  view?: AnnotationView
}

export type Plugin = {
  transform?: (annotations: Annotation[], doc: MarkdownDoc) => void
  annotations?: {
    [annotationType: string]: AnnotationExtension
  }
}

export function getTextOfAnnotation(doc: MarkdownDoc, annotation: Annotation): string {
  return getTextAtAutomergeSpan(doc.content, annotation.range)
}

export function applyPluginTransforms(plugins: Plugin [], doc: MarkdownDoc, annotations: Annotation[]): Annotation [] {
  annotations = cloneDeep(annotations)

  for (const plugin of plugins) {
    if (plugin.transform) {
      plugin.transform(annotations, doc)
    }
  }

  return annotations
}

export function getAlternativeViewsByAnnotation(plugins: Plugin []) : {[annotationType: string]: AnnotationView[]} {
  const alternativeViewsByAnnotation : {[annotationType: string]: AnnotationView[]} = {}

  plugins.forEach(({annotations}, index) => {
    if (!annotations) {
      return
    }

    for (const [type, extension] of Object.entries(annotations)) {
      if (!extension.view) {
        continue
      }

      let group = alternativeViewsByAnnotation[type]

      if (!group) {
        group = alternativeViewsByAnnotation[type] = []
      }

      group.push(extension.view)
    }
  })

  return alternativeViewsByAnnotation
}
