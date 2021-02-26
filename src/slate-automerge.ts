import Automerge from 'automerge'
import { Range } from 'slate'

export type AutomergeSpan = {
  start: Automerge.Cursor;
  end: Automerge.Cursor;
}

export type TextFormat = "bold" | "italic" | "underline"

export type Comment = {
  id: string;
  range: AutomergeSpan;
  text: string;
}

export type MarkdownDoc = {
  content: Automerge.Text;
  comments: Comment[];
}

export type RichTextDoc = {
  content: Automerge.Text;
  formatting: { span: AutomergeSpan, type: TextFormat }[]
}

// convert an Automerge Span to a Slate Range.
// Assumes the Slate doc only has a single text node, and no other blocks.
export function slateRangeFromAutomergeSpan(span: AutomergeSpan): Range {
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

// convert a Slate Range to an Automerge Span.
// Assumes the Slate doc only has a single text node, and no other blocks.
export function automergeSpanFromSlateRange(text: Automerge.Text, range: Range): AutomergeSpan {
  return {
    start: text.getCursorAt(range.anchor.offset),
    end: text.getCursorAt(range.focus.offset)
  }
}