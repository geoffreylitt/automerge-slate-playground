# Automerge Markdown Comments Demo

![](./automerge-comments.gif)

A demo integration of [Automerge](https://github.com/automerge/automerge) with [Slate](https://www.slatejs.org/examples)

So far, has basic support for Markdown with formatting preview, adapted from the [Slate Markdown example code](https://www.slatejs.org/examples/markdown-preview).

Supports inline comments, using the new [Automerge cursors](https://github.com/automerge/automerge/pull/313) to attach comments to text spans.

Maybe will grow to include other features like rich text?

# Run locally

`yarn`
`yarn start`

Open [localhost:8181](http://localhost:8181) to see the app

# Todos

- Add a second client window with option to enable/disable sync, for testing concurrent editing
- Figure out TS types for Cursors
- Add a rich text mode?