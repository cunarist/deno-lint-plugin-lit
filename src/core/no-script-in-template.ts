/**
 * `no-script-in-template`
 *
 * A `<script>` element inside a Lit template.
 *
 * Templates are parsed as document fragments and cloned into place. Scripts
 * created that way are already "already started" as far as the HTML spec is
 * concerned, so the browser never executes them. Nothing throws and nothing
 * warns — the code simply never runs, which reads as a silent no-op.
 */

import {
  isHtmlTemplate,
  parseTemplate,
  templateSource,
  walkElements,
} from "#helpers";

/**
 * Rejects a `<script>` element inside a Lit template.
 */
export const noScriptInTemplate: Deno.lint.Rule = {
  create(ctx) {
    return {
      TaggedTemplateExpression(node) {
        if (!isHtmlTemplate(node)) return;
        const source = templateSource(node);
        if (!/<\s*script[\s/>]/i.test(source.text)) return;

        walkElements(parseTemplate(source.text), (element) => {
          if (element.tagName !== "script") return;
          const location = element.sourceCodeLocation;
          if (!location) return;
          const span = location.startTag ?? location;
          ctx.report({
            range: source.toSourceRange(span.startOffset, span.endOffset),
            message: "`<script>` element in template.",
            hint:
              "Cloned template scripts never execute. Move the code into the component, or load it with a module import.",
          });
        });
      },
    };
  },
};
