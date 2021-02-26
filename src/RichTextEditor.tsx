/** @jsx jsx */
/* @jsxFrag React.Fragment */

import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { jsx, css } from "@emotion/react";
import isHotkey from 'is-hotkey'

import { createEditor, Text, Range, Point, Node, Operation, Editor } from "slate";
import { withHistory } from "slate-history";
import { Editable, RenderLeafProps, Slate, withReact } from "slate-react";
import Prism, { Token } from "prismjs";
import { loremIpsum } from "lorem-ipsum";
import { v4 as uuidv4 } from 'uuid';
import { RichTextDoc, Comment, slateRangeFromAutomergeSpan, automergeSpanFromSlateRange, TextFormat } from "./slate-automerge";

const HOTKEYS = {
  'mod+b': 'bold',
  'mod+i': 'italic',
  'mod+u': 'underline',
  'mod+`': 'code',
}

const withOpHandler = (editor: Editor, callback: (op: Operation) => void) => {
  const { apply } = editor;
  editor.apply = (op) => {
    apply(op)
    callback(op)
  }
  return editor;
}

type RichTextEditorProps = {
  doc: RichTextDoc;
  changeDoc: (callback: (doc: RichTextDoc) => void) => void
}

export default function RichTextEditor({ doc, changeDoc }: RichTextEditorProps) {
  const [selection, setSelection] = useState<Range>(null)

  // We model the document for Slate as a single text node.
  // It should stay a single node throughout all edits.
  const content:Node[] = [
    {
      children: [ { text: doc.content.toString() } ]
    }
  ]

  const renderLeaf = useCallback((props) => <Leaf {...props} />, [])

  const editor = useMemo(() => {
    return withOpHandler(withHistory(withReact(createEditor())), (op: Operation) => {
      console.log("applying Slate operation", op)
      if (op.type === 'insert_text') {
        changeDoc((doc: RichTextDoc) => doc.content.insertAt(op.offset, op.text))
      }
      if (op.type === 'remove_text') {
        changeDoc((doc: RichTextDoc) => doc.content.deleteAt(op.offset, op.text.length))
      }
    });
  }, []);

  const decorate = useCallback(
    ([node, path]) => {
      console.log("decoratin")
      const ranges: Range[] = [];

      if (!Text.isText(node)) {
        return ranges;
      }

      // Add formatting decorations
      for (const formatSpan of doc.formatting) {
        console.log({formatSpan, range: slateRangeFromAutomergeSpan(formatSpan.span)})
        ranges.push({
          ...slateRangeFromAutomergeSpan(formatSpan.span),
          [formatSpan.format]: true
        });
      }

      return ranges;
    },
    [doc.content, doc.formatting]
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
      <div css={css`
        border: solid thin #ddd;
        padding: 5px;
        grid-area: editor;
      `}>
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
              for (const hotkey in HOTKEYS) {
                if (isHotkey(hotkey, event as any)) {
                  event.preventDefault()
                  const mark = HOTKEYS[hotkey]
                  toggleMark(doc, editor, mark)
                }
              }
            }}
          />
        </Slate>
      </div>
    </div>
  );
}

const toggleMark = (doc: RichTextDoc, editor: Editor, format: TextFormat) => {
  console.log("toggle", format)
  const isActive = isMarkActive(editor, format)
  const span = automergeSpanFromSlateRange(doc.content, editor.selection)
  if (isActive) {
    console.log("remove", editor.selection, automergeSpanFromSlateRange(doc.content, editor.selection))
    doc.formatting.push({ span, format })
    // Editor.removeMark(editor, format)
  } else {
    console.log("add", editor.selection, automergeSpanFromSlateRange(doc.content, editor.selection))
    doc.formatting.push({ format, span })
    // Editor.addMark(editor, format, true)
  }
  console.log({doc})
}

const isMarkActive = (editor, format) => {
  const marks = Editor.marks(editor)
  return marks ? marks[format] === true : false
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
        // If a comment's start and end index are the same,
        // the span it pointed to has been removed from the doc
        if(comment.range.start.index === comment.range.end.index) {
          return null
        }
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
            <div css={css`margin-top: 5px; font-size: 12px;`}>
            (Text index: {comment.range.start.index} to {comment.range.end.index})
            </div>

          </div>
        );
      })}
    </div>
  );
}

