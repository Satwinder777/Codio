import * as Y from 'yjs';
import type { editor } from 'monaco-editor';

/**
 * Modern Monaco-Yjs Binding without legacy subpath issues.
 * Synchronizes Y.Text with Monaco's ITextModel.
 */
export class MonacoBinding {
  public ytext: Y.Text;
  public doc: Y.Doc;
  public monacoModel: editor.ITextModel;
  public editor: editor.IStandaloneCodeEditor;

  private isApplyingRemoteUpdate = false;
  private isApplyingLocalUpdate = false;
  private monacoDisposable: { dispose: () => void } | null = null;

  constructor(
    ytext: Y.Text,
    monacoModel: editor.ITextModel,
    editor: editor.IStandaloneCodeEditor
  ) {
    this.ytext = ytext;
    this.doc = ytext.doc as Y.Doc;
    this.monacoModel = monacoModel;
    this.editor = editor;

    // 1. Initial sync if editor model and ytext diverge
    const currentModelText = monacoModel.getValue();
    const currentYText = ytext.toString();

    if (currentYText.length === 0 && currentModelText.length > 0) {
      this.doc.transact(() => {
        ytext.insert(0, currentModelText);
      }, this);
    } else if (currentYText !== currentModelText) {
      monacoModel.setValue(currentYText);
    }

    // 2. Listen to remote Yjs Text changes
    this.ytext.observe(this.handleYTextChange);

    // 3. Listen to local Monaco content changes
    this.monacoDisposable = this.monacoModel.onDidChangeContent(this.handleMonacoChange);
  }

  private handleYTextChange = (event: Y.YTextEvent) => {
    if (event.transaction.origin === this || this.isApplyingLocalUpdate) {
      return;
    }

    this.isApplyingRemoteUpdate = true;
    try {
      // Save cursor position to restore after remote delta
      const selection = this.editor.getSelection();

      let index = 0;
      event.delta.forEach((op) => {
        if (op.retain !== undefined) {
          index += op.retain;
        } else if (op.insert !== undefined) {
          const insertStr = typeof op.insert === 'string' ? op.insert : '';
          const pos = this.monacoModel.getPositionAt(index);
          const range = {
            startLineNumber: pos.lineNumber,
            startColumn: pos.column,
            endLineNumber: pos.lineNumber,
            endColumn: pos.column,
          };
          this.monacoModel.applyEdits([{ range, text: insertStr }]);
          index += insertStr.length;
        } else if (op.delete !== undefined) {
          const startPos = this.monacoModel.getPositionAt(index);
          const endPos = this.monacoModel.getPositionAt(index + op.delete);
          const range = {
            startLineNumber: startPos.lineNumber,
            startColumn: startPos.column,
            endLineNumber: endPos.lineNumber,
            endColumn: endPos.column,
          };
          this.monacoModel.applyEdits([{ range, text: '' }]);
        }
      });

      // Restore cursor position if still valid
      if (selection) {
        this.editor.setSelection(selection);
      }
    } finally {
      this.isApplyingRemoteUpdate = false;
    }
  };

  private handleMonacoChange = (event: editor.IModelContentChangedEvent) => {
    if (this.isApplyingRemoteUpdate) {
      return;
    }

    this.isApplyingLocalUpdate = true;
    try {
      this.doc.transact(() => {
        // Changes are sorted from bottom to top by default in Monaco
        event.changes.forEach((change) => {
          this.ytext.delete(change.rangeOffset, change.rangeLength);
          this.ytext.insert(change.rangeOffset, change.text);
        });
      }, this);
    } finally {
      this.isApplyingLocalUpdate = false;
    }
  };

  public destroy() {
    this.ytext.unobserve(this.handleYTextChange);
    if (this.monacoDisposable) {
      this.monacoDisposable.dispose();
      this.monacoDisposable = null;
    }
  }
}
