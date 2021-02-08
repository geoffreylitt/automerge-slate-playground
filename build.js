#!/usr/bin/env node
//
// This example builds a module in both debug and release mode.
// See estrella.d.ts for documentation of available options.
// You can also pass any options for esbuild (as defined in esbuild/lib/main.d.ts).
//
const { build, cliopts } = require("estrella")
const Path = require("path")

build({
  outfile: "public/app.js",
  entry: "src/app.tsx",
  bundle: true,
  sourcemap: true,
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.NODE_DEBUG": '"production"',
    "process.env.REACT_APP_SC_ATTR": 'data-styled-automerge-markdown-comments',
    "process.env.REACT_APP_SC_DISABLE_SPEEDY": 'false',
    "process.env.REDUX_LOGGING": 'SILENT',
    "process": '{}',
    "global": 'window'
  },
})

// Run a local web server with livereload when -watch is set
cliopts.watch && require("serve-http").createServer({
  port: 8181,
  pubdir: Path.join(__dirname, "public"),
})
