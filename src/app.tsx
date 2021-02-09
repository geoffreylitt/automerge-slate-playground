/** @jsx jsx */
/* @jsxFrag React.Fragment */

import { jsx, css } from '@emotion/react'
import { render } from "react-dom";
import MarkdownEditor from './MarkdownEditor';
import Automerge from 'automerge'
import { useAutomergeDoc } from './hooks'
import { MarkdownDoc } from './slate-automerge'

const initialDoc:MarkdownDoc = {
  content: new Automerge.Text(`# Slate Automerge
This is some text. It supports _italic_ and **bolding**. And lists, too:

- a thing
- another thing
- yet another thing

Try highlighting a region and clicking Comment.

Even as you edit the doc, the comment will stay attached to the correct portion of the text.`),
  comments: []
}

const App = () => {
  const [doc, changeDoc] = useAutomergeDoc<MarkdownDoc>(initialDoc)

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
          {/* todo: add a second client in this box */}
        </div>
      </div>
}

render(
  <App />,
  document.getElementById("app")
);