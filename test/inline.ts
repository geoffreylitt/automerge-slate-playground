import assert from "assert";
import {
  applySlateOp,
  ExtendedSlateOperation,
  RichTextDoc,
} from "../src/slate-automerge";
import Automerge from "automerge";

describe("applying Slate operations", function () {
  describe("insertText", function () {
    it("inserts text into the Automerge.Text string", function () {
      let doc: Automerge.Doc<RichTextDoc> = Automerge.from({
        content: new Automerge.Text(`abcd`),
        formatSpans: [],
      });
      const changeDoc = (callback: any) => {
        doc = Automerge.change(doc, (d) => callback(d));
      };

      applySlateOp(
        {
          type: "insert_text",
          path: [0, 0],
          offset: 1,
          text: "1",
        },
        doc,
        changeDoc
      );

      assert.deepStrictEqual(doc.content.toString(), "a1bcd");
    });
  });

  describe("removeText", function () {
    it("removes text from the Automerge.Text string", function () {
      let doc: Automerge.Doc<RichTextDoc> = Automerge.from({
        content: new Automerge.Text(`abcd`),
        formatSpans: [],
      });
      const changeDoc = (callback: any) => {
        doc = Automerge.change(doc, (d) => callback(d));
      };

      applySlateOp(
        {
          type: "remove_text",
          path: [0, 0],
          offset: 1,
          text: "b",
        },
        doc,
        changeDoc
      );

      assert.deepStrictEqual(doc.content.toString(), "acd");
    });
  });

  describe("toggle_inline_formatting", function () {
    it("adds a format span when there's no prior formatting", function () {
      let doc: Automerge.Doc<RichTextDoc> = Automerge.from({
        content: new Automerge.Text(`abcd`),
        formatSpans: [],
      });
      const changeDoc = (callback: any) => {
        doc = Automerge.change(doc, (d) => callback(d));
      };

      const ops: ExtendedSlateOperation[] = [
        {
          type: "toggle_inline_formatting",
          format: "bold",
          selection: {
            anchor: { path: [0, 0], offset: 0 },
            focus: { path: [0, 0], offset: 2 },
          },
        },
      ];

      ops.forEach((op) => {
        applySlateOp(op, doc, changeDoc);
      });

      assert.deepStrictEqual(doc.content.toString(), "abcd");
      assert.deepStrictEqual(doc.formatSpans.length, 1);
      assert.deepStrictEqual(doc.formatSpans[0].format, "bold");
      assert.deepStrictEqual(doc.formatSpans[0].span.start.index, 0);
      assert.deepStrictEqual(doc.formatSpans[0].span.end.index, 2);
    });
  });
});

describe("toggle_inline_formatting", function () {
  it("adds a remove span when there is prior formatting", function () {
    let doc: Automerge.Doc<RichTextDoc> = Automerge.from({
      content: new Automerge.Text(`abcd`),
      formatSpans: [],
    });
    const changeDoc = (callback: any) => {
      doc = Automerge.change(doc, (d) => callback(d));
    };

    const ops: ExtendedSlateOperation[] = [
      {
        type: "toggle_inline_formatting",
        format: "bold",
        selection: {
          anchor: { path: [0, 0], offset: 0 },
          focus: { path: [0, 0], offset: 2 },
        },
      },
      {
        type: "toggle_inline_formatting",
        format: "bold",
        selection: {
          anchor: { path: [0, 0], offset: 0 },
          focus: { path: [0, 0], offset: 2 },
        },
      },
    ];

    ops.forEach((op) => {
      applySlateOp(op, doc, changeDoc);
    });

    assert.strictEqual(doc.content.toString(), "abcd");
    assert.strictEqual(doc.formatSpans.length, 2);
    assert.strictEqual(doc.formatSpans[0].format, "bold");
    assert.strictEqual(doc.formatSpans[0].span.start.index, 0);
    assert.strictEqual(doc.formatSpans[0].span.end.index, 2);
    assert.strictEqual(doc.formatSpans[0].remove, undefined);
    assert.strictEqual(doc.formatSpans[1].format, "bold");
    assert.strictEqual(doc.formatSpans[1].span.start.index, 0);
    assert.strictEqual(doc.formatSpans[1].span.end.index, 2);
    assert.strictEqual(doc.formatSpans[1].remove, true);
  });
});
