/**
 * `no-jsx-attribute-names`
 *
 * `className` and `htmlFor` are the JSX spellings of the `class` and `for`
 * attributes. In a Lit template the markup is real HTML, so they are set as
 * attributes of those literal names and have no effect at all.
 *
 * Only the plain attribute form is flagged. `.className=${…}` and
 * `.htmlFor=${…}` are property bindings to real DOM properties and work fine.
 */

import {
  isHtmlTemplate,
  parseTemplate,
  templateSource,
  walkElements,
} from "#helpers";
import type { ParsedElement } from "#helpers";

/** JSX attribute name to its HTML equivalent. */
const JSX_NAMES: ReadonlyMap<string, string> = new Map([
  ["classname", "class"],
  ["htmlfor", "for"],
]);

/**
 * Rejects the JSX attribute names `className` and `htmlFor` in a template.
 */
export const noJsxAttributeNames: Deno.lint.Rule = {
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
            const replacement = JSX_NAMES.get(key);
            if (replacement === undefined) continue;
            const raw = source.text.slice(
              location.startOffset,
              location.endOffset,
            );
            const equals = raw.indexOf("=");
            const name = equals < 0 ? raw : raw.slice(0, equals);
            ctx.report({
              range: source.toSourceRange(
                location.startOffset,
                location.startOffset + name.length,
              ),
              message: `\`${name}\` is a JSX attribute name, not an HTML one.`,
              hint: `Use \`${replacement}\` instead.`,
            });
          }
        });
      },
    };
  },
};
