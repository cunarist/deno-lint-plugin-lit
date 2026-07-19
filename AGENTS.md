# deno-lint-plugin-lit

A Deno lint plugin providing Lit rules, published to jsr.io.

The house style comes from **`../memona`** —
`user_app/scripts/deno-lint-plugin.ts` plus the normative sections of its
`AGENTS.md` and `.agents/memory/frontend-lit.md`.

One memona rule was deliberately **not** carried over: its ban on `nothing`.
`nothing` removes an attribute in attribute position, which an empty `html`
template cannot do, so banning it costs a capability with no replacement. That
rule was built and then dropped; do not reintroduce it.

---

## Working style

Keep responses short. State the decision and what changed — no restating
rationale already written here, no summarizing edits the user can read. Detail
belongs in this file, not in chat.

## Project conventions

- `deno.json` is the only config. Strict TS.
- **File names under `src/` are kebab-case**, matching the rule id exactly:
  `no-request-update-in-updated.ts` implements `no-request-update-in-updated`,
  with its doc at `no-request-update-in-updated.md` beside it. No translation
  step between a diagnostic id and the file that produces it.
- `deno fmt`, `deno check`, and `deno lint` must all pass on this package
  itself.
- Every rule has tests. Use `Deno.lint.runPlugin`, which is only available under
  `deno test`.
- Annotate the plugin as `Deno.lint.Plugin` — visitor callback params infer from
  it, and JSR's slow-types check needs the explicit public type.
- `license` must be set in `deno.json` (or a LICENSE file present) or
  `deno publish` fails.
- **Avoid `typeof` in type position.** Write the type out by name instead of
  deriving it — `AppDialogContext`, not `ContextType<typeof appDialogContext>`.
  Derived types read backwards and break when the value moves. This is about the
  _type_ keyword only: the runtime operator (`typeof x === "string"`) is fine
  and is used throughout the rules.

### Packaging: why there are four entry points

Deno's plugin API is `{ name, rules }` — **no tags, no presets, and no per-rule
options** (`RuleContext` has no `options`). Verified: `deno.json`
`rules.exclude` _does_ turn off a plugin rule, but `rules.include` does **not**
restrict plugin rules — loading a plugin turns on everything in it, opt-out
only.

Each config states one claim about the code it rejects. That claim, not the
subject matter, decides where a rule goes.

| Entry                   | Plugin name               | Claim                                            |
| ----------------------- | ------------------------- | ------------------------------------------------ |
| `./core`                | `lit-core`                | This does not do what it looks like it does      |
| `./strict`              | `lit-strict`              | Demanding, but we think you should               |
| `./dom-ref`             | `lit-dom-ref`             | Reach the DOM through a named `ref`              |
| `./reactive-controller` | `lit-reactive-controller` | Anything with a lifetime belongs in a controller |

```jsonc
{
  "lint": {
    "plugins": [
      "jsr:@cunarist/deno-lint-plugin-lit/core",
      "jsr:@cunarist/deno-lint-plugin-lit/strict"
    ],
    "rules": { "exclude": ["lit-strict/no-timers"] }
  }
}
```

A rule that _may fire on valid code_ still belongs in `strict` — that was tried
as a separate `pedantic` config and merged back, because two opt-in tiers with
near-identical names told users nothing.

Rule ids inside `reactive-controller` drop the redundant `controller-` prefix:
`lit-reactive-controller/host-constructor`, not `…/controller-host-constructor`.
Two keep it, because stripping left them meaningless —
`implements-reactive-controller` and `no-controller-references`.

**Consequence — two rules were dropped and one replaced**, since none can be
configured: `ban-attributes` (a denylist with no denylist is useless) and
`quoted-expressions` (no way to pick a direction) are out. `element-tag-prefix`
became `tag-matches-class-name`, which needs no configuration: strip any prefix
segments, and the rest must PascalCase to the class name.

