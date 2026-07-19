/**
 * `no-object-attribute-binding`
 *
 * An attribute value is a string. Binding an object literal to one stringifies
 * it to `[object Object]`; an array literal becomes its comma-joined elements.
 * Neither is ever what was meant.
 *
 * Use a property binding (`.foo=${{…}}`) to pass structured data, or serialise
 * it deliberately before the template.
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

export const noObjectAttributeBinding: Deno.lint.Rule = {
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
              const kind = expression.type === "ObjectExpression"
                ? "An object"
                : expression.type === "ArrayExpression"
                ? "An array"
                : null;
              if (kind === null) continue;
              ctx.report({
                node: expression,
                message:
                  `${kind} literal is bound to the \`${name}\` attribute.`,
                hint:
                  `Attributes are strings — use the property binding \`.${name}=\` , or serialise the value first.`,
              });
            }
          }
        });
      },
    };
  },
};
