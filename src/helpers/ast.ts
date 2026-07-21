/**
 * Generic AST helpers.
 *
 * IMPORTANT: lint AST nodes expose their fields as prototype getters, so
 * `Object.keys(node)` returns an empty array. Never traverse generically with
 * `Object.keys`/`Object.values` — always access fields by name.
 */

/** A class member key, as typed by `MethodDefinition`/`PropertyDefinition`. */
export type MemberKey = Deno.lint.MethodDefinition["key"];

/** Any node that can appear in an expression position. */
export type ExpressionNode = Deno.lint.Expression | MemberKey;

/** A class member, as typed by `ClassBody`. */
export type ClassMember = Deno.lint.ClassBody["body"][number];

/** Any node reachable while walking up `parent` links. */
type WithParent = { readonly parent?: unknown };

/** Name of a key node (`Identifier`, `PrivateIdentifier`, or string literal). */
export function keyName(
  key: MemberKey | null | undefined,
): string | null {
  if (!key) return null;
  switch (key.type) {
    case "Identifier":
      return key.name;
    case "PrivateIdentifier":
      return `#${key.name}`;
    case "Literal":
      return typeof key.value === "string" ? key.value : null;
    default:
      return null;
  }
}

/** Dotted source text of a static member expression, e.g. `this.host.foo`. */
export function memberPath(node: ExpressionNode): string | null {
  switch (node.type) {
    case "Identifier":
      return node.name;
    case "PrivateIdentifier":
      return `#${node.name}`;
    case "ThisExpression":
      return "this";
    case "MemberExpression": {
      if (node.computed) return null;
      const object = memberPath(node.object);
      const property = memberPath(node.property);
      if (object === null || property === null) return null;
      return `${object}.${property}`;
    }
    default:
      return null;
  }
}

/**
 * Whether a node is a "simple" reference: an identifier, `this`, or a
 * non-computed member chain of any depth. Computed access is not simple.
 */
export function isSimpleReference(node: ExpressionNode): boolean {
  return memberPath(node) !== null;
}

/** The callee name of a call expression, e.g. `repeat` or `this.foo.bar`. */
export function calleeName(node: Deno.lint.CallExpression): string | null {
  return memberPath(node.callee);
}

/** Decorators attached to a class, method, or property, by name. */
export function decoratorNames(
  decorators: readonly Deno.lint.Decorator[],
): string[] {
  const names: string[] = [];
  for (const decorator of decorators) {
    const expression = decorator.expression;
    const source = expression.type === "CallExpression"
      ? memberPath(expression.callee)
      : memberPath(expression);
    if (source !== null) names.push(source);
  }
  return names;
}

/** Find a decorator by name on a class, method, or property. */
export function findDecorator(
  decorators: readonly Deno.lint.Decorator[],
  name: string,
): Deno.lint.Decorator | null {
  for (const decorator of decorators) {
    const expression = decorator.expression;
    const source = expression.type === "CallExpression"
      ? memberPath(expression.callee)
      : memberPath(expression);
    if (source === name) return decorator;
  }
  return null;
}

/**
 * Decorators on a class.
 *
 * `ClassDeclaration.decorators` exists at runtime but is absent from Deno's
 * published typings, so it is read through a narrow cast. Verified against
 * Deno 2.9.3; drop the cast if the typings catch up.
 */
export function classDecorators(
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
): readonly Deno.lint.Decorator[] {
  const bag = node as unknown as { decorators?: Deno.lint.Decorator[] };
  return bag.decorators ?? [];
}

/** Nearest enclosing class body, or null if the node is not inside a class. */
export function enclosingClass(
  node: Deno.lint.Node,
): Deno.lint.ClassDeclaration | Deno.lint.ClassExpression | null {
  let current: Deno.lint.Node | undefined = node;
  while (current) {
    if (
      current.type === "ClassDeclaration" || current.type === "ClassExpression"
    ) {
      return current;
    }
    current = (current as WithParent).parent as Deno.lint.Node | undefined;
  }
  return null;
}

/**
 * Nearest enclosing method definition, or null. Used to answer "are we inside
 * `render()`?" without a manual stack.
 */
export function enclosingMethod(
  node: Deno.lint.Node,
): Deno.lint.MethodDefinition | null {
  let current: Deno.lint.Node | undefined = node;
  while (current) {
    if (current.type === "MethodDefinition") return current;
    if (
      current.type === "ClassDeclaration" || current.type === "ClassExpression"
    ) {
      return null;
    }
    current = (current as WithParent).parent as Deno.lint.Node | undefined;
  }
  return null;
}

/** Whether `node` sits inside a method with the given name. */
export function isInsideMethod(node: Deno.lint.Node, name: string): boolean {
  const method = enclosingMethod(node);
  return method !== null && keyName(method.key) === name;
}

/** Class members, with `export class X` wrappers already unwrapped by Deno. */
export function classMembers(
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
): readonly ClassMember[] {
  return node.body.body;
}

/** Find a named method on a class. */
export function findMethod(
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
  name: string,
): Deno.lint.MethodDefinition | null {
  for (const member of classMembers(node)) {
    if (member.type !== "MethodDefinition") continue;
    if (keyName(member.key) === name) return member;
  }
  return null;
}

/** Find a named property on a class. */
export function findProperty(
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
  name: string,
): Deno.lint.PropertyDefinition | null {
  for (const member of classMembers(node)) {
    if (member.type !== "PropertyDefinition") continue;
    if (keyName(member.key) === name) return member;
  }
  return null;
}

/** The constructor of a class, if it defines one. */
export function findConstructor(
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
): Deno.lint.MethodDefinition | null {
  for (const member of classMembers(node)) {
    if (member.type === "MethodDefinition" && member.kind === "constructor") {
      return member;
    }
  }
  return null;
}

/** Name of the type in a `: SomeType` annotation, if it is a plain reference. */
export function typeReferenceName(
  annotation: Deno.lint.TSTypeAnnotation | undefined | null,
): string | null {
  const inner = annotation?.typeAnnotation;
  if (!inner || inner.type !== "TSTypeReference") return null;
  const name = inner.typeName as unknown as {
    readonly type: string;
    readonly name?: string;
    readonly right?: { readonly name?: string };
  };
  if (name.type === "Identifier") return name.name ?? null;
  if (name.type === "TSQualifiedName") return name.right?.name ?? null;
  return null;
}

/** Convert `PathBar` to `path-bar`. */
export function pascalToKebab(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

/** Convert `path-bar` to `PathBar`. */
export function kebabToPascal(name: string): string {
  return name
    .split("-")
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}
