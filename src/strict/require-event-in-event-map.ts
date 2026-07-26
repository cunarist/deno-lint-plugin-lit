/**
 * `require-event-in-event-map`
 *
 * An event a component constructs must have a matching `HTMLElementEventMap`
 * entry in the same file, so a listener registered for that name is typed.
 * Collected across the whole module and decided on `Program:exit`, because the
 * augmentation may sit either side of the class.
 */

import { enclosingClass, isLitComponent, memberPath } from "#helpers";

/** Event constructors whose first argument is the event name. */
const EVENT_CONSTRUCTORS: readonly string[] = [
  "Event",
  "CustomEvent",
];

/** An event name awaiting its event-map entry. */
interface Dispatch {
  readonly name: string;
  readonly node: Deno.lint.Node;
}

/** Structural view of the pieces of an event-map entry we read. */
interface EntryShape {
  readonly key?: { readonly type: string; readonly value?: unknown };
}

/** Last segment of a dotted path, e.g. `globalThis.Event` -> `Event`. */
function lastSegment(path: string | null): string | null {
  if (path === null) return null;
  return path.split(".").pop() ?? path;
}

/**
 * Rejects an event constructed inside a Lit component whose name has no
 * matching `HTMLElementEventMap` entry in the same file.
 */
export const requireEventInEventMap: Deno.lint.Rule = {
  create(ctx) {
    /** Every event name declared on `HTMLElementEventMap` in this file. */
    const declared = new Set<string>();
    const dispatches: Dispatch[] = [];

    return {
      TSInterfaceDeclaration(node) {
        if (node.id.name !== "HTMLElementEventMap") return;
        for (const member of node.body.body) {
          if (member.type !== "TSPropertySignature") continue;
          const key = (member as unknown as EntryShape).key;
          if (!key || key.type !== "Literal") continue;
          if (typeof key.value !== "string") continue;
          declared.add(key.value);
        }
      },
      NewExpression(node) {
        const constructor = lastSegment(memberPath(node.callee));
        if (constructor === null) return;
        if (!EVENT_CONSTRUCTORS.includes(constructor)) return;
        const owner = enclosingClass(node);
        if (owner === null || !isLitComponent(owner, ctx)) return;
        const first = node.arguments[0];
        if (!first || first.type !== "Literal") return;
        if (typeof first.value !== "string") return;
        dispatches.push({ name: first.value, node: first });
      },
      "Program:exit"() {
        for (const dispatch of dispatches) {
          if (declared.has(dispatch.name)) continue;
          ctx.report({
            node: dispatch.node,
            message: `No HTMLElementEventMap entry for "${dispatch.name}".`,
            hint:
              `Add \`declare global { interface HTMLElementEventMap { "${dispatch.name}": CustomEvent } }\` in this file so listeners for it are typed.`,
          });
        }
      },
    };
  },
};
