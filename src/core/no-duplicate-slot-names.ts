/**
 * `no-duplicate-slot-names`
 *
 * Two `<slot name="x">` elements with the same name in one template. Slot
 * assignment matches light-DOM children against the *first* slot of a given
 * name; every later slot with that name stays permanently empty.
 *
 * A name that is bound (`<slot name=${this.slot}>`) is unknowable statically and
 * is skipped rather than guessed at.
 */

import {
  hasPlaceholder,
  isHtmlTemplate,
  parseTemplate,
  templateSource,
  walkElements,
} from "#helpers";
import type { ParsedElement } from "#helpers";

/** The literal `name` attribute of a slot, or null when absent or bound. */
function slotName(element: ParsedElement): string | null {
  for (const attr of element.attrs) {
    if (attr.name !== "name") continue;
    if (hasPlaceholder(attr.value)) return null;
    return attr.value;
  }
  return null;
}

/** Elements in document order — `walkElements` pops children in reverse. */
function inDocumentOrder(elements: readonly ParsedElement[]): ParsedElement[] {
  return [...elements].sort((a, b) =>
    (a.sourceCodeLocation?.startOffset ?? 0) -
    (b.sourceCodeLocation?.startOffset ?? 0)
  );
}

/**
 * Rejects two `<slot>` elements with the same `name` in one template.
 */
export const noDuplicateSlotNames: Deno.lint.Rule = {
  create(ctx) {
    return {
      TaggedTemplateExpression(node) {
        if (!isHtmlTemplate(node)) return;
        const source = templateSource(node);
        if (!/<\s*slot[\s/>]/i.test(source.text)) return;

        const slots: ParsedElement[] = [];
        walkElements(parseTemplate(source.text), (element) => {
          if (element.tagName === "slot") slots.push(element);
        });

        const seen = new Set<string>();
        for (const slot of inDocumentOrder(slots)) {
          const name = slotName(slot);
          if (name === null || name.length === 0) continue;
          if (!seen.has(name)) {
            seen.add(name);
            continue;
          }
          const location = slot.sourceCodeLocation;
          if (!location) continue;
          const span = location.attrs?.["name"] ?? location.startTag ??
            location;
          ctx.report({
            range: source.toSourceRange(span.startOffset, span.endOffset),
            message: `Duplicate slot name \`${name}\`.`,
            hint:
              "Only the first slot with a given name receives content; rename or remove this one.",
          });
        }
      },
    };
  },
};
