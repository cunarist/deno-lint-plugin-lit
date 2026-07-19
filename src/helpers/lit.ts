/** Lit-specific detection helpers. */

import { classDecorators, keyName, memberPath } from "./ast.ts";

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
 * Heuristic for "this class is a reactive controller" that does not depend on
 * the `implements` clause — needed by the rule that requires that clause.
 */
export function looksLikeReactiveController(
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
): boolean {
  if (hasReactiveControllerInterface(node)) return true;
  const name = node.id?.name ?? "";
  if (name.endsWith("Controller")) return true;
  for (const member of node.body.body) {
    if (member.type !== "MethodDefinition") continue;
    const memberName = keyName(member.key);
    if (memberName === "hostConnected" || memberName === "hostDisconnected") {
      return true;
    }
  }
  return false;
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
