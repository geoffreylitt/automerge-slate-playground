/** @jsx jsx */
/* @jsxFrag React.Fragment */

import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { jsx, css } from "@emotion/react";

import { createEditor, Text, Range, Point, Node } from "slate";
import { withHistory } from "slate-history";
import { Editable, RenderLeafProps, Slate, withReact } from "slate-react";
import Prism, { Token } from "prismjs";
import { loremIpsum } from "lorem-ipsum";
import { v4 as uuidv4 } from 'uuid';
import Automerge from 'automerge';

const initialContent = `## Goals
- Monolithic -> Customizable
- Siloed -> Interoperable
## Model
- Library of Concepts users can dynamically reconfigure
- Powerful data synchronizations enable composition
## Demo
- Interop between editors
- Show comments workflow on a kanban board
  - Add a resolved concept
  - Sync between board and editor`

const initialDoc:Doc = {
  content: initialContent,
  comments: []
}

// eslint-disable-next-line
// @ts-ignore
Prism.languages.markdown=Prism.languages.extend("markup",{}),Prism.languages.insertBefore("markdown","prolog",{blockquote:{pattern:/^>(?:[\t ]*>)*/m,alias:"punctuation"},code:[{pattern:/^(?: {4}|\t).+/m,alias:"keyword"},{pattern:/``.+?``|`[^`\n]+`/,alias:"keyword"}],title:[{pattern:/\w+.*(?:\r?\n|\r)(?:==+|--+)/,alias:"important",inside:{punctuation:/==+$|--+$/}},{pattern:/(^\s*)#+.+/m,lookbehind:!0,alias:"important",inside:{punctuation:/^#+|#+$/}}],hr:{pattern:/(^\s*)([*-])([\t ]*\2){2,}(?=\s*$)/m,lookbehind:!0,alias:"punctuation"},list:{pattern:/(^\s*)(?:[*+-]|\d+\.)(?=[\t ].)/m,lookbehind:!0,alias:"punctuation"},"url-reference":{pattern:/!?\[[^\]]+\]:[\t ]+(?:\S+|<(?:\\.|[^>\\])+>)(?:[\t ]+(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^)\\])*\)))?/,inside:{variable:{pattern:/^(!?\[)[^\]]+/,lookbehind:!0},string:/(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^)\\])*\))$/,punctuation:/^[\[\]!:]|[<>]/},alias:"url"},bold:{pattern:/(^|[^\\])(\*\*|__)(?:(?:\r?\n|\r)(?!\r?\n|\r)|.)+?\2/,lookbehind:!0,inside:{punctuation:/^\*\*|^__|\*\*$|__$/}},italic:{pattern:/(^|[^\\])([*_])(?:(?:\r?\n|\r)(?!\r?\n|\r)|.)+?\2/,lookbehind:!0,inside:{punctuation:/^[*_]|[*_]$/}},url:{pattern:/!?\[[^\]]+\](?:\([^\s)]+(?:[\t ]+"(?:\\.|[^"\\])*")?\)| ?\[[^\]\n]*\])/,inside:{variable:{pattern:/(!?\[)[^\]]+(?=\]$)/,lookbehind:!0},string:{pattern:/"(?:\\.|[^"\\])*"(?=\)$)/}}}}),Prism.languages.markdown.bold.inside.url=Prism.util.clone(Prism.languages.markdown.url),Prism.languages.markdown.italic.inside.url=Prism.util.clone(Prism.languages.markdown.url),Prism.languages.markdown.bold.inside.italic=Prism.util.clone(Prism.languages.markdown.italic),Prism.languages.markdown.italic.inside.bold=Prism.util.clone(Prism.languages.markdown.bold); // prettier-ignore

export type Comment = {
  id: string;
  cursor: number;
  text: string;
}


export type Doc = {
  content: string;
  comments: Comment[];
}

function useAutomergeDoc<T>() {
  const [doc, setDoc] = useState<T>(Automerge.init() as T)

  const changeDoc = (callback) => {
    setDoc(doc => Automerge.change(doc, d => callback(d)))
  }

  changeDoc(doc => doc.text = new Automerge.Text(initialContent))

  return [doc, changeDoc]
}

export default function MarkdownEditor() {
  // const [doc, changeDoc] = useAutomergeDoc()
  const [doc, setDoc] = useState<Doc>(initialDoc)
  const [selection, setSelection] = useState<Range>(null)
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null)

  const docSpans = doc.comments

  const content:Node[] = [
    {
      children: [ { text: doc.content } ]
    }
  ]

  const renderLeaf = useCallback((props) => <Leaf {...props} />, [
    docSpans,
    activeCommentId,
  ]);

  const setContent = (newContent: Node[]) => {
    // changeDoc(doc => doc.content = (newContent[0].children as Node[])[0].text)
    setDoc(doc => ({...doc, content: (newContent[0].children as Node[])[0].text as string }))
  }

  const addComment = () => {}
  // const addComment = () => {
  //   changeDoc((doc: Doc) => {
  //     doc.comments.push({
  //       id: uuidv4(),
  //       // todo: pick the real location
  //       cursor: doc.content.getCursorAt(5),
  //       text: loremIpsum()
  //     })
  //   })
  // }
    // todo: I think can replace this with just a setSelection callback.
  // weird usage of useEffect to trigger on a state change.
  // useEffect(() => {
  //   let activeCommentId = null
  //   for (const comment of docSpans) {
  //     if(activeCommentId !== comment.id && selection && Range.intersection(selection, comment.range)) {
  //       activeCommentId = comment.id
  //       break
  //     }
  //   }
  //   setActiveCommentId(activeCommentId)
  // }, [selection])

  const editor = useMemo(() => withHistory(withReact(createEditor())), []);

  const decorate = useCallback(
    ([node, path]) => {
      const ranges: Range[] = [];

      if (!Text.isText(node)) {
        return ranges;
      }

      const getLength = (token: any): number => {
        if (typeof token === "string") {
          return token.length;
        } else if (typeof token.content === "string") {
          return token.content.length;
        } else if (Array.isArray(token.content)) {
          return token.content.reduce((l, t) => l + getLength(t), 0);
        } else {
          return 0;
        }
      };

      // Add comment highlighting decorations
      // for (const docSpan of docSpans) {
      //   // Check whether the comment is on this node
      //   if (activeCommentId === docSpan.id) {
      //     ranges.push({
      //       extraHighlighted: true,
      //       ...docSpan.cursor,
      //     });
      //   } else {
      //     ranges.push({
      //       highlighted: true,
      //       ...docSpan.cursor,
      //     });
      //   }
      // }

      // Add Markdown decorations

      const tokens = Prism.tokenize(node.text, Prism.languages.markdown);
      let start = 0;

      for (const token of tokens) {
        const length = getLength(token);
        const end = start + length;

        if (typeof token !== "string") {
          ranges.push({
            [token.type]: true,
            anchor: { path, offset: start },
            focus: { path, offset: end },
          });
        }

        start = end;
      }

      return ranges;
    },
    [docSpans, activeCommentId]
  );

  return (
    <div css={css`
      padding: 10px;
      display: grid;
      grid-template-columns: 70% 30%;
      grid-template-rows: 30px auto;
      grid-template-areas:
        "toolbar toolbar"
        "editor comments";
      column-gap: 10px;
      row-gap: 10px;
    `}>
      <div css={css`grid-area: toolbar;`}>
        <button
          className="toolbar-button"
          onClick={addComment}>
            💬 Comment
        </button>
      </div>
      <div css={css`
        border: solid thin #ddd;
        padding: 5px;
        grid-area: editor;
      `}>
        <Slate editor={editor} value={content} onChange={setContent}>
          <Editable
            decorate={decorate}
            renderLeaf={renderLeaf}
            placeholder="Write some markdown here!"
            onSelect={() => {
              setSelection(editor.selection);
            }}
            // We want to keep the whole doc as one giant node;
            // block Enter key from creating a new node here.
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                editor.insertText("\n");
              }
            }}
          />
        </Slate>
      </div>
    </div>
  );
}

const Leaf = ({ attributes, children, leaf }: RenderLeafProps) => {
  return (
    <span
      {...attributes}
      css={css`
        font-weight: ${leaf.bold && "bold"};
        font-style: ${leaf.italic && "italic"};
        text-decoration: ${leaf.underlined && "underline"};
        ${leaf.title &&
        css`
          display: inline-block;
          font-weight: bold;
          font-size: 20px;
          margin: 20px 0 10px 0;
        `}
        ${leaf.list &&
        css`
          padding-left: 10px;
          font-size: 20px;
          line-height: 10px;
        `}
        ${leaf.hr &&
        css`
          display: block;
          text-align: center;
          border-bottom: 2px solid #ddd;
        `}
        ${leaf.blockquote &&
        css`
          display: inline-block;
          border-left: 2px solid #ddd;
          padding-left: 10px;
          color: #aaa;
          font-style: italic;
        `}
        ${leaf.code &&
        css`
          font-family: monospace;
          background-color: #eee;
          padding: 3px;
        `}
        ${leaf.highlighted &&
        css`
          background-color: #fffabe;
          color: black;
        `}
        ${leaf.extraHighlighted &&
        css`
          background-color: #ffeb00;
          color: black;
        `}
      `}
    >
      {children}
    </span>
  );
};

