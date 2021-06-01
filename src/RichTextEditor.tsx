/** @jsx jsx */
/* @jsxFrag React.Fragment */

import { useCallback, useMemo, useState } from "react";
import { jsx, css } from "@emotion/react";
import isHotkey from 'is-hotkey'

import { createEditor, Text, Range, Node, Operation, Editor } from "slate";
import { withHistory } from "slate-history";
import { Editable, RenderLeafProps, Slate, withReact } from "slate-react";
import { applySlateOp, ExtendedSlateOperation, RichTextDoc, slateRangeFromAutomergeSpan, TextFormat } from "./slate-automerge";

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
  const toggleMark = useCallback((doc: RichTextDoc, editor: Editor, format: TextFormat) => {
    const op: ExtendedSlateOperation = { type: "toggle_inline_formatting", selection: editor.selection, format }
    applySlateOp(op, doc, changeDoc)
  }, [doc])

  // We model the document for Slate as a single text node.
  // It should stay a single node throughout all edits.
  const content:Node[] = [
    {
      children: [ { text: doc.content.toString() } ]
    }
  ]

  const renderLeaf = useCallback((props) => <Leaf {...props} />, [])

  const editor = useMemo(() => {
    // Typically with Slate you would use an onChange function to update state.
    // But that doesn't work for Automerge because we need an op-based view.
    // We hook into text insert/remove events and propagate to Automerge accordingly.
    return withOpHandler(withHistory(withReact(createEditor())), (op: Operation) => {
      applySlateOp(op, doc, changeDoc)
    });
  }, []);

  // Apply bold/italic decorations to the document
  // based on the formatting spans
  const decorate = useCallback(
    ([node, path]) => {
      const ranges: Range[] = [];

      if (!Text.isText(node)) {
        return ranges;
      }

      for (const formatSpan of doc.formatSpans) {
        ranges.push({
          ...slateRangeFromAutomergeSpan(formatSpan.span),
          [formatSpan.format]: formatSpan.remove ? false : true
        });
      }

      return ranges;
    },
    [doc.content, doc.formatSpans]
  );

  return (
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
  );
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
