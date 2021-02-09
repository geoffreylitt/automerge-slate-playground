# Automerge Markdown Comments Demo

A demo integration of [Automerge](https://github.com/automerge/automerge) with [Slate](https://www.slatejs.org/examples)

So far, has basic support for Markdown with formatting preview, adapted from the [Slate Markdown example code](https://www.slatejs.org/examples/markdown-preview).

Supports inline comments, using [Automerge cursors](https://github.com/automerge/automerge/pull/313).

# Run locally

`yarn`
`yarn start`

Open [localhost:8181](http://localhost:8181)

# Todos

- Add a second client window with option to enable/disable sync, for testing concurrent editing
- Figure out TS types for Cursors
- Add a rich text mode?