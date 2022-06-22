/** @jsx jsx */
/* @jsxFrag React.Fragment */

import { jsx } from "@emotion/react";
import { render } from "react-dom";
import PotluckDemo from "./PotluckDemo";

const App = () => {
  return <PotluckDemo />;
};

render(<App />, document.getElementById("app"));
