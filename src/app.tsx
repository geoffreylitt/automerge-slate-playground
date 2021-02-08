/** @jsx jsx */
/* @jsxFrag React.Fragment */

import { jsx, css } from '@emotion/react'
import { render } from "react-dom";

const App = () => {
  return <div css={css`
        display: grid;
        grid-template-columns: 50% 50%;
        grid-template-rows: 30px auto 300px;
        grid-template-areas:
          "header header"
          "app-left app-right"
          "meta meta";
        column-gap: 20px;
        row-gap: 10px;
        font-family: "Fira Sans", sans-serif;
        width: 98vw;
        height: 100vh;
        padding: 0 20px;
        box-sizing: border-box;
      `}>
        <div css={css`
        grid-area: header;
        `}>
          <strong>Automerge Markdown Editor with Comments</strong>
        </div>
        <div css={css`grid-area: app-left; overflow: hidden;`}>
          This is the right app
        </div>
        <div css={css`grid-area: app-right; overflow: hidden;`}>
          This is the left app
        </div>
        <div css={css`grid-area: meta;`}>
          This space reserved for debug
        </div>
      </div>
}

render(
  <App />,
  document.getElementById("app")
);