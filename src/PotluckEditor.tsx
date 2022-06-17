/** @jsx jsx */
/* @jsxFrag React.Fragment */

import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { jsx, css } from "@emotion/react";
import "handsontable/dist/handsontable.full.css";

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
import { pick, pickBy, sortBy, uniq } from "lodash";
import { parse as parseIngredient } from "recipe-ingredient-parser-v3";
import { HotTable } from "@handsontable/react";
import { registerAllModules } from "handsontable/registry";
registerAllModules();

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
  icon: string;
  preprocess?: (text: string) => any;
  visibleFields?: string[];
};

const ANNOTATION_TYPES: AnnotationType[] = [
  {
    _type: "Ingredient",
    color: { r: 253, g: 253, b: 85 },
    icon: "🥕",
    preprocess: (text: string) => {
      return parseIngredient(text, "eng");
    },
    visibleFields: ["quantity", "unit", "ingredient"],
  },
  {
    _type: "Ingredient Quantity",
    icon: "🥄",
    color: { r: 204, g: 65, b: 135 },
  },
  {
    _type: "Ingredient Name",
    icon: "🍅",
    color: { r: 204, g: 98, b: 65 },
  },
  {
    _type: "Duration",
    icon: "🕓",
    color: { r: 50, g: 250, b: 50 },
  },
  {
    _type: "Step",
    icon: "🔢",
    color: { r: 250, g: 50, b: 50 },
  },
  {
    _type: "Servings",
    icon: "🍴",
    color: { r: 65, g: 155, b: 204 },
  },
  {
    _type: "Tag",
    icon: "🏷",
    color: { r: 16, g: 176, b: 165 },
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
  addAnnotation,
  modifierDown,
}: {
  annotationType: AnnotationType;
  addAnnotation: (annotationType: string) => void;
  modifierDown: boolean;
}) => {
  return (
    <button
      className="toolbar-button"
      onClick={() => addAnnotation(annotationType._type)}
      css={css`
        border: solid thin #eee;
        border-radius: 5px;
        margin-right: 10px;
        &:hover {
          cursor: pointer;
        }
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
      {annotationType.icon} {annotationType._type}
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
      const automergeSpan = automergeSpanFromSlateRange(
        doc.content,
        currentSelection
      );
      const preprocessor = ANNOTATION_TYPES.find(
        (t) => t._type === annotationType
      )?.preprocess;
      const annotationData =
        preprocessor !== undefined
          ? preprocessor(getTextAtAutomergeSpan(doc.content, automergeSpan))
          : {};

      doc.annotations.push({
        id: uuidv4(),
        range: automergeSpan,
        _type: annotationType,
        data: annotationData,
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
        box-sizing: border-box;
        max-height: 100vh;
        display: grid;
        grid-template-columns: 60% 40%;
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
            style={{ maxHeight: "700px", overflow: "auto" }}
          />
        </Slate>
      </div>
      <div
        css={css`
          grid-area: annotations;
        `}
      >
        <Annotations
          activeAnnotationId={activeAnnotationId}
          setActiveAnnotationId={setActiveAnnotationId}
          annotations={doc.annotations}
          text={doc.content}
        />
      </div>
    </div>
  );
}

const Annotations = ({
  text,
  annotations,
  activeAnnotationId,
  setActiveAnnotationId,
}: {
  text: Automerge.Text;
  annotations: Annotation[];
  activeAnnotationId: string;
  setActiveAnnotationId: (id: string) => void;
}) => {
  const annotationTypes = uniq(annotations.map((a) => a._type));

  return (
    <div>
      {annotationTypes.map((annotationType) => {
        const annotationTypeDefinition = ANNOTATION_TYPES.find(
          (t) => t._type === annotationType
        );
        const color = annotationTypeDefinition.color;
        const annotationsOfType = sortBy(
          annotations,
          (a) => a.range.start.index
        ).filter((a) => a._type === annotationType);
        console.log(annotationType, annotationsOfType);
        const visibleFields = annotationTypeDefinition.visibleFields ?? [
          "text",
        ];
        const annotationsForTable = annotationsOfType.map((a) =>
          pick(
            { ...a.data, text: getTextAtAutomergeSpan(text, a.range) },
            visibleFields
          )
        );

        return (
          <div
            key={annotationType}
            css={css`
              background-color: rgb(${color.r} ${color.g} ${color.b} / 0.2);
              padding: 2px 10px;
              margin-bottom: 10px;
            `}
          >
            <h3>{annotationType}</h3>
            <HotTable
              data={annotationsForTable}
              colHeaders={visibleFields}
              rowHeaders={false}
              width="400"
              height="200"
              licenseKey="non-commercial-and-evaluation"
              colWidths={80}
              manualColumnResize={true}
              wordWrap={false}
              afterSelection={(row, col, row2, col2) => {
                console.log({ row, col });
                const annotation = annotationsOfType[row];
                if (annotation) {
                  setActiveAnnotationId(annotation.id);
                }
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

const Leaf = ({ attributes, children, leaf }: RenderLeafProps) => {
  const highlightOpacity = leaf.active ? 0.6 : 0.2;
  // Get all the active annotation types at this leaf
  const activeAnnotationTypes = Object.keys(leaf)
    .filter((k) => k.startsWith("annotation-"))
    .map((k) => k.split("-")[1])
    .map((typeName) => ANNOTATION_TYPES.find((t) => t._type === typeName));

  const highlightColors = activeAnnotationTypes.map((a) => a.color);
  const blendedColor = highlightColors.reduce(
    (blended, color) =>
      normal(
        { ...blended, a: highlightOpacity },
        { ...color, a: highlightOpacity }
      ),
    { r: 255, g: 255, b: 255, a: 0 }
  );

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
          text-decoration: underline;
          text-decoration-color: ${leaf.active ? `#888` : `#ccc`};
          &::before {
            content: ${activeAnnotationTypes
              .map((at) => `"${at.icon} "`)
              .join(" ")};
          }
        `}
      `}
    >
      {children}
    </span>
  );
};
