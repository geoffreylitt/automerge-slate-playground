/** @jsx jsx */
/* @jsxFrag React.Fragment */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { jsx, css } from "@emotion/react";
import "handsontable/dist/handsontable.full.css";
import scalerPlugin from "./plugins/scaler";
import ingredientsPlugin from "./plugins/ingredients";
import timerPlugin from "./plugins/timer";
import {
  getMergedExtensions,
  Plugin,
  annotationWithComputedProps,
} from "./plugins";
import { isString } from "lodash";
import Automerge from "automerge";

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
import {
  Editable,
  ReactEditor,
  RenderLeafProps,
  Slate,
  withReact,
} from "slate-react";
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
import { HotTable } from "@handsontable/react";
import { registerAllModules } from "handsontable/registry";
import { AnnotationType, ANNOTATION_TYPES } from "./annotations";
import { applyPluginTransforms } from "./plugins";
import { DefaultAnnotationSpec } from "./PotluckDemo";

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
Prism.languages.markdown = Prism.languages.extend("markup", {}), Prism.languages.insertBefore("markdown", "prolog", {
  blockquote: {pattern: /^>(?:[\t ]*>)*/m, alias: "punctuation"},
  code: [{pattern: /^(?: {4}|\t).+/m, alias: "keyword"}, {pattern: /``.+?``|`[^`\n]+`/, alias: "keyword"}],
  title: [{
    pattern: /\w+.*(?:\r?\n|\r)(?:==+|--+)/,
    alias: "important",
    inside: {punctuation: /==+$|--+$/}
  }, {pattern: /(^\s*)#+.+/m, lookbehind: !0, alias: "important", inside: {punctuation: /^#+|#+$/}}],
  hr: {pattern: /(^\s*)([*-])([\t ]*\2){2,}(?=\s*$)/m, lookbehind: !0, alias: "punctuation"},
  list: {pattern: /(^\s*)(?:[*+-]|\d+\.)(?=[\t ].)/m, lookbehind: !0, alias: "punctuation"},
  "url-reference": {
    pattern: /!?\[[^\]]+\]:[\t ]+(?:\S+|<(?:\\.|[^>\\])+>)(?:[\t ]+(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^)\\])*\)))?/,
    inside: {
      variable: {pattern: /^(!?\[)[^\]]+/, lookbehind: !0},
      string: /(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^)\\])*\))$/,
      punctuation: /^[\[\]!:]|[<>]/
    },
    alias: "url"
  },
  bold: {
    pattern: /(^|[^\\])(\*\*|__)(?:(?:\r?\n|\r)(?!\r?\n|\r)|.)+?\2/,
    lookbehind: !0,
    inside: {punctuation: /^\*\*|^__|\*\*$|__$/}
  },
  italic: {
    pattern: /(^|[^\\])([*_])(?:(?:\r?\n|\r)(?!\r?\n|\r)|.)+?\2/,
    lookbehind: !0,
    inside: {punctuation: /^[*_]|[*_]$/}
  },
  url: {
    pattern: /!?\[[^\]]+\](?:\([^\s)]+(?:[\t ]+"(?:\\.|[^"\\])*")?\)| ?\[[^\]\n]*\])/,
    inside: {variable: {pattern: /(!?\[)[^\]]+(?=\]$)/, lookbehind: !0}, string: {pattern: /"(?:\\.|[^"\\])*"(?=\)$)/}}
  }
//@ts-ignore
}), Prism.languages.markdown.bold.inside.url = Prism.util.clone(Prism.languages.markdown.url), Prism.languages.markdown.italic.inside.url = Prism.util.clone(Prism.languages.markdown.url), Prism.languages.markdown.bold.inside.italic = Prism.util.clone(Prism.languages.markdown.italic), Prism.languages.markdown.italic.inside.bold = Prism.util.clone(Prism.languages.markdown.bold); // prettier-ignore

type PotluckEditorProps = {
  doc: MarkdownDoc;
  changeDoc: (callback: (doc: MarkdownDoc) => void) => void;
  defaultAnnotations: DefaultAnnotationSpec[];
};

const PLUGINS: Plugin[] = [ingredientsPlugin, scalerPlugin, timerPlugin];

const EXTENSIONS_BY_ANNOTATION = getMergedExtensions(PLUGINS);

const HOTKEYS: { [key: string]: string } = {
  "mod+1": ANNOTATION_TYPES[0]._type,
  "mod+2": ANNOTATION_TYPES[1]._type,
  "mod+3": ANNOTATION_TYPES[2]._type,
  "mod+4": ANNOTATION_TYPES[3]._type,
  "mod+5": ANNOTATION_TYPES[4]._type,
  "mod+6": ANNOTATION_TYPES[5]._type,
  "mod+7": ANNOTATION_TYPES[6]._type,
  "ctrl+1": ANNOTATION_TYPES[0]._type,
  "ctrl+2": ANNOTATION_TYPES[1]._type,
  "ctrl+3": ANNOTATION_TYPES[2]._type,
  "ctrl+4": ANNOTATION_TYPES[3]._type,
  "ctrl+5": ANNOTATION_TYPES[4]._type,
  "ctrl+6": ANNOTATION_TYPES[5]._type,
  "ctrl+7": ANNOTATION_TYPES[6]._type,
};

const AnnotateButton = ({
  annotationType,
  addAnnotation,
  modifierDown,
  currentSelection,
}: {
  annotationType: AnnotationType;
  addAnnotation: (annotationType: string, currentSelection: Range) => void;
  modifierDown: boolean;
  currentSelection: Range;
}) => {
  return (
    <button
      className="toolbar-button"
      onClick={() => addAnnotation(annotationType._type, currentSelection)}
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

export default function PotluckEditor({
  doc,
  changeDoc,
  defaultAnnotations,
}: PotluckEditorProps) {
  const [selection, setSelection] = useState<Range>(null);
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(
    null
  );
  const [modifierDown, setModifierDown] = useState<boolean>(false);

  const annotations = doc.annotations;

  // We model the document for Slate as a single text node.
  // It should stay a single node throughout all edits.
  const content: Node[] = [
    {
      children: [{ text: doc.content.toString() }],
    },
  ];

  const renderLeaf = useCallback(
    (props) => <Leaf {...props} annotations={annotations} />,
    [annotations, activeAnnotationId]
  );

  // Set up a Slate editor instance w/ some custom Automerge integration stuff
  const editor = useMemo(() => {
    return withOpHandler(
      withHistory(withReact(createEditor())),
      (op: Operation) => {
        console.log("OP!", op.type);
        if (op.type === "insert_text") {
          changeDoc((doc: MarkdownDoc) => {
            doc.content.insertAt(op.offset, op.text);

            // TODO: We want to re-parse structured data for all the annotations
            // after editing the text contents of the document.
            // But it causes a bug related to Automerge edit lifecycles,
            // so commented out for now.
            // for (const annotation of doc.annotations) {
            //   annotation.data = parseDataForAnnotation(annotation, doc);
            // }
          });
        }
        if (op.type === "remove_text") {
          changeDoc((doc: MarkdownDoc) =>
            doc.content.deleteAt(op.offset, op.text.length)
          );
        }
      }
    ) as ReactEditor; // TODO: Figure out why we need to cast this type here?
  }, []);

  // Add a new annotation to the currently selected text
  const addAnnotation = (
    annotationType: string,
    currentSelection: Range | null
  ) => {
    // Avoid adding empty annotations
    if (
      currentSelection === null ||
      currentSelection.anchor.offset === currentSelection.focus.offset
    ) {
      return;
    }

    changeDoc((doc: MarkdownDoc) => {
      const automergeSpan = automergeSpanFromSlateRange(
        doc.content,
        currentSelection
      );

      // todo: reapply transformation whenever annotations change instead of calling transform at creation
      const annotations: Annotation[] = [
        {
          id: uuidv4(),
          range: automergeSpan,
          _type: annotationType,
          data: {},
        },
      ];

      const transformedAnnotations = applyPluginTransforms(
        PLUGINS,
        doc,
        annotations
      );

      for (const annotation of transformedAnnotations) {
        doc.annotations.push(annotation);
      }
    });

    // move the cursor to the end of the current selection
    Transforms.select(editor, {
      anchor: currentSelection.focus,
      focus: currentSelection.focus,
    });
  };

  const deleteAnnotation = (annotationId: string): void => {
    changeDoc((doc) => {
      const index = doc.annotations.findIndex((a) => a.id === annotationId);
      if (index < 0) {
        return;
      }
      doc.annotations.splice(index, 1);
    });
  };

  // Add some default annotations to the doc
  useEffect(() => {
    for (const annotationSpec of defaultAnnotations) {
      const annotationRange = {
        anchor: {
          path: [0, 0],
          offset: annotationSpec.start,
        },
        focus: {
          path: [0, 0],
          offset: annotationSpec.end,
        },
      };
      addAnnotation(annotationSpec.type, annotationRange);
    }
  }, []);

  // Set the active annotation based on the latest selection in the doc
  useEffect(() => {
    let activeCommentId = null;
    for (const annotation of annotations) {
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

  // Logic for telling Slate what formatting should apply to each span of text.
  // Used for Markdown preview + annotating spans
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
          return token.content.reduce(
            (l: number, t: any) => l + getLength(t),
            0
          );
        } else {
          return 0;
        }
      };

      // Add comment highlighting decorations
      for (const docSpan of annotations) {
        ranges.push({
          ...slateRangeFromAutomergeSpan(docSpan.range),
          highlighted: true,
          [`annotation::${docSpan.id}`]: true,
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
    [annotations, activeAnnotationId]
  );

  const onChangeAnnotations = useCallback((mutate) => {
    changeDoc((doc) => {
      mutate(doc.annotations)
    })
  }, [changeDoc])

  return (
    <div
      css={css`
        column-gap: 10px;
        display: grid;
        max-height: 100vh;
        grid-template-columns: 60% 40%;
        grid-template-rows: 30px auto;
        grid-template-areas:
          "toolbar toolbar"
          "editor annotations";
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
            currentSelection={selection}
          />
        ))}
        <button
          onClick={() => deleteAnnotation(activeAnnotationId)}
          disabled={activeAnnotationId === null}
        >
          ❌ Remove this annotation
        </button>
      </div>

      <div
        className="shadow-lg bg-white rounded-lg p-4"
        css={css`
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
                  addAnnotation(annotationType, selection);
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
            style={{ maxHeight: "800px", overflow: "auto" }}
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
          onChangeAnnotations={onChangeAnnotations}
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
  onChangeAnnotations,
}: {
  text: Automerge.Text;
  annotations: Annotation[];
  activeAnnotationId: string;
  setActiveAnnotationId: (id: string) => void;
  onChangeAnnotations: (mutation: (annotations: Annotation[]) => void) => void
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
        const extension = EXTENSIONS_BY_ANNOTATION[annotationType];
        const visibleFields = annotationTypeDefinition.visibleFields ?? [
          "text",
        ];
        const annotationsForTable = annotationsOfType.map((a) => {
          const annotation = annotationWithComputedProps(
            {
              ...a.data,
              text: getTextAtAutomergeSpan(text, a.range),
            },
            extension
          );

          const data: any = {};

          for (const field of visibleFields) {
            data[field] = annotation[field];
          }

          return data;
        });

        const columns = visibleFields.map((name) => ({
          data: name,
          readOnly: extension?.computed[name] !== undefined
        }))

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
              columns={columns}
              rowHeaders={false}
              width="400"
              height="200"
              licenseKey="non-commercial-and-evaluation"
              colWidths={80}
              manualColumnResize={true}
              wordWrap={false}
              afterSelection={(row, col, row2, col2) => {
                const annotation = annotationsOfType[row];
                if (annotation) {
                  setActiveAnnotationId(annotation.id);
                }
              }}
              afterChange={(changes) => {
                if (!changes) {
                  return
                }

                onChangeAnnotations((annotations : Annotation[]) => {
                  for (const [row, prop, oldValue, newValue] of changes) {
                    const id = annotationsOfType[row].id

                    const index = annotations.findIndex((annotation) => {
                      return annotation.id === id
                    })

                    annotations[index].data[prop] = newValue
                  }
                })
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

function getAltView(
  activeAnnotations: Annotation[],
  annotations: Annotation[]
): JSX.Element | string {
  if (activeAnnotations.length === 0) {
    return;
  }

  const type = activeAnnotations[0]._type;
  const extension = EXTENSIONS_BY_ANNOTATION[type];

  if (!extension || !extension.view) {
    return;
  }

  const annotation = activeAnnotations[0];
  const data = annotationWithComputedProps(annotation.data, extension);

  return extension.view(data, annotations);
}

// This is where we define how an annotation is rendered.
// We style the "leaf" element in Slate, which is basically a container element
// wrapping some content-editable text.
const Leaf = ({
  attributes,
  children,
  leaf,
  annotations,
}: RenderLeafProps & { annotations: Annotation[] }) => {
  const highlightOpacity = leaf.active ? 0.6 : 0.2;
  // Get all the active annotation types at this leaf
  const activeAnnotations = Object.keys(leaf)
    .filter((k) => k.startsWith("annotation::"))
    .map((k) => k.split("::")[1])
    .map((id) => annotations.find((a) => a.id === id));

  const activeAnnotationTypes = activeAnnotations
    .map((a) => a._type)
    .map((t) => ANNOTATION_TYPES.find((t2) => t2._type === t));

  let altView = getAltView(activeAnnotations, annotations);

  const isAltViewText = isString(altView)

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
        position: relative;
        font-weight: ${leaf.bold && "bold"};
        font-style: ${leaf.italic && "italic"};
        text-decoration: ${leaf.underlined && "underline"};
        
        &:hover > .menu {
          display: inherit;
        }
        
        .menu {
          position: absolute;
          display: none;
          top: 100%;
          left: 0;
          background: #fff;
          z-index: 10;
          border: 1px solid #ddd;
        }
        
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
          padding: 0 0.2rem;
          color: black;
          text-decoration: underline;
          text-decoration-color: ${leaf.active ? `#888` : `#ccc`};

          &::before {
            content: ${activeAnnotationTypes
              .map((at) => `"${at.icon} "`)
              .join(" ")};
          }

          ${altView && isAltViewText &&
          `
            &::after {
              content: "${altView}";
              padding: 0 0.2rem;
              margin-left: 3px;
              background-color: #cae3ff;
              border-radius: 5px;
            }
          `}
        `}
      `}
    >
      {children}{altView && !isAltViewText && (
        <div
          className="menu"
          contentEditable={false}
        >
          {altView}
        </div>
      )}
    </span>
  );
};
