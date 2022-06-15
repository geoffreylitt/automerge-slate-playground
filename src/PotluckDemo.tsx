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
        display: grid;
        grid-template-columns: 50% 50%;
        grid-template-rows: auto;
        grid-template-areas: "app-left app-right";
        column-gap: 50px;

        width: 90vw;
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
        <div
          css={css`
            margin-bottom: 10px;
            font-size: 14px;
            text-transform: uppercase;
            color: #aaa;
          `}
        >
          Text Doc
        </div>
        <PotluckEditor doc={doc} changeDoc={changeDoc} />
      </div>
      <div
        css={css`
          grid-area: app-right;
          overflow: hidden;
        `}
      >
        <div
          css={css`
            margin-bottom: 10px;
            font-size: 14px;
            text-transform: uppercase;
            color: #aaa;
          `}
        >
          Plugins
        </div>
      </div>
    </div>
  );
}
