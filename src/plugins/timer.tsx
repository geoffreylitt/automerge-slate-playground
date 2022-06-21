import React from "react"
import {DURATION_TYPE} from '../annotations';
import {getTextOfAnnotation, Plugin} from './index';
import parseDuration from 'parse-duration'
import {Annotation, MarkdownDoc} from '../slate-automerge';

const timerPlugin: Plugin = {

  transform(annotations: Annotation[], doc: MarkdownDoc) {
    for (const annotation of annotations) {
      const text = getTextOfAnnotation(doc, annotation)

      if (annotation._type === DURATION_TYPE) {
         annotation.data.totalSeconds = parseDuration(text) / 1000
      }
    }
  },

  annotations: {
    [DURATION_TYPE]: {
      computed: {
        isInProgress: ({remainingSeconds}) => remainingSeconds !== undefined,
        isFinished: ({remainingSeconds}) => remainingSeconds === 0,
        isPaused: ({remainingSeconds, isRunning}) => remainingSeconds > 0 && isRunning === false,
        minutesDigits: ({remainingSeconds}) => Math.floor(remainingSeconds / 60),
        secondsDigits: ({remainingSeconds, minutesDigits}) => remainingSeconds - minutesDigits * 60,
      },

      defaults: {
        isRunning: () => false,
        remainingSeconds: ({ totalSeconds }) => totalSeconds
      },

      view: ({ minutesDigits, secondsDigits }) => {
        return (
          <div>
            ({minutesDigits.toString().padStart('0', 2)} : {secondsDigits.toString().padStart('0', 2)} ▶️)
          </div>
        )
      }
    }
  }
}

export default timerPlugin;


