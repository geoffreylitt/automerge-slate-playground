/** @jsx jsx */
/* @jsxFrag React.Fragment */

import { useCallback, useMemo, useState } from "react";
import { jsx, css } from "@emotion/react";

import {
  createEditor,
  Text,
  Range,
  Point,
  Node,
  Operation,
  Editor,
  Path,
  Location,
} from "slate";
import { withHistory } from "slate-history";
import { Editable, RenderLeafProps, Slate, withReact } from "slate-react";
import {
  RichTextDoc,
  Annotation,
  slateRangeFromAutomergeSpan,
  automergeSpanFromSlateRange,
  TextFormat,
  flattenedFormatting,
} from "./slate-automerge";

const withOpHandler = (
  editor: Editor,
  callback: (op: Operation, editor: Editor) => void
) => {
  const { apply } = editor;
  editor.apply = (op) => {
    apply(op);
    callback(op, editor);
  };
  return editor;
};

type ParagraphsEditorProps = {
  doc: RichTextDoc;
  changeDoc: (callback: (doc: RichTextDoc) => void) => void;
  content: Node[];
};

// convert a slate point (node path + char offset) into an
// index in an automerge doc.
// (naively and inefficiently...)
const slatePointToAutomergeTextOffset = (
  { path, offset }: Point,
  doc: any
): number => {
  const content = doc.content.toString();
  var newline_indices = [0];
  for (var i = 0; i < content.length; i++) {
    if (content[i] === "\n") newline_indices.push(i + 1);
  }

  return newline_indices[path[0]] + offset;
};

export default function ParagraphsEditor({
  doc,
  changeDoc,
  content,
}: ParagraphsEditorProps) {
  // We model the document for Slate as a single text node.
  // It should stay a single node throughout all edits.

  console.log({ content });
  const renderElement = useCallback((props) => <Element {...props} />, []);

  const editor = useMemo(() => {
    // Typically with Slate you would use an onChange function to update state.
    // But that doesn't work for Automerge because we need an op-based view.
    // We hook into Slate ops and propagate to Automerge accordingly.
    return withOpHandler(
      withHistory(withReact(createEditor())),
      (op: Operation, editor: Editor) => {
        console.log("applying Slate operation", op);

        if (op.type === "insert_text") {
          changeDoc((doc: RichTextDoc) => {
            const insertionPoint = slatePointToAutomergeTextOffset(op, doc);
            doc.content.insertAt(insertionPoint, op.text);
          });
        }
        if (op.type === "remove_text") {
          changeDoc((doc: RichTextDoc) => {
            const deletionPoint = slatePointToAutomergeTextOffset(op, doc);
            doc.content.deleteAt(deletionPoint);
          });
        }
        if (op.type === "split_node") {
          // OK, so splitting nodes is a bit weird.
          // Our document contains paragraph nodes which in turn contain a single text node.
          // (in theory, each paragraph node could contain more text nodes;
          // and when we add inline formatting it probably will contain more,
          // but for now, we only handle one text node per paragraph.)

          // When we split a paragraph, Slate generates two split node ops:
          // 1) split the text node:
          // { path: [<paragraph_index>, 0], <-- Address the first text node
          //   position: <char_index> }      <-- And split it at the right index
          //
          // Now our paragraph node contains two text nodes, but it's still one paragraph.
          //
          // 2) Split the _paragraph_ node: { path: [<paragraph_index>], position: 1 }
          //
          // This splits the paragraph between the two text nodes;
          // we end up with 2 paragraph nodes that each contain a single text node.
          //
          // The thing is, this is all really a single node split;
          // we only want to add a single newline character to our document.
          // So, long story short, we ignore the second split operation with a guard clause,
          // and only process the first one and change the doc accordingly.
          if (op.path.length < 2) {
            return;
          }

          editor.selection = {
            anchor: { path: [0, 0], offset: 0 },
            focus: { path: [0, 0], offset: 0 },
          };

          // we need to insert a newline marker at the right point in the text.
          // We're given a node index and an offset in the tree;
          // need to convert this to an index in the single string representation.
          changeDoc((doc: RichTextDoc) => {
            const split_position = slatePointToAutomergeTextOffset(
              { path: op.path, offset: op.position },
              doc
            );
            doc.content.insertAt(split_position, "\n");
          });
        }
        if (op.type === "merge_node") {
          changeDoc((doc: RichTextDoc) => {
            const newlinePosition =
              slatePointToAutomergeTextOffset(
                { path: op.path, offset: 0 },
                doc
              ) - 1;
            if (doc.content.toString()[newlinePosition] !== "\n") {
              console.log(
                "bad: merging nodes should delete a newline, but deleting something else"
              );
              return;
            }
            doc.content.deleteAt(newlinePosition);
          });
        }
      }
    );
  }, []);

  return (
    <div
      css={css`
        border: solid thin #ddd;
        padding: 5px;
        grid-area: editor;
      `}
    >
      <Slate editor={editor} value={content} onChange={() => {}}>
        <Editable renderElement={renderElement} placeholder="Some paragraphs" />
      </Slate>
    </div>
  );
}

const Element = ({ attributes, children, element }) => {
  switch (element.type) {
    case "block-quote":
      return <blockquote {...attributes}>{children}</blockquote>;
    case "bulleted-list":
      return <ul {...attributes}>{children}</ul>;
    case "heading-one":
      return <h1 {...attributes}>{children}</h1>;
    case "heading-two":
      return <h2 {...attributes}>{children}</h2>;
    case "list-item":
      return <li {...attributes}>{children}</li>;
    case "numbered-list":
      return <ol {...attributes}>{children}</ol>;
    default:
      return <p {...attributes}>{children}</p>;
  }
};
