/**
 * `host-constructor`
 *
 * A reactive controller receives its host and nothing else. Its constructor
 * takes exactly one parameter, named `host`, typed `ReactiveControllerHost`.
 * Everything else the controller needs is handed to it later, by the host.
 */

import { isLitComponent, looksLikeReactiveController } from "#helpers";

/** A class in scope for the controller rules. */
function isControllerClass(
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
): boolean {
  return !isLitComponent(node) && looksLikeReactiveController(node);
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
      }
    }

    return {
      ClassDeclaration: check,
      ClassExpression: check,
    };
  },
};
