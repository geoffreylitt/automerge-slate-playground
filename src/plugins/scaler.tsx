import React from "react";
import { formatQuantity } from "format-quantity";
import { getTextOfAnnotation, Plugin } from "./index";
import { Annotation, MarkdownDoc } from "../slate-automerge";
import { INGREDIENT_TYPE, SCALE_FACTOR_TYPE } from "../annotations";
import Automerge from "automerge";

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
  transform(annotations: Annotation[], text: Automerge.Text) {
    for (const annotation of annotations) {
      if (annotation._type === SCALE_FACTOR_TYPE) {
        const annotationText = getTextOfAnnotation(text, annotation);
        annotation.data.scaleFactor = parseFloat(annotationText);
      }
    }
  },

  annotations: {
    [INGREDIENT_TYPE]: {
      view: ({ quantity, unitPlural }, allAnnotations: Annotation[]) => {
        const scaleFactor = getScaleFactor(allAnnotations);
        if (scaleFactor === undefined) {
          return undefined;
        }
        // A hardcoded transformation function that scales by 2x
        return `→ ${formatQuantity(
          quantity * scaleFactor,
          true
        )} ${unitPlural}`;
      },
    },
  },
};

export default scalerPlugin;
