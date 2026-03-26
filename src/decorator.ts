import * as vscode from 'vscode';
import { parseDocument, DecorationRange, DecorationRangeType, getLinesForRange } from './parser';
import { DecorationTypes } from './styles';
import { MathRenderer } from './mathRenderer';
import { MUTED_COLOR, MUTED_COLOR_LIGHT, BULLET_COLOR } from './colors';

function pushPipeOptions(
  syntaxRanges: vscode.Range[],
  pipePaddings: number[] | undefined,
  target: vscode.DecorationOptions[],
): void {
  for (let i = 0; i < syntaxRanges.length; i++) {
    const padding = pipePaddings?.[i] ?? 0;
    const margin = padding > 0
      ? `0 0 0 calc(${padding}ch)`
      : '0 0 0 0';
    target.push({
      range: syntaxRanges[i],
      renderOptions: {
        before: {
          contentText: '\u2502',
          color: MUTED_COLOR,
          margin,
        },
      },
    });
  }
}

/** Range types whose syntax markers are handled by their own decoration types (not hiddenSyntax). */
const SELF_HIDDEN_TYPES = new Set<DecorationRangeType>([
  'heading', 'blockquote', 'listBullet', 'listNumber', 'codeBlock', 'horizontalRule',
  'mathInline', 'tableAlignmentRow', 'tableHeader', 'tableDataRowOdd', 'tableDataRowEven',
]);

/**
 * Orchestrates parsing and decoration application.
 * Manages the mapping between parsed ranges and VS Code decorations,
 * toggling syntax-hiding based on which lines have cursors.
 */
export class Decorator implements vscode.Disposable {
  private parsedRanges: DecorationRange[] = [];
  private activeLines: Set<number> = new Set();
  private parseDebounceTimer: ReturnType<typeof setTimeout> | undefined;
  private disposable: vscode.Disposable;

