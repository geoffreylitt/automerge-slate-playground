/** @jsx jsx */
/* @jsxFrag React.Fragment */

import { jsx, css } from "@emotion/react";
import { render } from "react-dom";
import { useState } from "react";
import RichTextDemo from "./RichTextDemo";
import MarkdownDemo from "./MarkdownDemo";
import ParagraphsDemo from "./ParagraphsDemo";
import PotluckDemo from "./PotluckDemo";

const demoComponents = {
  richtext: <RichTextDemo />,
  markdown: <MarkdownDemo />,
  paragraphs: <ParagraphsDemo />,
  potluck: <PotluckDemo />,
};

const App = () => {
  const [demo, setDemo] = useState("potluck");

  return (
    <div
      css={css`
        font-family: "Fira Sans", sans-serif;
      `}
    >
      <div
        css={css`
          margin-bottom: 20px;
        `}
      >
        <h2>Automerge Slate Playground</h2>
        <select value={demo} onChange={(e) => setDemo(e.target.value)}>
          {Object.keys(demoComponents).map((demoMode) => (
            <option value={demoMode}>{demoMode}</option>
          ))}
        </select>
      </div>

      {demoComponents[demo]}
    </div>
  );
};

render(<App />, document.getElementById("app"));
