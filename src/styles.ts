import * as vscode from 'vscode';

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

  return {
    hiddenSyntax: vscode.window.createTextEditorDecorationType({
      color: 'transparent',
      letterSpacing: '-0.55em; font-size: 0.001em',
    }),

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
      backgroundColor: 'rgba(128, 128, 128, 0.15)',
      border: '1px solid rgba(128, 128, 128, 0.1)',
      borderRadius: '3px',
    }),

    linkText: vscode.window.createTextEditorDecorationType({
      textDecoration: 'underline',
    }),

    headingSyntax: vscode.window.createTextEditorDecorationType({
      color: 'transparent',
      letterSpacing: '-0.55em; font-size: 0.001em',
    }),

    heading1: vscode.window.createTextEditorDecorationType({
      textDecoration: '; font-weight: bold;',
      isWholeLine: true,
    }),

    heading2: vscode.window.createTextEditorDecorationType({
      textDecoration: '; font-weight: bold;',
      isWholeLine: true,
    }),

    heading3: vscode.window.createTextEditorDecorationType({
      textDecoration: '; font-weight: bold;',
      isWholeLine: true,
    }),

    heading4: vscode.window.createTextEditorDecorationType({
      textDecoration: '; font-weight: bold;',
      isWholeLine: true,
    }),

    heading5: vscode.window.createTextEditorDecorationType({
      textDecoration: '; font-weight: bold;',
      isWholeLine: true,
    }),

    heading6: vscode.window.createTextEditorDecorationType({
      textDecoration: '; font-weight: bold;',
      isWholeLine: true,
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
        contentText: '\u2022 ',
        color: 'rgba(180, 180, 180, 0.8)',
      },
    }),

    listNumber: vscode.window.createTextEditorDecorationType({
      color: 'transparent',
      letterSpacing: '-0.55em; font-size: 0.001em',
    }),

    horizontalRule: vscode.window.createTextEditorDecorationType({
      color: 'transparent',
      letterSpacing: '-0.55em; font-size: 0.001em',
      isWholeLine: true,
      border: '1px solid rgba(128, 128, 128, 0.3)',
      borderWidth: '1px 0 0 0',
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
      letterSpacing: '-0.55em; font-size: 0.001em',
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
