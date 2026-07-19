# no-script-in-template

Rejects a `<script>` element inside a Lit template.

## Why

Lit parses each template into a `<template>` fragment once, then clones it into
place. A script node created by cloning is already flagged "already started" by
the HTML spec, so the browser never executes it. Nothing throws and nothing
warns — the code simply never runs, which is the worst kind of bug to find.

## Examples

```ts
// BAD
const t = html`<script src="analytics.js"></script>`;

// GOOD — import the module instead
import "./analytics.js";
```

## Notes

- Applies to both inline scripts and `src` scripts; neither executes.
- Detected structurally through the parsed tree, so the word "script" appearing
  in template text is not flagged.
- Every `<script>` in a template is reported.
- The diagnostic highlights the start tag, attributes included.
