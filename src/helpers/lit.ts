/** Lit-specific detection helpers. */

import { classDecorators, memberPath } from "./ast.ts";

/** Module specifiers that count as "the Lit core" for import checks. */
export const LIT_CORE_SOURCES: readonly string[] = [
  "lit",
  "lit-html",
  "lit-element",
];

/** Legacy v1 specifiers that should be replaced by `lit`. */
export const LEGACY_LIT_SOURCES: readonly string[] = [
  "lit-html",
  "lit-element",
];

/** Base classes that make a subclass a Lit component. */
const LIT_BASES: readonly string[] = [
  "LitElement",
  "ReactiveElement",
  "UpdatingElement",
];

/** Lifecycle members Lit defines on `ReactiveElement`/`LitElement`. */
export const LIT_LIFECYCLE_MEMBERS: readonly string[] = [
  "connectedCallback",
  "disconnectedCallback",
  "attributeChangedCallback",
  "adoptedCallback",
  "createRenderRoot",
  "firstUpdated",
  "updated",
  "shouldUpdate",
  "update",
  "willUpdate",
  "performUpdate",
  "requestUpdate",
  "scheduleUpdate",
  "render",
];

/** Decorators that declare a reactive property. */
export const REACTIVE_PROPERTY_DECORATORS: readonly string[] = [
  "property",
  "state",
];

/** Whether a class extends a known Lit base class. */
export function isLitComponent(
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
): boolean {
  const superClass = node.superClass;
  if (!superClass) return false;
  const path = memberPath(superClass);
  if (path === null) return false;
  const last = path.split(".").pop() ?? path;
  return LIT_BASES.includes(last);
}

/** Whether a class declares `implements ReactiveController`. */
export function hasReactiveControllerInterface(
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
): boolean {
  for (const clause of node.implements ?? []) {
    if (memberPath(clause.expression) === "ReactiveController") return true;
  }
  return false;
}

/**
 * Whether a class is a reactive controller.
 *
 * The only signal is the `implements ReactiveController` clause. Earlier this
 * also accepted a class name ending in `Controller`, which reported plain
 * classes called `GameController` and stayed silent on a controller called
 * anything else. A declaration the author wrote is a fact; a name is a guess.
 *
 * The cost is that a controller which omits the clause is never checked. That
 * is the honest trade: these rules apply to classes that declare themselves.
 */
export function isReactiveController(
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
): boolean {
  return hasReactiveControllerInterface(node);
}

/** Whether a tagged template uses the given tag name (`html` or `css`). */
export function isTaggedWith(
  node: Deno.lint.TaggedTemplateExpression,
  tag: string,
): boolean {
  const path = memberPath(node.tag);
  if (path === null) return false;
  // Accept `html`, and `svg`/`mathml` style siblings only when asked for.
  return path === tag;
}

/** Whether a tagged template is an `html` template. */
export function isHtmlTemplate(
  node: Deno.lint.TaggedTemplateExpression,
): boolean {
  return isTaggedWith(node, "html") || isTaggedWith(node, "svg");
}

/** Whether a tagged template is a `css` template. */
export function isCssTemplate(
  node: Deno.lint.TaggedTemplateExpression,
): boolean {
  return isTaggedWith(node, "css");
}

/** The custom element tag registered by `@customElement("x-y")`, if any. */
export function customElementTag(
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
): string | null {
  for (const decorator of classDecorators(node)) {
    const expression = decorator.expression;
    if (expression.type !== "CallExpression") continue;
    if (memberPath(expression.callee) !== "customElement") continue;
    const first = expression.arguments[0];
    if (first && first.type === "Literal" && typeof first.value === "string") {
      return first.value;
    }
  }
  return null;
}

/** Whether a property definition declares a reactive property. */
export function isReactiveProperty(
  node: Deno.lint.PropertyDefinition | Deno.lint.AccessorProperty,
): boolean {
  for (const decorator of node.decorators ?? []) {
    const expression = decorator.expression;
    const source = expression.type === "CallExpression"
      ? memberPath(expression.callee)
      : memberPath(expression);
    if (source !== null && REACTIVE_PROPERTY_DECORATORS.includes(source)) {
      return true;
    }
  }
  return false;
}

/**
 * The local name bound to a named import, when the module specifier matches.
 *
 * Rules that key on a bare call — `repeat(...)`, `createContext(...)` — must
 * confirm the name came from the module they mean. Without it the rule fires on
 * any unrelated function that happens to share the name.
 */
export function importedLocalName(
  node: Deno.lint.ImportDeclaration,
  matchesSource: (source: string) => boolean,
  importedName: string,
): string | null {
  const source = node.source.value;
  if (typeof source !== "string" || !matchesSource(source)) return null;
  for (const specifier of node.specifiers) {
    // `import * as ns from "…"` binds every export under `ns.`.
    if (specifier.type === "ImportNamespaceSpecifier") {
      return `${specifier.local.name}.${importedName}`;
    }
    if (specifier.type !== "ImportSpecifier") continue;
    const imported = specifier.imported;
    const name = imported.type === "Identifier"
      ? imported.name
      : typeof imported.value === "string"
      ? imported.value
      : null;
    if (name === importedName) return specifier.local.name;
  }
  return null;
}

/** Whether a specifier is Lit's `repeat` directive module. */
export function isRepeatModule(source: string): boolean {
  return /^(?:lit|lit-html|lit-element)\/directives\/repeat\.js$/.test(source);
}

/** Whether a specifier is the `@lit/context` package. */
export function isContextModule(source: string): boolean {
  return source === "@lit/context";
}
