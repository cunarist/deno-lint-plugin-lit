/**
 * `svg-template-for-svg-content`
 *
 * SVG-only elements written directly in an `html` template, with no enclosing
 * `<svg>` in the same template.
 *
 * Lit creates a template's nodes by parsing it in the HTML namespace. A bare
 * `<path>` or `<circle>` there becomes an *HTML* element named `path`, not an
 * SVG one — it lands in the DOM and renders nothing at all. The fix is the
 * `` svg`…` `` tag, which parses in the SVG namespace.
 *
 * A complete `<svg>…</svg>` inside `html` is fine: the parser switches
 * namespace at the `<svg>` start tag, so its children are created correctly.
 * Only unwrapped fragments are reported.
 */

import {
  isElement,
  isTaggedWith,
  parseTemplate,
  templateSource,
} from "#helpers";
import type { ParsedElement, ParsedNode } from "#helpers";

/**
 * Elements that exist only in the SVG namespace. Lowercased, because parse5
 * lowercases tag names while in the HTML namespace — which is exactly the
 * situation this rule detects. Names shared with HTML (`title`, `a`, `style`,
 * `script`, `image`) are deliberately absent: they are legal in an `html`
 * template on their own terms.
 */
const SVG_ONLY_ELEMENTS: ReadonlySet<string> = new Set([
  "animate",
  "animatemotion",
  "animatetransform",
  "circle",
  "clippath",
  "defs",
  "desc",
  "ellipse",
  "feblend",
  "fecolormatrix",
  "fegaussianblur",
  "femerge",
  "feoffset",
  "filter",
  "foreignobject",
  "g",
  "line",
  "lineargradient",
  "marker",
  "mask",
  "path",
  "pattern",
  "polygon",
  "polyline",
  "radialgradient",
  "rect",
  "stop",
  "symbol",
  "text",
  "textpath",
  "tspan",
  "use",
  "view",
]);

export const svgTemplateForSvgContent: Deno.lint.Rule = {
  create(ctx) {
    return {
      TaggedTemplateExpression(node) {
        // `svg` templates are the fix, not the problem; `isHtmlTemplate` would
        // match those too.
        if (!isTaggedWith(node, "html")) return;
        const source = templateSource(node);

        const report = (element: ParsedElement): void => {
          const location = element.sourceCodeLocation;
          if (!location) return;
          const span = location.startTag ?? location;
          ctx.report({
            range: source.toSourceRange(span.startOffset, span.endOffset),
            message:
              `SVG element \`<${element.tagName}>\` in an \`html\` template.`,
            hint:
              "Wrap it in an `<svg>` element, or move it into an `svg` template — Lit creates it in the HTML namespace otherwise and it never renders.",
          });
        };

        // Ancestry matters, so this walks manually rather than through
        // `walkElements`: descending into an `<svg>` means everything below is
        // already in the right namespace.
        const visit = (nodes: readonly ParsedNode[]): void => {
          for (const child of nodes) {
            if (!isElement(child)) continue;
            const tagName = child.tagName.toLowerCase();
            if (tagName === "svg") continue;
            if (SVG_ONLY_ELEMENTS.has(tagName)) report(child);
            if (child.childNodes) visit(child.childNodes);
          }
        };
        visit(parseTemplate(source.text).childNodes);
      },
    };
  },
};
