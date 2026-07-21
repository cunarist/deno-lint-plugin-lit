/**
 * `prefer-create-ref`
 *
 * A `ref` callback that only stashes the element into a field is a `createRef`
 * written the long way. `createRef()` holds the same reference with no method,
 * no `undefined`/`null` juggling, and `.value` reads it back by name.
 *
 * Only fires when the callback is provably a bare stash: its body is one
 * assignment of the callback's own parameter — optionally `?? null`,
 * `?? undefined`, `as T`, or `!` — to some target. A callback that does
 * anything more (registers a listener, reads other state) is left alone.
 *
 * The callback is resolved within the same file only. An inline arrow is read
 * directly; `ref(this.#store)` looks up the class member; a free identifier is
 * traced to its declaration. Anything ambiguous — reassigned, a parameter,
 * imported from another module — is passed over rather than guessed.
 */

import {
  enclosingClass,
  findMethod,
  findProperty,
  isSimpleReference,
} from "#helpers";

/** A callback the `ref` directive could receive. */
type Callback =
  | Deno.lint.ArrowFunctionExpression
  | Deno.lint.FunctionExpression
  | Deno.lint.FunctionDeclaration;

/** Name of a member access target, e.g. `#store` or `store`. */
function memberName(
  property: Deno.lint.MemberExpression["property"],
): string | null {
  if (property.type === "Identifier") return property.name;
  if (property.type === "PrivateIdentifier") return `#${property.name}`;
  return null;
}

/** Whether a node is `null` or `undefined`, the tail of a `?? …` normalise. */
function isNullish(node: Deno.lint.Expression): boolean {
  return (node.type === "Literal" && node.value === null) ||
    (node.type === "Identifier" && node.name === "undefined");
}

/** Strip `as T`, `!`, and `?? null` / `?? undefined` off an assignment RHS. */
function unwrapStash(expr: Deno.lint.Expression): Deno.lint.Expression {
  let current = expr;
  for (;;) {
    if (current.type === "TSAsExpression") {
      current = current.expression;
      continue;
    }
    if (current.type === "TSNonNullExpression") {
      current = current.expression;
      continue;
    }
    if (
      current.type === "LogicalExpression" && current.operator === "??" &&
      isNullish(current.right)
    ) {
      current = current.left;
      continue;
    }
    return current;
  }
}

/** The single assignment a callback's body reduces to, or null. */
function bodyAssignment(fn: Callback): Deno.lint.AssignmentExpression | null {
  const body = fn.body;
  if (body === null) return null;
  let expression: Deno.lint.Expression;
  if (body.type === "BlockStatement") {
    if (body.body.length !== 1) return null;
    const statement = body.body[0];
    if (!statement || statement.type !== "ExpressionStatement") return null;
    expression = statement.expression;
  } else {
    expression = body;
  }
  if (expression.type !== "AssignmentExpression") return null;
  if (expression.operator !== "=") return null;
  return expression;
}

/** Whether a callback does nothing but stash its own parameter. */
function isPureStash(fn: Callback): boolean {
  const param = fn.params[0];
  if (!param || param.type !== "Identifier") return false;
  const assignment = bodyAssignment(fn);
  if (assignment === null) return false;
  if (!isSimpleReference(assignment.left)) return false;
  const source = unwrapStash(assignment.right);
  return source.type === "Identifier" && source.name === param.name;
}

/** Whether a function binds `name` as a parameter, shadowing outer scopes. */
function bindsParam(fn: Callback, name: string): boolean {
  for (const param of fn.params) {
    if (param.type === "Identifier" && param.name === name) return true;
  }
  return false;
}

/**
 * The lone `const name = <fn>` or `function name` in a statement list, or
 * `null` when the name is declared here but not as a plain function (a `let`,
 * a reassignable binding, a redeclaration), or `undefined` when not declared
 * in this scope at all.
 */
function scanScope(
  statements: readonly Deno.lint.Node[],
  name: string,
): Callback | null | undefined {
  let match: Callback | null | undefined = undefined;
  let count = 0;
  for (const statement of statements) {
    const decl = statement.type === "ExportNamedDeclaration" &&
        statement.declaration
      ? statement.declaration
      : statement;
    if (decl.type === "FunctionDeclaration" && decl.id?.name === name) {
      count += 1;
      match = decl;
    } else if (decl.type === "VariableDeclaration") {
      for (const declarator of decl.declarations) {
        if (declarator.id.type !== "Identifier") continue;
        if (declarator.id.name !== name) continue;
        count += 1;
        const init = declarator.init;
        if (
          decl.kind === "const" && init &&
          (init.type === "ArrowFunctionExpression" ||
            init.type === "FunctionExpression")
        ) {
          match = init;
        } else {
          match = null;
        }
      }
    }
  }
  if (count === 0) return undefined;
  if (count > 1) return null;
  return match ?? null;
}

/** Trace a bare identifier to the function it names, in the same file only. */
function resolveIdentifier(
  start: Deno.lint.Node,
  name: string,
): Callback | null {
  let current: Deno.lint.Node | undefined = start;
  while (current) {
    if (
      current.type === "ArrowFunctionExpression" ||
      current.type === "FunctionExpression" ||
      current.type === "FunctionDeclaration"
    ) {
      if (bindsParam(current, name)) return null;
    }
    if (current.type === "BlockStatement" || current.type === "Program") {
      const found = scanScope(current.body, name);
      if (found !== undefined) return found;
    }
    current = (current as { parent?: Deno.lint.Node }).parent;
  }
  return null;
}

/** Resolve the `ref(...)` argument to a callback function, or null. */
function resolveCallback(
  arg: Deno.lint.Expression,
  call: Deno.lint.CallExpression,
): Callback | null {
  if (
    arg.type === "ArrowFunctionExpression" || arg.type === "FunctionExpression"
  ) {
    return arg;
  }
  if (arg.type === "MemberExpression") {
    if (arg.computed || arg.object.type !== "ThisExpression") return null;
    const name = memberName(arg.property);
    if (name === null) return null;
    const cls = enclosingClass(call);
    if (cls === null) return null;
    const method = findMethod(cls, name);
    if (method && method.kind === "method") {
      const value = method.value;
      if (value.type === "FunctionExpression") return value;
    }
    const property = findProperty(cls, name);
    const value = property?.value;
    if (
      value &&
      (value.type === "ArrowFunctionExpression" ||
        value.type === "FunctionExpression")
    ) {
      return value;
    }
    return null;
  }
  if (arg.type === "Identifier") return resolveIdentifier(call, arg.name);
  return null;
}

/**
 * Rejects a `ref` callback that only stashes the element, in favour of
 * `createRef`.
 */
export const preferCreateRef: Deno.lint.Rule = {
  create(ctx) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== "Identifier" || callee.name !== "ref") return;
        const arg = node.arguments[0];
        if (!arg || arg.type === "SpreadElement") return;
        const callback = resolveCallback(arg, node);
        if (callback === null || !isPureStash(callback)) return;
        ctx.report({
          node,
          message: "`ref` callback only stashes the element.",
          hint:
            "Use `createRef()` and read the element back through its `.value`.",
        });
      },
    };
  },
};
