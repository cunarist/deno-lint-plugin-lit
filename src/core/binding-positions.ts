/**
 * `binding-positions`
 *
 * Bindings may not appear where Lit cannot bind: in a tag name, in a closing
 * tag, or as an attribute name.
 */

import { bindingPlaceholder, isHtmlTemplate, templateSource } from "#helpers";

const OPEN_TAG_BINDING = /<\s*\{\{__lit_(\d+)__\}\}/;
const CLOSE_TAG_BINDING = /<\/\s*\{\{__lit_(\d+)__\}\}/;
const ATTRIBUTE_NAME_BINDING = /<[a-zA-Z][^>]*?\s\{\{__lit_(\d+)__\}\}\s*=/;

/**
 * Rejects a `${…}` binding used as a tag name, in a closing tag, or as an
 * attribute name.
 */
export const bindingPositions: Deno.lint.Rule = {
  create(ctx) {
    return {
      TaggedTemplateExpression(node) {
        if (!isHtmlTemplate(node, ctx)) return;
        const source = templateSource(node);

        for (
          const [pattern, what] of [
            [CLOSE_TAG_BINDING, "a closing tag"],
            [OPEN_TAG_BINDING, "a tag name"],
            [ATTRIBUTE_NAME_BINDING, "an attribute name"],
          ] as const
        ) {
          const match = pattern.exec(source.text);
          if (!match || match.index === undefined) continue;
          const index = Number(match[1]);
          const placeholder = bindingPlaceholder(index);
          const start = source.text.indexOf(placeholder, match.index);
          if (start < 0) continue;
          ctx.report({
            range: source.toSourceRange(start, start + placeholder.length),
            message: `Binding used as ${what}.`,
            hint:
              "Lit can only bind attribute values, properties, events, and child content.",
          });
          return;
        }
      },
    };
  },
};
