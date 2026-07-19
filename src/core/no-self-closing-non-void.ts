/**
 * `no-self-closing-non-void`
 *
 * HTML has no self-closing syntax. `<div />` is parsed as an ordinary start tag
 * and the `/` is discarded, so everything that follows becomes a child of the
 * element instead of a sibling. The mistake is invisible until the layout is
 * wrong.
 *
 * Void elements (`<br />`, `<img />`, …) already have no end tag, and foreign
 * content (SVG, MathML) genuinely supports self-closing syntax, so both are
 * left alone.
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

/** Elements that never have an end tag, where `/>` is harmless. */
const VOID_ELEMENTS: ReadonlySet<string> = new Set([
  "area",
  "base",
  "basefont",
  "br",
  "col",
  "embed",
  "frame",
  "hr",
  "img",
  "input",
  "keygen",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

/**
 * Whether a start tag really ends in a self-closing slash.
 *
 * An unquoted attribute value swallows a trailing `/` — `<div a=${x}/>` binds
 * the value `"…/"` and is *not* self-closing — so the slash only counts when it
 * sits past the end of every attribute.
 */
function isSelfClosing(element: ParsedElement, text: string): boolean {
  const startTag = element.sourceCodeLocation?.startTag;
  if (!startTag) return false;
  const slash = startTag.endOffset - 2;
  if (text[slash] !== "/") return false;
  for (
    const location of Object.values(element.sourceCodeLocation?.attrs ?? {})
  ) {
    if (location.endOffset > slash) return false;
  }
  return true;
}

export const noSelfClosingNonVoid: Deno.lint.Rule = {
  create(ctx) {
    return {
      TaggedTemplateExpression(node) {
        if (!isHtmlTemplate(node)) return;
        // An `svg` template is foreign content throughout, but parse5 parses it
        // as an HTML fragment and cannot know that.
        if (isTaggedWith(node, "svg")) return;
        const source = templateSource(node);
        const fragment = parseTemplate(source.text);

        walkElements(fragment, (element: ParsedElement) => {
          if (element.namespaceURI !== HTML_NAMESPACE) return;
          const tagName = element.tagName.toLowerCase();
          if (VOID_ELEMENTS.has(tagName)) return;
          if (!isSelfClosing(element, source.text)) return;
          const startTag = element.sourceCodeLocation?.startTag;
          if (!startTag) return;
          ctx.report({
            range: source.toSourceRange(
              startTag.startOffset,
              startTag.endOffset,
            ),
            message: `\`<${tagName} />\` is not self-closing in HTML.`,
            hint:
              `Write an explicit \`</${tagName}>\`; otherwise the rest of the template becomes its children.`,
          });
        });
      },
    };
  },
};
