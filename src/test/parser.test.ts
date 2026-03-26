import { describe, it, expect } from 'vitest';
import { parseDocument, DecorationRange } from '../parser';
import { createMockDocument } from './mocks';

// Helper: parse a string and return ranges of a given type
function parse(text: string): DecorationRange[] {
  const doc = createMockDocument(text) as any;
  return parseDocument(doc);
}

function rangesOfType(text: string, type: string): DecorationRange[] {
  return parse(text).filter((r) => r.type === type);
}

function contentText(text: string, range: DecorationRange): string {
  const lines = text.split('\n');
  const { start, end } = range.contentRange;
  if (start.line === end.line) {
    return lines[start.line].substring(start.character, end.character);
  }
  return '';
}

// ─── Headings ────────────────────────────────────────────

describe('headings', () => {
  it('parses H1 through H6', () => {
    const text = '# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6';
    const headings = rangesOfType(text, 'heading');
    expect(headings).toHaveLength(6);
    expect(headings.map((h) => h.level)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('extracts content after hash and space', () => {
    const text = '## Hello World';
    const [h] = rangesOfType(text, 'heading');
    expect(contentText(text, h)).toBe('Hello World');
  });

  it('does not match without space after hashes', () => {
    const text = '##NoSpace';
    expect(rangesOfType(text, 'heading')).toHaveLength(0);
  });

  it('does not match more than 6 hashes', () => {
    const text = '####### Seven';
    expect(rangesOfType(text, 'heading')).toHaveLength(0);
  });

  it('captures syntax range for hash markers', () => {
    const text = '### Heading';
    const [h] = rangesOfType(text, 'heading');
    expect(h.syntaxRanges).toHaveLength(1);
    expect(h.syntaxRanges[0].start.character).toBe(0);
    expect(h.syntaxRanges[0].end.character).toBe(4); // "### "
  });

  it('does not parse headings inside code blocks', () => {
    const text = '```\n# Not a heading\n```';
    expect(rangesOfType(text, 'heading')).toHaveLength(0);
  });
});

// ─── Code blocks ─────────────────────────────────────────

describe('code blocks', () => {
  it('detects fenced code block', () => {
    const text = '```\ncode\n```';
    const blocks = rangesOfType(text, 'codeBlock');
    expect(blocks).toHaveLength(1);
  });

  it('spans from opening to closing fence', () => {
    const text = '```\nline1\nline2\n```';
    const [block] = rangesOfType(text, 'codeBlock');
    expect(block.contentRange.start.line).toBe(0);
    expect(block.contentRange.end.line).toBe(3);
  });

  it('handles unclosed code block at EOF', () => {
    const text = '```\ncode\nmore code';
    const blocks = rangesOfType(text, 'codeBlock');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].contentRange.end.line).toBe(2);
  });

  it('preserves language identifier line', () => {
    const text = '```javascript\nconsole.log("hi");\n```';
    const blocks = rangesOfType(text, 'codeBlock');
    expect(blocks).toHaveLength(1);
  });

  it('does not parse markdown inside code blocks', () => {
    const text = '```\n**bold** *italic* [link](url)\n```';
    const ranges = parse(text);
    const nonCodeTypes = ranges.filter((r) => r.type !== 'codeBlock');
    expect(nonCodeTypes).toHaveLength(0);
  });
});

// ─── Tables ──────────────────────────────────────────────

describe('tables', () => {
  const simpleTable = '| A | B |\n| --- | --- |\n| 1 | 2 |';

  it('detects header, alignment, and data rows', () => {
    const ranges = parse(simpleTable);
    expect(ranges.filter((r) => r.type === 'tableHeader')).toHaveLength(1);
    expect(ranges.filter((r) => r.type === 'tableAlignmentRow')).toHaveLength(1);
    expect(ranges.filter((r) => r.type === 'tableDataRowOdd')).toHaveLength(1);
  });

  it('alternates odd/even data rows', () => {
    const text = '| A |\n| --- |\n| 1 |\n| 2 |\n| 3 |';
    const ranges = parse(text);
    expect(ranges.filter((r) => r.type === 'tableDataRowOdd')).toHaveLength(2);
    expect(ranges.filter((r) => r.type === 'tableDataRowEven')).toHaveLength(1);
  });

  it('handles alignment markers (:---, :---:, ---:)', () => {
    const text = '| L | C | R |\n| :--- | :---: | ---: |\n| a | b | c |';
    const ranges = parse(text);
    expect(ranges.filter((r) => r.type === 'tableAlignmentRow')).toHaveLength(1);
  });

  it('ends table when line without pipe is encountered', () => {
    const text = '| A |\n| --- |\n| 1 |\n\nNot a table';
    const ranges = parse(text);
    expect(ranges.filter((r) => r.type.startsWith('table'))).toHaveLength(3);
  });

  it('computes tableWidth on alignment row', () => {
    const text = '| Name    | Desc |\n| ------- | ---- |\n| x       | y    |';
    const alignRow = rangesOfType(text, 'tableAlignmentRow')[0];
    expect(alignRow.tableWidth).toBeGreaterThan(0);
  });
});

// ─── Blockquotes ─────────────────────────────────────────

describe('blockquotes', () => {
  it('detects blockquote', () => {
    const text = '> Hello';
    const [bq] = rangesOfType(text, 'blockquote');
    expect(contentText(text, bq)).toBe('Hello');
  });

  it('captures > marker as syntax range', () => {
    const text = '> Hello';
    const [bq] = rangesOfType(text, 'blockquote');
    expect(bq.syntaxRanges).toHaveLength(1);
  });

  it('handles blockquote with no space after >', () => {
    const text = '>Hello';
    const bqs = rangesOfType(text, 'blockquote');
    expect(bqs).toHaveLength(1);
  });

  it('parses inline formatting inside blockquotes', () => {
    const text = '> **bold** text';
    const ranges = parse(text);
    expect(ranges.some((r) => r.type === 'blockquote')).toBe(true);
    expect(ranges.some((r) => r.type === 'bold')).toBe(true);
  });
});

// ─── Unordered lists ─────────────────────────────────────

describe('unordered lists', () => {
  it('detects - bullet', () => {
    const text = '- Item';
    expect(rangesOfType(text, 'listBullet')).toHaveLength(1);
  });

  it('detects * bullet', () => {
    const text = '* Item';
    expect(rangesOfType(text, 'listBullet')).toHaveLength(1);
  });

  it('detects + bullet', () => {
    const text = '+ Item';
    expect(rangesOfType(text, 'listBullet')).toHaveLength(1);
  });

  it('handles nested bullets', () => {
    const text = '- Top\n  - Nested';
    const bullets = rangesOfType(text, 'listBullet');
    expect(bullets).toHaveLength(2);
  });

  it('does not match without space after bullet', () => {
    const text = '-NoSpace';
    expect(rangesOfType(text, 'listBullet')).toHaveLength(0);
  });

  it('syntax range includes bullet and trailing space', () => {
    const text = '- Item';
    const [b] = rangesOfType(text, 'listBullet');
    expect(b.syntaxRanges[0].start.character).toBe(0);
    expect(b.syntaxRanges[0].end.character).toBe(2); // "- "
  });
});

// ─── Ordered lists ───────────────────────────────────────

describe('ordered lists', () => {
  it('detects numbered list with period', () => {
    const text = '1. First';
    expect(rangesOfType(text, 'listNumber')).toHaveLength(1);
  });

  it('detects numbered list with paren', () => {
    const text = '1) First';
    expect(rangesOfType(text, 'listNumber')).toHaveLength(1);
  });

  it('handles multi-digit numbers', () => {
    const text = '10. Tenth';
    const [n] = rangesOfType(text, 'listNumber');
    expect(contentText(text, n)).toBe('Tenth');
  });

  it('handles nested ordered lists', () => {
    const text = '1. Top\n   1. Nested';
    expect(rangesOfType(text, 'listNumber')).toHaveLength(2);
  });

  it('syntax range excludes leading whitespace', () => {
    const text = '   1. Item';
    const [n] = rangesOfType(text, 'listNumber');
    expect(n.syntaxRanges[0].start.character).toBe(3); // after indent
    expect(n.syntaxRanges[0].end.character).toBe(6); // "1. "
  });
});

// ─── Horizontal rules ────────────────────────────────────

describe('horizontal rules', () => {
  it('detects ---', () => {
    expect(rangesOfType('---', 'horizontalRule')).toHaveLength(1);
  });

  it('detects ***', () => {
    expect(rangesOfType('***', 'horizontalRule')).toHaveLength(1);
  });

  it('detects ___', () => {
    expect(rangesOfType('___', 'horizontalRule')).toHaveLength(1);
  });

  it('detects with spaces: - - -', () => {
    expect(rangesOfType('- - -', 'horizontalRule')).toHaveLength(1);
  });

  it('does not match with only 2 chars', () => {
    expect(rangesOfType('--', 'horizontalRule')).toHaveLength(0);
  });

  it('does not match with mixed chars', () => {
    expect(rangesOfType('-*-', 'horizontalRule')).toHaveLength(0);
  });
});

// ─── Bold ────────────────────────────────────────────────

describe('bold', () => {
  it('detects **bold**', () => {
    const text = 'This is **bold** text';
    const [b] = rangesOfType(text, 'bold');
    expect(contentText(text, b)).toBe('bold');
  });

  it('detects __bold__', () => {
    const text = 'This is __bold__ text';
    const [b] = rangesOfType(text, 'bold');
    expect(contentText(text, b)).toBe('bold');
  });

  it('does not match with leading space: ** text**', () => {
    const text = '** not bold**';
    expect(rangesOfType(text, 'bold')).toHaveLength(0);
  });

  it('does not match empty: ****', () => {
    const text = '****';
    expect(rangesOfType(text, 'bold')).toHaveLength(0);
  });

  it('matches multiple bold on same line', () => {
    const text = '**one** and **two**';
    expect(rangesOfType(text, 'bold')).toHaveLength(2);
  });
});

// ─── Italic ──────────────────────────────────────────────

describe('italic', () => {
  it('detects *italic*', () => {
    const text = 'This is *italic* text';
    const [i] = rangesOfType(text, 'italic');
    expect(contentText(text, i)).toBe('italic');
  });

  it('detects _italic_', () => {
    const text = 'This is _italic_ text';
    const [i] = rangesOfType(text, 'italic');
    expect(contentText(text, i)).toBe('italic');
  });

  it('does not match mid-word underscores', () => {
    const text = 'snake_case_name';
    expect(rangesOfType(text, 'italic')).toHaveLength(0);
  });
});

// ─── Bold+Italic ─────────────────────────────────────────

describe('bold+italic', () => {
  it('detects ***text***', () => {
    const text = '***bold italic***';
    const [bi] = rangesOfType(text, 'boldItalic');
    expect(contentText(text, bi)).toBe('bold italic');
  });

  it('detects ___text___', () => {
    const text = '___bold italic___';
    const [bi] = rangesOfType(text, 'boldItalic');
    expect(contentText(text, bi)).toBe('bold italic');
  });

  it('detects **_text_** mixed markers', () => {
    const text = '**_mixed_**';
    const [bi] = rangesOfType(text, 'boldItalic');
    expect(contentText(text, bi)).toBe('mixed');
  });

  it('detects __*text*__ mixed markers', () => {
    const text = '__*mixed*__';
    const [bi] = rangesOfType(text, 'boldItalic');
    expect(contentText(text, bi)).toBe('mixed');
  });

  it('detects _**text**_ mixed markers', () => {
    const text = '_**mixed**_';
    const [bi] = rangesOfType(text, 'boldItalic');
    expect(contentText(text, bi)).toBe('mixed');
  });

  it('detects *__text__* mixed markers', () => {
    const text = '*__mixed__*';
    const [bi] = rangesOfType(text, 'boldItalic');
    expect(contentText(text, bi)).toBe('mixed');
  });
});

// ─── Strikethrough ───────────────────────────────────────

describe('strikethrough', () => {
  it('detects ~~text~~', () => {
    const text = '~~deleted~~';
    const [s] = rangesOfType(text, 'strikethrough');
    expect(contentText(text, s)).toBe('deleted');
  });

  it('does not match with leading space', () => {
    const text = '~~ not deleted~~';
    expect(rangesOfType(text, 'strikethrough')).toHaveLength(0);
  });
});

// ─── Inline code ─────────────────────────────────────────

describe('inline code', () => {
  it('detects `code`', () => {
    const text = 'Use `code` here';
    const [c] = rangesOfType(text, 'inlineCode');
    expect(contentText(text, c)).toBe('code');
  });

  it('detects ``double backtick``', () => {
    const text = 'Use ``code`` here';
    const [c] = rangesOfType(text, 'inlineCode');
    expect(contentText(text, c)).toBe('code');
  });

  it('allows backtick inside double backtick: ``code`with`ticks``', () => {
    const text = 'Use ``code`with`ticks`` here';
    const codes = rangesOfType(text, 'inlineCode');
    expect(codes).toHaveLength(1);
  });
});

// ─── Math ────────────────────────────────────────────────

describe('inline math', () => {
  it('detects $E=mc^2$', () => {
    const text = 'Energy is $E=mc^2$ right?';
    const [m] = rangesOfType(text, 'mathInline');
    expect(contentText(text, m)).toBe('E=mc^2');
  });

  it('does not match display math $$...$$', () => {
    const text = '$$E=mc^2$$';
    expect(rangesOfType(text, 'mathInline')).toHaveLength(0);
  });

  it('does not match with leading space', () => {
    const text = '$ not math$';
    expect(rangesOfType(text, 'mathInline')).toHaveLength(0);
  });
});

// ─── Links ───────────────────────────────────────────────

describe('links', () => {
  it('detects [text](url)', () => {
    const text = 'Visit [Google](https://google.com)';
    const [l] = rangesOfType(text, 'link');
    expect(contentText(text, l)).toBe('Google');
  });

  it('captures syntax ranges for brackets and parens', () => {
    const text = '[text](url)';
    const [l] = rangesOfType(text, 'link');
    expect(l.syntaxRanges.length).toBeGreaterThanOrEqual(2);
  });

  it('handles multiple links on same line', () => {
    const text = '[a](1) and [b](2)';
    expect(rangesOfType(text, 'link')).toHaveLength(2);
  });
});

// ─── Overlap detection ───────────────────────────────────

describe('overlap detection', () => {
  it('bold+italic takes priority over bold', () => {
    const text = '***text***';
    const ranges = parse(text);
    expect(ranges.some((r) => r.type === 'boldItalic')).toBe(true);
    expect(ranges.some((r) => r.type === 'bold')).toBe(false);
  });

  it('bold takes priority over italic for **text**', () => {
    const text = '**text**';
    const ranges = parse(text);
    expect(ranges.some((r) => r.type === 'bold')).toBe(true);
    expect(ranges.some((r) => r.type === 'italic')).toBe(false);
  });

  it('inline code prevents other formatting inside', () => {
    const text = '`**not bold**`';
    const ranges = parse(text);
    expect(ranges.some((r) => r.type === 'inlineCode')).toBe(true);
    expect(ranges.some((r) => r.type === 'bold')).toBe(false);
  });
});

// ─── Escaped characters ─────────────────────────────────

describe('escaped characters', () => {
  it('does not match escaped bold markers', () => {
    const text = '\\*\\*not bold\\*\\*';
    expect(rangesOfType(text, 'bold')).toHaveLength(0);
  });

  it('does not match escaped heading', () => {
    const text = '\\# Not a heading';
    expect(rangesOfType(text, 'heading')).toHaveLength(0);
  });

  it('does not match escaped link', () => {
    const text = '\\[not a link\\](url)';
    expect(rangesOfType(text, 'link')).toHaveLength(0);
  });
});

// ─── Performance ─────────────────────────────────────────

describe('performance', () => {
  it('parses a 2000-line document under 200ms', () => {
    const lines: string[] = [];
    for (let i = 0; i < 2000; i++) {
      const mod = i % 20;
      if (mod === 0) { lines.push(`## Heading ${i}`); }
      else if (mod === 5) { lines.push('---'); }
      else if (mod === 10) { lines.push('> A blockquote with **bold** and *italic*.'); }
      else if (mod === 15) { lines.push('- List item with `code` and [link](url)'); }
      else { lines.push(`Normal paragraph with **bold**, *italic*, ~~strike~~, and $math$.`); }
    }
    const text = lines.join('\n');
    const start = performance.now();
    parse(text);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(200);
  });
});
