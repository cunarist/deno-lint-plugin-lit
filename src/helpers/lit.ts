/** Lit-specific detection helpers. */

import {
  classDecorators,
  classMembers,
  findConstructor,
  findDecorator,
  findMethod,
  keyName,
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

/** Base classes that make a subclass a Lit component. */
const LIT_BASES: readonly string[] = [
  "LitElement",
  "ReactiveElement",
];

/** Tags whose tagged template is a Lit view template. */
const LIT_TEMPLATE_TAGS: readonly string[] = ["html", "svg"];

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

/** Whether a value is an AST node (has a string `type`). */
function isAstNode(value: unknown): value is Deno.lint.Node {
  return typeof value === "object" && value !== null &&
    typeof (value as { type?: unknown }).type === "string";
}

/** Last segment of a tagged template's tag, e.g. `Lit.html` -> `html`. */
function templateTag(
  node: Deno.lint.TaggedTemplateExpression,
): string | null {
  const path = memberPath(node.tag);
  return path === null ? null : (path.split(".").pop() ?? path);
}

/**
 * Whether the subtree rooted at `root` uses a tagged template with one of
 * `tags`. AST fields are prototype getters, so children are reached through
 * `Object.getOwnPropertyNames(Object.getPrototypeOf(node))`, not `Object.keys`.
 * A nested class is not descended into — its templates are its own.
 */
function subtreeUsesTaggedTemplate(
  root: Deno.lint.Node,
  tags: readonly string[],
): boolean {
  const seen = new Set<unknown>();
  const stack: unknown[] = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!isAstNode(current) || seen.has(current)) continue;
    seen.add(current);
    if (current.type === "TaggedTemplateExpression") {
      const tag = templateTag(current);
      if (tag !== null && tags.includes(tag)) return true;
    }
    if (
      current !== root &&
      (current.type === "ClassDeclaration" ||
        current.type === "ClassExpression")
    ) {
      continue;
    }
    for (
      const key of Object.getOwnPropertyNames(Object.getPrototypeOf(current))
    ) {
      if (key === "type" || key === "parent" || key === "range") continue;
      let child: unknown;
      try {
        child = (current as unknown as Record<string, unknown>)[key];
      } catch {
        continue;
      }
      if (Array.isArray(child)) {
        for (const item of child) if (isAstNode(item)) stack.push(item);
      } else if (isAstNode(child)) {
        stack.push(child);
      }
    }
  }
  return false;
}

/** Whether the class has a `render()` returning an `html`/`svg` template. */
function rendersLitTemplate(
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
): boolean {
  const body = findMethod(node, "render")?.value.body;
  if (!body) return false;
  return subtreeUsesTaggedTemplate(body, LIT_TEMPLATE_TAGS);
}

/** Whether the class has a static `styles` member built from `css`. */
function hasCssStyles(
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
): boolean {
  for (const member of classMembers(node)) {
    if (member.type === "PropertyDefinition") {
      if (!member.static || keyName(member.key) !== "styles") continue;
      if (member.value && subtreeUsesTaggedTemplate(member.value, ["css"])) {
        return true;
      }
    } else if (member.type === "MethodDefinition" && member.kind === "get") {
      if (!member.static || keyName(member.key) !== "styles") continue;
      const body = member.value.body;
      if (body && subtreeUsesTaggedTemplate(body, ["css"])) return true;
    }
  }
  return false;
}

/** The base class declared in the same module, if `name` resolves there. */
function baseClassInModule(
  node: Deno.lint.Node,
  name: string,
): Deno.lint.ClassDeclaration | null {
  let program: Deno.lint.Node | undefined = node;
  while (program && program.type !== "Program") {
    program = (program as { parent?: Deno.lint.Node }).parent;
  }
  if (!program || program.type !== "Program") return null;
  for (const statement of program.body) {
    const decl = statement.type === "ExportNamedDeclaration" &&
        statement.declaration
      ? statement.declaration
      : statement;
    if (decl.type === "ClassDeclaration" && decl.id?.name === name) return decl;
  }
  return null;
}

/**
 * Whether a class is a Lit component.
 *
 * Four same-file signals, any one of which is enough: it extends a Lit base
 * (`LitElement`/`ReactiveElement`, following the superclass chain within the
 * module), carries `@customElement`, has a `render()` returning an `html`/`svg`
 * template, or declares `static styles` built from `css`. A base imported from
 * another module cannot be followed — there is no cross-file resolution — so a
 * component whose only Lit-ness lives in an off-file base with none of the other
 * signals present is not seen.
 */
export function isLitComponent(
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
): boolean {
  return isLitComponentChain(node, new Set());
}

function isLitComponentChain(
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
  seen: Set<Deno.lint.Node>,
): boolean {
  if (seen.has(node)) return false;
  seen.add(node);

  const superClass = node.superClass;
  if (superClass) {
    const path = memberPath(superClass);
    const base = path === null ? null : (path.split(".").pop() ?? path);
    if (base !== null) {
      if (LIT_BASES.includes(base)) return true;
      const decl = baseClassInModule(node, base);
      if (decl && isLitComponentChain(decl, seen)) return true;
    }
  }

  if (findDecorator(classDecorators(node), "customElement") !== null) {
    return true;
  }
  if (rendersLitTemplate(node)) return true;
  return hasCssStyles(node);
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
