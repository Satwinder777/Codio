import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import type { editor } from 'monaco-editor';
import { MonacoBinding } from '../MonacoBinding';

interface MonacoChange {
  rangeOffset: number;
  rangeLength: number;
  text: string;
}

class FakeModel {
  public value: string;
  public disposed = false;
  private listener: ((event: editor.IModelContentChangedEvent) => void) | null = null;

  constructor(value: string) {
    this.value = value;
  }

  getValue() { return this.value; }
  getValueLength() { return this.value.length; }
  getLineCount() { return this.value.split('\n').length; }
  isDisposed() { return this.disposed; }
  setValue(value: string) { this.value = value; }

  getPositionAt(offset: number) {
    const before = this.value.slice(0, Math.max(0, offset));
    const lines = before.split('\n');
    return { lineNumber: lines.length, column: lines[lines.length - 1].length + 1 };
  }

  getOffsetAt(position: { lineNumber: number; column: number }) {
    const lines = this.value.split('\n');
    let offset = 0;
    for (let index = 0; index < position.lineNumber - 1; index++) offset += (lines[index] || '').length + 1;
    return offset + position.column - 1;
  }

  applyEdits(edits: Array<{ range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number }; text: string }>) {
    const normalized = edits.map((edit) => ({
      start: this.getOffsetAt({ lineNumber: edit.range.startLineNumber, column: edit.range.startColumn }),
      end: this.getOffsetAt({ lineNumber: edit.range.endLineNumber, column: edit.range.endColumn }),
      text: edit.text,
    })).sort((left, right) => right.start - left.start);
    for (const edit of normalized) this.value = this.value.slice(0, edit.start) + edit.text + this.value.slice(edit.end);
  }

  onDidChangeContent(listener: (event: editor.IModelContentChangedEvent) => void) {
    this.listener = listener;
    return { dispose: () => { this.listener = null; } };
  }

  emitLocalChanges(changes: MonacoChange[]) {
    this.listener?.({ changes } as editor.IModelContentChangedEvent);
  }
}

function bind(text: Y.Text, model: FakeModel) {
  const fakeEditor = {
    getSelection: () => null,
    setSelection: () => undefined,
  } as unknown as editor.IStandaloneCodeEditor;
  return new MonacoBinding(text, model as unknown as editor.ITextModel, fakeEditor);
}

describe('Monaco Yjs binding', () => {
  it('applies multiple Monaco changes from right to left using original offsets', () => {
    const doc = new Y.Doc();
    const text = doc.getText('monaco');
    text.insert(0, 'abcdef');
    const model = new FakeModel('abcdef');
    const binding = bind(text, model);

    model.value = 'aXYZdEFf';
    model.emitLocalChanges([
      { rangeOffset: 1, rangeLength: 2, text: 'XYZ' },
      { rangeOffset: 4, rangeLength: 1, text: 'EF' },
    ]);

    expect(text.toString()).toBe('aXYZdEFf');
    binding.destroy();
    doc.destroy();
  });

  it('updates the visible editor when a collaborator replaces and deletes text', () => {
    const source = new Y.Doc();
    const sourceText = source.getText('monaco');
    sourceText.insert(0, 'first line\nsecond line');

    const receiver = new Y.Doc();
    Y.applyUpdate(receiver, Y.encodeStateAsUpdate(source));
    const receiverText = receiver.getText('monaco');
    const model = new FakeModel(receiverText.toString());
    const binding = bind(receiverText, model);

    sourceText.delete(0, sourceText.length);
    sourceText.insert(0, 'updated\n');
    Y.applyUpdate(receiver, Y.encodeStateAsUpdate(source, Y.encodeStateVector(receiver)));

    expect(model.value).toBe('updated\n');
    expect(receiverText.toString()).toBe('updated\n');
    binding.destroy();
    source.destroy();
    receiver.destroy();
  });

  it('ignores late remote updates after the Monaco model has been disposed', () => {
    const source = new Y.Doc();
    const receiver = new Y.Doc();
    source.getText('monaco').insert(0, 'initial');
    Y.applyUpdate(receiver, Y.encodeStateAsUpdate(source));
    const receiverText = receiver.getText('monaco');
    const model = new FakeModel(receiverText.toString());
    const binding = bind(receiverText, model);

    model.disposed = true;
    source.getText('monaco').insert(7, ' update');
    expect(() => Y.applyUpdate(receiver, Y.encodeStateAsUpdate(source, Y.encodeStateVector(receiver)))).not.toThrow();
    expect(receiverText.toString()).toBe('initial update');
    expect(model.value).toBe('initial');

    binding.destroy();
    source.destroy();
    receiver.destroy();
  });
});
