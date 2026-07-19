/**
 * `no-controller-references`
 *
 * Controllers are siblings, not a graph. Each one talks to the host and to
 * nothing else. A controller that names, accepts, constructs, or forwards
 * another controller creates an ordering dependency the host cannot see.
 */

import {
  enclosingClass,
  isLitComponent,
  looksLikeReactiveController,
  memberPath,
} from "#helpers";

/**
 * Names ending in `Controller` that are not reactive controllers.
 *
 * Lit's own types are contracts rather than controllers, and the platform ships
 * several `*Controller` classes — `AbortController` above all — that a
 * controller legitimately owns. Without these exclusions the name heuristic
 * fires on `#abort: AbortController`, which is the exact resource-ownership
 * pattern these rules are meant to encourage.
 */
const ALLOWED_NAMES: readonly string[] = [
  "ReactiveController",
  "ReactiveControllerHost",
  "AbortController",
  "ReadableStreamDefaultController",
  "ReadableByteStreamController",
  "WritableStreamDefaultController",
  "TransformStreamDefaultController",
];

const HINT =
  "Route shared state through the host; controllers must not know about each other.";

/** A class in scope for the controller rules. */
function isControllerClass(
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
): boolean {
  return !isLitComponent(node) && looksLikeReactiveController(node);
}

/** Whether a name denotes some other controller. */
function isForeignControllerName(
  name: string | null,
  ownName: string | null,
): boolean {
  if (name === null || name === ownName) return false;
  if (ALLOWED_NAMES.includes(name)) return false;
  return name.endsWith("Controller");
}

/** Last segment of a dotted path, e.g. `this.#barController` -> `#barController`. */
function lastSegment(path: string): string {
  return path.split(".").pop() ?? path;
}

/** Whether an expression reads something named like another controller. */
function referencesController(node: Deno.lint.Node): boolean {
  if (node.type !== "Identifier" && node.type !== "MemberExpression") {
    return false;
  }
  const path = memberPath(node);
  if (path === null) return false;
  const segment = lastSegment(path).replace(/^#/, "");
  if (segment.length === 0) return false;
  const capitalized = segment.charAt(0).toUpperCase() + segment.slice(1);
  return isForeignControllerName(capitalized, null);
}

/**
 * Rejects a controller that names, constructs, accepts, or forwards another
 * reactive controller.
 */
export const noControllerReferences: Deno.lint.Rule = {
  create(ctx) {
    /** The controller class enclosing a node, or null. */
    function owningController(
      node: Deno.lint.Node,
    ): Deno.lint.ClassDeclaration | Deno.lint.ClassExpression | null {
      const owner = enclosingClass(node);
      if (owner === null || !isControllerClass(owner)) return null;
      return owner;
    }

    function checkArguments(
      node: Deno.lint.CallExpression | Deno.lint.NewExpression,
    ): void {
      if (owningController(node) === null) return;
      for (const argument of node.arguments) {
        if (argument.type === "SpreadElement") continue;
        if (!referencesController(argument)) continue;
        ctx.report({
          range: argument.range,
          message: "Reactive controller passes another controller along.",
          hint: HINT,
        });
        return;
      }
    }

    return {
      TSTypeReference(node) {
        const owner = owningController(node);
        if (owner === null) return;
        const name = memberPath(
          node.typeName as unknown as Deno.lint.Expression,
        );
        if (
          !isForeignControllerName(
            lastSegment(name ?? ""),
            owner.id?.name ?? null,
          )
        ) {
          return;
        }
        ctx.report({
          range: node.range,
          message: "Reactive controller names another controller type.",
          hint: HINT,
        });
      },
      NewExpression(node) {
        const owner = owningController(node);
        if (owner !== null) {
          const name = memberPath(node.callee);
          if (
            isForeignControllerName(
              lastSegment(name ?? ""),
              owner.id?.name ?? null,
            )
          ) {
            ctx.report({
              range: node.range,
              message: "Reactive controller constructs another controller.",
              hint: HINT,
            });
            return;
          }
        }
        checkArguments(node);
      },
      CallExpression: checkArguments,
    };
  },
};