There is **no root `.` export.** A barrel that only re-exported the four groups
lowered the JSR score and earned nothing: each entry point already exports its
rules individually alongside its `*Rules` record, so composing a custom
`lint.ts` works by importing from the specific subpaths. Do not add one back —
if `.` were also a plugin, a user loading both `.` and `./core` would get every
diagnostic twice.

### Per-rule docs

Every rule has a `.md` next to its `.ts`, same basename, linked from the README
table. Examples are derived from the rule's test file so docs cannot drift from
behaviour. Relative links work on GitHub; they will not resolve on jsr.io until
a repository URL is set.

### Verified environment facts

Checked empirically against Deno 2.9.3 — do not re-litigate:

- A lint plugin **can** import `npm:` packages. `npm:parse5@8` loads and parses
  inside a real `deno lint` run.
- JSR **accepts** npm dependencies. `deno publish --dry-run` passes slow-types
  and publish checks with `npm:parse5` as a dependency.
- AST node fields are **prototype getters**. `Object.keys(node)` returns `[]`.
  Never traverse with `Object.keys`/`Object.values` — use explicit field access,
  or `Object.getOwnPropertyNames(Object.getPrototypeOf(node))`.
- `Deno.lint.runPlugin` and real `deno lint` agree on the above. memona's note
  claiming tests diverge from real lint is **stale** for 2.9.3; tests are
  faithful.
- Top-level `export class X` arrives as an `ExportNamedDeclaration` wrapper —
  unwrap before matching `ClassDeclaration`.
- String literals are node type **`Literal`** with a `.value`, not
  `StringLiteral` — despite `StringLiteral` appearing in some key-position
  unions.
- `ClassDeclaration` has **no `decorators` field in the typings**, though it
  exists at runtime. Always read class decorators through `classDecorators()` in
  `helpers/ast.ts`. `ClassDeclaration.implements` _is_ typed and usable.
- `AccessorProperty` has **no `typeAnnotation` in the typings** though it
  carries one at runtime — the same gap as `ClassDeclaration.decorators`. Read
  it through a narrow cast.
- **`enclosingMethod()` does not stop at nested function boundaries.** It
  reports "inside the constructor" for an assignment in a callback the
  constructor merely registers. A rule asking "does this _run_ during X?" rather
  than "is this lexically inside X?" must walk parents itself and bail on any
  `ArrowFunctionExpression` / `FunctionDeclaration` / `FunctionExpression` that
  is not X's own body.
- `Deno.lint.Node` has **no `"AccessorProperty"` member**, even though
  `AccessorProperty` is a real exported type. Comparing
  `node.type ===
  "AccessorProperty"` during a generic parent-walk fails to
  compile (TS2367, "no overlap"). It is only reachable through typed fields such
  as `ClassBody["body"]`.
- `:exit` visitors (`"MethodDefinition:exit"`) work. Use them to collect facts
  during a subtree walk and decide on exit — `lifecycle-super` needs this to
  accept a `super.x()` call nested inside `if`/`try`.
- There is **no cross-file resolution**. A rule that needs the superclass chain
  can only scan `Program.body` of the same module. A base class imported from
  elsewhere is unanalyzable — a real limitation to document per rule, not a bug.
- **Import-map aliases are fine for shipping, but break path-loading.** Internal
  imports use `#helpers` (mapped in `deno.json`). `deno publish` rewrites
  specifiers to fully-qualified ones at publish time, so consumers installing
  from JSR resolve it correctly. But a project that loads the plugin by **file
  path** never reads this package's `deno.json` and fails with
  `Import "#helpers" not a dependency`. That is a limitation of path-loading,
  not of the package — see the integration-testing note below.
- Third-party imports must still be fully-specified `npm:` / `jsr:`. A bare
  `parse5` alias resolves against the _consumer's_ import map and fails there.
