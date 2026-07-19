import { svgTemplateForSvgContent } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin(
  "svg-template-for-svg-content",
  svgTemplateForSvgContent,
);

Deno.test("svg-template-for-svg-content: allows a complete svg element", () => {
  assertValid(plugin, "const t = html`<svg><path></path></svg>`;");
  assertValid(plugin, "const t = html`<svg><g><circle></circle></g></svg>`;");
});

Deno.test("svg-template-for-svg-content: allows svg templates", () => {
  assertValid(plugin, "const t = svg`<path></path>`;");
  assertValid(plugin, "const t = svg`<circle></circle>`;");
});

Deno.test("svg-template-for-svg-content: allows plain html", () => {
  assertValid(plugin, "const t = html`<div><span></span></div>`;");
  assertValid(plugin, "const t = html`<a href=${this.href}>x</a>`;");
  assertValid(plugin, "const t = html`<title>x</title>`;");
});

Deno.test("svg-template-for-svg-content: ignores non-lit templates", () => {
  assertValid(plugin, "const t = sql`<path></path>`;");
});

Deno.test("svg-template-for-svg-content: rejects a bare svg child", () => {
  assertInvalid(plugin, "const t = html`<path></path>`;");
  assertInvalid(plugin, "const t = html`<circle></circle>`;");
  assertInvalid(plugin, "const t = html`<rect></rect>`;");
});

Deno.test("svg-template-for-svg-content: rejects one nested under html elements", () => {
  assertInvalid(plugin, "const t = html`<div><polygon></polygon></div>`;");
});

Deno.test("svg-template-for-svg-content: reports each bare element", () => {
  assertInvalid(
    plugin,
    "const t = html`<path></path><circle></circle>`;",
    2,
  );
});

Deno.test("svg-template-for-svg-content: highlights the start tag", () => {
  const code = 'const t = html`<div><path d="M0 0"></path></div>`;';
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, '<path d="M0 0">');
});

Deno.test("svg-template-for-svg-content: highlights a start tag holding a binding", () => {
  const code = "const t = html`<path d=${this.d}></path>`;";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "<path d=${this.d}>");
});
