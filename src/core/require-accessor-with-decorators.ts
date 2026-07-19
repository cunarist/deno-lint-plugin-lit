/**
 * `require-accessor-with-decorators`
 *
 * Under standard (TC39) decorators, `@property` and `@state` can only install a
 * reactive accessor on a field declared with `accessor`. On a plain field the
 * decorator has nothing to wrap, so writes never request an update.
 *
 * This is only correct for a project on standard decorators. A lint rule cannot
 * read `tsconfig`, so it cannot tell — see the rule's docs.
 */

import {
  enclosingClass,
  isLitComponent,
  isReactiveProperty,
  keyName,
} from "#helpers";

/**
 * Reports a `@property` or `@state` decorator on a plain class field instead
 * of an `accessor` field.
 */
export const requireAccessorWithDecorators: Deno.lint.Rule = {
  create(ctx) {
    return {
      PropertyDefinition(node) {
        if (node.static) return;
        if (!isReactiveProperty(node)) return;
        const owner = enclosingClass(node);
        if (owner === null || !isLitComponent(owner)) return;
        const name = keyName(node.key) ?? "the field";
        ctx.report({
          node: node.key,
          message:
            `Reactive property \`${name}\` is a plain field, not an accessor.`,
          hint:
            "Declare it as `accessor` so the decorator can install a reactive accessor under standard decorators.",
        });
      },
    };
  },
};
