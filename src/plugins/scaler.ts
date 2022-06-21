import {formatQuantity} from 'format-quantity';
import {getTextOfAnnotation, Plugin} from './index';
import {Annotation, MarkdownDoc} from '../slate-automerge';
import {INGREDIENT_TYPE, SCALE_FACTOR_TYPE} from '../annotations';

const getScaleFactor = (annotations: Annotation[]): number | undefined => {
  const scaleAnnotations = annotations.filter(
    (a) => a._type === "Scale Factor"
  );
  if (scaleAnnotations.length === 0) {
    return undefined;
  }

  return scaleAnnotations[0]!.data.scaleFactor;
};


const scalerPlugin: Plugin = {

  transform(annotations: Annotation[], doc: MarkdownDoc) {
    for (const annotation of annotations) {
      if (annotation._type === SCALE_FACTOR_TYPE) {
        const text = getTextOfAnnotation(doc, annotation)
        annotation.data.scaleFactor = parseFloat(text)
      }
    }
  },

  annotations: {
    [INGREDIENT_TYPE]: {
      view: (annotation: Annotation, allAnnotations: Annotation[]) => {
        const scaleFactor = getScaleFactor(allAnnotations);
        if (scaleFactor === undefined) {
          return undefined;
        }
        // A hardcoded transformation function that scales by 2x
        return `${formatQuantity(annotation.data.quantity * scaleFactor, true)} ${
          annotation.data.unitPlural
        }`;
      }
    }
  }
}

export default scalerPlugin;