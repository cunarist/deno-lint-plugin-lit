/**
 * `no-invalid-html`
 *
 * The markup inside an `html` template must parse as valid HTML: no stray `<`,
 * no truncated tags, no unclosed elements.
 *
 * parse5 surfaces tokenizer-level problems through `onParseError`. It does not
 * treat an unclosed element as an error, so that case is detected structurally:
 * an element whose source location has a start tag but no end tag, and which is
 * neither void nor self-closing, was never closed.
 */

import { parseFragment } from "parse5";
import type { ParserError } from "parse5";

import { isElement, isHtmlTemplate, templateSource } from "#helpers";
import type { ParsedElement, ParsedNode } from "#helpers";

/** Elements that never have an end tag. */
const VOID_ELEMENTS: ReadonlySet<string> = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

/** Elements whose end tag HTML makes optional; not worth flagging. */
const OPTIONAL_END_TAG: ReadonlySet<string> = new Set([
  "body",
  "caption",
  "colgroup",
  "dd",
  "dt",
  "head",
  "html",
  "li",
  "optgroup",
  "option",
  "p",
  "rb",
  "rp",
  "rt",
  "rtc",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
]);

/**
 * Duplicate attributes are a parse error too, but they are the subject of
 * `no-duplicate-template-bindings`; reporting them here as well would double up.
 */
const DELEGATED_CODES: ReadonlySet<string> = new Set(["duplicate-attribute"]);

/** Human-readable wording for the parse-error codes worth explaining. */
const CODE_MESSAGES: Readonly<Record<string, string>> = {
  "invalid-first-character-of-tag-name":
    "Stray `<` in template markup; escape it as `&lt;`.",
  "eof-in-tag": "Unterminated tag in template markup.",
  "eof-before-tag-name": "Unterminated tag in template markup.",
  "missing-end-tag-name": "Missing end tag name in template markup.",
  "unexpected-character-in-attribute-name":
    "Invalid character in an attribute name.",
  "unexpected-character-in-unquoted-attribute-value":
    "Invalid character in an unquoted attribute value; quote the value.",
  "missing-whitespace-between-attributes":
    "Missing whitespace between attributes.",
  "unexpected-solidus-in-tag": "Unexpected `/` in a tag.",
  "eof-in-comment": "Unterminated comment in template markup.",
};

/** Collect every element in the fragment, deepest last. */
function collectElements(
  root: { readonly childNodes: readonly ParsedNode[] },
): ParsedElement[] {
  const found: ParsedElement[] = [];
  const stack: ParsedNode[] = [...root.childNodes];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    if (isElement(current)) found.push(current);
    if ("childNodes" in current && current.childNodes) {
      stack.push(...current.childNodes);
    }
  }
  return found;
}

/**
 * Rejects markup inside an `html` template that does not parse as valid
 * HTML.
 */
export const noInvalidHtml: Deno.lint.Rule = {
  create(ctx) {
    return {
      TaggedTemplateExpression(node) {
        if (!isHtmlTemplate(node, ctx)) return;
        const source = templateSource(node);

        const errors: ParserError[] = [];
        const fragment = parseFragment(source.text, {
          sourceCodeLocationInfo: true,
          onParseError: (error) => errors.push(error),
        });

        for (const error of errors) {
          if (DELEGATED_CODES.has(error.code)) continue;
          // Tokenizer errors point at the character *after* the offending `<`,
          // and end-of-input errors point past the end of the text; clamp both
          // so the diagnostic lands on something the reader can see.
          let start = error.code === "invalid-first-character-of-tag-name"
            ? error.startOffset - 1
            : error.startOffset;
          start = Math.max(0, Math.min(start, source.text.length - 1));
          const end = Math.max(error.endOffset, start + 1);
          ctx.report({
            range: source.toSourceRange(start, end),
            message: CODE_MESSAGES[error.code] ??
              `Invalid HTML in template (${error.code}).`,
            hint: "Lit templates are parsed as HTML; the markup must be valid.",
          });
        }

        for (const element of collectElements(fragment)) {
          const location = element.sourceCodeLocation;
          const startTag = location?.startTag;
          if (!location || !startTag) continue;
          if (location.endTag) continue;
          const tagName = element.tagName.toLowerCase();
          if (VOID_ELEMENTS.has(tagName) || OPTIONAL_END_TAG.has(tagName)) {
            continue;
          }
          const raw = source.text.slice(
            startTag.startOffset,
            startTag.endOffset,
          );
          if (raw.endsWith("/>")) continue;
          ctx.report({
            range: source.toSourceRange(
              startTag.startOffset,
              startTag.endOffset,
            ),
            message: `Tag \`<${tagName}>\` is never closed.`,
            hint: `Add a matching \`</${tagName}>\`.`,
          });
        }
      },
    };
  },
};