  constructor(
    private editor: vscode.TextEditor,
    private dt: DecorationTypes,
    private mathRenderer?: MathRenderer,
  ) {
    this.disposable = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document === this.editor.document) {
        this.debouncedParse();
      }
    });

    this.reparseAndApply();
  }

  setActiveLines(lines: Set<number>): void {
    this.activeLines = lines;
    this.applyDecorations();
  }

  setEditor(editor: vscode.TextEditor): void {
    this.editor = editor;
    this.reparseAndApply();
  }

  private debouncedParse(): void {
    if (this.parseDebounceTimer) {
      clearTimeout(this.parseDebounceTimer);
    }
    this.parseDebounceTimer = setTimeout(() => {
      this.reparseAndApply();
    }, 100);
  }

  private reparseAndApply(): void {
    this.parsedRanges = parseDocument(this.editor.document);
    this.applyDecorations();
  }

  private applyDecorations(): void {
    const dt = this.dt;
    const totalLines = this.editor.document.lineCount;

    // Decoration collectors
    const hiddenSyntaxRanges: vscode.Range[] = [];
    const boldRanges: vscode.Range[] = [];
    const italicRanges: vscode.Range[] = [];
    const boldItalicRanges: vscode.Range[] = [];
    const proseBoldRanges: vscode.Range[] = [];
    const proseItalicRanges: vscode.Range[] = [];
    const proseBoldItalicRanges: vscode.Range[] = [];
    const headingRanges: vscode.Range[][] = [[], [], [], [], [], []];
    const headingTextRanges: vscode.Range[][] = [[], [], [], [], [], []];
    const headingSyntaxOptions: vscode.DecorationOptions[] = [];
    const inlineCodeRanges: vscode.Range[] = [];
    const strikethroughRanges: vscode.Range[] = [];
    const linkTextRanges: vscode.Range[] = [];
    const blockquoteContentRanges: vscode.Range[] = [];
    const blockquoteMarkerRanges: vscode.Range[] = [];
    const listBulletRanges: vscode.Range[] = [];
    const listNumberOptions: vscode.DecorationOptions[] = [];
    const horizontalRuleRanges: vscode.Range[] = [];
    const codeBlockRanges: vscode.Range[] = [];
    const codeBlockFenceRanges: vscode.Range[] = [];
    const mathInlineSourceRanges: vscode.Range[] = [];
    const mathInlineRendered: vscode.DecorationOptions[] = [];
    const tableHeaderRanges: vscode.Range[] = [];
    const tableAlignmentRowOptions: vscode.DecorationOptions[] = [];
    const tableDataRowOddRanges: vscode.Range[] = [];
    const tableDataRowEvenRanges: vscode.Range[] = [];
    const tablePipeOptions: vscode.DecorationOptions[] = [];
    const proseFontRanges: vscode.Range[] = [];

    // Single pass: collect monospace lines and monospace spans for prose font exclusion
    const monoLines = new Set<number>();
    const monoSpansByLine = new Map<number, { start: number; end: number }[]>();

    function addMonoSpan(line: number, start: number, end: number): void {
      if (!monoSpansByLine.has(line)) {
        monoSpansByLine.set(line, []);
      }
      monoSpansByLine.get(line)!.push({ start, end });
    }

    for (const range of this.parsedRanges) {
      // Whole-line monospace types (code blocks, tables)
      if (range.type === 'codeBlock' || range.type === 'tableHeader' ||
          range.type === 'tableAlignmentRow' || range.type === 'tableDataRowOdd' ||
          range.type === 'tableDataRowEven') {
        for (let line = range.contentRange.start.line; line <= range.contentRange.end.line; line++) {
          monoLines.add(line);
        }
      }

      // Inline monospace spans excluded from prose font
      if (range.type === 'inlineCode') {
        const line = range.contentRange.start.line;
        const start = range.syntaxRanges.length > 0
          ? range.syntaxRanges[0].start.character
          : range.contentRange.start.character;
        const end = range.syntaxRanges.length > 0
          ? range.syntaxRanges[range.syntaxRanges.length - 1].end.character
          : range.contentRange.end.character;
        addMonoSpan(line, start, end);
      } else if (range.type === 'heading') {
        // Heading syntax (# markers) are collapsed — exclude from prose font
        const line = range.contentRange.start.line;
        for (const sr of range.syntaxRanges) {
          addMonoSpan(line, sr.start.character, sr.end.character);
        }
      } else if (range.type === 'bold' || range.type === 'italic' || range.type === 'boldItalic') {
        // Formatted text uses prose variants that handle font-family themselves
        addMonoSpan(range.contentRange.start.line, range.contentRange.start.character, range.contentRange.end.character);
      } else if (range.type === 'listBullet' || range.type === 'listNumber') {
        // List prefix (indentation + bullet/number) stays monospace for alignment
        addMonoSpan(range.contentRange.start.line, 0, range.contentRange.start.character);
      }
    }

    // Build prose font ranges: non-monospace, non-active lines, excluding monospace spans
    for (let line = 0; line < totalLines; line++) {
      if (monoLines.has(line) || this.activeLines.has(line)) { continue; }

      const lineLength = this.editor.document.lineAt(line).text.length;
      if (lineLength === 0) { continue; }

      const spans = monoSpansByLine.get(line);
      if (!spans || spans.length === 0) {
        proseFontRanges.push(new vscode.Range(line, 0, line, lineLength));
      } else {
        const sorted = spans.sort((a, b) => a.start - b.start);
        let cursor = 0;
        for (const span of sorted) {
          if (cursor < span.start) {
            proseFontRanges.push(new vscode.Range(line, cursor, line, span.start));
          }
          cursor = span.end;
        }
        if (cursor < lineLength) {
          proseFontRanges.push(new vscode.Range(line, cursor, line, lineLength));
        }
      }
    }

    // Main pass: build decoration ranges
    for (const range of this.parsedRanges) {
      const lines = getLinesForRange(range);
      const isOnActiveLine = lines.some((l) => this.activeLines.has(l));

      switch (range.type) {
        case 'bold': {
          const onProseLine = !isOnActiveLine && !monoLines.has(range.contentRange.start.line);
          (onProseLine ? proseBoldRanges : boldRanges).push(range.contentRange);
          break;
        }
        case 'italic': {
          const onProseLine = !isOnActiveLine && !monoLines.has(range.contentRange.start.line);
          (onProseLine ? proseItalicRanges : italicRanges).push(range.contentRange);
          break;
        }
        case 'boldItalic': {
          const onProseLine = !isOnActiveLine && !monoLines.has(range.contentRange.start.line);
          (onProseLine ? proseBoldItalicRanges : boldItalicRanges).push(range.contentRange);
          break;
        }
        case 'heading': {
          const level = Math.min(Math.max((range.level ?? 1) - 1, 0), 5);
          const lineNum = range.contentRange.start.line;
          headingRanges[level].push(new vscode.Range(lineNum, 0, lineNum, 0));
          if (!isOnActiveLine) {
            headingTextRanges[level].push(range.contentRange);
            for (const sr of range.syntaxRanges) {
              headingSyntaxOptions.push({
                range: sr,
                renderOptions: {
                  before: {
                    contentText: this.editor.document.getText(sr),
                    color: MUTED_COLOR,
                    fontWeight: 'normal',
                  },
                },
              });
            }
          }
          break;
        }
        case 'inlineCode':
          if (isOnActiveLine) {
            const fullRange = new vscode.Range(
              range.syntaxRanges[0].start,
              range.syntaxRanges[range.syntaxRanges.length - 1].end,
            );
            inlineCodeRanges.push(fullRange);
          } else {
            inlineCodeRanges.push(range.contentRange);
          }
          break;
        case 'strikethrough':
          strikethroughRanges.push(range.contentRange);
          break;
        case 'link':
          linkTextRanges.push(range.contentRange);
          break;
        case 'blockquote':
          blockquoteContentRanges.push(range.contentRange);
          if (!isOnActiveLine && range.syntaxRanges.length > 0) {
            blockquoteMarkerRanges.push(range.syntaxRanges[0]);
          }
          break;
        case 'listBullet':
          if (!isOnActiveLine && range.syntaxRanges.length > 0) {
            listBulletRanges.push(range.syntaxRanges[0]);
          }
          break;
        case 'listNumber':
          if (!isOnActiveLine && range.syntaxRanges.length > 0) {
            const sr = range.syntaxRanges[0];
            const numberText = this.editor.document.getText(sr);
            const numberOnly = numberText.match(/\d+/)?.[0] ?? numberText.trimEnd();
            listNumberOptions.push({
              range: sr,
              renderOptions: {
                before: {
                  contentText: numberOnly + '. ',
                  color: BULLET_COLOR,
                },
              },
            });
          }
          break;
        case 'horizontalRule':
          if (!isOnActiveLine) {
            horizontalRuleRanges.push(range.contentRange);
          }
          break;
        case 'codeBlock':
          for (let line = range.contentRange.start.line; line <= range.contentRange.end.line; line++) {
            const isFenceLine = range.syntaxRanges.some((sr) => sr.start.line === line);
            if (isFenceLine && !isOnActiveLine) {
              codeBlockFenceRanges.push(new vscode.Range(line, 0, line, this.editor.document.lineAt(line).text.length));
            } else {
              codeBlockRanges.push(new vscode.Range(line, 0, line, this.editor.document.lineAt(line).text.length));
            }
          }
          break;
        case 'mathInline': {
          const fullRange = new vscode.Range(
            range.syntaxRanges[0].start,
            range.syntaxRanges[range.syntaxRanges.length - 1].end,
          );
          if (isOnActiveLine) {
            mathInlineSourceRanges.push(fullRange);
          } else {
            const latex = this.editor.document.getText(range.contentRange);
            const result = this.mathRenderer?.render(latex);
            if (result) {
              mathInlineRendered.push({
                range: fullRange,
                renderOptions: {
                  after: {
                    contentIconPath: result.uri,
                    width: result.width,
                    height: result.height,
                    margin: '0 0 0 0.2em',
                    textDecoration: `none; vertical-align: ${result.verticalAlign}`,
                  },
                },
              });
            }
          }
          break;
        }
        case 'tableHeader':
          if (!isOnActiveLine) {
            tableHeaderRanges.push(range.contentRange);
            pushPipeOptions(range.syntaxRanges, range.pipePaddings, tablePipeOptions);
          }
          break;
        case 'tableAlignmentRow':
          if (!isOnActiveLine) {
            const width = range.tableWidth ?? 0;
            tableAlignmentRowOptions.push({
              range: range.contentRange,
              renderOptions: width > 0 ? {
                before: {
                  contentText: '\u2014'.repeat(width),
                  color: MUTED_COLOR_LIGHT,
                },
              } : undefined,
            });
          }
          break;
        case 'tableDataRowOdd':
          if (!isOnActiveLine) {
            tableDataRowOddRanges.push(range.contentRange);
            pushPipeOptions(range.syntaxRanges, range.pipePaddings, tablePipeOptions);
          }
          break;
        case 'tableDataRowEven':
          if (!isOnActiveLine) {
            tableDataRowEvenRanges.push(range.contentRange);
            pushPipeOptions(range.syntaxRanges, range.pipePaddings, tablePipeOptions);
          }
          break;
      }

      // Hide syntax markers on inactive lines (unless type handles its own hiding)
      if (!isOnActiveLine) {
        for (const syntaxRange of range.syntaxRanges) {
          if (!SELF_HIDDEN_TYPES.has(range.type)) {
            hiddenSyntaxRanges.push(syntaxRange);
          }
        }
      }
    }

    // Apply all decorations
    this.editor.setDecorations(dt.proseFont, proseFontRanges);
    this.editor.setDecorations(dt.hiddenSyntax, hiddenSyntaxRanges);
    this.editor.setDecorations(dt.bold, boldRanges);
    this.editor.setDecorations(dt.italic, italicRanges);
    this.editor.setDecorations(dt.boldItalic, boldItalicRanges);
    this.editor.setDecorations(dt.proseBold, proseBoldRanges);
    this.editor.setDecorations(dt.proseItalic, proseItalicRanges);
    this.editor.setDecorations(dt.proseBoldItalic, proseBoldItalicRanges);
    this.editor.setDecorations(dt.headingSyntax, headingSyntaxOptions);
    for (let i = 0; i < 6; i++) {
      this.editor.setDecorations(dt.headings[i], headingRanges[i]);
      this.editor.setDecorations(dt.headingTexts[i], headingTextRanges[i]);
    }
    this.editor.setDecorations(dt.inlineCode, inlineCodeRanges);
    this.editor.setDecorations(dt.strikethrough, strikethroughRanges);
    this.editor.setDecorations(dt.linkText, linkTextRanges);
    this.editor.setDecorations(dt.blockquoteContent, blockquoteContentRanges);
    this.editor.setDecorations(dt.blockquoteMarker, blockquoteMarkerRanges);
    this.editor.setDecorations(dt.listBullet, listBulletRanges);
    this.editor.setDecorations(dt.listNumber, listNumberOptions);
    this.editor.setDecorations(dt.horizontalRule, horizontalRuleRanges);
    this.editor.setDecorations(dt.codeBlock, codeBlockRanges);
    this.editor.setDecorations(dt.codeBlockFence, codeBlockFenceRanges);
    this.editor.setDecorations(dt.mathInline, mathInlineSourceRanges);
    this.editor.setDecorations(dt.mathInlineHidden, mathInlineRendered);
    this.editor.setDecorations(dt.tableHeader, tableHeaderRanges);
    this.editor.setDecorations(dt.tableAlignmentRow, tableAlignmentRowOptions);
    this.editor.setDecorations(dt.tableDataRowOdd, tableDataRowOddRanges);
    this.editor.setDecorations(dt.tableDataRowEven, tableDataRowEvenRanges);
    this.editor.setDecorations(dt.tablePipe, tablePipeOptions);
  }

  clearAll(): void {
    const dt = this.dt;
    const allTypes = [
      dt.hiddenSyntax, dt.proseFont, dt.bold, dt.italic, dt.boldItalic,
      dt.proseBold, dt.proseItalic, dt.proseBoldItalic,
      dt.headingSyntax, ...dt.headings, ...dt.headingTexts,
      dt.inlineCode, dt.strikethrough, dt.linkText,
      dt.blockquoteContent, dt.blockquoteMarker, dt.listBullet, dt.listNumber,
      dt.horizontalRule, dt.codeBlock, dt.codeBlockFence,
      dt.mathInline, dt.mathInlineHidden,
      dt.tableHeader, dt.tableAlignmentRow, dt.tableDataRowOdd, dt.tableDataRowEven, dt.tablePipe,
    ];
    for (const t of allTypes) {
      this.editor.setDecorations(t, []);
    }
  }

  dispose(): void {
    if (this.parseDebounceTimer) {
      clearTimeout(this.parseDebounceTimer);
    }
    this.disposable.dispose();
  }
}
