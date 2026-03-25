import * as vscode from 'vscode';
import { createDecorationTypes, DecorationTypes, HeadingStyleOptions } from './styles';
import { CursorTracker } from './cursorTracker';
import { Decorator } from './decorator';
import { MathRenderer } from './mathRenderer';

let decorationTypes: DecorationTypes | undefined;
let cursorTracker: CursorTracker | undefined;
let decorator: Decorator | undefined;
let mathRenderer: MathRenderer | undefined;

export function activate(context: vscode.ExtensionContext): void {
  try {
    const config = vscode.workspace.getConfiguration('markdown-wysiwyg');
    if (!config.get<boolean>('enable', true)) {
      return;
    }

    decorationTypes = createDecorationTypes(readHeadingOptions(config));

    if (config.get<boolean>('math.enable', true)) {
      mathRenderer = new MathRenderer();
    }

    cursorTracker = new CursorTracker();

    // When cursor lines change, update decorator
    context.subscriptions.push(
      cursorTracker.onDidChange((activeLines) => {
        if (decorator) {
          decorator.setActiveLines(activeLines);
        }
      }),
    );

    // Initialize with the current active editor if it's markdown
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && isMarkdown(activeEditor.document)) {
      initDecorator(activeEditor);
    }

    // Handle active editor changes
    context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor && isMarkdown(editor.document)) {
          initDecorator(editor);
        } else {
          disposeDecorator();
        }
      }),
    );

    // Re-decorate on theme change (math SVGs need re-rendering)
    context.subscriptions.push(
      vscode.window.onDidChangeActiveColorTheme(() => {
        if (decorator) {
          decorator.setActiveLines(cursorTracker?.activeLines ?? new Set());
        }
      }),
    );

    // Handle configuration changes
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('markdown-wysiwyg') || e.affectsConfiguration('editor.fontSize')) {
          const newConfig = vscode.workspace.getConfiguration('markdown-wysiwyg');
          if (!newConfig.get<boolean>('enable', true)) {
            deactivateAll();
          } else {
            // Re-initialize
            disposeDecorationTypes();
            decorationTypes = createDecorationTypes(readHeadingOptions(newConfig));

            // Recreate math renderer based on config
            if (mathRenderer) {
              mathRenderer.dispose();
              mathRenderer = undefined;
            }
            if (newConfig.get<boolean>('math.enable', true)) {
              mathRenderer = new MathRenderer();
            }

            const editor = vscode.window.activeTextEditor;
            if (editor && isMarkdown(editor.document)) {
              initDecorator(editor);
            }
          }
        }
      }),
    );

    // Cleanup on deactivation
    context.subscriptions.push({
      dispose: () => deactivateAll(),
    });
  } catch (err) {
    console.error('[markdown-wysiwyg] Activation error:', err);
  }
}

function initDecorator(editor: vscode.TextEditor): void {
  if (!decorationTypes) { return; }

  if (decorator) {
    decorator.setEditor(editor);
  } else {
    decorator = new Decorator(editor, decorationTypes, mathRenderer);
  }

  // Sync cursor state
  if (cursorTracker) {
    decorator.setActiveLines(cursorTracker.activeLines);
  }
}

function disposeDecorator(): void {
  if (decorator) {
    decorator.clearAll();
    decorator.dispose();
    decorator = undefined;
  }
}

function disposeDecorationTypes(): void {
  if (decorationTypes) {
    for (const dt of Object.values(decorationTypes) as vscode.TextEditorDecorationType[]) {
      dt.dispose();
    }
    decorationTypes = undefined;
  }
}

function deactivateAll(): void {
  disposeDecorator();
  if (cursorTracker) {
    cursorTracker.dispose();
    cursorTracker = undefined;
  }
  if (mathRenderer) {
    mathRenderer.dispose();
    mathRenderer = undefined;
  }
  disposeDecorationTypes();
}

function readHeadingOptions(config: vscode.WorkspaceConfiguration): HeadingStyleOptions {
  return {
    scaleFontSize: config.get<boolean>('headings.scaleFontSize', true),
    fontSizeMultipliers: config.get<number[]>('headings.fontSizeScale', [1.4, 1.2, 1.0, 0.9, 0.8, 0.7]),
    colorize: config.get<boolean>('headings.colorize', true),
  };
}

function isMarkdown(document: vscode.TextDocument): boolean {
  return document.languageId === 'markdown';
}

export function deactivate(): void {
  deactivateAll();
}
