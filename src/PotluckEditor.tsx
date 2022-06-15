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
  Transforms,
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
import { normal } from "color-blend";
import isHotkey from "is-hotkey";

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

type AnnotationType = {
  _type: string;
  color: { r: number; g: number; b: number };
};

const ANNOTATION_TYPES: AnnotationType[] = [
  {
    _type: "🥕 Ingredient",
    color: { r: 253, g: 253, b: 85 },
  },
  {
    _type: "⏱ Duration",
    color: { r: 50, g: 250, b: 50 },
  },
  {
    _type: "🔢 Step",
    color: { r: 250, g: 50, b: 50 },
  },
  {
    _type: "🍽 Servings",
    color: { r: 50, g: 50, b: 250 },
  },
  {
    _type: "🥄 Quantity",
    color: { r: 50, g: 50, b: 250 },
  },
  {
    _type: "🥄 Food Name",
    color: { r: 50, g: 50, b: 250 },
  },
  {
    _type: "🏷 Tag",
    color: { r: 50, g: 50, b: 250 },
  },
];

const HOTKEYS = {
  "mod+1": ANNOTATION_TYPES[0]._type,
  "mod+2": ANNOTATION_TYPES[1]._type,
  "mod+3": ANNOTATION_TYPES[2]._type,
  "mod+4": ANNOTATION_TYPES[3]._type,
  "mod+5": ANNOTATION_TYPES[4]._type,
  "mod+6": ANNOTATION_TYPES[5]._type,
  "mod+7": ANNOTATION_TYPES[6]._type,
};

const AnnotateButton = ({
  annotationType,
  disabled,
  addAnnotation,
  modifierDown,
}: {
  annotationType: AnnotationType;
  disabled: boolean;
  addAnnotation: (annotationType: string) => void;
  modifierDown: boolean;
}) => {
  return (
    <button
      className="toolbar-button"
      disabled={disabled}
      onClick={() => addAnnotation(annotationType._type)}
      css={css`
        border: solid thin #eee;
        border-radius: 5px;
        margin-right: 10px;
        &:enabled {
          background-color: rgb(
            ${annotationType.color.r} ${annotationType.color.g}
              ${annotationType.color.b} / 20%
          );
        }
        &:active {
          background-color: rgb(
            ${annotationType.color.r} ${annotationType.color.g}
              ${annotationType.color.b} / 50%
          );
        }
      `}
    >
      {annotationType._type}{" "}
      <div
        css={css`
          color: #555;
        `}
      >
        {modifierDown && `⌘+${ANNOTATION_TYPES.indexOf(annotationType) + 1}`}
      </div>
    </button>
  );
};

export default function PotluckEditor({ doc, changeDoc }: MarkdownEditorProps) {
  const [selection, setSelection] = useState<Range>(null);
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(
    null
  );
  const [modifierDown, setModifierDown] = useState<boolean>(false);

  const docSpans = doc.annotations;

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

  const addAnnotation = (annotationType: string) => {
    const currentSelection = selection;
    changeDoc((doc: MarkdownDoc) => {
      doc.annotations.push({
        id: uuidv4(),
        range: automergeSpanFromSlateRange(doc.content, currentSelection),
        _type: annotationType,
        data: {},
      });
    });

    // move the cursor to the end of the current selection
    Transforms.select(editor, {
      anchor: selection.focus,
      focus: selection.focus,
    });
  };

  // Set the active annotation based on the latest selection in the doc
  useEffect(() => {
    let activeCommentId = null;
    for (const annotation of docSpans) {
      if (
        activeCommentId !== annotation.id &&
        selection &&
        Range.intersection(
          selection,
          slateRangeFromAutomergeSpan(annotation.range)
        )
      ) {
        activeCommentId = annotation.id;
        break;
      }
    }
    setActiveAnnotationId(activeCommentId);
  }, [selection]);

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
        ranges.push({
          ...slateRangeFromAutomergeSpan(docSpan.range),
          highlighted: true,
          [`annotation-${docSpan._type}`]: true,
          active: activeAnnotationId === docSpan.id,
        });
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
        padding: 30px;
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
        {ANNOTATION_TYPES.map((annotationType) => (
          <AnnotateButton
            disabled={selection?.anchor?.offset === selection?.focus?.offset}
            annotationType={annotationType}
            addAnnotation={addAnnotation}
            modifierDown={modifierDown}
          />
        ))}
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

              for (const hotkey in HOTKEYS) {
                if (isHotkey(hotkey, event as any)) {
                  event.preventDefault();
                  const annotationType = HOTKEYS[hotkey];
                  addAnnotation(annotationType);
                }
              }

              if (isHotkey("mod", event as any)) {
                setModifierDown(true);
              }
            }}
            onKeyUp={(event) => {
              if (!isHotkey("mod", event as any)) {
                setModifierDown(false);
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
          <ul>
            {doc.annotations
              .filter((a) => a._type === "🥕 Ingredient")
              .map((annotation) => {
                const color = ANNOTATION_TYPES.find(
                  (t) => t._type === annotation._type
                ).color;
                return (
                  <li
                    key={annotation.id}
                    css={css`
                      ${activeAnnotationId === annotation.id &&
                      `background-color: rgb(${color.r} ${color.g} ${color.b} / 0.3);`}
                    `}
                  >
                    {getTextAtAutomergeSpan(doc.content, annotation.range)}
                  </li>
                );
              })}
          </ul>
        </div>
      </div>
    </div>
  );
}

const Leaf = ({ attributes, children, leaf }: RenderLeafProps) => {
  const highlightOpacity = leaf.active ? 0.6 : 0.25;
  // Get all the active annotation types at this leaf
  const activeAnnotationTypes = Object.keys(leaf)
    .filter((k) => k.startsWith("annotation-"))
    .map((k) => k.split("-")[1]);

  const highlightColors = activeAnnotationTypes.map(
    (annotationType) =>
      ANNOTATION_TYPES.find((t) => t._type === annotationType).color
  );
  const blendedColor = highlightColors.reduce(
    (blended, color) =>
      normal(
        { ...blended, a: highlightOpacity },
        { ...color, a: highlightOpacity }
      ),
    { r: 255, g: 255, b: 255, a: 0 }
  );
  if (activeAnnotationTypes.length > 0) {
    console.log({ activeAnnotationTypes, highlightColors, blendedColor });
  }

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
        ${activeAnnotationTypes.length > 0 &&
        css`
          background-color: rgba(
            ${blendedColor.r},
            ${blendedColor.g},
            ${blendedColor.b},
            ${blendedColor.a}
          );
          color: black;
        `}
      `}
    >
      {children}
    </span>
  );
};
