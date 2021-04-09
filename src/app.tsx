/** @jsx jsx */
/* @jsxFrag React.Fragment */

import { jsx, css } from '@emotion/react'
import { render } from "react-dom";
import Automerge from 'automerge'
import { useAutomergeDoc } from './hooks'
import { MarkdownDoc, RichTextDoc } from './slate-automerge'
import RichTextEditor from './RichTextEditor';
import ReactJson from 'react-json-view'
import { useState } from 'react';
import RichTextDemo from './RichTextDemo';
import MarkdownDemo from './MarkdownDemo';

const demoData = {
  "markdown": {
    content: new Automerge.Text(`# A markdown doc

    This doc has some _inline formatting_. Try *adding a comment*!`),
    comments: []
  }
}

const demoComponents = {
  "richtext": <RichTextDemo />,
  "markdown": <MarkdownDemo />
}

const App = () => {
  const [demo, setDemo] = useState("richtext")

  return <div css={css`font-family: "Fira Sans", sans-serif;`}>
          <div css={css`margin-bottom: 20px;`}>
          <h2>Automerge Slate Playground</h2>
          <select value={demo} onChange={(e) => setDemo(e.target.value)}>
            {Object.keys(demoComponents).map(demoMode => <option value={demoMode}>{demoMode}</option>)}
          </select>
          </div>

          {demoComponents[demo]}
        </div>
}

render(
  <App />,
  document.getElementById("app")
);