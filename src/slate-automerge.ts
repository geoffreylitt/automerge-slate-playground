import Automerge from "automerge";
import { Editor, Operation, Range, SelectionOperation, Point } from "slate";

export type AutomergeSpan = {
  start: Automerge.Cursor;
  end: Automerge.Cursor;
};

export type TextFormat = "bold" | "italic" | "underline";

export type Annotation = {
  id: string;
  range: AutomergeSpan; // { start: 10, end: 20 }
  _type: string;
  data: any;
};

export type MarkdownDoc = {
  content: Automerge.Text;
  annotations: Annotation[];
};

// convert an Automerge Span to a Slate Range.
// Assumes the Slate doc only has a single text node, and no other blocks.
export function slateRangeFromAutomergeSpan(span: AutomergeSpan): Range {
  return {
    anchor: {
      path: [0, 0],
      offset: span.start.index,
    },
    focus: {
      path: [0, 0],
      offset: span.end.index,
    },
  };
}

// convert a Slate Range to an Automerge Span.
// Assumes the Slate doc only has a single text node, and no other blocks.
export function automergeSpanFromSlateRange(
  text: Automerge.Text,
  range: Range
): AutomergeSpan {
  // Slate differentiates between whether the user highlighted starting
  // from the left or the right. We want to just store the annotation
  // the same way regardless.
  let start, end;
  if (range.anchor.offset <= range.focus.offset) {
    (start = range.anchor.offset), (end = range.focus.offset);
  } else {
    (start = range.focus.offset), (end = range.anchor.offset);
  }
  return {
    // @ts-ignore We can't extend the typedef for Automerge.Text from the outside, just ignore this for now.
    start: text.getCursorAt(start),
    // @ts-ignore We can't extend the typedef for Automerge.Text from the outside, just ignore this for now.
    end: text.getCursorAt(end),
  };
}

export function getTextAtAutomergeSpan(
  text: Automerge.Text,
  span: AutomergeSpan
) {
  let start, end;
  if (span.start.index <= span.end.index) {
    start = span.start.index;
    end = span.end.index;
  } else {
    start = span.end.index;
    end = span.start.index;
  }
  return text.slice(span.start.index, span.end.index).join("");
}
