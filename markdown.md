# Ultimate Markdown Testing Document

Welcome to this comprehensive markdown testing document! This file contains various markdown elements to thoroughly test the migration into Contentful's Long Text field.

## Table of Contents

- [Introduction](#introduction)
- [Formatting Examples](#formatting-examples)
- [Lists and Tasks](#lists-and-tasks)
- [Code Examples](#code-examples)
- [Blockquotes](#blockquotes)
- [Links and References](#links-and-references)

---

## Introduction

This document is designed to test **all major markdown features** that you might encounter in a typical content migration scenario. We'll explore everything from _simple italics_ to `inline code` and much more.

### Why Test Markdown Migration?

Testing is crucial because:

1. It ensures **proper formatting** is preserved
2. It validates that _special characters_ render correctly
3. It confirms that ~~strikethrough~~ and other marks work as expected

![Beautiful Cat](https://placecats.com/1200/700)

## Formatting Examples

### Bold and Italic Text

You can create **bold text** using double asterisks or **double underscores**. For _italic text_, use single asterisks or _single underscores_. You can even combine them for **_bold and italic_** text!

### Strikethrough and Inline Code

Sometimes you need to show ~~incorrect information~~ and replace it with the correct version. When discussing code, use `inline code formatting` with backticks.

### Subscript and Superscript

While standard markdown doesn't always support these, you might see H~2~O for chemical formulas or x^2^ for mathematical expressions.

---

## Lists and Tasks

### Unordered Lists

Here's a shopping list for a developer:

- Coffee ☕
- More coffee
- Mechanical keyboard
  - With RGB lighting
  - Cherry MX switches
- Ergonomic chair
- Standing desk
  - Adjustable height
  - Cable management

### Ordered Lists

Steps to deploy an application:

1. Write the code
2. Test locally
3. Commit to version control
4. Run CI/CD pipeline
   1. Run unit tests
   2. Run integration tests
   3. Build production bundle
5. Deploy to staging
6. Verify staging environment
7. Deploy to production
8. Monitor logs and metrics

![Another Beautiful Cat](https://placecats.com/1800/1000)

### Task Lists

- [x] Create markdown file
- [x] Add various formatting examples
- [x] Include images
- [ ] Test migration to Contentful
- [ ] Verify all formatting is preserved
- [ ] Document any issues found

---

## Code Examples

### Inline Code

When working with JavaScript, you often use functions like `console.log()`, `Array.map()`, or `Promise.all()`.

### Code Blocks

Here's a JavaScript example:

```javascript
function greetUser(name) {
  const greeting = `Hello, ${name}!`;
  console.log(greeting);
  return greeting;
}

const user = {
  name: "Alice",
  role: "Developer",
  skills: ["JavaScript", "React", "Node.js"],
};

greetUser(user.name);
```

Here's a Python example:

```python
def calculate_fibonacci(n):
    """Calculate the nth Fibonacci number"""
    if n <= 1:
        return n
    return calculate_fibonacci(n-1) + calculate_fibonacci(n-2)

# Generate first 10 Fibonacci numbers
fibonacci_sequence = [calculate_fibonacci(i) for i in range(10)]
print(fibonacci_sequence)
```

And some JSON data:

```json
{
  "name": "Test Document",
  "version": "1.0.0",
  "features": ["markdown", "formatting", "images"],
  "metadata": {
    "author": "Content Team",
    "created": "2025-11-11"
  }
}
```

---

## Blockquotes

> This is a simple blockquote. It's useful for highlighting important information or quotes from other sources.

> **Nested blockquotes** can be powerful:
>
> > This is a nested quote within a quote. You might use this when quoting someone who is themselves quoting another person.
> >
> > It maintains the hierarchy of information nicely.

> ### Blockquotes with Formatting
>
> You can include _various_ **formatting** options inside blockquotes:
>
> - Lists work too
> - As do links: [Visit Example](https://example.com)
> - And even `inline code`

---

## Links and References

### Inline Links

Visit [Contentful](https://www.contentful.com/) for a powerful content platform. You can also check out [GitHub](https://github.com) for version control or [Stack Overflow](https://stackoverflow.com/) when you need help.

### Reference-Style Links

I often refer to [Markdown Guide][1] when I need help with syntax. The [MDN Web Docs][2] are also invaluable for web development.

[1]: https://www.markdownguide.org/
[2]: https://developer.mozilla.org/

### URLs and Email

You can also use automatic links: <https://www.example.com> or contact us at <contact@example.com>.

---

## Tables

| Feature     | Supported | Priority | Notes                 |
| ----------- | --------- | -------- | --------------------- |
| Headings    | ✓         | High     | All levels (H1-H6)    |
| Bold/Italic | ✓         | High     | Essential formatting  |
| Links       | ✓         | High     | Internal and external |
| Images      | ✓         | Medium   | With alt text         |
| Code Blocks | ✓         | Medium   | Syntax highlighting   |
| Tables      | ✓         | Low      | Basic support         |

### Alignment Examples

| Left Aligned | Center Aligned | Right Aligned |
| :----------- | :------------: | ------------: |
| Content      |    Content     |       Content |
| More         |      More      |          More |
| Data         |      Data      |          Data |

---

## Images with Captions

![Beautiful feline friend enjoying a sunny day](https://placecats.com/1200/700)
_Caption: Our featured cat of the day_

Images are essential for visual content. Make sure they have descriptive alt text for accessibility!

---

## Horizontal Rules

You can create horizontal rules in several ways:

---

---

---

## Special Characters and Escaping

Sometimes you need to use special characters: \* \_ \` \# \[ \] \( \) \! \\

You can also use HTML entities: &copy; &trade; &reg; &mdash; &ndash; &hellip;

---

## Emphasis Variations

We've covered **strong emphasis** and _regular emphasis_, but there's also:

- **_Bold and italic together_**
- **_Another way_** to do the same thing
- And you can nest them: **This is bold with _italic_ inside**

---

## Conclusion

This markdown document contains approximately 100 lines of varied content, demonstrating:

1. Multiple heading levels (H1 through H3)
2. Text formatting (bold, italic, strikethrough, inline code)
3. Various list types (ordered, unordered, task lists)
4. Code blocks with syntax highlighting
5. Blockquotes (simple and nested)
6. Links (inline, reference, and automatic)
7. Tables with different alignments
8. Images with alt text
9. Horizontal rules
10. Special characters and escaping

![One more cat for good measure](https://placecats.com/1800/1000)

### Final Notes

> **Remember:** When migrating this content to Contentful, verify that:
>
> - All formatting is preserved correctly
> - Images load and display properly
> - Links remain functional
> - Code blocks maintain their syntax highlighting
> - Tables render as expected
