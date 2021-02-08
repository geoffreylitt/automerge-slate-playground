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
  content: new Automerge.Text(initialContent),
  comments: []
}

// eslint-disable-next-line
// @ts-ignore
Prism.languages.markdown=Prism.languages.extend("markup",{}),Prism.languages.insertBefore("markdown","prolog",{blockquote:{pattern:/^>(?:[\t ]*>)*/m,alias:"punctuation"},code:[{pattern:/^(?: {4}|\t).+/m,alias:"keyword"},{pattern:/``.+?``|`[^`\n]+`/,alias:"keyword"}],title:[{pattern:/\w+.*(?:\r?\n|\r)(?:==+|--+)/,alias:"important",inside:{punctuation:/==+$|--+$/}},{pattern:/(^\s*)#+.+/m,lookbehind:!0,alias:"important",inside:{punctuation:/^#+|#+$/}}],hr:{pattern:/(^\s*)([*-])([\t ]*\2){2,}(?=\s*$)/m,lookbehind:!0,alias:"punctuation"},list:{pattern:/(^\s*)(?:[*+-]|\d+\.)(?=[\t ].)/m,lookbehind:!0,alias:"punctuation"},"url-reference":{pattern:/!?\[[^\]]+\]:[\t ]+(?:\S+|<(?:\\.|[^>\\])+>)(?:[\t ]+(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^)\\])*\)))?/,inside:{variable:{pattern:/^(!?\[)[^\]]+/,lookbehind:!0},string:/(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^)\\])*\))$/,punctuation:/^[\[\]!:]|[<>]/},alias:"url"},bold:{pattern:/(^|[^\\])(\*\*|__)(?:(?:\r?\n|\r)(?!\r?\n|\r)|.)+?\2/,lookbehind:!0,inside:{punctuation:/^\*\*|^__|\*\*$|__$/}},italic:{pattern:/(^|[^\\])([*_])(?:(?:\r?\n|\r)(?!\r?\n|\r)|.)+?\2/,lookbehind:!0,inside:{punctuation:/^[*_]|[*_]$/}},url:{pattern:/!?\[[^\]]+\](?:\([^\s)]+(?:[\t ]+"(?:\\.|[^"\\])*")?\)| ?\[[^\]\n]*\])/,inside:{variable:{pattern:/(!?\[)[^\]]+(?=\]$)/,lookbehind:!0},string:{pattern:/"(?:\\.|[^"\\])*"(?=\)$)/}}}}),Prism.languages.markdown.bold.inside.url=Prism.util.clone(Prism.languages.markdown.url),Prism.languages.markdown.italic.inside.url=Prism.util.clone(Prism.languages.markdown.url),Prism.languages.markdown.bold.inside.italic=Prism.util.clone(Prism.languages.markdown.italic),Prism.languages.markdown.italic.inside.bold=Prism.util.clone(Prism.languages.markdown.bold); // prettier-ignore

type AutomergeSpan = {
  start: Automerge.Cursor;
  end: Automerge.Cursor;
}

export type Comment = {
  id: string;
  range: AutomergeSpan;
  text: string;
}

// convert automerge span to slate range,
// assume only a single text block for now
function slateRangeFromAutomergeSpan(span: AutomergeSpan): Range {
  return {
    anchor: {
      path: [0, 0],
      offset: span.start.index
    },
    focus: {
      path: [0, 0],
      offset: span.end.index
    }
  }
}

function automergeSpanFromSlateRange(text: Automerge.Text, range: Range): AutomergeSpan {
  // We throw away the path info from the range;
  // assume we only have a single text node
  return {
    start: text.getCursorAt(range.anchor.offset),
    end: text.getCursorAt(range.focus.offset)
  }
}

export type Doc = {
  content: Automerge.Text;
  comments: Comment[];
}

function useAutomergeDoc(): [Doc, (callback: any) => void] {
  const [doc, setDoc] = useState<Doc>(Automerge.from(initialDoc))

  const changeDoc = (callback) => {
    setDoc(doc => Automerge.change(doc, d => callback(d)))
  }

  return [doc, changeDoc]
}

export default function MarkdownEditor() {
  const [doc, changeDoc] = useAutomergeDoc()
  const [selection, setSelection] = useState<Range>(null)
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null)

  console.log(doc)

  const docSpans = doc.comments

  const content:Node[] = [
    {
      children: [ { text: doc.content.toString() } ]
    }
  ]

  const renderLeaf = useCallback((props) => <Leaf {...props} />, [
    docSpans,
    activeCommentId,
  ]);

  // todo: we need to hook in at a different point, blowing away whole text won't work
  const setContent= () => {}
  // const setContent = (newContent: Node[]) => {
  //   changeDoc(doc => doc.content = new Automerge.Text(newContent[0].children as Node[])[0].text)
  // }

  const addComment = () => {
    console.log(selection)
    changeDoc((doc: Doc) => {
      console.log("in here", doc.content.getElemId(1))
      doc.comments.push({
        id: uuidv4(),
        // todo: pick the real location
        range: automergeSpanFromSlateRange(doc.content, selection),
        text: loremIpsum()
      })
    })
  }

  useEffect(() => {
    let activeCommentId = null
    for (const comment of docSpans) {
      if(activeCommentId !== comment.id && selection && Range.intersection(selection, slateRangeFromAutomergeSpan(comment.range))) {
        activeCommentId = comment.id
        break
      }
    }
    setActiveCommentId(activeCommentId)
  }, [selection])

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
      for (const docSpan of docSpans) {
        // Check whether the comment is on this node
        console.log("highlighting", docSpan, docSpan.range.start.index, docSpan.range.end.index)

        if (activeCommentId === docSpan.id) {
          ranges.push({
            ...slateRangeFromAutomergeSpan(docSpan.range),
            extraHighlighted: true,
          });
        } else {
          ranges.push({
            ...slateRangeFromAutomergeSpan(docSpan.range),
            highlighted: true
          });
        }
      }

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

      console.log({ranges})
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
      <div css={css`grid-area: comments;`}>
        <Comments
          comments={doc.comments}
          activeCommentId={activeCommentId}
          setActiveCommentId={setActiveCommentId}
        />
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

type CommentsProps = {
  comments: Comment[];
  activeCommentId: string;
  setActiveCommentId: any;
};

function Comments({
  comments,
  activeCommentId,
  setActiveCommentId,
}: CommentsProps) {
  // todo: sort the comments

  return (
    <div className="comments-list">
      {comments.map((comment) => {
        return (
          <div
            key={comment.id}
            css={css`
              border: solid thin #ddd;
              border-radius: 10px;
              padding: 10px;
              margin: 10px;
              cursor: pointer;

              &:hover {
                border: solid thin #bbb;
              }

              ${activeCommentId === comment.id &&
              `border: solid thin #bbb;
              box-shadow: 0px 0px 5px 3px #ddd;`}
            `}
            onClick={() => setActiveCommentId(comment.id)}
          >
            {comment.text}
          </div>
        );
      })}
    </div>
  );
}

