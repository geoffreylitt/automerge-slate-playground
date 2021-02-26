import Automerge from 'automerge'
import { Range } from 'slate'
import range from 'lodash/range'

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
  formatSpans: { span: AutomergeSpan, format: TextFormat, remove?: boolean }[]
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

// Returns an array of objects, one per character in the doc,
// representing the formatting applied to that character.
// Useful for
export function flattenedFormatting(doc: RichTextDoc) {
  const chars: { [key: string]: boolean }[] = range(doc.content.length).map(c => {})
  for(const formatSpan of doc.formatSpans) {
    console.log("flattening", formatSpan)
    let start: number, end: number;

    // compute a start and end s.t. start comes before end
    // so we don't end up with backwards spans
    if(formatSpan.span.end.index > formatSpan.span.start.index) {
      start = formatSpan.span.start.index;
      end = formatSpan.span.end.index;
    } else {
      start = formatSpan.span.end.index;
      end = formatSpan.span.start.index;
    }

    for(let i = start; i < end; i++) {
      if(chars[i] === undefined) chars[i] = {}
      if(!formatSpan.remove) {
        chars[i][formatSpan.format] = true
      } else {
        chars[i][formatSpan.format] = false
      }
    }
  }

  return chars
}