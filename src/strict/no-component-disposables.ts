/**
 * `no-component-disposables`
 *
 * A component renders; it does not own resources. Anything with a lifetime —
 * an observer, a socket, a worker, a listener — must live in a
 * `ReactiveController` that releases it in `hostDisconnected`, so acquisition
 * and release sit in one file.
 */

import { enclosingClass, isLitComponent, memberPath } from "#helpers";

/** Constructors that hand back something needing an explicit release. */
const DISPOSABLE_CONSTRUCTORS: readonly string[] = [
  "AbortController",
  "EventSource",
  "IntersectionObserver",
  "MutationObserver",
  "ResizeObserver",
  "WebSocket",
  "Worker",
];

/** Methods that acquire or release a resource. */
const DISPOSABLE_METHODS: readonly string[] = [
  "addEventListener",
  "removeEventListener",
  "destroy",
  "disconnect",
  "dispose",
];

const HINT =
  "Delegate to a ReactiveController that acquires the resource in `hostConnected` and releases it in `hostDisconnected`.";

/** Whether the node sits inside a Lit component class body. */
function inLitComponent(node: Deno.lint.Node): boolean {
  const owner = enclosingClass(node);
  return owner !== null && isLitComponent(owner);
}

/** Last segment of a dotted path, e.g. `globalThis.Worker` -> `Worker`. */
function lastSegment(path: string | null): string | null {
  if (path === null) return null;
  return path.split(".").pop() ?? path;
}

/**
 * Rejects constructing `AbortController`, `EventSource`,
 * `IntersectionObserver`, `MutationObserver`, `ResizeObserver`, `WebSocket`,
 * or `Worker` inside a Lit component, and rejects calling
 * `addEventListener`, `removeEventListener`, `destroy`, `disconnect`,
 * or `dispose` there.
 */
export const noComponentDisposables: Deno.lint.Rule = {
  create(ctx) {
    return {
      NewExpression(node) {
        const name = lastSegment(memberPath(node.callee));
        if (name === null || !DISPOSABLE_CONSTRUCTORS.includes(name)) return;
        if (!inLitComponent(node)) return;
        ctx.report({
          node: node.callee,
          message: `Lit component constructs \`${name}\`.`,
          hint: HINT,
        });
      },
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== "MemberExpression" || callee.computed) return;
        const property = callee.property;
        if (property.type !== "Identifier") return;
        const name = property.name;
        if (!DISPOSABLE_METHODS.includes(name)) return;
        if (!inLitComponent(node)) return;
        ctx.report({
          node: callee,
          message: `Lit component calls \`${name}\`.`,
          hint: HINT,
        });
      },
    };
  },
};
