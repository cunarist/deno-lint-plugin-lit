/**
 * `no-multiple-default-slots`
 *
 * Two or more unnamed `<slot>` elements in one template. Unassigned light-DOM
 * children all go to the *first* default slot; the rest never receive anything.
 *
 * A slot whose name is bound (`<slot name=${this.slot}>`) may or may not be a
 * default slot at runtime, so it is neither counted nor reported.
 */

import {
  hasPlaceholder,
  isHtmlTemplate,
  parseTemplate,
  templateSource,
  walkElements,
} from "#helpers";
import type { ParsedElement } from "#helpers";

/** Whether a slot is unambiguously the default slot. */
function isDefaultSlot(element: ParsedElement): boolean {
  for (const attr of element.attrs) {
    if (attr.name !== "name") continue;
    // A bound name is unknowable; treat it as "not provably default".
    if (hasPlaceholder(attr.value)) return false;
    return attr.value.length === 0;
  }
  return true;
}

/** Elements in document order — `walkElements` pops children in reverse. */
function inDocumentOrder(elements: readonly ParsedElement[]): ParsedElement[] {
  return [...elements].sort((a, b) =>
    (a.sourceCodeLocation?.startOffset ?? 0) -
    (b.sourceCodeLocation?.startOffset ?? 0)
  );
}

export const noMultipleDefaultSlots: Deno.lint.Rule = {
  create(ctx) {
    return {
      TaggedTemplateExpression(node) {
        if (!isHtmlTemplate(node)) return;
        const source = templateSource(node);
        if (!/<\s*slot[\s/>]/i.test(source.text)) return;

        const slots: ParsedElement[] = [];
        walkElements(parseTemplate(source.text), (element) => {
          if (element.tagName === "slot" && isDefaultSlot(element)) {
            slots.push(element);
          }
        });

        for (const slot of inDocumentOrder(slots).slice(1)) {
          const location = slot.sourceCodeLocation;
          if (!location) continue;
          const span = location.startTag ?? location;
          ctx.report({
            range: source.toSourceRange(span.startOffset, span.endOffset),
            message: "Second default `<slot>` in one template.",
            hint:
              "Only the first default slot receives content; give this one a `name`, or remove it.",
          });
        }
      },
    };
  },
};
