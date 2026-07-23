# deno-lint-plugin-lit

Lint rules for [Lit](https://lit.dev) Web Components, for `deno lint`.

Good for letting an AI write your components: the rules catch the Lit mistakes a
model makes. Battle-tested on real code.

## Setup

```jsonc
// deno.json
{
  "lint": {
    "plugins": ["jsr:@cunarist/deno-lint-plugin-lit/core"]
  }
}
```

Five plugins. Each says something different about the code it rejects:

| Plugin                 | Says                                              | Rules |
| ---------------------- | ------------------------------------------------- | ----- |
| `/core`                | This does not do what it looks like it does.      | 53    |
| `/strict`              | Demanding, but we think you should.               | 14    |
| `/dom-ref`             | Reach the DOM through a named `ref` callback.     | 3     |
| `/reactive-controller` | Anything with a lifetime belongs in a controller. | 7     |
| `/naming`              | What elements and controllers are called.         | 4     |

Add the ones you want:

```jsonc
{
  "lint": {
    "plugins": [
      "jsr:@cunarist/deno-lint-plugin-lit/core",
      "jsr:@cunarist/deno-lint-plugin-lit/strict"
    ]
  }
}
```

Adding a plugin turns on every rule in it. Rule ids are the plugin name plus the
rule, so turn one off like this:

```jsonc
{ "lint": { "rules": { "exclude": ["lit-reactive-controller/no-timers"] } } }
```

All rules assume **standard decorators** — the TC39 proposal, which is the
default in Deno and in TypeScript 5. `experimentalDecorators` is the older,
separate proposal; if you have it switched on, several rules here will be wrong
for you.

### Picking rules yourself

```ts
// lint.ts
import { coreRules } from "jsr:@cunarist/deno-lint-plugin-lit/core";
import { noTimers } from "jsr:@cunarist/deno-lint-plugin-lit/reactive-controller";

const plugin: Deno.lint.Plugin = {
  name: "my-lit",
  rules: { ...coreRules, "no-timers": noTimers },
};

export default plugin;
```

```jsonc
{ "lint": { "plugins": ["./lint.ts"] } }
```

Each entry point exports its rules individually plus the whole group as one
record: `coreRules`, `strictRules`, `domRefRules`, `reactiveControllerRules`,
`namingRules`.

## `/core`

The rule to read first is `simple-template-expressions`: **a binding is a name,
not an expression.** Compute before the `return` and interpolate by name.
Directives included — `repeat(...)` is a call like any other.

```ts
// BAD - all the same violation
html`<div>${repeat(this.items, k, v)}</div>`;
html`<div @click=${() => this.go()}></div>`;
html`<ul>${this.items.map((i) => html`<li>${i}</li>`)}</ul>`;
html`<div>${this.ready ? a : b}</div>`;
html`<div>${this.items[0]}</div>`;

// GOOD
const renderedItems = repeat(this.items, (i) => i.id, this.#renderItem);
return html`<div @click=${this.#onClick}>${renderedItems}</div>`;
```

This is stricter than Lit's own documentation, which puts conditionals and
`.map()` straight into templates. The trade is that `render()` becomes a
description rather than a program.

| Rule                                                                                           | Catches                                                                                                                 |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| [`attribute-value-entities`](src/core/attribute-value-entities.md)                             | an unescaped `&`, `<`, `>` or `"` inside a static attribute value in an `html` template                                 |
| [`binding-positions`](src/core/binding-positions.md)                                           | a `${…}` binding used as a tag name, in a closing tag, or as an attribute name                                          |
| [`composed-requires-bubbles`](src/core/composed-requires-bubbles.md)                           | an event constructed with `composed: true` but without `bubbles: true`                                                  |
| [`event-name-case`](src/core/event-name-case.md)                                               | an event name with uppercase letters in `new CustomEvent(...)` or `new Event(...)`                                      |
| [`lifecycle-super`](src/core/lifecycle-super.md)                                               | an override of a Lit lifecycle callback that never calls its own `super` implementation                                 |
| [`no-array-mutation-without-reassign`](src/core/no-array-mutation-without-reassign.md)         | calling a mutating array method on a reactive property                                                                  |
| [`no-async-lifecycle`](src/core/no-async-lifecycle.md)                                         | `async` on a Lit lifecycle hook                                                                                         |
| [`no-async-render`](src/core/no-async-render.md)                                               | an `async render()` on a Lit component                                                                                  |
| [`no-attribute-property-binding-conflict`](src/core/no-attribute-property-binding-conflict.md) | the same name bound as both an attribute and a property on one element                                                  |
| [`no-camelcase-attribute`](src/core/no-camelcase-attribute.md)                                 | an attribute name containing uppercase letters                                                                          |
| [`no-classfield-shadowing`](src/core/no-classfield-shadowing.md)                               | a plain class field whose name matches a reactive property                                                              |
| [`no-context-mutation-by-consumer`](src/core/no-context-mutation-by-consumer.md)               | assignment to a field declared with `@consume`                                                                          |
| [`no-dispatch-in-render`](src/core/no-dispatch-in-render.md)                                   | calling `dispatchEvent(...)` from `render()`                                                                            |
| [`no-duplicate-context-provider`](src/core/no-duplicate-context-provider.md)                   | two `@provide` declarations for the same context object on one class                                                    |
| [`no-duplicate-property-declaration`](src/core/no-duplicate-property-declaration.md)           | a property declared by both a decorator and a `static properties` entry                                                 |
| [`no-duplicate-slot-names`](src/core/no-duplicate-slot-names.md)                               | two `<slot>` elements with the same `name` in one template                                                              |
| [`no-duplicate-tag-registration`](src/core/no-duplicate-tag-registration.md)                   | registering the same custom element tag twice in one file                                                               |
| [`no-duplicate-template-bindings`](src/core/no-duplicate-template-bindings.md)                 | the same attribute, property, boolean or event binding appearing twice on one element                                   |
| [`no-index-as-repeat-key`](src/core/no-index-as-repeat-key.md)                                 | a `repeat` key function that returns its own index parameter                                                            |
| [`no-inline-event-attribute`](src/core/no-inline-event-attribute.md)                           | HTML inline event handler attributes such as `onclick` inside an `html` template                                        |
| [`no-inner-html-assignment`](src/core/no-inner-html-assignment.md)                             | assignment to `innerHTML` or `outerHTML` on any receiver                                                                |
| [`no-invalid-escape-sequences`](src/core/no-invalid-escape-sequences.md)                       | a malformed `\x` or `\u` escape inside an `html` template                                                               |
| [`no-invalid-html`](src/core/no-invalid-html.md)                                               | markup inside an `html` template that does not parse as valid HTML                                                      |
| [`no-jsx-attribute-names`](src/core/no-jsx-attribute-names.md)                                 | the JSX attribute names `className` and `htmlFor` in a template                                                         |
| [`no-legacy-imports`](src/core/no-legacy-imports.md)                                           | imports from the Lit 1 module paths `lit-html` and `lit-element`, and imports of names that Lit 2 removed               |
| [`no-legacy-template-syntax`](src/core/no-legacy-template-syntax.md)                           | Polymer-style `[[oneWay]]` and `{{twoWay}}` bindings inside an `html` template                                          |
| [`no-multiple-default-slots`](src/core/no-multiple-default-slots.md)                           | two or more unnamed `<slot>` elements in one template                                                                   |
| [`no-native-attributes`](src/core/no-native-attributes.md)                                     | a reactive property named after a global HTML attribute                                                                 |
| [`no-partial-property-binding`](src/core/no-partial-property-binding.md)                       | a property, event or boolean binding that is not the entire attribute value                                             |
| [`no-private-properties`](src/core/no-private-properties.md)                                   | `@property` on a field declared with a `#` private name                                                                 |
| [`no-property-change-in-updated`](src/core/no-property-change-in-updated.md)                   | assigning to a reactive property inside `updated()` or `firstUpdated()`                                                 |
| [`no-property-change-update`](src/core/no-property-change-update.md)                           | assigning to a reactive property inside `update()`                                                                      |
| [`no-property-named-like-lifecycle`](src/core/no-property-named-like-lifecycle.md)             | a class field or reactive property named after a Lit lifecycle member                                                   |
| [`no-request-update-in-updated`](src/core/no-request-update-in-updated.md)                     | calling `this.requestUpdate()` inside `updated()` or `firstUpdated()`                                                   |
| [`no-script-in-template`](src/core/no-script-in-template.md)                                   | a `<script>` element inside a Lit template                                                                              |
| [`no-self-closing-non-void`](src/core/no-self-closing-non-void.md)                             | self-closing syntax on a non-void element in a template                                                                 |
| [`no-this-assign-in-render`](src/core/no-this-assign-in-render.md)                             | assigning to anything reached through `this` inside `render()`                                                          |
| [`no-this-in-static-styles`](src/core/no-this-in-static-styles.md)                             | `this` inside a `static styles` initialiser                                                                             |
| [`no-unsafe-css`](src/core/no-unsafe-css.md)                                                   | `unsafeCSS` imported from Lit — both the import specifier and every call site                                           |
| [`no-unsafe-html`](src/core/no-unsafe-html.md)                                                 | the `unsafeHTML` and `unsafeSVG` directives — both the import specifier and every call site                             |
| [`no-useless-template-literals`](src/core/no-useless-template-literals.md)                     | an `html` template whose entire content is one binding and no markup                                                    |
| [`no-value-attribute`](src/core/no-value-attribute.md)                                         | a bound `value=${…}` attribute on a form control; use the property binding `.value=${…}`                                |
| [`prefer-static-styles`](src/core/prefer-static-styles.md)                                     | a `<style>` element inside an `html` template                                                                           |
| [`require-accessor-with-decorators`](src/core/require-accessor-with-decorators.md)             | a `@property` or `@state` decorator on a plain class field instead of an `accessor` field                               |
| [`require-context-type`](src/core/require-context-type.md)                                     | a `createContext()` call from `@lit/context` with no explicit type argument                                             |
| [`require-dashed-tag`](src/core/require-dashed-tag.md)                                         | a custom element name the registry will not accept                                                                      |
| [`require-dispatch-on-this`](src/core/require-dispatch-on-this.md)                             | a component event dispatched on something other than the component itself                                               |
| [`require-property-type`](src/core/require-property-type.md)                                   | a `@property` that has an attribute but declares no `{type: …}`                                                         |
| [`require-repeat-key`](src/core/require-repeat-key.md)                                         | `repeat(items, template)` — the two-argument form, with no key function                                                 |
| [`require-scalar-reflect`](src/core/require-scalar-reflect.md)                                 | `reflect: true` unless the options prove the value is a scalar                                                          |
| [`simple-template-expressions`](src/core/simple-template-expressions.md)                       | Every `${…}` binding in an `html` template must be an identifier, `this`, or a non-computed member chain — nothing else |
| [`svg-template-for-svg-content`](src/core/svg-template-for-svg-content.md)                     | SVG-only elements written directly in an `html` template with no enclosing `<svg>`                                      |
| [`value-after-constraints`](src/core/value-after-constraints.md)                               | a `value` binding that appears before a validity constraint attribute on the same form control                          |

## `/strict`

Correct, and worth adopting — but they ask more of you than `/core` does, and a
few will fire on code that works. `createContext("key")` is valid Lit. A class
registered from a barrel file looks unregistered here. Light DOM is a real Lit
feature that this ruleset declines to use.

| Rule                                                                                           | Catches                                                                                                             |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [`attribute-names`](src/strict/attribute-names.md)                                             | a camelCase reactive property that does not declare an explicit `attribute` option                                  |
| [`directive-allowlist`](src/strict/directive-allowlist.md)                                     | every import from a Lit `directives/` module except `lit/directives/ref.js` and `lit/directives/repeat.js`          |
| [`no-boolean-property-default-true`](src/strict/no-boolean-property-default-true.md)           | a boolean reactive property whose default is not literal `false`                                                    |
| [`no-event-target-subclass`](src/strict/no-event-target-subclass.md)                           | a class that extends `EventTarget`                                                                                  |
| [`no-light-dom`](src/strict/no-light-dom.md)                                                   | `createRenderRoot()` returning `this`, which renders the component into the light DOM                               |
| [`no-manual-update`](src/strict/no-manual-update.md)                                           | a Lit component scheduling its own update with `requestUpdate`, `performUpdate`, or `scheduleUpdate`                |
| [`no-property-assignment-in-constructor`](src/strict/no-property-assignment-in-constructor.md) | assigning a reactive property inside `constructor()`                                                                |
| [`no-string-context-key`](src/strict/no-string-context-key.md)                                 | a string literal as the key passed to `createContext()`                                                             |
| [`no-update-complete`](src/strict/no-update-complete.md)                                       | any access to `updateComplete`                                                                                      |
| [`prefer-context-decorators`](src/strict/prefer-context-decorators.md)                         | constructing a `ContextProvider` or `ContextConsumer` by hand inside a Lit component                                |
| [`prefer-decorators`](src/strict/prefer-decorators.md)                                         | a `static properties` declaration on a Lit component                                                                |
| [`require-custom-element-registration`](src/strict/require-custom-element-registration.md)     | a `LitElement` subclass that is never registered, with neither `@customElement` nor `customElements.define`         |
| [`require-event-in-event-map`](src/strict/require-event-in-event-map.md)                       | an event constructed inside a Lit component whose name has no matching `HTMLElementEventMap` entry in the same file |
| [`require-tag-name-map`](src/strict/require-tag-name-map.md)                                   | a component registered with `@customElement` that has no matching `HTMLElementTagNameMap` entry in the same file    |

## `/dom-ref`

One idea: the only way to reach an element is a `ref` bound to a `createRef`.

`@query` answers two questions badly: **which** element, and **when**.

- **Which** — a selector matches by shape. `@query("input")` means "whichever
  input comes first". Add one above it and you silently get a different element.
- **When** — it is a lazy `querySelector`. It answers any time you ask,
  including `null` before the first render.

A `ref` settles both: it is bound to one position, and Lit fills its `createRef`
as the element attaches and clears it as it goes away.

```ts
// BAD
class Bad extends LitElement {
  @query("#input")
  accessor input;

  override render() {
    return html`<input id="input">`;
  }
}

// GOOD
class Good extends LitElement {
  #input = createRef<HTMLInputElement>();

  override render() {
    const inputRef = ref(this.#input);
    return html`<input ${inputRef}>`;
  }
}
```

| Rule                                                        | Catches                                                                                                                                     |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| [`no-dom-query`](src/dom-ref/no-dom-query.md)               | `querySelector` and `querySelectorAll` inside a Lit component                                                                               |
| [`no-query-decorators`](src/dom-ref/no-query-decorators.md) | `@query`, `@queryAll`, `@queryAsync`, `@queryAssignedElements`, and `@queryAssignedNodes`, and their imports from the Lit decorator modules |
| [`prefer-create-ref`](src/dom-ref/prefer-create-ref.md)     | a `ref` callback that only stashes the element, in favour of `createRef`                                                                    |

## `/reactive-controller`

A `ReactiveController` is a unit of behaviour with no UI. It keeps components
small, pairs acquisition with release so a resource cannot leak, and turns
"watch this element's size" into something named and reusable.

```ts
class ItemsController implements ReactiveController {
  #host: ReactiveControllerHost;
  #abort: AbortController | undefined;

  constructor(host: ReactiveControllerHost) {
    this.#host = host;
    host.addController(this);
  }

  hostConnected(): void {
    this.#abort = new AbortController();
  }

  hostDisconnected(): void {
    this.#abort?.abort();
    this.#abort = undefined;
  }
}
```

Components keep only `styles` and `render`. Everything else — listeners, timers,
sockets, fetches — moves here, where `hostConnected` and `hostDisconnected` sit
next to each other.

| Rule                                                                              | Catches                                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`host-constructor`](src/reactive-controller/host-constructor.md)                 | a controller constructor that is not exactly `constructor(host: ReactiveControllerHost)`                                                                                                                                            |
| [`lifecycle-allowlist`](src/reactive-controller/lifecycle-allowlist.md)           | any lifecycle override on a Lit component other than `styles` and `render`                                                                                                                                                          |
| [`no-component-disposables`](src/reactive-controller/no-component-disposables.md) | constructing `AbortController`, `EventSource`, `IntersectionObserver`, `MutationObserver`, `ResizeObserver`, `WebSocket`, or `Worker` inside a Lit component, and rejects calling `addEventListener` or `removeEventListener` there |
| [`no-fetch-in-component`](src/reactive-controller/no-fetch-in-component.md)       | a `fetch(...)` call inside a Lit component class                                                                                                                                                                                    |
| [`no-timers`](src/reactive-controller/no-timers.md)                               | `setTimeout`, `setInterval`, `requestAnimationFrame`, and `queueMicrotask` inside a Lit component                                                                                                                                   |
| [`paired-lifecycle`](src/reactive-controller/paired-lifecycle.md)                 | a controller that defines `hostConnected` or `hostDisconnected` but not both                                                                                                                                                        |
| [`self-registration`](src/reactive-controller/self-registration.md)               | a controller that does not call `host.addController(this)` in its constructor                                                                                                                                                       |

## `/naming`

Pure convention — nothing here changes what the code does. The point is that a
reader can tell an element from a controller from a plain class at a glance.

| Rule                                                                   | Catches                                                                                              |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| [`require-controller-suffix`](src/naming/require-controller-suffix.md) | a reactive controller class whose name does not end in `Controller`                                  |
| [`require-element-suffix`](src/naming/require-element-suffix.md)       | a registered component class whose name does not end in `Element`                                    |
| [`require-tag-prefix`](src/naming/require-tag-prefix.md)               | a custom element name that carries no namespace segment                                              |
| [`tag-matches-class-name`](src/naming/tag-matches-class-name.md)       | a `@customElement` tag whose segments, after any leading prefix, do not PascalCase to the class name |

## Known limits

- **No rule options.** Deno's plugin API has no way to configure a rule, so none
  of these take settings.
- **One file at a time.** Rules that need a superclass chain or a registration
  site only see the current module.
- **Unclosed tags are under-reported.** `<li>`, `<td>`, and `<p>` may legally
  omit their closing tag, so `no-invalid-html` leaves them alone.

## License

MIT. See `LICENSE` for third-party attribution.
