# Markdown WYSIWYG

A VS Code extension that provides WYSIWYG-like markdown editing. Prose content renders in a sans-serif font while code and tables stay monospace. Syntax markers are hidden on inactive lines and revealed when the cursor moves to that line.

## Supported Syntax

- **Headings** (H1–H6) — bold, configurable font sizes, `#` markers shown as subtle gray text
- **Bold**, **Italic**, **Bold+Italic** (including mixed markers like `**_text_**`)
- **Strikethrough**
- **Inline code** — monospace with background highlight
- **Links** — syntax hidden, link text underlined
- **Blockquotes** — `>` replaced with a vertical bar, italic with reduced opacity
- **Unordered lists** — bullet characters replaced with `•`
- **Ordered lists** — numbers re-rendered as pseudo-elements
- **Fenced code blocks** — monospace with background
- **Horizontal rules**
- **Tables** — header, alignment separator, and alternating data row styling
- **Inline math** — LaTeX between `$...$`

## Installation

The extension is not yet published on the VS Code Marketplace. To run it locally:

```sh
git clone https://github.com/gauravsett/markdown-wysiwyg.git
cd markdown-wysiwyg
npm install
npm run compile
```

Then open the project in VS Code and press **F5** to launch an Extension Development Host with the extension active.

## Configuration

All settings are under the `markdown-wysiwyg` prefix.

| Setting | Type | Default | Description |
|---|---|---|---|
| `enable` | boolean | `true` | Enable/disable WYSIWYG decorations |
| `fontFamily` | string | `"system-ui, -apple-system, sans-serif"` | Font for prose content (code stays monospace) |
| `headings.scaleFontSize` | boolean | `true` | Scale heading font sizes |
| `headings.fontSizeScale` | number[] | `[1, 1, 1, 1, 1, 1]` | Font size multipliers for H1–H6 |
| `math.enable` | boolean | `true` | Render inline LaTeX math |
