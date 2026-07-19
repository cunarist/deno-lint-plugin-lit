/**
 * `no-component-disposables`
 *
 * A component renders; it does not own resources. Anything with a lifetime —
 * an observer, a socket, a worker, a listener, a stream — must live in a
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

/** Whether a method name opens a long-lived stream, e.g. `streamFileWatch`. */
function isStreamMethod(name: string): boolean {
  return name.startsWith("stream") && name.length > "stream".length;
}

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
        if (!DISPOSABLE_METHODS.includes(name) && !isStreamMethod(name)) return;
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
