import * as vscode from 'vscode';
import { MUTED_COLOR, MUTED_COLOR_LIGHT, SUBTLE_BG, BULLET_COLOR, INLINE_CODE_BG, INLINE_CODE_BORDER, MATH_BG } from './colors';

export interface DecorationTypes {
  hiddenSyntax: vscode.TextEditorDecorationType;
  proseFont: vscode.TextEditorDecorationType;
  bold: vscode.TextEditorDecorationType;
  italic: vscode.TextEditorDecorationType;
  boldItalic: vscode.TextEditorDecorationType;
  proseBold: vscode.TextEditorDecorationType;
  proseItalic: vscode.TextEditorDecorationType;
  proseBoldItalic: vscode.TextEditorDecorationType;
  strikethrough: vscode.TextEditorDecorationType;
  inlineCode: vscode.TextEditorDecorationType;
  linkText: vscode.TextEditorDecorationType;
  headingSyntax: vscode.TextEditorDecorationType;
  headings: vscode.TextEditorDecorationType[];
  headingTexts: vscode.TextEditorDecorationType[];
  blockquoteContent: vscode.TextEditorDecorationType;
  blockquoteMarker: vscode.TextEditorDecorationType;
  listBullet: vscode.TextEditorDecorationType;
  listNumber: vscode.TextEditorDecorationType;
  horizontalRule: vscode.TextEditorDecorationType;
  codeBlock: vscode.TextEditorDecorationType;
  codeBlockFence: vscode.TextEditorDecorationType;
  mathInline: vscode.TextEditorDecorationType;
  mathInlineHidden: vscode.TextEditorDecorationType;
  tableHeader: vscode.TextEditorDecorationType;
  tableAlignmentRow: vscode.TextEditorDecorationType;
  tableDataRowOdd: vscode.TextEditorDecorationType;
  tableDataRowEven: vscode.TextEditorDecorationType;
  tablePipe: vscode.TextEditorDecorationType;
}

export interface HeadingStyleOptions {
  scaleFontSize?: boolean;
  fontSizeMultipliers: number[];
}

// Shared CSS for collapsing text to near-zero width while preserving cursor navigation
const HIDDEN_TEXT_CSS = {
  color: 'transparent' as const,
  letterSpacing: '-0.55em; font-size: 0.001em',
};


function createNoOpDecorationType(): vscode.TextEditorDecorationType {
  return vscode.window.createTextEditorDecorationType({});
}

export function createDecorationTypes(options: HeadingStyleOptions): DecorationTypes {
  const {
    scaleFontSize = true,
    fontSizeMultipliers,
  } = options;
  const baseFontSize = vscode.workspace.getConfiguration('editor').get<number>('fontSize', 14);
  const proseFontFamily = vscode.workspace.getConfiguration('markdown-wysiwyg').get<string>('fontFamily', 'system-ui, -apple-system, sans-serif');

  function headingTextDecoration(depth: number): vscode.TextEditorDecorationType {
    if (!scaleFontSize) { return createNoOpDecorationType(); }

    const multiplier = fontSizeMultipliers[depth - 1] ?? 1.0;
    const size = Math.round(baseFontSize * multiplier);

    return vscode.window.createTextEditorDecorationType({
      textDecoration: `; font-size: ${size}px; font-weight: bold;`,
    });
  }

  // All heading levels share the same whole-line bold decoration
  const headingBase = { textDecoration: '; font-weight: bold;', isWholeLine: true };

  return {
    hiddenSyntax: vscode.window.createTextEditorDecorationType({ ...HIDDEN_TEXT_CSS }),

    proseFont: vscode.window.createTextEditorDecorationType({
      textDecoration: `; font-family: ${proseFontFamily};`,
    }),

    bold: vscode.window.createTextEditorDecorationType({
      fontWeight: 'bold',
    }),

    italic: vscode.window.createTextEditorDecorationType({
      fontStyle: 'italic',
    }),

    boldItalic: vscode.window.createTextEditorDecorationType({
      fontWeight: 'bold',
      fontStyle: 'italic',
    }),

    proseBold: vscode.window.createTextEditorDecorationType({
      textDecoration: `; font-family: ${proseFontFamily}; font-weight: bold;`,
    }),

    proseItalic: vscode.window.createTextEditorDecorationType({
      textDecoration: `; font-family: ${proseFontFamily}; font-style: italic;`,
    }),

    proseBoldItalic: vscode.window.createTextEditorDecorationType({
      textDecoration: `; font-family: ${proseFontFamily}; font-weight: bold; font-style: italic;`,
    }),

    strikethrough: vscode.window.createTextEditorDecorationType({
      textDecoration: 'line-through',
    }),

    inlineCode: vscode.window.createTextEditorDecorationType({
      backgroundColor: INLINE_CODE_BG,
      border: `1px solid ${INLINE_CODE_BORDER}`,
      borderRadius: '3px',
    }),

    linkText: vscode.window.createTextEditorDecorationType({
      textDecoration: 'underline',
    }),

    headingSyntax: vscode.window.createTextEditorDecorationType({ ...HIDDEN_TEXT_CSS }),

    headings: Array.from({ length: 6 }, () =>
      vscode.window.createTextEditorDecorationType(headingBase),
    ),

    headingTexts: Array.from({ length: 6 }, (_, i) => headingTextDecoration(i + 1)),

    blockquoteContent: vscode.window.createTextEditorDecorationType({
      fontStyle: 'italic',
      opacity: '0.85',
    }),

    blockquoteMarker: vscode.window.createTextEditorDecorationType({
      ...HIDDEN_TEXT_CSS,
      before: {
        contentText: '\u2502',
        color: MUTED_COLOR,
        margin: '0 0.3em 0 0',
      },
    }),

    listBullet: vscode.window.createTextEditorDecorationType({
      ...HIDDEN_TEXT_CSS,
      before: {
        contentText: '\u2022 ',
        color: BULLET_COLOR,
      },
    }),

    listNumber: vscode.window.createTextEditorDecorationType({ ...HIDDEN_TEXT_CSS }),

    horizontalRule: vscode.window.createTextEditorDecorationType({
      ...HIDDEN_TEXT_CSS,
      isWholeLine: true,
      border: `1px solid ${MUTED_COLOR_LIGHT}`,
      borderWidth: '1px 0 0 0',
    }),

    codeBlock: vscode.window.createTextEditorDecorationType({
      backgroundColor: SUBTLE_BG,
      isWholeLine: true,
    }),

    codeBlockFence: vscode.window.createTextEditorDecorationType({
      ...HIDDEN_TEXT_CSS,
      isWholeLine: true,
      backgroundColor: SUBTLE_BG,
    }),

    mathInline: vscode.window.createTextEditorDecorationType({
      backgroundColor: MATH_BG,
      borderRadius: '3px',
    }),

    mathInlineHidden: vscode.window.createTextEditorDecorationType({ ...HIDDEN_TEXT_CSS }),

    tableHeader: vscode.window.createTextEditorDecorationType({
      fontWeight: 'bold',
      backgroundColor: 'var(--vscode-markdownWysiwyg-tableHeaderBackground)',
      isWholeLine: true,
    }),

    tableAlignmentRow: vscode.window.createTextEditorDecorationType({ ...HIDDEN_TEXT_CSS }),

    tableDataRowOdd: vscode.window.createTextEditorDecorationType({
      isWholeLine: true,
    }),

    tableDataRowEven: vscode.window.createTextEditorDecorationType({
      isWholeLine: true,
    }),

    tablePipe: vscode.window.createTextEditorDecorationType({ ...HIDDEN_TEXT_CSS }),
  };
}
