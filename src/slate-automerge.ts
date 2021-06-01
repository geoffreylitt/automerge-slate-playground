import Automerge from 'automerge'
import { Operation, Range, SelectionOperation } from 'slate'
import range from 'lodash/range'
import every from 'lodash/every'

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

type ToggleInlineFormatOperation = {
  type: "toggle_inline_formatting"
  selection: Range,
  format: TextFormat
}

// Our own Operation type, which includes all of Slate's operations
// and some custom operations of our own.
// (Todo: probably eventually makes sense to fully customize our operation types)
export type ExtendedSlateOperation = Operation | ToggleInlineFormatOperation

export function applySlateOp(
  op: ExtendedSlateOperation,
  doc: RichTextDoc
): void {
  console.log("inside op handler", { op, doc })
  if (op.type === 'insert_text') {
    doc.content.insertAt(op.offset, op.text)
  }
  if (op.type === 'remove_text') {
    doc.content.deleteAt(op.offset, op.text.length)
  }
  if (op.type === 'toggle_inline_formatting') {
    const flatFormatting = flattenedFormatting(doc)
    const selectedArray = flatFormatting.slice(Range.start(op.selection).offset, Range.end(op.selection).offset)
    const isActive = every(selectedArray, c => c && c[op.format] === true)
    const span = automergeSpanFromSlateRange(doc.content, op.selection)
    if (isActive) {
      console.log("active!")
      doc.formatSpans.push({ span, format: op.format, remove: true })
      // Note: In normal Slate usage you'd put something like this:
      // Editor.removeMark(editor, format)
      // which would split up tree nodes and set properties on the newly created node.
      // Instead of doing this, we record the format span in the annotations representation.
    } else {
      console.log("inactive!")
      doc.formatSpans.push({ span, format: op.format })
      // Same as above; don't do Slate's typical process here
      // Editor.addMark(editor, format, true)
    }
  }
  else {
    console.log("ignored op of unknown type")
  }
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

