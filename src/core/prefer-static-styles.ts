/**
 * `prefer-static-styles`
 *
 * A `<style>` element inside an `html` template is re-parsed on every render
 * and cannot be shared between instances. Use `static styles` with a
 * `` css`…` `` literal instead.
 */

import {
  isHtmlTemplate,
  parseTemplate,
  templateSource,
  walkElements,
} from "#helpers";

/**
 * Rejects a `<style>` element inside an `html` template.
 */
export const preferStaticStyles: Deno.lint.Rule = {
  create(ctx) {
    return {
      TaggedTemplateExpression(node) {
        if (!isHtmlTemplate(node)) return;
        const source = templateSource(node);
        if (!/<\s*style[\s>]/i.test(source.text)) return;

        const fragment = parseTemplate(source.text);
        walkElements(fragment, (element) => {
          if (element.tagName !== "style") return;
          const location = element.sourceCodeLocation;
          if (!location) return;
          const tag = location.startTag ?? location;
          ctx.report({
            range: source.toSourceRange(tag.startOffset, tag.endOffset),
            message: "`<style>` element in template.",
            hint:
              "Move the rules into a `static styles = css`…`` member so they are parsed once and shared.",
          });
        });
      },
    };
  },
};