- Template location mapping needs care: a placeholder (`{{__lit_0__}}`) and the
  binding it stands for (`${this.tag}`) have different lengths, so offsets
  inside a placeholder cannot be mapped linearly — they snap to the whole `${…}`
  span. Every rule test asserts the highlighted source text
  (`assertReportedText`) because this class of bug leaves the rule firing
  correctly while pointing at the wrong characters.

### parse5 namespace and casing

- **parse5 lowercases attribute names**, in `attrs` _and_ in the
  `sourceCodeLocation.attrs` keys. `.myProp=${v}` arrives as `.myprop`. A rule
  that cares about attribute casing must slice the raw name back out of
  `source.text` using the location offsets.
- **`parseTemplate` parses everything as HTML.** It calls `parseFragment` with
  no context element, so `` svg`<circle />` `` is parsed in the HTML namespace,
  not the SVG one. Namespace-sensitive rules currently bail on
  `isTaggedWith(node, "svg")` to avoid false positives. A nested `<svg>` inside
  an `html` template is fine — parse5 switches namespace correctly there.
  **Consequence:** those rules go silent inside `svg` templates, exactly where
  `svg-template-for-svg-content` pushes people. A context-aware `parseTemplate`
  variant is the real fix.
- Unquoted attribute values swallow a trailing `/`: `<div a=${x}/>` is **not**
  self-closing — the value ends only at whitespace or `>`. Likewise
  `.prop=${a} ${b}` parses as a value plus a _separate valueless attribute_, not
  as one multi-part binding.

### `walkElements` ordering

`walkElements` yields elements in **document order**. It was originally a
stack-based DFS, which visited siblings in reverse and silently inverted any
rule reporting "the second and later occurrence" — flagging the first and
sparing the last. Fixed, but the lesson stands: assert the reported range in the
test, not merely that a diagnostic fired.

### Docs gotcha

`deno fmt` reformats `` ```ts `` blocks inside Markdown. A decorated field
written at top level is invalid TS, so **fmt silently deletes the decorator** —
which once left the `attribute-names` README example with identical BAD and GOOD
snippets. Always wrap decorator examples in a `class … { }` body. Likewise
inline `html` `` gets mangled; write "an empty `html` template" instead.

fmt also **reflows `html` and `css` template bodies** inside `` ```ts `` blocks
— a one-line `` css`:host { … }` `` comes back as a five-line block. A snippet
whose markup is unbalanced across several tags gets re-indented as though the
stray closing tag were a child, which reads as a different bug than the one
being shown. Keep doc snippets to a single tag or balanced one-liners — those
survive untouched.

### Integration testing

Unit tests use `Deno.lint.runPlugin`; that is not the deployment path. Before
release, also run real `deno lint` from a _separate_ consumer project against
both a deliberately-bad file and a known-good component. That check is what
caught two real bugs the 313 unit tests missed: bare `parse5` imports failing to
resolve against a consumer's import map, and false positives on idiomatic code
(`AbortController` tripping `no-controller-references`, `willUpdate` tripping
`lifecycle-super`).

Since internal imports use the `#helpers` alias, the consumer project **cannot**
point at `src/**/mod.ts` by file path — it must consume the package the way real
users do, via `jsr:@cunarist/deno-lint-plugin-lit/...`. That means this check
now requires a published version (a prerelease is enough). Testing by path was
convenient but never matched the deployment path anyway.

### HTML parsing

Template rules use `npm:parse5` + `npm:parse5-htmlparser2-tree-adapter`, the the
parser browsers agree with, so template rules match real markup. Join the quasis
with a placeholder to represent bindings, parse with
`sourceCodeLocationInfo: true`, then map locations back to the original template
range for reporting.

---

## Rule inventory

Status: `mem` = enforced by memona's own plugin, `new` = documented in memona
but not previously enforced anywhere, `lit` = a general Lit correctness rule.

### Config: `recommended`

Portable correctness. True for any Lit codebase, no house style.

