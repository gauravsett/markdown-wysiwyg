# Markdown WYSIWYG Test Document

This file exercises every markdown construct supported by the extension.
Use it to verify that the syntax hiding and revealing works correctly.

## Headings

### Third-level heading

#### Fourth-level heading

##### Fifth-level heading

###### Sixth-level heading

## Text Formatting

This is **bold text** and this is _italic text_ and this is **_bold italic_**.

You can also use __bold with underscores__ and *italic with asterisks*.

Here is ***triple-asterisk bold italic*** for completeness.

Here is some ~~strikethrough text~~ for deletions.

Here is `inline code` in a sentence, and ``double backtick `code` `` too.

Here is an inline math expression: $E = mc^2$.

And a longer one: $\int_0^{\infty} e^{-x^2} dx = \frac{\sqrt{\pi}}{2}$.

## Links

Visit [Example](https://example.com) for more info.

Here is a [link with a longer URL](https://example.com/path/to/page?query=value&sort=asc).

## Lists

### Unordered lists

- First item
- Second item
  - Nested item
* Star bullet
+ Plus bullet

### Ordered lists

1. First numbered item in the list
  1. Nested numbered item
2. Second numbered item

## Blockquotes

> This is a single-line blockquote.

> This is a multi-line blockquote.
> It spans two lines.

> A blockquote with **bold text** and _italic text_ inside it.

## Code Blocks

```javascript
function greet(name) {
  console.log(`Hello, ${name}!`);
  return true;
}
```

```python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)
```

## Tables

| Name    | Type   | Default | Description              |
| ------- | ------ | ------- | ------------------------ |
| enabled | bool   | true    | Enable the feature       |
| count   | int    | 10      | Number of items to fetch |
| label   | string | ""      | Display label            |
| verbose | bool   | false   | Show detailed output including debug information |
| timeout | int    | 30      | Timeout in seconds       |

## Horizontal Rules

---

***

___

## Mixed Content

Here is a paragraph with **bold**, _italic_, `code`, ~~deleted~~, and a [link](https://example.com) all in one line.

> A blockquote with `inline code` and a [link](https://example.com).

- A list item with **bold**, _italic_, and `code` together.
- Another item with a [link](https://example.com) and ~~strikethrough~~.
