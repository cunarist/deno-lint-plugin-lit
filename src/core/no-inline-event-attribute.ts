/**
 * `no-inline-event-attribute`
 *
 * An `onclick="…"` attribute is evaluated as global-scope JavaScript by the
 * browser, so the handler cannot see the component instance at all — and every
 * strict Content-Security-Policy blocks it outright. Written as
 * `onclick=${this.go}` it is worse: Lit sets the *attribute* to the stringified
 * function, which then fails to parse. Lit's `@click=${…}` binding attaches a
 * real listener with the right `this`.
 */

import {
  isHtmlTemplate,
  parseTemplate,
  templateSource,
  walkElements,
} from "#helpers";
import type { ParsedElement } from "#helpers";

/**
 * HTML event handler content attributes. Matched against an explicit list
 * rather than an `on*` prefix, because attributes like `once` and `only` share
 * that prefix without being handlers.
 */
const HANDLER_ATTRIBUTES: ReadonlySet<string> = new Set([
  "onabort",
  "onanimationend",
  "onanimationiteration",
  "onanimationstart",
  "onauxclick",
  "onbeforeinput",
  "onbeforetoggle",
  "onbeforeunload",
  "onblur",
  "oncancel",
  "oncanplay",
  "oncanplaythrough",
  "onchange",
  "onclick",
  "onclose",
  "oncontextmenu",
  "oncopy",
  "oncuechange",
  "oncut",
  "ondblclick",
  "ondrag",
  "ondragend",
  "ondragenter",
  "ondragleave",
  "ondragover",
  "ondragstart",
  "ondrop",
  "ondurationchange",
  "onemptied",
  "onended",
  "onerror",
  "onfocus",
  "onfocusin",
  "onfocusout",
  "onformdata",
  "oninput",
  "oninvalid",
  "onkeydown",
  "onkeypress",
  "onkeyup",
  "onload",
  "onloadeddata",
  "onloadedmetadata",
  "onloadstart",
  "onmousedown",
  "onmouseenter",
  "onmouseleave",
  "onmousemove",
  "onmouseout",
  "onmouseover",
  "onmouseup",
  "onpaste",
  "onpause",
  "onplay",
  "onplaying",
  "onpointercancel",
  "onpointerdown",
  "onpointerenter",
  "onpointerleave",
  "onpointermove",
  "onpointerout",
  "onpointerover",
  "onpointerup",
  "onprogress",
  "onratechange",
  "onreset",
  "onresize",
  "onscroll",
  "onscrollend",
  "onsecuritypolicyviolation",
  "onseeked",
  "onseeking",
  "onselect",
  "onselectionchange",
  "onselectstart",
  "onslotchange",
  "onstalled",
  "onsubmit",
  "onsuspend",
  "ontimeupdate",
  "ontoggle",
  "ontransitionend",
  "onvolumechange",
  "onwaiting",
  "onwheel",
]);

/**
 * Rejects HTML inline event handler attributes such as `onclick` inside an
 * `html` template.
 */
export const noInlineEventAttribute: Deno.lint.Rule = {
  create(ctx) {
    return {
      TaggedTemplateExpression(node) {
        if (!isHtmlTemplate(node, ctx)) return;
        const source = templateSource(node);
        const fragment = parseTemplate(source.text);

        walkElements(fragment, (element: ParsedElement) => {
          const locations = element.sourceCodeLocation?.attrs;
          if (!locations) return;
          for (const attribute of element.attrs) {
            const name = attribute.name.toLowerCase();
            if (!HANDLER_ATTRIBUTES.has(name)) continue;
            const location = locations[name];
            if (!location) continue;
            ctx.report({
              range: source.toSourceRange(
                location.startOffset,
                location.endOffset,
              ),
              message: `Inline \`${name}\` attribute in a template.`,
              hint: `Use Lit's event binding \`@${
                name.slice(2)
              }=\${…}\` instead.`,
            });
          }
        });
      },
    };
  },
};
