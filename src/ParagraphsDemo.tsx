/** @jsx jsx */
/* @jsxFrag React.Fragment */

import { jsx, css } from '@emotion/react'
import { useAutomergeDoc } from "./hooks"
import { RichTextDoc } from "./slate-automerge"
import Automerge from 'automerge'
import ReactJson from 'react-json-view'
import ParagraphsEditor from './ParagraphsEditor'
import { useState } from 'react'

export default function ParagraphsDemo() {
  const [doc, changeDoc] = useAutomergeDoc<any>({
    content: new Automerge.Text(`This is a doc with paragraphs\nSee? Two paragraphs!\n`),
  })

  const content:Node[] = doc.content.toString().split("\n").map(paragraph => ({
    type: "paragraph",
    children: [
      { text: paragraph }
    ]
  }))

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
      <ParagraphsEditor doc={doc} changeDoc={changeDoc} content={content} />
    </div>
    <div css={css`grid-area: app-right; overflow: hidden;`}>
      <div css={css`margin-bottom: 10px; font-size: 14px; text-transform: uppercase; color: #aaa;`}>Automerge doc state</div>
      <ReactJson src={{
        content: doc.content.toString().replace(/\n/g, "\\n")
      }} collapsed={false} collapseStringsAfterLength={280} displayDataTypes={false} displayObjectSize={false} />
      <div css={css`margin-top: 20px; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; color: #aaa;`}>Slate tree content</div>
      <ReactJson src={{
        content: content
      }} collapsed={false} collapseStringsAfterLength={280} displayDataTypes={false} displayObjectSize={false} />
    </div>
  </div>
}