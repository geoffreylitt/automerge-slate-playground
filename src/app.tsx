/** @jsx jsx */
/* @jsxFrag React.Fragment */

import { jsx, css } from '@emotion/react'
import { render } from "react-dom";
import Automerge from 'automerge'
import { useAutomergeDoc } from './hooks'
import { MarkdownDoc, RichTextDoc } from './slate-automerge'
import RichTextEditor from './RichTextEditor';
import ReactJson from 'react-json-view'

const initialDoc:RichTextDoc = {
  content: new Automerge.Text(`Slate Automerge

This is some text. Formatting can be applied with cmd+b and cmd+i.`),
  formatSpans: []
}

const App = () => {
  const [doc, changeDoc] = useAutomergeDoc<RichTextDoc>(initialDoc)

  return <div css={css`
        display: grid;
        grid-template-columns: 50% 50%;
        grid-template-rows: 30px auto;
        grid-template-areas:
          "header header"
          "app-left app-right";
        column-gap: 20px;
        row-gap: 10px;
        font-family: "Fira Sans", sans-serif;
        width: 90vw;
        height: 100vh;
        box-sizing: border-box;
      `}>
        <div css={css`
        grid-area: header;
        `}>
          <strong>Automerge Rich Text Editor</strong>
        </div>
        <div css={css`grid-area: app-left; overflow: hidden;`}>
          <RichTextEditor doc={doc} changeDoc={changeDoc} />
        </div>
        <div css={css`grid-area: app-right; overflow: hidden;`}>
          <ReactJson src={{
            content: doc.content.toString(),
            formatSpans: doc.formatSpans.map(span => ({
              start: span.span.start.index,
              end: span.span.end.index,
              format: span.format,
              remove: !!span.remove
            }))
          }} collapsed={false} collapseStringsAfterLength={280} displayDataTypes={false} displayObjectSize={false} />
        </div>
      </div>
}

render(
  <App />,
  document.getElementById("app")
);