| Rule                             | Src | Enforces                                           |
| -------------------------------- | --- | -------------------------------------------------- |
| `no-invalid-html`                | up  | Template markup must parse as valid HTML           |
| `binding-positions`              | up  | No bindings in tag names, closing tags, `<${x}>`   |
| `attribute-value-entities`       | up  | Escape `&`, `<`, `>`, `"` in attribute values      |
| `no-duplicate-template-bindings` | up  | No attribute bound twice on one element            |
| `no-legacy-template-syntax`      | up  | No Polymer `[[x]]` / `{{x}}`                       |
| `no-invalid-escape-sequences`    | up  | No invalid escapes in templates                    |
| `no-property-change-update`      | up  | No reactive-property assignment in `update()`      |
| `no-this-assign-in-render`       | up  | No `this.x = …` in `render()`                      |
| `no-classfield-shadowing`        | up  | Class field must not shadow a reactive property    |
| `no-legacy-imports`              | up  | No `lit-element` / `lit-html` v1 paths; use `lit`  |
| `no-value-attribute`             | up  | Use `.value=`, not `value=`                        |
| `value-after-constraints`        | up  | `value` binding after `min`/`max`/`pattern`        |
| `no-native-attributes`           | up  | Don't shadow native attributes with reactive props |
| `attribute-names`                | up  | Property ↔ attribute casing consistent             |
| `no-private-properties`          | up  | `#x` / `_x` must not be `@property`                |

`lifecycle-super` (up) is **conditionally** in `recommended`: it requires
`super.<method>()` in lifecycle overrides. Under memona style those overrides
are banned outright by `lifecycle-allowlist`, so it is dead code there — but it
is correct for anyone not adopting the controller discipline. Ships enabled;
`disciplined` supersedes it.

### Config: `strict`

Template purity and styles.

**The template-purity principle:** a template binding may only be an identifier
or a simple member expression. Everything is computed before the `return` and
interpolated by name — _including directives_. `repeat(...)` is a call like any
other and is hoisted out too. There is no directive exemption.

