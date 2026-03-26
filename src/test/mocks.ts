/** Minimal vscode module mock for testing parser without VS Code runtime. */

export class Position {
  constructor(
    public readonly line: number,
    public readonly character: number,
  ) {}
}

export class Range {
  public readonly start: Position;
  public readonly end: Position;

  constructor(startLine: number, startChar: number, endLine: number, endChar: number);
  constructor(start: Position, end: Position);
  constructor(a: number | Position, b: number | Position, c?: number, d?: number) {
    if (typeof a === 'number') {
      this.start = new Position(a, b as number);
      this.end = new Position(c!, d!);
    } else {
      this.start = a;
      this.end = b as Position;
    }
  }
}

export class Selection extends Range {}

/** Creates a mock TextDocument from a string. */
export function createMockDocument(text: string) {
  const lines = text.split('\n');
  return {
    getText(range?: Range): string {
      if (!range) { return text; }
      if (range.start.line === range.end.line) {
        return lines[range.start.line].substring(range.start.character, range.end.character);
      }
      const result: string[] = [];
      for (let l = range.start.line; l <= range.end.line; l++) {
        const line = lines[l];
        const start = l === range.start.line ? range.start.character : 0;
        const end = l === range.end.line ? range.end.character : line.length;
        result.push(line.substring(start, end));
      }
      return result.join('\n');
    },
    lineAt(line: number) {
      return { text: lines[line], range: new Range(line, 0, line, lines[line].length) };
    },
    get lineCount() { return lines.length; },
    get languageId() { return 'markdown'; },
  };
}
