/**
 * `no-camelcase-attribute`
 *
 * The HTML parser lowercases every attribute name, so `<x-y myProp=${v}>` sets
 * an attribute called `myprop`. A component that declares `myProp` never sees
 * it, and the binding silently does nothing. Kebab-case is the fix, so snake_case
 * (`my_prop`) is rejected too — it is not an attribute style anyone reaches for.
 *
 * Only plain attributes are checked. `.myProp=`, `@myEvent=` and `?myFlag=` are
 * handled by Lit itself, not by the HTML parser, and stay case-sensitive.
 * Foreign content is skipped too — SVG really does have `viewBox` and friends.
 */

import {
  isHtmlTemplate,
  isTaggedWith,
  parseTemplate,
  templateSource,
  walkElements,
} from "#helpers";
import type { ParsedElement } from "#helpers";

/** The HTML namespace; anything else is foreign content. */
const HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";

/** Sigils that mark a binding Lit resolves itself. */
const SIGILS = ".@?";

/** Owned by `no-jsx-attribute-names`, which gives a better message. */
const JSX_NAMES: ReadonlySet<string> = new Set(["classname", "htmlfor"]);

/**
 * Rejects an attribute name that is not kebab-case — one with uppercase
 * letters or an underscore.
 */
export const noCamelcaseAttribute: Deno.lint.Rule = {
  create(ctx) {
    return {
      TaggedTemplateExpression(node) {
        if (!isHtmlTemplate(node, ctx)) return;
        // An `svg` template is foreign content throughout, but parse5 parses it
        // as an HTML fragment and cannot know that.
        if (isTaggedWith(node, "svg", ctx)) return;
        const source = templateSource(node);
        const fragment = parseTemplate(source.text);

        walkElements(fragment, (element: ParsedElement) => {
          if (element.namespaceURI !== HTML_NAMESPACE) return;
          const locations = element.sourceCodeLocation?.attrs;
          if (!locations) return;

          for (const location of Object.values(locations)) {
            const raw = source.text.slice(
              location.startOffset,
              location.endOffset,
            );
            const equals = raw.indexOf("=");
            const name = equals < 0 ? raw : raw.slice(0, equals);
            if (name.length === 0) continue;
            if (SIGILS.includes(name[0] ?? "")) continue;
            if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) continue;
            const hasUppercase = name !== name.toLowerCase();
            const hasUnderscore = name.includes("_");
            if (!hasUppercase && !hasUnderscore) continue;
            if (hasUppercase && JSX_NAMES.has(name.toLowerCase())) continue;
            const range = source.toSourceRange(
              location.startOffset,
              location.startOffset + name.length,
            );
            if (hasUppercase) {
              ctx.report({
                range,
                message: `Attribute \`${name}\` has uppercase letters.`,
                hint:
                  `HTML lowercases attribute names — write \`${name.toLowerCase()}\`, or bind the property with \`.${name}=\`.`,
              });
            } else {
              const kebab = name.replace(/_/g, "-");
              ctx.report({
                range,
                message: `Attribute \`${name}\` uses snake_case.`,
                hint: `Attribute names are kebab-case — write \`${kebab}\`.`,
              });
            }
          }
        });
      },
    };
  },
};
