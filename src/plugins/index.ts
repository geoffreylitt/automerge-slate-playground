import {
  Annotation,
  getTextAtAutomergeSpan,
  MarkdownDoc,
} from "../slate-automerge";
import {cloneDeep} from "lodash";
import * as Automerge from "automerge";
import {useObservableListener} from "../hooks";
import {useRef} from "react";

export type AnnotationView = (
  data: any,
  allAnnotations: Annotation[]
) => JSX.Element | string | undefined;

export type ComputedProperty = (data: any) => any;

export type ComputedProperties = { [name: string]: ComputedProperty };

export type EffectHooks = {
  onChange?: () => void;
  onMount?: () => void;
  onUnmount?: () => void;
}

export type AnnotationExtension = {
  view?: AnnotationView;
  computed?: ComputedProperties;
  defaults?: ComputedProperties;
  effect?: () => EffectHooks
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

// todo: handle conflicting computed properties / views / effect
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

      if (extension.effect) {
        mergedExtension.effect = extension.effect
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


type AnnotationChange = {
  action: 'change' | 'insert' | 'remove',
  annotation: Annotation
  index: string
}

function getAnnotationChangesFromDiff(diff: Automerge.ObjectDiff, before: MarkdownDoc, after: MarkdownDoc): AnnotationChange [] {
  const annotations: any = Object.values(diff.props.annotations)[0]

  const changedIndex: { [index: string]: boolean } = {}
  const insertedIndex: { [index: string]: boolean } = {}
  const deletedIndex: { [index: string]: boolean } = {}

  const edits = annotations.edits;

  if (edits) {
    for (const edit of edits) {
      switch (edit.action) {
        case 'insert':
          insertedIndex[edit.index] = true
          break;
        case 'remove':
          deletedIndex[edit.index] = true
          break;
      }
    }
  }

  for (const prop of Object.keys(annotations.props)) {
    if (!insertedIndex[prop]) {
      changedIndex[prop] = true
    }
  }

  return Object.entries(changedIndex)
    .map(([index]) => ({ action: 'change', index, annotation: after.annotations[parseInt(index)] }) as AnnotationChange)
    .concat(
      Object.entries(insertedIndex)
        .map(([index]) => ({ action: 'insert', index, annotation: after.annotations[parseInt(index)] }))
    )
    .concat(
      Object.entries(deletedIndex)
        .map(([index]) => ({ action: 'remove', index, annotation: before.annotations[parseInt(index)] }))
    )
}


export function useEffectHandlers(observable: Automerge.Observable, doc: MarkdownDoc, extensionsByType: { [type: string]: AnnotationExtension }) {
  const effectHandlersRef = useRef({})

  useObservableListener(observable, doc, (diff, before, after) => {
    try {

      const changes = getAnnotationChangesFromDiff(diff, before, after)

      const effectHandlers: { [id: string]: EffectHooks } = effectHandlersRef.current

      for (const { action, annotation, index } of changes) {
        const extension = extensionsByType[annotation._type]

        if (!extension) {
          continue
        }

        const effect = extensionsByType[annotation._type].effect

        if (!effect) {
          continue
        }

        switch (action) {
          case "change":
            effectHandlers[annotation.id].onChange()
            break;

          case "insert":
            const handler = effectHandlers[annotation.id] = effect()
            handler.onMount()
            break;

          case "remove":
            effectHandlers[annotation.id].onUnmount()
            delete effectHandlers[annotation.id]
            break;
        }
      }
    } catch (err) {
      console.log('err', err)
    }
  })
}
