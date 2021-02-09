/** @jsx jsx */
/* @jsxFrag React.Fragment */

import { jsx, css } from '@emotion/react'
import { render } from "react-dom";
import MarkdownEditor from './MarkdownEditor';
import Automerge from 'automerge'
import { useState } from 'react';

export type AutomergeSpan = {
  start: Automerge.Cursor;
  end: Automerge.Cursor;
}

export type Comment = {
  id: string;
  range: AutomergeSpan;
  text: string;
}

export type MarkdownDoc = {
  content: Automerge.Text;
  comments: Comment[];
}

const initialContent = `## Goals
- Monolithic -> Customizable
- Siloed -> Interoperable
## Model
- Library of Concepts users can dynamically reconfigure
- Powerful data synchronizations enable composition
## Demo
- Interop between editors
- Show comments workflow on a kanban board
  - Add a resolved concept
  - Sync between board and editor`

const initialDoc:MarkdownDoc = {
  content: new Automerge.Text(initialContent),
  comments: []
}

function useAutomergeDoc(): [MarkdownDoc, (callback: any) => void] {
  const [doc, setDoc] = useState<MarkdownDoc>(Automerge.from(initialDoc))

  const changeDoc = (callback) => {
    setDoc(doc => Automerge.change(doc, d => callback(d)))
  }

  return [doc, changeDoc]
}

const App = () => {
  const [doc, changeDoc] = useAutomergeDoc()

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
        width: 100vw;
        height: 100vh;
        box-sizing: border-box;
      `}>
        <div css={css`
        grid-area: header;
        `}>
          <strong>Automerge Markdown Editor with Comments</strong>
        </div>
        <div css={css`grid-area: app-left; overflow: hidden;`}>
          <MarkdownEditor doc={doc} changeDoc={changeDoc} />
        </div>
        <div css={css`grid-area: app-right; overflow: hidden;`}>
        </div>
      </div>
}

render(
  <App />,
  document.getElementById("app")
);