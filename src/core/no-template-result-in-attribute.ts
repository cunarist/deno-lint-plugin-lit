/**
 * `no-template-result-in-attribute`
 *
 * A `TemplateResult` is a description of DOM. Lit can only turn it into DOM in
 * child position; in attribute position the value is coerced to a string and
 * the attribute ends up as `[object Object]`.
 *
 * Property bindings are exempt — passing a `TemplateResult` as a property to a
 * component that renders it later is a normal pattern.
 */

import {
  isHtmlTemplate,
  parseTemplate,
  placeholderIndices,
  templateSource,
  walkElements,
} from "#helpers";
import type { ParsedElement } from "#helpers";

/** Sigils that mark a binding Lit resolves itself rather than as an attribute. */
const SIGILS = ".@?";

/**
 * Rejects a template bound into attribute position.
 */
export const noTemplateResultInAttribute: Deno.lint.Rule = {
  create(ctx) {
    return {
      TaggedTemplateExpression(node) {
        if (!isHtmlTemplate(node)) return;
        const source = templateSource(node);
        const expressions = node.quasi.expressions;
        const fragment = parseTemplate(source.text);

        walkElements(fragment, (element: ParsedElement) => {
          const locations = element.sourceCodeLocation?.attrs;
          if (!locations) return;

          for (const location of Object.values(locations)) {
            const raw = source.text.slice(
              location.startOffset,
              location.endOffset,
            );
            const equals = raw.indexOf("=");
            if (equals < 0) continue;
            const name = raw.slice(0, equals);
            if (SIGILS.includes(name[0] ?? "")) continue;

            for (const index of placeholderIndices(raw.slice(equals + 1))) {
              const expression = expressions[index];
              if (!expression) continue;
              if (expression.type !== "TaggedTemplateExpression") continue;
              if (!isHtmlTemplate(expression)) continue;
              ctx.report({
                node: expression,
                message:
                  `A template is bound to the \`${name}\` attribute of \`<${element.tagName.toLowerCase()}>\`.`,
                hint:
                  "Templates only render in child position; bind a string here, or move the template between the tags.",
              });
            }
          }
        });
      },
    };
  },
};
