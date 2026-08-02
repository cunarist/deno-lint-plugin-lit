/**
 * `require-direct-registration-import`
 *
 * A custom element used in a template whose registering module this file does
 * not import, directly or through that module's own `mod.ts`. The element still
 * renders as long as some other module ran its `customElements.define`, so the
 * tag works today by borrowing another file's import — until that unrelated
 * import is removed and this template silently breaks. Importing the
 * registering module here keeps the usage self-sufficient.
 *
 * This rule reads two facts no single file can answer — which module registers a
 * tag, and which modules this file truly runs — from a walk of the whole
 * program, computed once and kept. Without type information it stays silent
 * rather than guess.
 */

import { tryGetTypeServices } from "@cunarist/typescript-deno-lint/types";
import { relative } from "@std/path";

import {
  isHtmlTemplate,
  parseTemplate,
  templateSource,
  walkElements,
} from "#helpers";
import type { ParsedElement } from "#helpers";
import { registrationIndex, runtimeImportIndex } from "#scanner";

/** A file path relative to the working directory, for a readable hint. */
function shortPath(file: string): string {
  const short = relative(Deno.cwd(), file).replaceAll("\\", "/");
  return short === "" || short.startsWith("..") ? file : short;
}

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
    const services = tryGetTypeServices(ctx);
    if (services === null) {
      return {};
    }
    // Every path here comes out of the same program, so they compare directly;
    // only the hint is shortened, for a message worth reading.
    const self = services.sourceFile.fileName;
    const imported = runtimeImportIndex(services);
    const registrations = registrationIndex(services);

    return {
      TaggedTemplateExpression(node) {
        if (!isHtmlTemplate(node, ctx)) return;
        const source = templateSource(node);
        walkElements(parseTemplate(source.text), (element) => {
          const tag = element.tagName;
          const module = registrations.get(tag);
          if (
            !isCustomElement(tag) ||
            module === undefined ||
            module === self ||
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
            hint: `Import \`${shortPath(module)}\` in this file.`,
          });
        });
      },
    };
  },
};
