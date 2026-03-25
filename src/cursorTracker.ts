import * as vscode from 'vscode';

/**
 * Tracks which lines have cursors on them.
 * Fires an event when the set of cursor lines changes.
 */
export class CursorTracker implements vscode.Disposable {
  private _activeLines: Set<number> = new Set();
  private _onDidChange = new vscode.EventEmitter<Set<number>>();
  private disposable: vscode.Disposable;

  readonly onDidChange = this._onDidChange.event;

  constructor() {
    this.disposable = vscode.window.onDidChangeTextEditorSelection((e) => {
      if (e.textEditor === vscode.window.activeTextEditor) {
        this.updateFromSelections(e.selections);
      }
    });

    // Initialize from current editor
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      this.updateFromSelections(editor.selections);
    }
  }

  get activeLines(): Set<number> {
    return this._activeLines;
  }

  private updateFromSelections(selections: readonly vscode.Selection[]): void {
    const newLines = new Set<number>();
    for (const sel of selections) {
      for (let line = sel.start.line; line <= sel.end.line; line++) {
        newLines.add(line);
      }
    }

    if (!setsEqual(this._activeLines, newLines)) {
      this._activeLines = newLines;
      this._onDidChange.fire(newLines);
    }
  }

  dispose(): void {
    this.disposable.dispose();
    this._onDidChange.dispose();
  }
}

function setsEqual(a: Set<number>, b: Set<number>): boolean {
  if (a.size !== b.size) { return false; }
  for (const v of a) {
    if (!b.has(v)) { return false; }
  }
  return true;
}
