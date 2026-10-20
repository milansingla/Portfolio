---
title: "Fixture article: a long post for rendering tests"
slug: fixture-long-article
description: "A synthetic article used only by the automated tests to exercise headings, code, tables, links and images."
publishedAt: 2026-03-12
updatedAt: 2026-03-20
author: Milan Singla
tags: [testing, fixtures]
published: true
coverImage: /og.png
coverAlt: Test cover image
featured: true
related: [fixture-second-article]
---

This paragraph is plain text that must appear in the server-rendered HTML. It has `inline code`, a [link to the CV](/cv), an [external link](https://github.com/milansingla) and a [related article](/blog/fixture-second-article).

## First section

Some prose. <script>window.__xss = 1</script> and <b>raw html</b> must be shown as text, never executed.

```ts
const greeting: string = "hello <world>";
function add(a: number, b: number) { return a + b; }
```

```bash
docker compose up -d --build
```

### A subsection

| Name | Value |
| ---- | ----- |
| one  | 1     |
| two  | 2     |

![A small test image](/og.png)

## Second section

A very long unbroken line inside a code block must scroll sideways, not widen the page:

```js
const long = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
```

### Another subsection

Jump back to [the first section](#first-section).

## Repeated heading

One.

## Repeated heading

Two.
