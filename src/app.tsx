/** @jsx jsx */
/* @jsxFrag React.Fragment */

import { jsx, css } from '@emotion/react'
import { render } from "react-dom";
import MarkdownEditor from './MarkdownEditor';

const App = () => {
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
          <MarkdownEditor />
        </div>
        <div css={css`grid-area: app-right; overflow: hidden;`}>
          Right app
        </div>
      </div>
}

render(
  <App />,
  document.getElementById("app")
);