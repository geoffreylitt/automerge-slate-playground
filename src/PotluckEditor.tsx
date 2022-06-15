/** @jsx jsx */
/* @jsxFrag React.Fragment */

import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { jsx, css } from "@emotion/react";

import {
  createEditor,
  Text,
  Range,
  Point,
  Node,
  Operation,
  Editor,
} from "slate";
import { withHistory } from "slate-history";
import { Editable, RenderLeafProps, Slate, withReact } from "slate-react";
import Prism, { Token } from "prismjs";
import { loremIpsum } from "lorem-ipsum";
import { v4 as uuidv4 } from "uuid";
import {
  MarkdownDoc,
  Annotation,
  slateRangeFromAutomergeSpan,
  automergeSpanFromSlateRange,
  getTextAtAutomergeSpan,
} from "./slate-automerge";

const withOpHandler = (editor: Editor, callback: (op: Operation) => void) => {
  const { apply } = editor;
  editor.apply = (op) => {
    apply(op);
    callback(op);
  };
  return editor;
};

// eslint-disable-next-line
// @ts-ignore
Prism.languages.markdown=Prism.languages.extend("markup",{}),Prism.languages.insertBefore("markdown","prolog",{blockquote:{pattern:/^>(?:[\t ]*>)*/m,alias:"punctuation"},code:[{pattern:/^(?: {4}|\t).+/m,alias:"keyword"},{pattern:/``.+?``|`[^`\n]+`/,alias:"keyword"}],title:[{pattern:/\w+.*(?:\r?\n|\r)(?:==+|--+)/,alias:"important",inside:{punctuation:/==+$|--+$/}},{pattern:/(^\s*)#+.+/m,lookbehind:!0,alias:"important",inside:{punctuation:/^#+|#+$/}}],hr:{pattern:/(^\s*)([*-])([\t ]*\2){2,}(?=\s*$)/m,lookbehind:!0,alias:"punctuation"},list:{pattern:/(^\s*)(?:[*+-]|\d+\.)(?=[\t ].)/m,lookbehind:!0,alias:"punctuation"},"url-reference":{pattern:/!?\[[^\]]+\]:[\t ]+(?:\S+|<(?:\\.|[^>\\])+>)(?:[\t ]+(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^)\\])*\)))?/,inside:{variable:{pattern:/^(!?\[)[^\]]+/,lookbehind:!0},string:/(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^)\\])*\))$/,punctuation:/^[\[\]!:]|[<>]/},alias:"url"},bold:{pattern:/(^|[^\\])(\*\*|__)(?:(?:\r?\n|\r)(?!\r?\n|\r)|.)+?\2/,lookbehind:!0,inside:{punctuation:/^\*\*|^__|\*\*$|__$/}},italic:{pattern:/(^|[^\\])([*_])(?:(?:\r?\n|\r)(?!\r?\n|\r)|.)+?\2/,lookbehind:!0,inside:{punctuation:/^[*_]|[*_]$/}},url:{pattern:/!?\[[^\]]+\](?:\([^\s)]+(?:[\t ]+"(?:\\.|[^"\\])*")?\)| ?\[[^\]\n]*\])/,inside:{variable:{pattern:/(!?\[)[^\]]+(?=\]$)/,lookbehind:!0},string:{pattern:/"(?:\\.|[^"\\])*"(?=\)$)/}}}}),Prism.languages.markdown.bold.inside.url=Prism.util.clone(Prism.languages.markdown.url),Prism.languages.markdown.italic.inside.url=Prism.util.clone(Prism.languages.markdown.url),Prism.languages.markdown.bold.inside.italic=Prism.util.clone(Prism.languages.markdown.italic),Prism.languages.markdown.italic.inside.bold=Prism.util.clone(Prism.languages.markdown.bold); // prettier-ignore

type MarkdownEditorProps = {
  doc: MarkdownDoc;
  changeDoc: (callback: (doc: MarkdownDoc) => void) => void;
};

export default function MarkdownEditor({
  doc,
  changeDoc,
}: MarkdownEditorProps) {
  const [selection, setSelection] = useState<Range>(null);
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(
    null
  );

  const docSpans = doc.annotations;

  console.log(doc.annotations);

  // We model the document for Slate as a single text node.
  // It should stay a single node throughout all edits.
  const content: Node[] = [
    {
      children: [{ text: doc.content.toString() }],
    },
  ];

  const renderLeaf = useCallback(
    (props) => <Leaf {...props} />,
    [docSpans, activeAnnotationId]
  );

  const addAnnotation = (annotationType: string) => {
    changeDoc((doc: MarkdownDoc) => {
      doc.annotations.push({
        id: uuidv4(),
        range: automergeSpanFromSlateRange(doc.content, selection),
        _type: annotationType,
        data: {},
      });
    });
  };

  // Set the active comment based on the latest selection in the doc
  useEffect(() => {
    let activeCommentId = null;
    for (const comment of docSpans) {
      if (
        activeCommentId !== comment.id &&
        selection &&
        Range.intersection(
          selection,
          slateRangeFromAutomergeSpan(comment.range)
        )
      ) {
        activeCommentId = comment.id;
        break;
      }
    }
    setActiveAnnotationId(activeCommentId);
  }, [selection]);

  const editor = useMemo(() => {
    return withOpHandler(
      withHistory(withReact(createEditor())),
      (op: Operation) => {
        if (op.type === "insert_text") {
          changeDoc((doc: MarkdownDoc) =>
            doc.content.insertAt(op.offset, op.text)
          );
        }
        if (op.type === "remove_text") {
          changeDoc((doc: MarkdownDoc) =>
            doc.content.deleteAt(op.offset, op.text.length)
          );
        }
      }
    );
  }, []);

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
        if (activeAnnotationId === docSpan.id) {
          ranges.push({
            ...slateRangeFromAutomergeSpan(docSpan.range),
            extraHighlighted: true,
          });
        } else {
          ranges.push({
            ...slateRangeFromAutomergeSpan(docSpan.range),
            highlighted: true,
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

      return ranges;
    },
    [docSpans, activeAnnotationId]
  );

  return (
    <div
      css={css`
        padding: 10px;
        display: grid;
        grid-template-columns: 70% 30%;
        grid-template-rows: 30px auto;
        grid-template-areas:
          "toolbar toolbar"
          "editor annotations";
        column-gap: 10px;
        row-gap: 10px;
      `}
    >
      <div
        css={css`
          grid-area: toolbar;
        `}
      >
        <button
          className="toolbar-button"
          disabled={selection?.anchor?.offset === selection?.focus?.offset}
          onClick={() => addAnnotation("ingredient")}
        >
          🥕 Ingredient
        </button>
        <button
          className="toolbar-button"
          disabled={selection?.anchor?.offset === selection?.focus?.offset}
          onClick={() => addAnnotation("duration")}
        >
          ⏱ Duration
        </button>
      </div>
      <div
        css={css`
          border: solid thin #ddd;
          padding: 5px;
          grid-area: editor;
        `}
      >
        <Slate editor={editor} value={content} onChange={() => {}}>
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
      <div
        css={css`
          grid-area: annotations;
        `}
      >
        <div>
          <h2>Ingredients</h2>
          {doc.annotations
            .filter((a) => a._type === "ingredient")
            .map((annotation) => (
              <div
                key={annotation.id}
                css={css`
                  ${activeAnnotationId === annotation.id &&
                  `background-color: #ddd;`}
                `}
              >
                {getTextAtAutomergeSpan(doc.content, annotation.range)}
              </div>
            ))}
        </div>
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
  annotations: Annotation[];
  activeAnnotationId: string;
  setActiveAnnotationId: any;
};

function Ingredients({
  annotations,
  activeAnnotationId,
  setActiveAnnotationId,
}: CommentsProps) {
  // todo: sort the comments

  return (
    <div className="comments-list">
      {annotations.map((annotation) => {
        // If a comment's start and end index are the same,
        // the span it pointed to has been removed from the doc
        if (annotation.range.start.index === annotation.range.end.index) {
          return null;
        }
        return (
          <div
            key={annotation.id}
            css={css`
              margin: 3px;
              cursor: pointer;

              &:hover {
                border: solid thin #bbb;
              }

              ${activeAnnotationId === annotation.id &&
              `border: solid thin #bbb;
              box-shadow: 0px 0px 5px 3px #ddd;`}
            `}
            onClick={() => setActiveAnnotationId(annotation.id)}
          >
            {annotation.text}
            <div
              css={css`
                margin-top: 5px;
                font-size: 12px;
              `}
            ></div>
          </div>
        );
      })}
    </div>
  );
}
