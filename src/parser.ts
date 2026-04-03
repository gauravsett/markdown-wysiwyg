import * as vscode from 'vscode';

export type DecorationRangeType =
  | 'bold'
  | 'italic'
  | 'boldItalic'
  | 'heading'
  | 'link'
  | 'inlineCode'
  | 'strikethrough'
  | 'blockquote'
  | 'codeBlock'
  | 'horizontalRule'
  | 'listBullet'
  | 'listNumber'
  | 'mathInline'
  | 'tableHeader'
  | 'tableAlignmentRow'
  | 'tableDataRowOdd'
  | 'tableDataRowEven';

export interface DecorationRange {
  type: DecorationRangeType;
  contentRange: vscode.Range;
  syntaxRanges: vscode.Range[];
  level?: number;
  pipePaddings?: number[];
  tableWidth?: number;
}

/**
 * Get all line numbers touched by a decoration range.
 */
export function getLinesForRange(dr: DecorationRange): number[] {
  const lines = new Set<number>();
  for (let l = dr.contentRange.start.line; l <= dr.contentRange.end.line; l++) {
    lines.add(l);
  }
  for (const sr of dr.syntaxRanges) {
    for (let l = sr.start.line; l <= sr.end.line; l++) {
      lines.add(l);
    }
  }
  return Array.from(lines);
}

/**
 * Parse a markdown document and return decoration ranges.
 * Uses line-by-line regex for precise character-level positioning.
 */
