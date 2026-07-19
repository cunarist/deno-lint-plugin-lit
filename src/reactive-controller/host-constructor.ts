/**
 * `host-constructor`
 *
 * A reactive controller receives its host and nothing else. Its constructor
 * takes exactly one parameter, named `host`, typed `ReactiveControllerHost`.
 * Everything else the controller needs is handed to it later, by the host.
 */

import { isLitComponent, isReactiveController, memberPath } from "#helpers";

/** A class in scope for the controller rules. */
function isControllerClass(
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
): boolean {
  return !isLitComponent(node) && isReactiveController(node);
}

/** The constructor of a class, if it defines one. */
function findConstructor(
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
): Deno.lint.MethodDefinition | null {
  for (const member of node.body.body) {
    if (member.type === "MethodDefinition" && member.kind === "constructor") {
      return member;
    }
  }
  return null;
}

/** Name of the type in a `: SomeType` annotation, if it is a plain reference. */
function typeReferenceName(
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

/**
 * Where the constructor stores its host parameter, if it stores it at all.
 *
 * The parameter is followed to its assignment rather than assumed to land in a
 * field of a particular name — that is the point of the check. The sibling
 * rules then read `this.#host` knowing this rule enforced it.
 */
function storageTarget(
  constructor: Deno.lint.MethodDefinition,
  paramName: string,
): { node: Deno.lint.Node; path: string } | null {
  const body = constructor.value.body;
  if (!body) return null;
  for (const statement of body.body) {
    if (statement.type !== "ExpressionStatement") continue;
    const expression = statement.expression;
    if (expression.type !== "AssignmentExpression") continue;
    if (expression.operator !== "=") continue;
    if (expression.right.type !== "Identifier") continue;
    if (expression.right.name !== paramName) continue;
    const path = memberPath(expression.left);
    if (path === null) continue;
    return { node: expression.left, path };
  }
  return null;
}

/**
 * Source span of a parameter including its type annotation — `param.range`
 * covers only the binding name.
 */
function paramRange(param: Deno.lint.Parameter): Deno.lint.Range {
  const annotated = param as unknown as {
    readonly typeAnnotation?: { readonly range: Deno.lint.Range };
  };
  const end = annotated.typeAnnotation?.range[1] ?? param.range[1];
  return [param.range[0], Math.max(end, param.range[1])];
}

const HINT = "Write `constructor(host: ReactiveControllerHost)`.";

/**
 * Rejects a controller constructor that is not exactly `constructor(host:
 * ReactiveControllerHost)`.
 */
export const hostConstructor: Deno.lint.Rule = {
  create(ctx) {
    function check(
      node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
    ): void {
      if (!isControllerClass(node)) return;
      const constructor = findConstructor(node);
      if (constructor === null) {
        ctx.report({
          range: node.id?.range ?? node.range,
          message: "Reactive controller defines no constructor.",
          hint: HINT,
        });
        return;
      }

      const params = constructor.value.params;
      if (params.length !== 1) {
        const first = params[0];
        const last = params[params.length - 1];
        ctx.report({
          range: first && last
            ? [paramRange(first)[0], paramRange(last)[1]]
            : constructor.key.range,
          message:
            `Reactive controller constructor takes ${params.length} parameters.`,
          hint: HINT,
        });
        return;
      }

      const param = params[0];
      if (!param) return;
      if (param.type !== "Identifier" || param.name !== "host") {
        ctx.report({
          range: paramRange(param),
          message: "Reactive controller constructor parameter is not `host`.",
          hint: HINT,
        });
        return;
      }
      if (param.optional === true) {
        ctx.report({
          range: paramRange(param),
          message: "Reactive controller host parameter is optional.",
          hint: HINT,
        });
        return;
      }
      if (
        typeReferenceName(param.typeAnnotation) !== "ReactiveControllerHost"
      ) {
        ctx.report({
          range: paramRange(param),
          message:
            "Reactive controller host parameter is not typed `ReactiveControllerHost`.",
          hint: HINT,
        });
        return;
      }

      const stored = storageTarget(constructor, param.name);
      if (stored !== null && stored.path !== "this.#host") {
        ctx.report({
          node: stored.node,
          message: `Host is stored as \`${stored.path}\`, not \`this.#host\`.`,
          hint:
            "Sibling rules read the host through `this.#host`. Under any other name they cannot see it, and stop checking this controller.",
        });
      }
    }

    return {
      ClassDeclaration: check,
      ClassExpression: check,
    };
  },
};
