import {DURATION_TYPE} from '../annotations';
import {getTextOfAnnotation, Plugin} from './index';
import parseDuration from 'parse-duration'
import {Annotation, MarkdownDoc} from '../slate-automerge';

const timerPlugin: Plugin = {

  transform(annotations: Annotation[], doc: MarkdownDoc) {
    for (const annotation of annotations) {
      const text = getTextOfAnnotation(doc, annotation)

      if (annotation._type === DURATION_TYPE) {
         annotation.data.durationInSeconds = parseDuration(text) / 1000
      }
    }
  }
}

export default timerPlugin;