export function parseDocument(document: vscode.TextDocument): DecorationRange[] {
  const ranges: DecorationRange[] = [];
  const text = document.getText();
  const lines = text.split('\n');

  // Skip YAML frontmatter (--- delimited block at start of document)
  let firstContentLine = 0;
  if (lines.length > 0 && lines[0].trim() === '---') {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        firstContentLine = i + 1;
        break;
      }
    }
  }

  let inCodeBlock = false;
  let codeBlockStartLine = -1;

  let inTable = false;
  let tableStartLine = -1;
  let tableDataRowIndex = 0;
  const alignmentRowRegex = /^\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/;

  for (let lineIdx = firstContentLine; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];

    // --- Code blocks (fenced with ```) ---
    const fenceMatch = line.match(/^(\s*)(```+)/);
    if (fenceMatch) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockStartLine = lineIdx;
      } else {
        // End of code block
        ranges.push({
          type: 'codeBlock',
          contentRange: new vscode.Range(codeBlockStartLine, 0, lineIdx, line.length),
          syntaxRanges: [
            new vscode.Range(codeBlockStartLine, 0, codeBlockStartLine, lines[codeBlockStartLine].length),
            new vscode.Range(lineIdx, 0, lineIdx, line.length),
          ],
        });
        inCodeBlock = false;
        codeBlockStartLine = -1;
      }
      continue;
    }

    // Skip lines inside code blocks
    if (inCodeBlock) {
      continue;
    }

    // --- Table detection ---
    let isPartOfTable = false;

    if (!inTable) {
      if (line.includes('|') && lineIdx + 1 < lines.length && alignmentRowRegex.test(lines[lineIdx + 1])) {
        inTable = true;
        tableStartLine = lineIdx;
        tableDataRowIndex = 0;
        isPartOfTable = true;
        ranges.push({
          type: 'tableHeader',
          contentRange: new vscode.Range(lineIdx, 0, lineIdx, line.length),
          syntaxRanges: findPipePositions(line, lineIdx),
        });
      }
    } else {
      if (lineIdx === tableStartLine + 1) {
        // Alignment row
        isPartOfTable = true;
        ranges.push({
          type: 'tableAlignmentRow',
          contentRange: new vscode.Range(lineIdx, 0, lineIdx, line.length),
          syntaxRanges: [new vscode.Range(lineIdx, 0, lineIdx, line.length)],
        });
        continue;
      } else if (line.includes('|')) {
        // Data row
        isPartOfTable = true;
        tableDataRowIndex++;
        ranges.push({
          type: tableDataRowIndex % 2 === 1 ? 'tableDataRowOdd' : 'tableDataRowEven',
          contentRange: new vscode.Range(lineIdx, 0, lineIdx, line.length),
          syntaxRanges: findPipePositions(line, lineIdx),
        });
      } else {
        // End of table
        inTable = false;
        tableStartLine = -1;
        tableDataRowIndex = 0;
      }
    }

    if (isPartOfTable) {
      parseInlineFormatting(line, lineIdx, ranges);
      continue;
    }

    // --- Horizontal rule (---, ***, ___) ---
    if (/^\s{0,3}([-*_])\s*(?:\1\s*){2,}$/.test(line)) {
      ranges.push({
        type: 'horizontalRule',
        contentRange: new vscode.Range(lineIdx, 0, lineIdx, line.length),
        syntaxRanges: [new vscode.Range(lineIdx, 0, lineIdx, line.length)],
      });
      continue;
    }

    // --- Headings ---
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const hashes = headingMatch[1];
      const level = hashes.length;
      const contentStart = hashes.length + 1; // +1 for the space
      ranges.push({
        type: 'heading',
        contentRange: new vscode.Range(lineIdx, contentStart, lineIdx, line.length),
        syntaxRanges: [new vscode.Range(lineIdx, 0, lineIdx, contentStart)],
        level,
      });
      // Don't continue — headings can contain inline formatting
    }

    // --- Blockquotes ---
    const blockquoteMatch = line.match(/^(\s*>\s?)/);
    if (blockquoteMatch) {
      const marker = blockquoteMatch[1];
      ranges.push({
        type: 'blockquote',
        contentRange: new vscode.Range(lineIdx, marker.length, lineIdx, line.length),
        syntaxRanges: [new vscode.Range(lineIdx, 0, lineIdx, marker.length)],
      });
    }

    // --- List bullets (-, *, +) ---
    const listMatch = line.match(/^(\s*)([-*+])\s/);
    if (listMatch) {
      const bulletPos = listMatch[1].length;
      ranges.push({
        type: 'listBullet',
        contentRange: new vscode.Range(lineIdx, bulletPos + 2, lineIdx, line.length),
        syntaxRanges: [new vscode.Range(lineIdx, bulletPos, lineIdx, bulletPos + 2)],
      });
    }

    // --- Ordered list numbers (1. or 1)) ---
    const orderedMatch = line.match(/^(\s*)(\d+[.)]\s)/);
    if (orderedMatch) {
      const prefixEnd = orderedMatch[1].length + orderedMatch[2].length;
      ranges.push({
        type: 'listNumber',
        contentRange: new vscode.Range(lineIdx, prefixEnd, lineIdx, line.length),
        syntaxRanges: [new vscode.Range(lineIdx, orderedMatch[1].length, lineIdx, prefixEnd)],
      });
    }

    // --- Inline formatting ---
    parseInlineFormatting(line, lineIdx, ranges);
  }

  // Handle unclosed code block (document ends without closing fence)
  if (inCodeBlock) {
    const lastLine = lines.length - 1;
    ranges.push({
      type: 'codeBlock',
      contentRange: new vscode.Range(codeBlockStartLine, 0, lastLine, lines[lastLine].length),
      syntaxRanges: [
        new vscode.Range(codeBlockStartLine, 0, codeBlockStartLine, lines[codeBlockStartLine].length),
      ],
    });
  }

  computeTablePadding(ranges, lines);

  return ranges;
}

function findPipePositions(line: string, lineIdx: number): vscode.Range[] {
  const positions: vscode.Range[] = [];
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '|') {
      positions.push(new vscode.Range(lineIdx, i, lineIdx, i + 1));
    }
  }
  return positions;
}

function computeTablePadding(ranges: DecorationRange[], lines: string[]): void {
  const tableTypes = new Set<DecorationRangeType>([
    'tableHeader', 'tableAlignmentRow', 'tableDataRowOdd', 'tableDataRowEven',
  ]);

  // Group table ranges into consecutive tables
  const tableRanges = ranges.filter((r) => tableTypes.has(r.type));
  if (tableRanges.length === 0) { return; }

  const tables: DecorationRange[][] = [];
  let currentTable: DecorationRange[] = [tableRanges[0]];

  for (let i = 1; i < tableRanges.length; i++) {
    const prevLine = tableRanges[i - 1].contentRange.start.line;
    const curLine = tableRanges[i].contentRange.start.line;
    if (curLine === prevLine + 1) {
      currentTable.push(tableRanges[i]);
    } else {
      tables.push(currentTable);
      currentTable = [tableRanges[i]];
    }
  }
  tables.push(currentTable);

  // Build a map: line number -> list of hidden syntax char ranges from inline formatting
  const inlineTypes = new Set<DecorationRangeType>([
    'bold', 'italic', 'boldItalic', 'strikethrough', 'inlineCode', 'link', 'mathInline',
  ]);
  const hiddenCharsByLine = new Map<number, Array<[number, number]>>();
  for (const r of ranges) {
    if (!inlineTypes.has(r.type)) { continue; }
    for (const sr of r.syntaxRanges) {
      const line = sr.start.line;
      if (!hiddenCharsByLine.has(line)) {
        hiddenCharsByLine.set(line, []);
      }
      hiddenCharsByLine.get(line)!.push([sr.start.character, sr.end.character]);
    }
  }

  // For each table, compute max effective cell widths and assign pipePaddings
  for (const table of tables) {
    // Store the max line length across all rows for the alignment row separator
    const alignmentRow = table.find((r) => r.type === 'tableAlignmentRow');
    if (alignmentRow) {
      let maxLength = 0;
      for (const r of table) {
        const len = lines[r.contentRange.start.line].length;
        if (len > maxLength) { maxLength = len; }
      }
      alignmentRow.tableWidth = maxLength;
    }

    // Collect pipe positions per row (skip alignment row — it uses line-through, not pipes)
    const dataRows = table.filter((r) => r.type !== 'tableAlignmentRow');
    if (dataRows.length === 0) { continue; }

    // Get pipe positions for each row from the source text
    const rowPipePositions: number[][] = dataRows.map((r) => {
      const line = lines[r.contentRange.start.line];
      const positions: number[] = [];
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '|') { positions.push(i); }
      }
      return positions;
    });

    // Find max number of pipes (use minimum to avoid index-out-of-bounds)
    const minPipes = Math.min(...rowPipePositions.map((p) => p.length));
    if (minPipes < 2) { continue; } // Need at least 2 pipes for 1 cell

    // Compute effective cell widths (raw width minus hidden syntax chars in cell)
    // This accounts for inline formatting markers that get collapsed on inactive lines
    const numCols = minPipes - 1;
    const rowEffectiveWidths: number[][] = [];
    const maxEffectiveWidths = new Array<number>(numCols).fill(0);

    for (let ri = 0; ri < dataRows.length; ri++) {
      const positions = rowPipePositions[ri];
      const lineNum = dataRows[ri].contentRange.start.line;
      const hiddenRanges = hiddenCharsByLine.get(lineNum) || [];
      const effectiveWidths: number[] = [];

      for (let col = 0; col < numCols; col++) {
        const cellStart = positions[col];
        const cellEnd = positions[col + 1];
        const rawWidth = cellEnd - cellStart;

        // Count hidden syntax chars within this cell
        let hiddenChars = 0;
        for (const [hStart, hEnd] of hiddenRanges) {
          const overlapStart = Math.max(hStart, cellStart);
          const overlapEnd = Math.min(hEnd, cellEnd);
          if (overlapStart < overlapEnd) {
            hiddenChars += overlapEnd - overlapStart;
          }
        }

        const effectiveWidth = rawWidth - hiddenChars;
        effectiveWidths.push(effectiveWidth);
        if (effectiveWidth > maxEffectiveWidths[col]) {
          maxEffectiveWidths[col] = effectiveWidth;
        }
      }
      rowEffectiveWidths.push(effectiveWidths);
    }

    // Assign pipePaddings to each data row based on effective width deficit
    for (let ri = 0; ri < dataRows.length; ri++) {
      const paddings: number[] = [0]; // First pipe always 0
      for (let col = 0; col < numCols; col++) {
        paddings.push(maxEffectiveWidths[col] - rowEffectiveWidths[ri][col]);
      }
      dataRows[ri].pipePaddings = paddings;
    }
  }
}

function parseInlineFormatting(line: string, lineIdx: number, ranges: DecorationRange[]): void {
  // Track matched character ranges to avoid overlapping matches
  const matched: Array<[number, number]> = [];

  function isAlreadyMatched(start: number, end: number): boolean {
    return matched.some(([s, e]) => start < e && end > s);
  }

  // --- Inline code (`code`) — matched first since backtick content is literal ---
  let match: RegExpExecArray | null;
  const codeRegex = /(?<!`)(`+)(?!`)(.+?)(?<!`)\1(?!`)/g;

  match = codeRegex.exec(line);
  while (match !== null) {
    const fullStart = match.index;
    const backtickLen = match[1].length;
    const contentStart = fullStart + backtickLen;
    const contentEnd = contentStart + match[2].length;
    const fullEnd = contentEnd + backtickLen;

    if (!isAlreadyMatched(fullStart, fullEnd)) {
      matched.push([fullStart, fullEnd]);
      ranges.push({
        type: 'inlineCode',
        contentRange: new vscode.Range(lineIdx, contentStart, lineIdx, contentEnd),
        syntaxRanges: [
          new vscode.Range(lineIdx, fullStart, lineIdx, contentStart),
          new vscode.Range(lineIdx, contentEnd, lineIdx, fullEnd),
        ],
      });
    }
    match = codeRegex.exec(line);
  }

  // --- Bold + Italic (***text***, ___text___, **_text_**, __*text*__, _**text**_, *__text__*) ---
  const boldItalicRegex = /(\*{3}|_{3})(?!\s)(.+?)(?<!\s)\1/g;

  match = boldItalicRegex.exec(line);
  while (match !== null) {
    const fullStart = match.index;
    const markerLen = 3;
    const contentStart = fullStart + markerLen;
    const contentEnd = contentStart + match[2].length;
    const fullEnd = contentEnd + markerLen;

    if (!isAlreadyMatched(fullStart, fullEnd)) {
      matched.push([fullStart, fullEnd]);
      ranges.push({
        type: 'boldItalic',
        contentRange: new vscode.Range(lineIdx, contentStart, lineIdx, contentEnd),
        syntaxRanges: [
          new vscode.Range(lineIdx, fullStart, lineIdx, contentStart),
          new vscode.Range(lineIdx, contentEnd, lineIdx, fullEnd),
        ],
      });
    }
    match = boldItalicRegex.exec(line);
  }

  // Mixed-marker bold+italic: **_text_**, __*text*__, _**text**_, *__text__*
  const mixedBoldItalicRegex = /(\*{2}_|_{2}\*|_\*{2}|\*_{2})(?!\s)(.+?)(?<!\s)(?:\*{2}_|_{2}\*|_\*{2}|\*_{2})/g;
  match = mixedBoldItalicRegex.exec(line);
  while (match !== null) {
    const fullStart = match.index;
    const markerLen = 3;
    const contentStart = fullStart + markerLen;
    const contentEnd = contentStart + match[2].length;
    const fullEnd = contentEnd + markerLen;

    if (!isAlreadyMatched(fullStart, fullEnd)) {
      matched.push([fullStart, fullEnd]);
      ranges.push({
        type: 'boldItalic',
        contentRange: new vscode.Range(lineIdx, contentStart, lineIdx, contentEnd),
        syntaxRanges: [
          new vscode.Range(lineIdx, fullStart, lineIdx, contentStart),
          new vscode.Range(lineIdx, contentEnd, lineIdx, fullEnd),
        ],
      });
    }
    match = mixedBoldItalicRegex.exec(line);
  }

  // --- Bold (**text** or __text__) ---
  const boldRegex = /(\*{2}|_{2})(?!\s)(.+?)(?<!\s)\1/g;

  match = boldRegex.exec(line);
  while (match !== null) {
    const fullStart = match.index;
    const markerLen = 2;
    const contentStart = fullStart + markerLen;
    const contentEnd = contentStart + match[2].length;
    const fullEnd = contentEnd + markerLen;

    if (!isAlreadyMatched(fullStart, fullEnd)) {
      matched.push([fullStart, fullEnd]);
      ranges.push({
        type: 'bold',
        contentRange: new vscode.Range(lineIdx, contentStart, lineIdx, contentEnd),
        syntaxRanges: [
          new vscode.Range(lineIdx, fullStart, lineIdx, contentStart),
          new vscode.Range(lineIdx, contentEnd, lineIdx, fullEnd),
        ],
      });
    }
    match = boldRegex.exec(line);
  }

  // --- Italic (*text* or _text_) ---
  const italicRegex = /(?<!\*|\w)([*_])(?!\s)(.+?)(?<!\s)\1(?!\*|\w)/g;

  match = italicRegex.exec(line);
  while (match !== null) {
    const fullStart = match.index;
    const markerLen = 1;
    const contentStart = fullStart + markerLen;
    const contentEnd = contentStart + match[2].length;
    const fullEnd = contentEnd + markerLen;

    if (!isAlreadyMatched(fullStart, fullEnd)) {
      matched.push([fullStart, fullEnd]);
      ranges.push({
        type: 'italic',
        contentRange: new vscode.Range(lineIdx, contentStart, lineIdx, contentEnd),
        syntaxRanges: [
          new vscode.Range(lineIdx, fullStart, lineIdx, contentStart),
          new vscode.Range(lineIdx, contentEnd, lineIdx, fullEnd),
        ],
      });
    }
    match = italicRegex.exec(line);
  }

  // --- Strikethrough (~~text~~) ---
  const strikeRegex = /~~(?!\s)(.+?)(?<!\s)~~/g;

  match = strikeRegex.exec(line);
  while (match !== null) {
    const fullStart = match.index;
    const contentStart = fullStart + 2;
    const contentEnd = contentStart + match[1].length;
    const fullEnd = contentEnd + 2;

    if (!isAlreadyMatched(fullStart, fullEnd)) {
      matched.push([fullStart, fullEnd]);
      ranges.push({
        type: 'strikethrough',
        contentRange: new vscode.Range(lineIdx, contentStart, lineIdx, contentEnd),
        syntaxRanges: [
          new vscode.Range(lineIdx, fullStart, lineIdx, contentStart),
          new vscode.Range(lineIdx, contentEnd, lineIdx, fullEnd),
        ],
      });
    }
    match = strikeRegex.exec(line);
  }

  // --- Inline math ($...$) ---
  const mathInlineRegex = /(?<!\$)\$(?!\$)(?!\s)(.+?)(?<!\s)(?<!\$)\$/g;

  match = mathInlineRegex.exec(line);
  while (match !== null) {
    const fullStart = match.index;
    const contentStart = fullStart + 1;
    const contentEnd = contentStart + match[1].length;
    const fullEnd = contentEnd + 1;

    if (!isAlreadyMatched(fullStart, fullEnd)) {
      matched.push([fullStart, fullEnd]);
      ranges.push({
        type: 'mathInline',
        contentRange: new vscode.Range(lineIdx, contentStart, lineIdx, contentEnd),
        syntaxRanges: [
          new vscode.Range(lineIdx, fullStart, lineIdx, contentStart),
          new vscode.Range(lineIdx, contentEnd, lineIdx, fullEnd),
        ],
      });
    }
    match = mathInlineRegex.exec(line);
  }

  // --- Links [text](url) ---
  const linkRegex = /(?<!\\)\[([^\]]+)\]\(([^)]+)\)/g;

  match = linkRegex.exec(line);
  while (match !== null) {
    const fullStart = match.index;
    const textStart = fullStart + 1; // after [
    const textEnd = textStart + match[1].length;
    const fullEnd = fullStart + match[0].length;

    if (!isAlreadyMatched(fullStart, fullEnd)) {
      matched.push([fullStart, fullEnd]);
      ranges.push({
        type: 'link',
        contentRange: new vscode.Range(lineIdx, textStart, lineIdx, textEnd),
        syntaxRanges: [
          new vscode.Range(lineIdx, fullStart, lineIdx, fullStart + 1),
          new vscode.Range(lineIdx, textEnd, lineIdx, fullEnd),
        ],
      });
    }
    match = linkRegex.exec(line);
  }
}
