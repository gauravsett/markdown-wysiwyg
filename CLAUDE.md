# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VS Code extension that provides WYSIWYG-like markdown editing. It hides markdown syntax markers on inactive lines and reveals them when the cursor moves to that line, using VS Code's `TextEditorDecorationType` API. Activates on `onLanguage:markdown`.

## Build Commands

- `npm run compile` — one-shot TypeScript build (`src/` → `out/`)
- `npm run watch` — incremental watch mode (also the default VS Code build task)
- No automated tests exist. Use `test.md` for manual verification of all supported markdown constructs.
- To debug: press F5 in VS Code which launches an Extension Development Host (configured in `.vscode/launch.json`)

## Architecture

The extension follows an event-driven pipeline:

```
CursorTracker (tracks active lines from selections)
  → extension.ts (wires components, listens to editor/config changes)
    → Decorator (re-parses on document changes, debounced 100ms)
      → Parser (regex-based line-by-line + inline formatting)
        → DecorationRange[] (content ranges + syntax ranges per type)
      → editor.setDecorations() (19 decoration types from styles.ts)
```

**Key modules:**

- **`extension.ts`** — Lifecycle hub. Creates and disposes `CursorTracker`, `Decorator`, and `DecorationTypes`. Guards on `languageId === 'markdown'`.
- **`cursorTracker.ts`** — Subscribes to selection changes, maintains `Set<number>` of active line numbers, fires `onDidChange` only when the set actually changes.
- **`decorator.ts`** — Holds parsed ranges and active lines. On cursor change or document edit, decides per-range whether to hide syntax (inactive lines) or reveal it (active lines). Applies all 19 decoration types in one pass.
- **`parser.ts`** — Entirely regex-based (no external parser used despite `markdown-it` being a dependency). Returns `DecorationRange` objects with `type`, `contentRange`, `syntaxRanges`, and optional `level`. Uses state machine for code blocks and overlap detection for inline formatting. Inline formats processed in priority order: bold+italic → bold → italic → strikethrough → inline code → links.
- **`styles.ts`** — Creates 19 `TextEditorDecorationType` instances. Uses the CSS hack `color: transparent; letter-spacing: -0.55em; font-size: 0.001em` to visually hide syntax characters while preserving cursor navigation.

## Key Design Details

- All three classes (`CursorTracker`, `Decorator`, `DecorationTypes`) implement `vscode.Disposable`
- `markdown-it` is listed as a dependency but currently unused — the parser is fully custom regex
- Configuration keys are declared in `package.json` under `contributes.configuration` (prefix: `markdown-wysiwyg`); some settings like `headings.scaleFontSize` and `colorize` are declared but not yet wired into code
- The `DecorationRange` interface is central: each range has a `type` (11 values), `contentRange` (what to style), and `syntaxRanges[]` (what to hide)
