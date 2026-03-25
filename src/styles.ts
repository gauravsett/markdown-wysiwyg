import * as vscode from 'vscode';

export interface DecorationTypes {
  hiddenSyntax: vscode.TextEditorDecorationType;
  bold: vscode.TextEditorDecorationType;
  italic: vscode.TextEditorDecorationType;
  boldItalic: vscode.TextEditorDecorationType;
  strikethrough: vscode.TextEditorDecorationType;
  inlineCode: vscode.TextEditorDecorationType;
  linkText: vscode.TextEditorDecorationType;
  heading1: vscode.TextEditorDecorationType;
  heading2: vscode.TextEditorDecorationType;
  heading3: vscode.TextEditorDecorationType;
  heading4: vscode.TextEditorDecorationType;
  heading5: vscode.TextEditorDecorationType;
  heading6: vscode.TextEditorDecorationType;
  headingText1: vscode.TextEditorDecorationType;
  headingText2: vscode.TextEditorDecorationType;
  headingText3: vscode.TextEditorDecorationType;
  headingText4: vscode.TextEditorDecorationType;
  headingText5: vscode.TextEditorDecorationType;
  headingText6: vscode.TextEditorDecorationType;
  blockquoteContent: vscode.TextEditorDecorationType;
  blockquoteMarker: vscode.TextEditorDecorationType;
  listBullet: vscode.TextEditorDecorationType;
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
  colorize?: boolean;
}

const HEADING_COLOR_VARS = [
  'var(--vscode-markdownWysiwyg-heading1)',
  'var(--vscode-markdownWysiwyg-heading2)',
  'var(--vscode-markdownWysiwyg-heading3)',
  'var(--vscode-markdownWysiwyg-heading4)',
  'var(--vscode-markdownWysiwyg-heading5)',
  'var(--vscode-markdownWysiwyg-heading6)',
];

function createNoOpDecorationType(): vscode.TextEditorDecorationType {
  return vscode.window.createTextEditorDecorationType({});
}

