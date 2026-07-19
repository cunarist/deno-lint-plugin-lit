/**
 * `value-after-constraints`
 *
 * Lit applies bindings in source order. If a form control's value is set before
 * its validity constraints, the browser validates the value against the
 * constraints that were in force at the time — which is to say, none — and the
 * control can end up reporting the wrong validity. Put `value` last.
 */

import {
  isHtmlTemplate,
  parseTemplate,
  templateSource,
  walkElements,
} from "#helpers";
import type { ParsedElement } from "#helpers";

/** Elements with constraint validation. */
const FORM_CONTROLS: ReadonlySet<string> = new Set([
  "input",
  "select",
  "textarea",
]);

/** Attributes that constrain what counts as a valid value. */
const CONSTRAINTS: readonly string[] = [
  "min",
  "max",
  "step",
  "pattern",
  "maxlength",
  "minlength",
  "required",
];

/** The two spellings of a value binding. */
const VALUE_NAMES: readonly string[] = ["value", ".value"];

export const valueAfterConstraints: Deno.lint.Rule = {
  create(ctx) {
    return {
      TaggedTemplateExpression(node) {
        if (!isHtmlTemplate(node)) return;
        const source = templateSource(node);
        const fragment = parseTemplate(source.text);

        walkElements(fragment, (element: ParsedElement) => {
          if (!FORM_CONTROLS.has(element.tagName.toLowerCase())) return;
          const locations = element.sourceCodeLocation?.attrs;
          if (!locations) return;

          for (const valueName of VALUE_NAMES) {
            const value = locations[valueName];
            if (!value) continue;
            for (const constraint of CONSTRAINTS) {
              const other = locations[constraint] ??
                locations[`?${constraint}`] ?? locations[`.${constraint}`];
              if (!other) continue;
              if (other.startOffset < value.startOffset) continue;
              ctx.report({
                range: source.toSourceRange(
                  value.startOffset,
                  value.endOffset,
                ),
                message:
                  `\`${valueName}\` is set before the \`${constraint}\` constraint.`,
                hint:
                  "Move the value binding after every constraint attribute so validation sees them.",
              });
              return;
            }
          }
        });
      },
    };
  },
};
