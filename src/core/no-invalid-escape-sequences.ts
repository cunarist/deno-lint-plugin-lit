/**
 * `no-invalid-escape-sequences`
 *
 * A tagged template makes malformed `\x` and `\u` escapes legal to *write* —
 * `String.raw`-style access keeps working while the cooked value silently
 * becomes `undefined`. In an `html` template that is never what was meant, so
 * the escape is almost always a typo or a regex pasted into markup.
 *
 * Only `\x` and `\u` are checked: every other `\c` is a valid (if redundant)
 * escape, so `\d` and `\w` inside an inline pattern are left alone.
 */

import { bindingPlaceholder, isHtmlTemplate, templateSource } from "#helpers";

const HEX = /[\da-fA-F]/;

interface Invalid {
  /** Offset of the backslash within the quasi's raw text. */
  readonly index: number;
  /** Length of the offending sequence. */
  readonly length: number;
  /** `x` or `u`. */
  readonly kind: string;
}

/** Find malformed `\x`/`\u` escapes, respecting escaped backslashes. */
function invalidEscapes(raw: string): Invalid[] {
  const found: Invalid[] = [];
  let index = 0;
  while (index < raw.length) {
    if (raw[index] !== "\\") {
      index += 1;
      continue;
    }
    const kind = raw[index + 1];
    if (kind === "\\") {
      // An escaped backslash consumes the next character.
      index += 2;
      continue;
    }
    if (kind === "x") {
      const digits = raw.slice(index + 2, index + 4);
      if (
        digits.length < 2 || !HEX.test(digits[0] ?? "") ||
        !HEX.test(digits[1] ?? "")
      ) {
        found.push({ index, length: 2 + digits.length, kind: "x" });
      }
      index += 2;
      continue;
    }
    if (kind === "u") {
      if (raw[index + 2] === "{") {
        const close = raw.indexOf("}", index + 3);
        const body = close < 0 ? "" : raw.slice(index + 3, close);
        const valid = body.length > 0 &&
          [...body].every((character) => HEX.test(character));
        if (!valid) {
          found.push({
            index,
            length: (close < 0 ? raw.length : close + 1) - index,
            kind: "u",
          });
        }
      } else {
        const digits = raw.slice(index + 2, index + 6);
        const valid = digits.length === 4 &&
          [...digits].every((character) => HEX.test(character));
        if (!valid) found.push({ index, length: 2 + digits.length, kind: "u" });
      }
      index += 2;
      continue;
    }
    index += 2;
  }
  return found;
}

/**
 * Rejects a malformed `\x` or `\u` escape inside an `html` template.
 */
export const noInvalidEscapeSequences: Deno.lint.Rule = {
  create(ctx) {
    return {
      TaggedTemplateExpression(node) {
        if (!isHtmlTemplate(node, ctx)) return;
        const source = templateSource(node);
        const quasis = node.quasi.quasis;
        const expressions = node.quasi.expressions;

        let textOffset = 0;
        for (let index = 0; index < quasis.length; index += 1) {
          const quasi = quasis[index];
          if (!quasi) continue;
          for (const invalid of invalidEscapes(quasi.raw)) {
            const start = textOffset + invalid.index;
            ctx.report({
              range: source.toSourceRange(
                start,
                start + Math.max(1, invalid.length),
              ),
              message: `Invalid \`\\${invalid.kind}\` escape sequence.`,
              hint: invalid.kind === "x"
                ? "`\\x` must be followed by exactly two hex digits."
                : "`\\u` must be followed by four hex digits or `{…}`.",
            });
          }
          textOffset += quasi.raw.length;
          if (index < expressions.length) {
            textOffset += bindingPlaceholder(index).length;
          }
        }
      },
    };
  },
};