export function createDecorationTypes(options: HeadingStyleOptions): DecorationTypes {
  const {
    scaleFontSize = true,
    fontSizeMultipliers,
    colorize = true,
  } = options;
  const baseFontSize = vscode.workspace.getConfiguration('editor').get<number>('fontSize', 14);

  function headingTextDecoration(depth: number): vscode.TextEditorDecorationType {
    const css: string[] = [];

    if (scaleFontSize) {
      const multiplier = fontSizeMultipliers[depth - 1] ?? 1.0;
      const size = Math.round(baseFontSize * multiplier);
      css.push(`font-size: ${size}px`);
    }

    if (colorize) {
      css.push(`color: ${HEADING_COLOR_VARS[depth - 1]} !important`);
    }

    if (css.length === 0) { return createNoOpDecorationType(); }

    return vscode.window.createTextEditorDecorationType({
      textDecoration: `; ${css.join('; ')};`,
    });
  }

  return {
    hiddenSyntax: vscode.window.createTextEditorDecorationType({
      color: 'transparent',
      letterSpacing: '-0.55em; font-size: 0.001em',
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

    strikethrough: vscode.window.createTextEditorDecorationType({
      textDecoration: 'line-through',
    }),

    inlineCode: vscode.window.createTextEditorDecorationType({
      backgroundColor: 'rgba(128, 128, 128, 0.15)',
      border: '1px solid rgba(128, 128, 128, 0.1)',
      borderRadius: '3px',
    }),

    linkText: vscode.window.createTextEditorDecorationType({
      textDecoration: 'underline',
    }),

    // Headings: use before pseudo-elements (separate DOM nodes, not subject to
    // semantic token color overrides) and backgroundColor (also unaffected).
    // font-size/color CSS injection via letterSpacing is reset by VS Code's
    // layout engine (Issue #9078) and color is overridden by token colors.
    heading1: vscode.window.createTextEditorDecorationType({
      fontWeight: 'bold',
      backgroundColor: 'rgba(224, 108, 117, 0.12)',
      isWholeLine: true,
      before: { contentText: '\u2503', color: '#E06C75', margin: '0 0.4em 0 0' },
    }),

    heading2: vscode.window.createTextEditorDecorationType({
      fontWeight: 'bold',
      backgroundColor: 'rgba(97, 175, 239, 0.12)',
      isWholeLine: true,
      before: { contentText: '\u2503', color: '#61AFEF', margin: '0 0.4em 0 0' },
    }),

    heading3: vscode.window.createTextEditorDecorationType({
      fontWeight: 'bold',
      backgroundColor: 'rgba(198, 120, 221, 0.10)',
      isWholeLine: true,
      before: { contentText: '\u2503', color: '#C678DD', margin: '0 0.4em 0 0' },
    }),

    heading4: vscode.window.createTextEditorDecorationType({
      fontWeight: 'bold',
      backgroundColor: 'rgba(229, 192, 123, 0.10)',
      isWholeLine: true,
      before: { contentText: '\u2503', color: '#E5C07B', margin: '0 0.4em 0 0' },
    }),

    heading5: vscode.window.createTextEditorDecorationType({
      fontWeight: 'bold',
      backgroundColor: 'rgba(86, 182, 194, 0.08)',
      isWholeLine: true,
      before: { contentText: '\u2503', color: '#56B6C2', margin: '0 0.4em 0 0' },
    }),

    heading6: vscode.window.createTextEditorDecorationType({
      fontWeight: 'bold',
      backgroundColor: 'rgba(152, 195, 121, 0.08)',
      isWholeLine: true,
      before: { contentText: '\u2503', color: '#98C379', margin: '0 0.4em 0 0' },
    }),

    headingText1: headingTextDecoration(1),
    headingText2: headingTextDecoration(2),
    headingText3: headingTextDecoration(3),
    headingText4: headingTextDecoration(4),
    headingText5: headingTextDecoration(5),
    headingText6: headingTextDecoration(6),

    blockquoteContent: vscode.window.createTextEditorDecorationType({
      fontStyle: 'italic',
      opacity: '0.85',
    }),

    blockquoteMarker: vscode.window.createTextEditorDecorationType({
      color: 'transparent',
      letterSpacing: '-0.55em; font-size: 0.001em',
      before: {
        contentText: '\u2503',
        color: 'rgba(128, 128, 128, 0.5)',
        margin: '0 0.3em 0 0',
      },
    }),

    listBullet: vscode.window.createTextEditorDecorationType({
      color: 'transparent',
      letterSpacing: '-0.55em; font-size: 0.001em',
      before: {
        contentText: '\u2022',
        color: 'rgba(180, 180, 180, 0.8)',
      },
    }),

    horizontalRule: vscode.window.createTextEditorDecorationType({
      color: 'transparent',
      letterSpacing: '-0.55em; font-size: 0.001em',
      isWholeLine: true,
      border: '1px solid rgba(128, 128, 128, 0.3)',
      borderWidth: '0 0 1px 0',
    }),

    codeBlock: vscode.window.createTextEditorDecorationType({
      backgroundColor: 'rgba(128, 128, 128, 0.08)',
      isWholeLine: true,
    }),

    codeBlockFence: vscode.window.createTextEditorDecorationType({
      color: 'transparent',
      letterSpacing: '-0.55em; font-size: 0.001em',
      isWholeLine: true,
      backgroundColor: 'rgba(128, 128, 128, 0.08)',
    }),

    mathInline: vscode.window.createTextEditorDecorationType({
      backgroundColor: 'rgba(255, 200, 124, 0.1)',
      borderRadius: '3px',
    }),

    mathInlineHidden: vscode.window.createTextEditorDecorationType({
      color: 'transparent',
      letterSpacing: '-0.55em; font-size: 0.001em',
    }),

    tableHeader: vscode.window.createTextEditorDecorationType({
      fontWeight: 'bold',
      backgroundColor: 'var(--vscode-markdownWysiwyg-tableHeaderBackground)',
      isWholeLine: true,
    }),

    tableAlignmentRow: vscode.window.createTextEditorDecorationType({
      color: 'transparent',
      isWholeLine: true,
      textDecoration: 'line-through; text-decoration-color: rgba(128, 128, 128, 0.3)',
      after: {
        contentText: '\u2500',
        color: 'rgba(128, 128, 128, 0)',
      },
      before: {
        contentText: '\u2500',
        color: 'rgba(128, 128, 128, 0)',
      },
    }),

    tableDataRowOdd: vscode.window.createTextEditorDecorationType({
      isWholeLine: true,
    }),

    tableDataRowEven: vscode.window.createTextEditorDecorationType({
      isWholeLine: true,
    }),

    tablePipe: vscode.window.createTextEditorDecorationType({
      color: 'transparent',
      letterSpacing: '-0.55em; font-size: 0.001em',
    }),
  };
}
