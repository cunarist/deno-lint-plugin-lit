/**
 * `attribute-value-entities`
 *
 * Characters that are significant to the HTML parser must be written as
 * entities inside attribute values: `&`, `<`, `>` and `"`.
 *
 * Bindings are excluded — a `${…}` is substituted for a placeholder before
 * parsing, so expression text is never scanned.
 */

import {
  isHtmlTemplate,
  parseTemplate,
  templateSource,
  walkElements,
} from "#helpers";
import type { ParsedElement } from "#helpers";

/** A bare `&` that does not start a character reference. */
const OFFENDERS = /[<>"]|&(?!(?:#\d+|#[xX][\da-fA-F]+|[a-zA-Z][a-zA-Z\d]*);)/g;

const REPLACEMENTS: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};

/** Blank out binding placeholders, preserving offsets. */
function maskPlaceholders(text: string): string {
  return text.replace(
    /\{\{__lit_\d+__\}\}/g,
    (match) => " ".repeat(match.length),
  );
}

interface AttributeValue {
  /** Offset of the first character of the value in the template text. */
  readonly start: number;
  /** Offset just past the last character of the value. */
  readonly end: number;
}

/**
 * Locate the raw value of an attribute inside its `name="value"` span. Returns
 * null for a valueless attribute.
 */
function attributeValue(
  text: string,
  start: number,
  end: number,
): AttributeValue | null {
  const raw = text.slice(start, end);
  const equals = raw.indexOf("=");
  if (equals < 0) return null;
  let valueStart = equals + 1;
  while (valueStart < raw.length && /\s/.test(raw[valueStart] ?? "")) {
    valueStart += 1;
  }
  let valueEnd = raw.length;
  const quote = raw[valueStart];
  if ((quote === '"' || quote === "'") && raw.endsWith(quote)) {
    valueStart += 1;
    valueEnd -= 1;
  }
  if (valueEnd <= valueStart) return null;
  return { start: start + valueStart, end: start + valueEnd };
}

/**
 * Rejects an unescaped `&`, `<`, `>` or `"` inside a static attribute value
 * in an `html` template.
 */
export const attributeValueEntities: Deno.lint.Rule = {
  create(ctx) {
    return {
      TaggedTemplateExpression(node) {
        if (!isHtmlTemplate(node, ctx)) return;
        const source = templateSource(node);
        const fragment = parseTemplate(source.text);

        walkElements(fragment, (element: ParsedElement) => {
          const locations = element.sourceCodeLocation?.attrs;
          if (!locations) return;
          for (const location of Object.values(locations)) {
            const value = attributeValue(
              source.text,
              location.startOffset,
              location.endOffset,
            );
            if (!value) continue;
            const raw = maskPlaceholders(
              source.text.slice(value.start, value.end),
            );
            OFFENDERS.lastIndex = 0;
            let match = OFFENDERS.exec(raw);
            while (match !== null) {
              const character = match[0];
              const at = value.start + match.index;
              ctx.report({
                range: source.toSourceRange(at, at + character.length),
                message:
                  `Attribute value contains an unescaped \`${character}\`.`,
                hint: `Write it as \`${
                  REPLACEMENTS[character] ?? character
                }\`.`,
              });
              match = OFFENDERS.exec(raw);
            }
          }
        });
      },
    };
  },
};
