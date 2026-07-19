import { noDuplicateTagRegistration } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin(
  "no-duplicate-tag-registration",
  noDuplicateTagRegistration,
);

Deno.test("no-duplicate-tag-registration: allows distinct tags", () => {
  assertValid(
    plugin,
    `@customElement("x-one")
    class One extends LitElement {}
    @customElement("x-two")
    class Two extends LitElement {}`,
  );
});

Deno.test("no-duplicate-tag-registration: allows one decorator registration", () => {
  assertValid(
    plugin,
    `@customElement("x-one")
    export class One extends LitElement {}`,
  );
});

Deno.test("no-duplicate-tag-registration: allows one define call", () => {
  assertValid(plugin, 'customElements.define("x-one", One);');
});

Deno.test("no-duplicate-tag-registration: allows define with a computed tag", () => {
  assertValid(
    plugin,
    "customElements.define(tag, One); customElements.define(tag, Two);",
  );
});

Deno.test("no-duplicate-tag-registration: rejects two decorators with one tag", () => {
  assertInvalid(
    plugin,
    `@customElement("x-one")
    class One extends LitElement {}
    @customElement("x-one")
    class Two extends LitElement {}`,
  );
});

Deno.test("no-duplicate-tag-registration: rejects two define calls", () => {
  assertInvalid(
    plugin,
    `customElements.define("x-one", One);
    customElements.define("x-one", Two);`,
  );
});

Deno.test("no-duplicate-tag-registration: rejects a decorator plus a define", () => {
  assertInvalid(
    plugin,
    `@customElement("x-one")
    class One extends LitElement {}
    customElements.define("x-one", Other);`,
  );
});

Deno.test("no-duplicate-tag-registration: reports every extra registration", () => {
  assertInvalid(
    plugin,
    `customElements.define("x-one", A);
    customElements.define("x-one", B);
    customElements.define("x-one", C);`,
    2,
  );
});

Deno.test("no-duplicate-tag-registration: highlights the later tag literal", () => {
  const code = `@customElement("x-one")
class One extends LitElement {}
customElements.define("x-one", Other);`;
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, '"x-one"');
  if (diagnostic.range[0] < code.indexOf("customElements.define")) {
    throw new Error("expected the second registration to be reported");
  }
});
