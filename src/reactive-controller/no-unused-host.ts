/**
 * `no-unused-host`
 *
 * Keeping a reference to the host implies the controller pushes updates to it.
 * A stored `#host` that is never read is dead weight that suggests a
 * relationship which does not exist — register with the host and let it go.
 */

import {
  enclosingClass,
  isLitComponent,
  keyName,
  looksLikeReactiveController,
  memberPath,
} from "#helpers";

/** How the host is stored, and where to point when it goes unused. */
interface HostStore {
  readonly range: Deno.lint.Range;
  readonly name: string;
  used: boolean;
}

/** A class in scope for the controller rules. */
function isControllerClass(
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
): boolean {
  return !isLitComponent(node) && looksLikeReactiveController(node);
}

/** Whether a member expression reads `this.host` or `this.#host`. */
function hostMemberName(node: Deno.lint.MemberExpression): string | null {
  if (node.computed || node.object.type !== "ThisExpression") return null;
  const name = memberPath(node.property);
  return name === "host" || name === "#host" ? name : null;
}

/** Whether a node is the assignment target of `<node> = …`. */
function isAssignmentTarget(node: Deno.lint.MemberExpression): boolean {
  const parent = (node as { parent?: Deno.lint.Node }).parent;
  if (!parent || parent.type !== "AssignmentExpression") return false;
  if (parent.operator !== "=") return false;
  return parent.left.range[0] === node.range[0] &&
    parent.left.range[1] === node.range[1];
}

export const noUnusedHost: Deno.lint.Rule = {
  create(ctx) {
    const stores = new Map<number, HostStore>();

    function enter(
      node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
    ): void {
      if (!isControllerClass(node)) return;
      for (const member of node.body.body) {
        if (member.type !== "PropertyDefinition" || member.static) continue;
        const name = keyName(member.key);
        if (name !== "host" && name !== "#host") continue;
        stores.set(node.range[0], {
          range: member.key.range,
          name,
          used: false,
        });
        return;
      }
    }

    function exit(
      node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
    ): void {
      const store = stores.get(node.range[0]);
      if (!store || store.used) return;
      ctx.report({
        range: store.range,
        message: `Reactive controller stores ${store.name} but never reads it.`,
        hint:
          "Drop the field and just call `host.addController(this)`; store the host only when the controller pushes updates to it.",
      });
    }

    return {
      ClassDeclaration: enter,
      ClassExpression: enter,
      MemberExpression(node) {
        if (hostMemberName(node) === null) return;
        if (isAssignmentTarget(node)) return;
        const owner = enclosingClass(node);
        if (owner === null) return;
        const store = stores.get(owner.range[0]);
        if (store) store.used = true;
      },
      "ClassDeclaration:exit": exit,
      "ClassExpression:exit": exit,
    };
  },
};
