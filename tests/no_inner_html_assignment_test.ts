import { noInnerHtmlAssignment } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("no-inner-html-assignment", noInnerHtmlAssignment);

Deno.test("no-inner-html-assignment: allows reading innerHTML", () => {
  assertValid(plugin, "const markup = this.innerHTML;");
  assertValid(plugin, "if (el.outerHTML === other) {}");
});

Deno.test("no-inner-html-assignment: allows textContent", () => {
  assertValid(plugin, "this.textContent = value;");
  assertValid(plugin, "el.innerText = value;");
});

Deno.test("no-inner-html-assignment: allows an unrelated property", () => {
  assertValid(plugin, "this.innerHTMLCache = value;");
});

Deno.test("no-inner-html-assignment: rejects assigning this.innerHTML", () => {
  assertInvalid(plugin, "this.innerHTML = markup;");
});

Deno.test("no-inner-html-assignment: rejects assigning on any receiver", () => {
  assertInvalid(plugin, "el.innerHTML = markup;");
  assertInvalid(plugin, "this.renderRoot.innerHTML = markup;");
});

Deno.test("no-inner-html-assignment: rejects outerHTML", () => {
  assertInvalid(plugin, "el.outerHTML = markup;");
});

Deno.test("no-inner-html-assignment: rejects compound assignment", () => {
  assertInvalid(plugin, "this.innerHTML += markup;");
});

Deno.test("no-inner-html-assignment: rejects a computed string key", () => {
  assertInvalid(plugin, 'el["innerHTML"] = markup;');
});

Deno.test("no-inner-html-assignment: highlights the assignment target", () => {
  const code = "this.renderRoot.innerHTML = markup;";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "this.renderRoot.innerHTML");
});
