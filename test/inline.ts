import assert from 'assert'
import { applySlateOp, RichTextDoc } from '../src/slate-automerge'
import Automerge from 'automerge'






describe('applying Slate operations', function() {
  describe('insertText', function() {
    it('inserts text into the Automerge.Text string', function() {
      let doc: Automerge.Doc<RichTextDoc> = Automerge.from(
        { content: new Automerge.Text(`abcd`), formatSpans: [] }
      )
      const changeDoc = (callback: any) => {
        doc = Automerge.change(doc, d => callback(d))
      }

      applySlateOp({
        type: "insert_text",
        path: [0, 0],
        offset: 1,
        text: "1"
      },
      doc,
      changeDoc)

      assert.deepStrictEqual(
        doc.content.toString(),
        "a1bcd"
      )
    })
  })

  describe('removeText', function() {
    it('removes text from the Automerge.Text string', function() {
      let doc: Automerge.Doc<RichTextDoc> = Automerge.from(
        { content: new Automerge.Text(`abcd`), formatSpans: [] }
      )
      const changeDoc = (callback: any) => {
        doc = Automerge.change(doc, d => callback(d))
      }

      applySlateOp({
        type: "remove_text",
        path: [0, 0],
        offset: 1,
        text: "b"
      },
      doc,
      changeDoc)

      assert.deepStrictEqual(
        doc.content.toString(),
        "acd"
      )
    })
  })
})