/** Lit-specific detection helpers. */

import {
  type FileFacts,
  fileKey,
  hashText,
  type LitTemplateKind,
  scanFacts,
} from "#scan-index";

import {
  classDecorators,
  findConstructor,
  memberPath,
  typeReferenceName,
} from "./ast.ts";

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

/**
 * Whether a class is a Lit component, from the scanner's facts.
 *
 * The scanner follows the heritage chain across files with a real type checker,
 * so this recognizes a component whose base lives in another module — which the
 * AST cannot. With no facts, or facts whose hash no longer matches the file
 * being linted, it reports `false` rather than guess.
 */
export function isLitComponent(
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
  ctx: Deno.lint.RuleContext,
): boolean {
  if (node.id === null) {
    return false;
  }
  return factsFor(ctx)?.components.includes(node.id.range[0]) ?? false;
}

/** Fresh scanner facts for the file being linted. */
function factsFor(ctx: Deno.lint.RuleContext): FileFacts | null {
  const facts = scanFacts();
  if (facts === null) {
    return null;
  }
  const fileFacts = facts.cache.files[fileKey(facts.root, ctx.filename)];
  if (
    fileFacts === undefined ||
    fileFacts.hash !== hashText(ctx.sourceCode.text)
  ) {
    return null;
  }
  return fileFacts;
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

/** The `ReactiveControllerHost` parameter in a constructor, by type not name. */
function hostParamOf(
  ctor: Deno.lint.MethodDefinition,
): Deno.lint.Identifier | null {
  for (const param of ctor.value.params) {
    if (
      param.type === "Identifier" &&
      typeReferenceName(param.typeAnnotation) === "ReactiveControllerHost"
    ) {
      return param;
    }
  }
  return null;
}

/**
 * The constructor parameter a controller receives its host through.
 *
 * Found by its `ReactiveControllerHost` type, not by the name `host`, so this
 * does not depend on `host-constructor` having enforced that name — a controller
 * may call the parameter anything.
 */
export function controllerHostParam(
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
): Deno.lint.Identifier | null {
  const ctor = findConstructor(node);
  return ctor ? hostParamOf(ctor) : null;
}

/**
 * The field a controller stores its host in, by name (`#host`, `host`, `_host`,
 * …), or null.
 *
 * The host parameter is found by type, then followed to a top-level
 * `this.<field> = host` assignment in the constructor. Anything more elaborate —
 * an intermediate alias (`const h = host; this.#host = h`), destructuring, or a
 * nested target (`this.state.host`) — is unanalyzable and returns null; callers
 * skip the controller rather than guess. Returns null too when the host is not
 * stored at all, which is legitimate: a controller that only registers itself
 * needs no field.
 */
export function controllerHostField(
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
): string | null {
  const ctor = findConstructor(node);
  if (!ctor) return null;
  const param = hostParamOf(ctor);
  if (!param) return null;
  const body = ctor.value.body;
  if (!body) return null;
  for (const statement of body.body) {
    if (statement.type !== "ExpressionStatement") continue;
    const expr = statement.expression;
    if (expr.type !== "AssignmentExpression" || expr.operator !== "=") continue;
    if (expr.right.type !== "Identifier" || expr.right.name !== param.name) {
      continue;
    }
    const target = expr.left;
    if (target.type !== "MemberExpression" || target.computed) continue;
    if (target.object.type !== "ThisExpression") continue;
    const property = target.property;
    if (property.type === "Identifier") return property.name;
    if (property.type === "PrivateIdentifier") return `#${property.name}`;
  }
  return null;
}

/** Whether a tagged template uses the given tag name (`html` or `css`). */
export function isTaggedWith(
  node: Deno.lint.TaggedTemplateExpression,
  tag: LitTemplateKind,
  ctx: Deno.lint.RuleContext,
): boolean {
  return factsFor(ctx)?.templates.some((template) =>
    template.kind === tag && template.start === node.tag.range[0]
  ) ?? false;
}

/** Whether a tagged template is an `html` template. */
export function isHtmlTemplate(
  node: Deno.lint.TaggedTemplateExpression,
  ctx: Deno.lint.RuleContext,
): boolean {
  return isTaggedWith(node, "html", ctx) ||
    isTaggedWith(node, "svg", ctx);
}

/** Whether a tagged template is a `css` template. */
export function isCssTemplate(
  node: Deno.lint.TaggedTemplateExpression,
  ctx: Deno.lint.RuleContext,
): boolean {
  return isTaggedWith(node, "css", ctx);
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
