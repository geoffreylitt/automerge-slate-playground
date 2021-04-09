/** @jsx jsx */
/* @jsxFrag React.Fragment */

import { jsx, css } from '@emotion/react'
import { useAutomergeDoc } from "./hooks"
import { automergeSpanFromSlateRange, RichTextDoc } from "./slate-automerge"
import Automerge from 'automerge'
import ReactJson from 'react-json-view'
import RichTextEditor from './RichTextEditor'

export default function RichTextDemo() {
  const [doc, changeDoc] = useAutomergeDoc<RichTextDoc>({
    content: new Automerge.Text(`Rich Text Demo

This is a simple WYSIWYG editor. Try bolding/italicizing text with cmd+b and cmd+i.

Overlapping spans apply correctly, and spans stay attached as the text changes.`),
    formatSpans: []
  })

  return <div css={css`
    display: grid;
    grid-template-columns: 50% 50%;
    grid-template-rows: auto;
    grid-template-areas:
      "app-left app-right";
    column-gap: 50px;

    width: 90vw;
    height: 100%;
    box-sizing: border-box;
  `}>
    <div css={css`grid-area: app-left; overflow: hidden;`}>
      <div css={css`margin-bottom: 10px; font-size: 14px; text-transform: uppercase; color: #aaa;`}>Editor UI</div>
      <RichTextEditor doc={doc} changeDoc={changeDoc} />
    </div>
    <div css={css`grid-area: app-right; overflow: hidden;`}>
    <div css={css`margin-bottom: 10px; font-size: 14px; text-transform: uppercase; color: #aaa;`}>Automerge doc state</div>
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