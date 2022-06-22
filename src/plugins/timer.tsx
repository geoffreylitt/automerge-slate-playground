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
        isInProgress: ({ remainingSeconds, totalSeconds, isRunning }) => remainingSeconds !== totalSeconds || isRunning,
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

      view: ({ minutesDigits, secondsDigits, isFinished }) => {
        return (
          <div style={{
            padding: '8px',
            whiteSpace: 'nowrap',
            color: isFinished ? 'red' : 'black'
          }}>
            {minutesDigits.toString().padStart(2, "0")} : {secondsDigits.toString().padStart(2, "0")}
          </div>
        )
      },

      effect: (duration) => {
        let interval : any;

        const tick = () => {
          if (duration.remainingSeconds > 0) {
            duration.remainingSeconds = duration.remainingSeconds - 1
          } else {
            duration.isRunning = false
          }
        }

        return {
          onMount () {
            if (duration.isRunning) {
              interval = setInterval(tick, 1000)
            }
          },

          onUnmount () {
            clearInterval(interval);
          },

          onChange (prev) {
            if (prev.isRunning === duration.isRunning) {
              return
            }

            if (duration.isRunning) {
              interval = setInterval(tick, 1000)
              return
            }

            clearInterval(interval)
          }
        }
      }
    },
  },
};

export default timerPlugin;
