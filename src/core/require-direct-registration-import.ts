/**
 * `require-direct-registration-import`
 *
 * A custom element used in a template whose registering module this file does
 * not import. The element still renders as long as some other module ran its
 * `customElements.define`, so the tag works today by borrowing another file's
 * import — until that unrelated import is removed and this template silently
 * breaks. Importing the registering module here keeps the usage self-sufficient.
 *
 * This rule reads facts a synchronous rule cannot compute — which module
 * registers a tag, and which modules this file truly imports — from the cache
 * the background scanner writes. With no cache at all it stays silent rather
 * than guess.
 */

import {
  isHtmlTemplate,
  parseTemplate,
  templateSource,
  walkElements,
} from "#helpers";
import type { ParsedElement } from "#helpers";
import { currentFileFacts, fileKey, scanFacts } from "#scan-index";

/** Whether a tag names a custom element rather than a built-in one. */
function isCustomElement(tagName: string): boolean {
  return tagName.includes("-");
}

/** The source span of an element's opening tag. */
function startTagSpan(
  element: ParsedElement,
): { readonly startOffset: number; readonly endOffset: number } | null {
  const location = element.sourceCodeLocation;
  return location?.startTag ?? location ?? null;
}

/**
 * Rejects a template tag whose registering module the file does not import.
 */
export const requireDirectRegistrationImport: Deno.lint.Rule = {
  create(ctx) {
    const facts = scanFacts();
    if (facts === null) {
      return {};
    }
    const key = fileKey(facts.root, ctx.filename);
    const fileFacts = currentFileFacts(ctx.filename, ctx.sourceCode.text);
    if (fileFacts === null) {
      return {};
    }
    const imported = new Set(fileFacts.imports);
    const registrations = facts.cache.registrations;

    return {
      TaggedTemplateExpression(node) {
        if (!isHtmlTemplate(node, ctx)) return;
        const source = templateSource(node);
        walkElements(parseTemplate(source.text), (element) => {
          const tag = element.tagName;
          const module = registrations[tag];
          if (
            !isCustomElement(tag) ||
            module === undefined ||
            module === key ||
            imported.has(module)
          ) {
            return;
          }
          const span = startTagSpan(element);
          if (span === null) return;
          ctx.report({
            range: source.toSourceRange(span.startOffset, span.endOffset),
            message:
              `\`<${tag}>\` is used without importing the module that registers it.`,
            hint: `Import \`${module}\` in this file.`,
          });
        });
      },
    };
  },
};
