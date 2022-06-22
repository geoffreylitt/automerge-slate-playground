import Automerge from "automerge";
import { useState, useRef, useEffect } from "react";

export function useAutomergeDoc<DocType>({
  initialDoc,
  observable,
}: {
  initialDoc: DocType;
  observable: Automerge.Observable;
}): [DocType, (callback: any) => void, (doc: DocType) => void] {
  const [doc, setDoc] = useState<DocType>(() => {
    return Automerge.from(initialDoc, { observable }) as DocType;
  });

  const changeDoc = (callback: any) => {
    setDoc((doc) => Automerge.change(doc, (d) => callback(d)));
  };

  return [doc, changeDoc, setDoc];
}

export function useObservable() {
  const observableRef = useRef(new Automerge.Observable());

  return observableRef.current;
}

export function useObservableListener<DocType>(
  observable: Automerge.Observable,
  doc: DocType,
  callback: (
    diff: Automerge.ObjectDiff,
    before: DocType,
    after: DocType
  ) => void
) {
  const callbackRef: any = useRef();

  callbackRef.current = callback;

  useEffect(() => {
    observable.observe(doc, (diff, before, after) => {
      callbackRef.current(diff, before, after);
    });
  }, []);
}
