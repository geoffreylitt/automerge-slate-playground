/** @jsx jsx */
/* @jsxFrag React.Fragment */

import { jsx, css } from "@emotion/react";
import { render } from "react-dom";
import PotluckDemo from "./PotluckDemo";

const App = () => {
  return (
    <div
      css={css`
        font-family: "Fira Sans", sans-serif;
      `}
    >
      <PotluckDemo />
    </div>
  );
};

render(<App />, document.getElementById("app"));
