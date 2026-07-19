/**
 * `no-partial-property-binding`
 *
 * A property, event or boolean binding must be the *entire* attribute value.
 * Lit cannot compose a value out of parts for these — there is nothing sensible
 * to concatenate a function or an object with — so it throws at render time:
 *
 * > Property, event, boolean and element bindings must consist of a single
 * > expression.
 *
 * Only plain attributes may interleave literal text with bindings.
 */

import {
  bindingPlaceholder,
  isHtmlTemplate,
  parseTemplate,
  placeholderIndices,
  templateSource,
  walkElements,
} from "#helpers";
import type { ParsedElement } from "#helpers";

/** Sigils whose binding must stand alone. */
const SIGILS = ".@?";

interface RawAttribute {
  readonly name: string;
  readonly value: string;
  readonly hasValue: boolean;
  readonly start: number;
  readonly end: number;
}

/**
 * Attributes with their *original* casing and quoting, in source order.
 *
 * parse5 lowercases attribute names and unescapes values, so neither the `attrs`
 * array nor the location keys can be used directly — the raw text is sliced back
 * out of the template instead.
 */
function rawAttributes(element: ParsedElement, text: string): RawAttribute[] {
  const locations = element.sourceCodeLocation?.attrs;
  if (!locations) return [];
  const attributes: RawAttribute[] = [];
  for (const location of Object.values(locations)) {
    const raw = text.slice(location.startOffset, location.endOffset);
    const equals = raw.indexOf("=");
    const name = equals < 0 ? raw : raw.slice(0, equals);
    let value = equals < 0 ? "" : raw.slice(equals + 1).trim();
    const quote = value[0];
    if (
      value.length >= 2 && (quote === '"' || quote === "'") &&
      value.endsWith(quote)
    ) {
      value = value.slice(1, -1);
    }
    attributes.push({
      name,
      value,
      hasValue: equals >= 0,
      start: location.startOffset,
      end: location.endOffset,
    });
  }
  attributes.sort((left, right) => left.start - right.start);
  return attributes;
}

/** Describe a sigil for the diagnostic message. */
function describe(sigil: string): string {
  if (sigil === "@") return "An event binding";
  if (sigil === "?") return "A boolean binding";
  return "A property binding";
}

/**
 * Rejects a property, event or boolean binding that is not the entire
 * attribute value.
 */
export const noPartialPropertyBinding: Deno.lint.Rule = {
  create(ctx) {
    return {
      TaggedTemplateExpression(node) {
        if (!isHtmlTemplate(node)) return;
        const source = templateSource(node);
        const fragment = parseTemplate(source.text);

        walkElements(fragment, (element: ParsedElement) => {
          const attributes = rawAttributes(element, source.text);

          for (let index = 0; index < attributes.length; index += 1) {
            const attribute = attributes[index];
            if (!attribute) continue;
            const sigil = attribute.name[0] ?? "";

            if (SIGILS.includes(sigil)) {
              if (!attribute.hasValue) continue;
              const indices = placeholderIndices(attribute.value);
              const only = indices.length === 1 && indices[0] !== undefined &&
                attribute.value === bindingPlaceholder(indices[0]);
              if (only) continue;
              // A static `.prop="hello"` is a legitimate literal assignment.
              if (indices.length === 0) continue;
              ctx.report({
                range: source.toSourceRange(attribute.start, attribute.end),
                message: `${
                  describe(sigil)
                } must be the whole attribute value.`,
                hint:
                  "Compute the value before the template and bind it as a single expression.",
              });
              continue;
            }

            // `.prop=${a} ${b}` — the unquoted value stops at the space, so the
            // trailing binding lands here as a valueless attribute of its own.
            if (attribute.hasValue || attribute.value.length > 0) continue;
            const stray = placeholderIndices(attribute.name);
            if (stray.length !== 1 || stray[0] === undefined) continue;
            if (attribute.name !== bindingPlaceholder(stray[0])) continue;
            const previous = attributes[index - 1];
            if (!previous) continue;
            const previousSigil = previous.name[0] ?? "";
            if (!SIGILS.includes(previousSigil)) continue;
            ctx.report({
              range: source.toSourceRange(previous.start, attribute.end),
              message: `${
                describe(previousSigil)
              } must be the whole attribute value.`,
              hint:
                "Compute the value before the template and bind it as a single expression.",
            });
          }
        });
      },
    };
  },
};
