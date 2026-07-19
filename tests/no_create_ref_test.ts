import { noCreateRef } from "#dom-ref";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("no-create-ref", noCreateRef);

Deno.test("no-create-ref: allows the ref directive alone", () => {
  assertValid(plugin, 'import { ref } from "lit/directives/ref.js";');
  assertValid(
    plugin,
    "class A extends LitElement { render() { return html`<i ${ref(this.#onInput)}></i>`; } }",
  );
});

Deno.test("no-create-ref: rejects the import", () => {
  assertInvalid(
    plugin,
    'import { createRef, ref } from "lit/directives/ref.js";',
  );
});

Deno.test("no-create-ref: rejects the call", () => {
  assertInvalid(
    plugin,
    "class A extends LitElement { #input = createRef(); }",
  );
});

Deno.test("no-create-ref: rejects a namespaced call", () => {
  assertInvalid(plugin, "const r = refs.createRef();");
});

Deno.test("no-create-ref: reports import and call together", () => {
  assertInvalid(
    plugin,
    `import { createRef } from "lit/directives/ref.js";
     const r = createRef();`,
    2,
  );
});

Deno.test("no-create-ref: highlights the call callee", () => {
  const code = "class A extends LitElement { #input = createRef(); }";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "createRef");
});
