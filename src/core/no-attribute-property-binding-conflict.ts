/**
 * `no-attribute-property-binding-conflict`
 *
 * Binding the same name both ways on one element — `<x-y foo=${a} .foo=${b}>` —
 * sets the attribute and the property from two different sources. For a
 * reactive property the attribute also feeds the property, so the two race and
 * whichever Lit commits last wins. The result is order-dependent and changes
 * when the bindings are reordered.
 */

import {
  isHtmlTemplate,
  parseTemplate,
  templateSource,
  walkElements,
} from "#helpers";
import type { ParsedElement } from "#helpers";

/**
 * Rejects the same name bound as both an attribute and a property on one
 * element.
 */
export const noAttributePropertyBindingConflict: Deno.lint.Rule = {
  create(ctx) {
    return {
      TaggedTemplateExpression(node) {
        if (!isHtmlTemplate(node)) return;
        const source = templateSource(node);
        const fragment = parseTemplate(source.text);

        walkElements(fragment, (element: ParsedElement) => {
          const locations = element.sourceCodeLocation?.attrs;
          if (!locations) return;

          for (const [key, location] of Object.entries(locations)) {
            if (!key.startsWith(".")) continue;
            const bare = key.slice(1);
            if (bare.length === 0) continue;
            const other = locations[bare];
            if (!other) continue;
            // Report whichever binding comes second, as the duplicate.
            const later = location.startOffset > other.startOffset
              ? location
              : other;
            const laterName = later === location ? key : bare;
            ctx.report({
              range: source.toSourceRange(
                later.startOffset,
                later.startOffset + laterName.length,
              ),
              message:
                `\`${bare}\` is bound as both an attribute and a property.`,
              hint:
                `Keep one — \`.${bare}=\` for the property, or \`${bare}=\` for the attribute.`,
            });
          }
        });
      },
    };
  },
};
