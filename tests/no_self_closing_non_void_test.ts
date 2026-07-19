import { noSelfClosingNonVoid } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("no-self-closing-non-void", noSelfClosingNonVoid);

Deno.test("no-self-closing-non-void: allows explicit end tags", () => {
  assertValid(plugin, "const t = html`<div></div>`;");
  assertValid(plugin, "const t = html`<my-el></my-el>`;");
  assertValid(plugin, "const t = html`<div><span></span></div>`;");
});

Deno.test("no-self-closing-non-void: allows void elements", () => {
  assertValid(plugin, "const t = html`<br />`;");
  assertValid(plugin, 'const t = html`<img src="a.png" />`;');
  assertValid(plugin, 'const t = html`<input type="text"/>`;');
  assertValid(plugin, 'const t = html`<hr/><meta charset="utf-8"/>`;');
});

Deno.test("no-self-closing-non-void: allows self-closing SVG content", () => {
  assertValid(plugin, 'const t = html`<svg><path d="M0 0" /></svg>`;');
  assertValid(plugin, 'const t = svg`<circle cx="1" />`;');
});

Deno.test("no-self-closing-non-void: ignores a trailing slash inside an unquoted value", () => {
  assertValid(plugin, "const t = html`<a href=${this.url}/>text</a>`;");
});

Deno.test("no-self-closing-non-void: rejects a self-closing div", () => {
  assertInvalid(plugin, "const t = html`<div />`;");
  assertInvalid(plugin, "const t = html`<div/>`;");
});

Deno.test("no-self-closing-non-void: rejects a self-closing custom element", () => {
  assertInvalid(plugin, "const t = html`<my-el .foo=${this.a} />`;");
});

Deno.test("no-self-closing-non-void: ignores non-html templates", () => {
  assertValid(plugin, "const t = sql`<div />`;");
});

Deno.test("no-self-closing-non-void: highlights the start tag", () => {
  const code = 'const t = html`<div class="a" /><span></span>`;';
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, '<div class="a" />');
});

Deno.test("no-self-closing-non-void: highlights a start tag containing a binding", () => {
  const code = "const t = html`<my-el .foo=${this.a} />`;";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "<my-el .foo=${this.a} />");
});
