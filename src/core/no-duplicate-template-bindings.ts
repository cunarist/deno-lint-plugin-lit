/**
 * `no-duplicate-template-bindings`
 *
 * The same attribute, property, boolean or event binding must not appear twice
 * on one element. The four sigils are separate namespaces — `foo`, `.foo`,
 * `?foo` and `@foo` may coexist — but a repeat within a namespace is silently
 * dropped by the parser, so it is always a bug.
 *
 * parse5 already reports this as a `duplicate-attribute` parse error, and the
 * sigil is part of the attribute name, so its namespacing falls out for free.
 */

import { parseFragment } from "npm:parse5@^8.0.1";

import { isHtmlTemplate, templateSource } from "#helpers";

/** Characters that terminate an attribute name. */
const NAME_END = /[\s/>=]/;

/**
 * parse5 reports the duplicate at the offset just past the repeated attribute
 * name — the `=` or the whitespace that terminated it — so the name is read
 * backwards from there.
 */
function nameEndingAt(text: string, offset: number): [number, number] {
  let start = offset;
  while (start > 0 && !NAME_END.test(text[start - 1] ?? " ")) start -= 1;
  return [start, offset];
}

/** Describe a binding by its sigil, for the diagnostic message. */
function describe(name: string): string {
  switch (name[0]) {
    case ".":
      return `Property \`${name}\``;
    case "?":
      return `Boolean attribute \`${name}\``;
    case "@":
      return `Event listener \`${name}\``;
    default:
      return `Attribute \`${name}\``;
  }
}

export const noDuplicateTemplateBindings: Deno.lint.Rule = {
  create(ctx) {
    return {
      TaggedTemplateExpression(node) {
        if (!isHtmlTemplate(node)) return;
        const source = templateSource(node);

        parseFragment(source.text, {
          sourceCodeLocationInfo: true,
          onParseError: (error) => {
            if (error.code !== "duplicate-attribute") return;
            const [start, end] = nameEndingAt(source.text, error.startOffset);
            const name = source.text.slice(start, end);
            if (name.length === 0) return;
            ctx.report({
              range: source.toSourceRange(start, end),
              message: `${describe(name)} is bound more than once.`,
              hint:
                "Remove the duplicate; only the first binding takes effect.",
            });
          },
        });
      },
    };
  },
};
