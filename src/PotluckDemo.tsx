/** @jsx jsx */
/* @jsxFrag React.Fragment */

import { jsx, css } from "@emotion/react";
import { useAutomergeDoc } from "./hooks";
import { MarkdownDoc, RichTextDoc } from "./slate-automerge";
import Automerge from "automerge";
import ReactJson from "react-json-view";
import PotluckEditor from "./PotluckEditor";

export default function PotluckDemo() {
  const [doc, changeDoc] = useAutomergeDoc<MarkdownDoc>({
    content: new Automerge.Text(`# Green Eggs and Ham

## Ingredients

- A dozen Green Eggs
- 1 large ham

## Steps

- Put the eggs in the pan
- Put the ham in the pan
- Cook for 10 minutes
- Enjoy!`),
    annotations: [],
  });

  return (
    <div
      css={css`
        max-width: 1000px;
        height: 100%;
        box-sizing: border-box;
      `}
    >
      <div
        css={css`
          grid-area: app-left;
          overflow: hidden;
        `}
      >
        <PotluckEditor doc={doc} changeDoc={changeDoc} />
      </div>
    </div>
  );
}
