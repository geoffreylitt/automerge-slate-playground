import {Annotation, getTextAtAutomergeSpan, MarkdownDoc} from "../slate-automerge"
import {cloneDeep} from "lodash"

export type AnnotationView = (annotation: Annotation, allAnnotations: Annotation[]) => string | undefined

export type ComputedProperty = (data: any) => any

export type AnnotationExtension = {
  view?: AnnotationView
  computed?: { [name: string]: ComputedProperty }
}

export type Plugin = {
  transform?: (annotations: Annotation[], doc: MarkdownDoc) => void,
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

// todo: handle conflicting computed properties / views
// currently new plugins override previous plugins

export function getMergedExtensions(plugins: Plugin []): { [annotationType: string]: AnnotationExtension } {
  const extensionsByAnnotation: { [annotationType: string]: AnnotationExtension } = {}

  plugins.forEach(({annotations}, index) => {
    if (!annotations) {
      return
    }

    for (const [annotationType, extension] of Object.entries(annotations)) {
      let mergedExtension = extensionsByAnnotation[annotationType]

      if (!mergedExtension) {
        mergedExtension = extensionsByAnnotation[annotationType] = { computed: {} }
      }

      if (extension.view) {
       mergedExtension.view = extension.view
      }

      if (extension.computed) {
        for (const [name, computation] of Object.entries(extension.computed)) {
          mergedExtension.computed[name] = computation
        }
      }
    }
  })

  return extensionsByAnnotation
}

