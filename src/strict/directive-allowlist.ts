/**
 * `directive-allowlist`
 *
 * Only `ref` and `repeat` may be imported from `lit/directives/*`. Every other
 * directive hides control flow or state inside the template.
 *
 * This governs which directives may be *imported*. It does not grant an
 * imported directive a place inside a template — `simple-template-expressions`
 * still requires `repeat(...)` to be hoisted out of the `` html`` ``.
 */

/** Directive modules a component may import. */
const ALLOWED_DIRECTIVES: readonly string[] = [
  "lit/directives/ref.js",
  "lit/directives/repeat.js",
];

/** Matches any Lit directive module specifier. */
const DIRECTIVE_SOURCE = /^(?:lit|lit-html|lit-element)\/directives\//;

export const directiveAllowlist: Deno.lint.Rule = {
  create(ctx) {
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source !== "string") return;
        if (!DIRECTIVE_SOURCE.test(source)) return;
        if (ALLOWED_DIRECTIVES.includes(source)) return;
        ctx.report({
          node: node.source,
          message: `Directive module "${source}" is not allowed.`,
          hint:
            "Only `lit/directives/ref.js` and `lit/directives/repeat.js` may be imported. Compute the value before the template instead.",
        });
      },
    };
  },
};
