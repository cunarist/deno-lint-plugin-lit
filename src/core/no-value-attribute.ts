/**
 * `no-value-attribute`
 *
 * On a form control, `value=${…}` sets the *attribute*, which browsers treat as
 * the control's default value only. Once the user has typed, the attribute no
 * longer drives what is displayed. Bind the property with `.value=${…}`.
 *
 * Only bound values are flagged: a static `value="5"` is a legitimate default.
 */

import {
  hasPlaceholder,
  isHtmlTemplate,
  parseTemplate,
  templateSource,
  walkElements,
} from "#helpers";
import type { ParsedElement } from "#helpers";

/** Elements whose `value` is live control state rather than plain markup. */
const FORM_CONTROLS: ReadonlySet<string> = new Set([
  "button",
  "data",
  "input",
  "li",
  "meter",
  "option",
  "output",
  "param",
  "progress",
  "select",
  "textarea",
]);

export const noValueAttribute: Deno.lint.Rule = {
  create(ctx) {
    return {
      TaggedTemplateExpression(node) {
        if (!isHtmlTemplate(node)) return;
        const source = templateSource(node);
        const fragment = parseTemplate(source.text);

        walkElements(fragment, (element: ParsedElement) => {
          if (!FORM_CONTROLS.has(element.tagName.toLowerCase())) return;
          const location = element.sourceCodeLocation?.attrs?.["value"];
          if (!location) return;
          const raw = source.text.slice(
            location.startOffset,
            location.endOffset,
          );
          if (!hasPlaceholder(raw)) return;
          ctx.report({
            range: source.toSourceRange(
              location.startOffset,
              location.endOffset,
            ),
            message:
              `Bound \`value\` attribute on \`<${element.tagName.toLowerCase()}>\`.`,
            hint: "Use the property binding `.value=${…}` instead.",
          });
        });
      },
    };
  },
};
