# deno-lint-plugin-lit

A Deno lint plugin providing Lit rules, published to jsr.io.

A ban on `nothing` was built and then deliberately dropped. `nothing` removes an
attribute in attribute position, which an empty `html` template cannot do, so
banning it costs a capability with no replacement. Do not reintroduce it.

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

`tests/docs_consistency_test.ts` lints every `// GOOD` snippet in every doc with
**all five plugins at once**. That is what catches a rule whose advice another
rule forbids — it found five docs telling people to derive values in
`willUpdate()`, which `lifecycle-allowlist` bans, including that rule's own
example. Two escape hatches exist and both are commented in the test: snippet
noise (a minimal example omitting `@customElement` and friends) and one expected
disagreement (`lifecycle-super` must override a callback to describe itself).

Write what a rule rejects and how to fix it. **Do not write implementation
history** — "an earlier version inferred…", "this was inverted because…". That
belongs in a commit message. A reader of a rule doc wants the current behaviour.

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
- `Deno.lint.runPlugin` and real `deno lint` agree on the above, so tests are
  faithful to what `deno lint` will do.
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
- **`isLitComponent` detects by same-file facts, any one of four.** It extends
  `LitElement`/`ReactiveElement` (following the superclass chain within the
  module), carries `@customElement`, has a `render()` returning an `html`/`svg`
  template, or declares `static styles` built from `css`. It is intentionally
  _not_ `extends LitElement` alone: cross-file and cross-library bases are
  common, so a name-only base check silently skips real components. `render()`
  the _name_ and `extends HTMLElement` were rejected — the first is a method
  name any framework uses, the second means the class is a plain element, not a
  Lit one. The residual miss is a class whose only Lit-ness is an off-file base
  with none of the four local signals. `no-manual-update` needs no help from
  this: a `this.requestUpdate()` receiver only exists on a `ReactiveElement`, so
  the call itself is the signal — but it still gates on `isLitComponent`, so an
  off-file base with no local signal is the shared limitation, not a
  rule-specific one.
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

**The README rule tables are canonical.** Each rule has a `.md` beside its
`.ts`, and the README links every one. Do not keep a second list here — it went
stale twice.

Where a rule goes is decided by the claim it makes, not its subject. See
"Packaging" above.

## Deliberately excluded

Out of scope for a Lit ruleset, even though a strict codebase may want them:

- General TypeScript style — `no-satisfies`, PascalCase type names, UPPER_SNAKE
  string unions, import ordering, no default exports. These belong in a separate
  package.
- Design-system rules — banning `px` in `css`, enforcing design tokens.
- i18n — requiring user-visible strings to go through a translation function.
- Banning custom events outright. Events are the platform interface; a component
  that only speaks Lit context cannot be used from plain HTML, React, or Vue,
  which is the main reason to write a custom element at all. `/core` instead
  enforces that events are dispatched correctly, and `/strict` bans the
  `EventTarget` state-bus pattern.

Also deliberately not attempted, because static analysis would only produce
noise: stale-guard (generation counter) presence in controller async work, and
`hasChanged` on object properties.

Rules that depended on a **naming convention** were removed rather than shipped:
a rule keyed on methods called `sync*` does nothing in a codebase that does not
use that name, and misfires in one that uses it for something else. Rule
behaviour must follow from Lit semantics, not from what things are called.

**Inferring a type's meaning from its name is forbidden — no rule may decide
what a type is by what it is called.** Guessing that `MyDialog` is a concrete
web-component class, or that `~Element` names a host, is the same naming-heuristic
hack: it misfires on unrelated names and stays silent on a type named anything
else. A rule must read structure, never spelling.

`no-unused-host` (flag a controller storing its host but never reading it) was
dropped as redundant. Under `noUnusedLocals`, TS already reports a write-only
`#host` with TS6133 — and `#host` is the idiomatic private field. The only gap
was a write-only _public_ field (`this.host`), which TS never flags, and a
dedicated rule for that lone shape did not pull its weight.
`controllerHostField` in `helpers/lit.ts` — added for it — stays, because
`self-registration` uses it to recognize registration through a renamed host.

## Decorators

Every rule assumes **standard (TC39) decorators**, which is the default in Deno
and TypeScript 5. Verified on Deno 2.9.3: a decorator with no config receives
`(value, context)`.

`experimentalDecorators` is the **older, separate** proposal, not an earlier
name for the same thing — enabling it moves backwards. Under it, several rules
here are wrong, most obviously `require-accessor-with-decorators`, which is in
`core` precisely because under the default a plain `@property` field never
becomes reactive.
