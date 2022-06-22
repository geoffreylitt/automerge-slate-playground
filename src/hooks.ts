import Automerge from "automerge";
import { useState } from "react";

export function useAutomergeDoc<DocType>(
  initialDoc: DocType
): [DocType, (callback: any) => void, (doc: DocType) => void] {
  const [doc, setDoc] = useState<DocType>(
    Automerge.from(initialDoc) as DocType
  );

  const changeDoc = (callback: any) => {
    setDoc((doc) => Automerge.change(doc, (d) => callback(d)));
  };

  return [doc, changeDoc, setDoc];
}
