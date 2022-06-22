import React from "react";
import { DURATION_TYPE } from "../annotations";
import { getTextOfAnnotation, Plugin } from "./index";
import parseDuration from "parse-duration";
import { Annotation, MarkdownDoc } from "../slate-automerge";
import Automerge from "automerge";

const timerPlugin: Plugin = {
  transform(annotations: Annotation[], text: Automerge.Text) {
    for (const annotation of annotations) {
      const annotationText = getTextOfAnnotation(text, annotation);

      if (annotation._type === DURATION_TYPE) {
        annotation.data.totalSeconds = parseDuration(annotationText) / 1000;
      }
    }
  },

  annotations: {
    [DURATION_TYPE]: {
      computed: {
        isInProgress: ({ remainingSeconds }) => remainingSeconds !== undefined,
        isFinished: ({ remainingSeconds }) => remainingSeconds === 0,
        isPaused: ({ remainingSeconds, isRunning }) =>
          remainingSeconds > 0 && isRunning === false,
        minutesDigits: ({ remainingSeconds }) =>
          Math.floor(remainingSeconds / 60),
        secondsDigits: ({ remainingSeconds, minutesDigits }) =>
          remainingSeconds - minutesDigits * 60,
      },

      defaults: {
        isRunning: () => false,
        remainingSeconds: ({ totalSeconds }) => totalSeconds,
      },

      view: ({ minutesDigits, secondsDigits }) => {
        return (
          <div style={{padding: '8px'}}>
            {minutesDigits.toString().padStart(2, "0")} : {secondsDigits.toString().padStart(2, "0")}
          </div>
        )
      }
    },
  },
};

export default timerPlugin;