```ts
// correct — memona components/file-tree-view.ts:210
const renderedItems = repeat(
  this.items,
  (item) => this.itemId(item),
  this.#renderNode,
);
return html`<div>${renderedItems}</div>`;

// all violations of the one rule
html`<div>${repeat(this.items, k, v)}</div>`; // call
html`<div @click=${() => this.go()}>`; // arrow
html`<div @click=${this.go.bind(this)}>`; // bind
html`<ul>${this.items.map((i) => html`…`)}</ul>`; // map
html`<div>${cond ? a : b}</div>`; // conditional
html`<div>${a && b}</div>`; // logical

html`<div @click=${this.#onClick}>`; // fine — member expression
```

This subsumes upstream's `no-template-arrow`, `no-template-bind`, and
`no-template-map`: each is one violation shape of `simple-template-expressions`,
reported with a shape-specific message and hint rather than as a separate rule.
Keeping them as distinct rules would let a codebase disable `no-template-map`
while claiming template purity, which is incoherent.

"Simple member expression" = non-computed chain of any depth (`this.a.b.c` ok).
Computed access (`this.items[0]`) is rejected — hoist it.

The same restriction applies to the `return` of `render()`: no conditional in
the returned expression. Early
`return html\`…\``inside an`if`is fine — memona does
this at`file-tree-view.ts:206`.

| Rule                           | Src | Enforces                                                                                                             |
| ------------------------------ | --- | -------------------------------------------------------------------------------------------------------------------- |
| `simple-template-expressions`  | new | **Core rule.** Every `${…}` in an `html` template must be an identifier or a simple member expression. Nothing else. |
| `no-useless-template-literals` | up  | No `html` template that is one static expression                                                                     |
| `prefer-static-styles`         | up  | No `<style>` in templates; use `static styles`                                                                       |
| `no-unsafe-css`                | mem | Ban `unsafeCSS` from `lit`                                                                                           |
| `static-styles-css-literal`    | mem | `static styles` must be a direct `` css`…` `` — no arrays, no refs                                                   |

### Config: `controllers`

memona's `reactive-controller-conventions` mega-rule, split into individually
named and disableable rules.

| Rule                              | Src | Enforces                                                            |
| --------------------------------- | --- | ------------------------------------------------------------------- |
| `controller-implements-interface` | mem | Must `implements ReactiveController`                                |
| `controller-host-constructor`     | mem | Constructor takes exactly one param, `host: ReactiveControllerHost` |
| `controller-self-registration`    | mem | Must call `host.addController(this)`                                |
| `controller-paired-lifecycle`     | mem | Must define both `hostConnected` and `hostDisconnected`             |
| `no-unused-controller-host`       | mem | Store `#host` only if used                                          |
| `no-controller-references`        | mem | Controllers may not reference, accept, or pass other controllers    |
| `no-controller-self-sync`         | mem | A controller may not call its own `sync*` method                    |
| `no-controller-sync-in-render`    | mem | Host may not call `this.#ctrl.sync*()` from `render()`              |
| `controller-construction-args`    | mem | A host may pass only `this` when constructing a controller          |

### Config: `disciplined`

memona house style. Opt-in — these are the rules that will surprise outsiders.

| Rule                       | Src    | Enforces                                                                                                                                                                                                   |
| -------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lifecycle-allowlist`      | mem    | On a `LitElement`, only `styles`, `render`, `willUpdate` may be overridden                                                                                                                                 |
| `no-manual-update`         | mem    | `requestUpdate`/`performUpdate`/`scheduleUpdate` only via `this.host.*`                                                                                                                                    |
| `no-update-complete`       | mem    | No `this.updateComplete`                                                                                                                                                                                   |
| `no-timers`                | mem    | No `setTimeout`/`setInterval`/`requestAnimationFrame`/`queueMicrotask`                                                                                                                                     |
| `no-dom-query`             | mem    | No `querySelector`/`querySelectorAll` — use `ref`                                                                                                                                                          |
| `no-query-decorators`      | up→mem | Ban `@query`/`@queryAll`/`@queryAssigned*` (inverts upstream `prefer-query-decorators`)                                                                                                                    |
| `no-create-ref`            | mem    | No `createRef` — named ref callbacks only                                                                                                                                                                  |
| `directive-allowlist`      | mem    | Only `ref` and `repeat`; configurable                                                                                                                                                                      |
| `no-component-disposables` | mem    | Components may not construct/manage `AbortController`, `EventSource`, `*Observer`, `WebSocket`, `Worker`, or call `addEventListener`/`destroy`/`disconnect`/`dispose`/`stream*` — delegate to a controller |
| `require-tag-name-map`     | new    | `declare global { HTMLElementTagNameMap }` per component, directly above the class                                                                                                                         |
| `element-tag-prefix`       | new    | Tag is kebab-case with a configured prefix; class is PascalCase tag minus prefix                                                                                                                           |
| `prefer-decorators`        | new    | Use `@property`/`@state`, not `static properties`                                                                                                                                                          |

---

## Phase 5 — shipped (43 rules)

These are **implemented and tested**. The README rule tables are the canonical
list; what follows is the design record for why each exists. The pruning pass
described at the bottom has **not** been done yet — that is the next task.

### To `recommended` (37)

Property declaration:

| Rule                                    | Catches                                                                 |
| --------------------------------------- | ----------------------------------------------------------------------- |
| `require-property-type`                 | `@property() count = 0` — the attribute arrives as a string             |
| `property-type-matches-declaration`     | `{type: Number}` on a `: string` field                                  |
| `no-reflect-on-complex-property`        | `reflect: true` on an object or array — serialises to `[object Object]` |
| `no-boolean-property-default-true`      | a boolean defaulting to `true` cannot be unset from markup              |
| `no-duplicate-property-declaration`     | same property in both a decorator and `static properties`               |
| `no-property-named-like-lifecycle`      | a member named `update` / `render` shadows the lifecycle                |
| `no-property-assignment-in-constructor` | assigned before first render; breaks SSR hydration                      |

Render correctness:

| Rule                                 | Catches                                                   |
| ------------------------------------ | --------------------------------------------------------- |
| `no-async-render`                    | `async render()` — Lit does not render a Promise          |
| `no-async-lifecycle`                 | `async willUpdate()` — Lit does not await lifecycle hooks |
| `no-this-in-static-styles`           | `this` in a static context                                |
| `no-dispatch-in-render`              | dispatching an event from `render()`                      |
| `no-property-change-in-updated`      | reactive write in `updated()` — re-enters the cycle       |
| `no-request-update-in-updated`       | `requestUpdate()` in `updated()` — infinite loop          |
| `no-array-mutation-without-reassign` | `this.items.push(x)` — identity unchanged, no re-render   |

Template structure:

| Rule                                     | Catches                                                         |
| ---------------------------------------- | --------------------------------------------------------------- |
| `no-self-closing-non-void`               | `<div />` — HTML has no self-closing; the rest becomes children |
| `no-jsx-attribute-names`                 | `className=` / `htmlFor=`                                       |
| `no-camelcase-attribute`                 | `<x-y myProp=${v}>` — attribute names lowercase                 |
| `no-partial-property-binding`            | `.prop=${a} ${b}` — runtime error                               |
| `no-template-result-in-attribute`        | a `TemplateResult` in attribute position                        |
| `no-object-attribute-binding`            | an object bound as attribute — stringified                      |
| `no-attribute-property-binding-conflict` | `foo=${a}` alongside `.foo=${b}`                                |
| `no-duplicate-slot-names`                | the same named slot twice                                       |
| `no-multiple-default-slots`              | two unnamed `<slot>` — only the first works                     |
| `svg-template-for-svg-content`           | `<path>` / `<circle>` inside an `html` template                 |
| `no-script-in-template`                  | `<script>` does not execute in a template                       |
| `require-repeat-key`                     | `repeat(items, template)` — no key function                     |
| `no-index-as-repeat-key`                 | index as key defeats `repeat`                                   |

Security:

| Rule                        | Catches                                                                |
| --------------------------- | ---------------------------------------------------------------------- |
| `no-inner-html-assignment`  | `innerHTML =` — XSS, and fights Lit's rendering                        |
| `no-inline-event-attribute` | `onclick="…"` string handler — does not work as expected, violates CSP |

Events:

| Rule                        | Catches                                                              |
| --------------------------- | -------------------------------------------------------------------- |
| `event-name-case`           | `CustomEvent("itemSelected")` — DOM event names are lowercase        |
| `composed-requires-bubbles` | `composed: true` without `bubbles` never crosses the shadow boundary |

Context (`@lit/context`):

| Rule                              | Catches                                           |
| --------------------------------- | ------------------------------------------------- |
| `require-context-type`            | `createContext()` with no type argument           |
| `no-string-context-key`           | a string key can collide globally; use a `Symbol` |
| `no-context-mutation-by-consumer` | a consumer writing to the provided value          |
| `no-duplicate-context-provider`   | the same context provided twice in one class      |

Registration:

| Rule                                  | Catches                                  |
| ------------------------------------- | ---------------------------------------- |
| `no-duplicate-tag-registration`       | the same tag registered twice            |
| `require-custom-element-registration` | a `LitElement` subclass never registered |

### To `strict` (2)

| Rule                         | Catches                                                                  |
| ---------------------------- | ------------------------------------------------------------------------ |
| `no-unsafe-html`             | `unsafeHTML` / `unsafeSVG` — XSS. The missing partner to `no-unsafe-css` |
| `require-event-in-event-map` | dispatching without an `HTMLElementEventMap` entry                       |

### To `controllers` (1)

| Rule                                       | Catches                                                            |
| ------------------------------------------ | ------------------------------------------------------------------ |
| `require-abort-signal-in-controller-fetch` | `fetch` without a `signal` cannot be cut off in `hostDisconnected` |

### To `disciplined` (3)

| Rule                               | Catches                                                                                                                                                                |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `no-fetch-in-component`            | a component fetching directly — nothing owns the cancellation                                                                                                          |
| `require-context-subscribe`        | `@consume` without `subscribe: true`. **Not a Lit requirement** — the default reads once at connect, which is correct for a value that never changes. House style only |
| `require-accessor-with-decorators` | `@property` on a plain field under standard decorators. **Risky** — the right answer depends on the project's decorator mode, which a rule cannot see                  |

### Notes on this list

- Total would be 86, with `recommended` at 53. That is too heavy for a "safe
  default". Plan on a pruning pass: build, run against `../memona` and any other
  real Lit codebase, and demote whatever produces false positives. The shipped
  43 needed exactly that — `lifecycle-super` and `no-controller-references` were
  both wrong until real code proved it.
- **A hit on memona is not automatically a false positive.** When triaging that
  pass, separate the two cases: the rule is wrong (demote or fix it), or the
  rule is right and memona should change (keep it, and note the migration). A
  rule worth having is worth keeping even when the house codebase does not
  comply yet — do not tune the ruleset down to whatever memona already passes.
- Deliberately **not** attempted, because static analysis would only produce
  noise: stale-guard (generation counter) presence in controller async work,
  `hasChanged` on object properties, and banning custom events outright (that
  last one would break framework-agnostic interop, which is the main reason to
  use custom elements at all).

## Deliberately excluded

Too project-specific to publish; leave in memona:

- `restricted-types` / the `EventTarget` ban — memona-specific architectural
  rule.
- `no-event-constructor` — not Lit-specific.
- No hardcoded user-visible strings (`t()` / `cl-tr`) — memona i18n, not Lit.
- No `px` in `css` — a design-system rule, not a Lit rule. Could ship as a
  configurable `css-unit-denylist` later if wanted.
- `no-satisfies`, `no-line-lint-ignore`, `pascal-case-types`,
  `upper-snake-string-unions` — general TS style, out of scope.

## Open questions

1. Whether `element-tag-prefix` is worth publishing or belongs in memona only.
   It's only useful if the prefix is configurable, which it can be.

Resolved: directives get **no** exemption from `simple-template-expressions` —
`repeat(...)` is hoisted out of the template like any other call. The
`directive-allowlist` rule governs _which_ directives may be imported; it does
not grant them a place inside a template.

## Build order

Rule count is high (~48). Build in phases, each shippable:

1. **Phase 1** — `recommended`. Needs the parse5 template-location plumbing,
   which everything else in the template family reuses. Highest value, fully
   portable.
2. **Phase 2** — `strict`. Reuses phase 1's template infrastructure.
3. **Phase 3** — `controllers`. Pure AST, no template work. Independent of 1
   and 2.
4. **Phase 4** — `disciplined`. Mostly simple AST checks; mechanical once the
   LitElement-subclass detection helper from phase 3 exists.

Shared helpers to build first: LitElement-subclass detection, `html`/`css`
tagged template detection (treating `lit`, `lit-html`, `lit-element` as aliases
for import-source checks), decorator lookup, and template-location mapping.

---

## Decorators

Every rule assumes **standard (TC39) decorators**, which is the default in Deno
and TypeScript 5. Verified on Deno 2.9.3: a decorator with no config receives
`(value, context)`.

`experimentalDecorators` is the **older, separate** proposal, not an earlier
name for the same thing — enabling it moves backwards. Under it, several rules
here are wrong, most obviously `require-accessor-with-decorators`, which is in
`core` precisely because under the default a plain `@property` field never
becomes reactive.

memona already complies: 356 `accessor` uses, no `experimentalDecorators`.
