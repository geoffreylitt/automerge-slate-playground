/** @jsx jsx */
/* @jsxFrag React.Fragment */

import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { jsx, css } from "@emotion/react";
import isHotkey from 'is-hotkey'
import every from 'lodash/every'

import { createEditor, Text, Range, Point, Node, Operation, Editor } from "slate";
import { withHistory } from "slate-history";
import { Editable, RenderLeafProps, Slate, withReact } from "slate-react";
import { RichTextDoc, Comment, slateRangeFromAutomergeSpan, automergeSpanFromSlateRange, TextFormat, flattenedFormatting } from "./slate-automerge";

const HOTKEYS = {
  'mod+b': 'bold',
  'mod+i': 'italic',
  'mod+u': 'underline',
  'mod+`': 'code',
}

const withOpHandler = (editor: Editor, callback: (op: Operation, editor: Editor) => void) => {
  const { apply } = editor;
  editor.apply = (op) => {
    apply(op)
    callback(op, editor)
  }
  return editor;
}

type RichTextEditorProps = {
  doc: RichTextDoc;
  changeDoc: (callback: (doc: RichTextDoc) => void) => void
}

export default function ParagraphsEditor({ doc, changeDoc }: RichTextEditorProps) {
  console.log("trying to render doc", doc.content.toString())
  const [selection, setSelection] = useState<Range>(null)
  const flatFormatting = flattenedFormatting(doc)

  // We model the document for Slate as a single text node.
  // It should stay a single node throughout all edits.
  const content:Node[] = doc.content.toString().split("\n").map(paragraph => ({
    type: "paragraph",
    children: [
      { text: paragraph }
    ]
  }))

  const renderElement = useCallback(props => <Element {...props} />, [])
  const renderLeaf = useCallback((props) => <Leaf {...props} />, [])

  const editor = useMemo(() => {
    // Typically with Slate you would use an onChange function to update state.
    // But that doesn't work for Automerge because we need an op-based view.
    // We hook into text insert/remove events and propagate to Automerge accordingly.
    return withOpHandler(withHistory(withReact(createEditor())), (op: Operation, editor: Editor) => {
      console.log("applying Slate operation", op)
      if (op.type === 'insert_text') {
        changeDoc((doc: RichTextDoc) => doc.content.insertAt(op.offset, op.text))
      }
      if (op.type === 'split_node') {
        editor.selection = {
          anchor: { path: [0, 0], offset: 0 },
          focus: { path: [0, 0], offset: 0 },
        }

        // we need to insert a newline marker at the right point in the text.
        // We're given a node index and an offset in the tree;
        // need to convert this to an index in the single string representation.
        changeDoc((doc: RichTextDoc) => {
          const content = doc.content.toString()
          var newline_indices = [0];
          for(var i=0; i<content.length; i++) {
            if (content[i] === "\n") newline_indices.push(i);
          }
          console.log({ newline_indices })

          const split_position = newline_indices[op.path[0]] + op.position
          console.log("inserting newline at", split_position)
          doc.content.insertAt(split_position, "\n")
        })


      }
    });
  }, []);

  if(editor.selection) {
    console.log("selection", Editor.node(editor, editor.selection))
  }

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
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          placeholder="Write some markdown here!"
          onSelect={() => {
            setSelection(editor.selection);
          }}
        />
      </Slate>
    </div>
  );
}

const isMarkActive = (editor, format) => {
  const marks = Editor.marks(editor)
  console.log({marks})
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

const Element = ({ attributes, children, element }) => {
  console.log("rendering element", element)
  switch (element.type) {
    case 'block-quote':
      return <blockquote {...attributes}>{children}</blockquote>
    case 'bulleted-list':
      return <ul {...attributes}>{children}</ul>
    case 'heading-one':
      return <h1 {...attributes}>{children}</h1>
    case 'heading-two':
      return <h2 {...attributes}>{children}</h2>
    case 'list-item':
      return <li {...attributes}>{children}</li>
    case 'numbered-list':
      return <ol {...attributes}>{children}</ol>
    default:
      return <p {...attributes}>{children}</p>
  }
}
