import {
  Annotation,
  getTextAtAutomergeSpan,
  MarkdownDoc,
} from "../slate-automerge";
import { cloneDeep } from "lodash";
import * as Automerge from "automerge";

export type AnnotationView = (
  data: any,
  allAnnotations: Annotation[]
) => JSX.Element | string | undefined;

export type ComputedProperty = (data: any) => any;

export type ComputedProperties = { [name: string]: ComputedProperty };

export type AnnotationExtension = {
  view?: AnnotationView;
  computed?: ComputedProperties;
  defaults?: ComputedProperties;
};

export type Plugin = {
  transform?: (annotations: Annotation[], text: Automerge.Text) => void;
  annotations?: {
    [annotationType: string]: AnnotationExtension;
  };
};

export function getTextOfAnnotation(
  text: Automerge.Text,
  annotation: Annotation
): string {
  return getTextAtAutomergeSpan(text, annotation.range);
}

export function applyPluginTransforms(
  plugins: Plugin[],
  text: Automerge.Text,
  annotations: Annotation[]
): Annotation[] {
  annotations = cloneDeep(annotations);

  for (const plugin of plugins) {
    if (plugin.transform) {
      plugin.transform(annotations, text);
    }
  }

  return annotations;
}

// todo: handle conflicting computed properties / views
// currently new plugins override previous plugins

export function getMergedExtensions(plugins: Plugin[]): {
  [annotationType: string]: AnnotationExtension;
} {
  const extensionsByAnnotation: {
    [annotationType: string]: AnnotationExtension;
  } = {};

  plugins.forEach(({ annotations }, index) => {
    if (!annotations) {
      return;
    }

    for (const [annotationType, extension] of Object.entries(annotations)) {
      let mergedExtension = extensionsByAnnotation[annotationType];

      if (!mergedExtension) {
        mergedExtension = extensionsByAnnotation[annotationType] = {
          computed: {},
          defaults: {},
        };
      }

      if (extension.view) {
        mergedExtension.view = extension.view;
      }

      if (extension.computed) {
        for (const [name, computation] of Object.entries(extension.computed)) {
          mergedExtension.computed[name] = computation;
        }
      }

      if (extension.defaults) {
        for (const [name, defaultComputation] of Object.entries(
          extension.defaults
        )) {
          mergedExtension.defaults[name] = defaultComputation;
        }
      }
    }
  });

  return extensionsByAnnotation;
}

const ENABLE_PROXY_LOG = false;

export function annotationWithComputedProps(
  data: any,
  extension: AnnotationExtension
): any {
  if (!extension || (!extension.computed && !extension.defaults)) {
    return data;
  }

  const { computed = {}, defaults = {} } = extension;

  const handler = {
    get(target: any, prop: string) {
      if (target.hasOwnProperty(prop)) {
        return target[prop];
      }

      ENABLE_PROXY_LOG && console.log("get", prop);

      const computation = computed[prop];

      ENABLE_PROXY_LOG && console.log("computation", computation);

      if (computation) {
        const result = computation(
          annotationWithComputedProps(data, extension)
        );

        ENABLE_PROXY_LOG && console.log("=", result);

        return result;
      }

      const defaultComputation = defaults[prop];

      ENABLE_PROXY_LOG && console.log("default", defaultComputation);

      if (defaultComputation) {
        const result = defaultComputation(
          annotationWithComputedProps(data, extension)
        );

        ENABLE_PROXY_LOG && console.log("=", result);

        return result;
      }

      return target[prop];
    },

    set() {
      throw new Error("invalid mutation");
    },
  };

  return new Proxy(data, handler);
}
