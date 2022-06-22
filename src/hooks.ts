import Automerge from "automerge";
import {useState, useRef} from "react";

export function useAutomergeDoc<DocType>(
  initialDoc: DocType,
  onChange?: (diff: any, before: DocType, after: DocType) => void
): [DocType, (callback: any) => void, (doc: DocType) => void] {

  const onObserveRef = useRef<any>()
  onObserveRef.current = onChange

  const [doc, setDoc] = useState<DocType>(() => {
    let observable = new Automerge.Observable()

    const doc = Automerge.from(initialDoc, { observable }) as DocType

    observable.observe(doc, (diff, before, after) => {
      if (onObserveRef.current) {
        onObserveRef.current(diff, before, after)
      }
    })

    return doc
  });

  const changeDoc = (callback: any) => {
    setDoc((doc) => Automerge.change(doc, (d) => callback(d)));
  };

  return [doc, changeDoc, setDoc];
}
