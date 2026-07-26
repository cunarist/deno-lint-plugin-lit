# require-direct-registration-import

Rejects a custom element used in a template whose registering module the file
does not import, directly or through that module's own `mod.ts`.

## Why

A custom element renders as long as some module has run its
`customElements.define`. So a template can use `<cl-widget>` while a completely
different file is what imported and registered it. The tag works today by
borrowing that other import, and the day it is removed for an unrelated reason,
this template silently renders an unknown element. Importing the registering
module here makes the usage carry its own reason to work.

## Examples

```ts
// BAD - <cl-widget> works only while another file imports its module
import { html, LitElement } from "lit";

export class Panel extends LitElement {
  override render() {
    return html`<cl-widget></cl-widget>`;
  }
}
```

```ts
// GOOD - the registering module is imported here
import { html, LitElement } from "lit";
import "./cl-widget.ts";

export class Panel extends LitElement {
  override render() {
    return html`<cl-widget></cl-widget>`;
  }
}
```

## Notes

- This rule reads facts a synchronous lint rule cannot compute — which module
  registers a tag, and which modules a file truly imports — from the in-memory
  facts the scanner builds when the plugin loads. With no current facts the rule
  does nothing.
- A tag counts as registered through a `customElements.define` call, a
  `@customElement` decorator, or an `HTMLElementTagNameMap` augmentation, so
  both app elements and compiled dependencies are covered.
- A type-only import (`import type …`) never runs its module, so it does not
  count as importing the registration.
- A `mod.ts` stands for the folder it sits in, so importing `./widgets/mod.ts`
  also counts for anything under `./widgets/` that it runs. Any other barrel
  does not — it can pull a module in from anywhere, which is the borrowed import
  this rule rejects.
- An element registered in the same file needs no import and is not flagged.
