import { requireCustomElementRegistration } from "#strict";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin(
  "require-custom-element-registration",
  requireCustomElementRegistration,
);

Deno.test("require-custom-element-registration: allows a decorated component", () => {
  assertValid(
    plugin,
    `@customElement("x-one")
    export class One extends LitElement {}`,
  );
});

Deno.test("require-custom-element-registration: allows a define call", () => {
  assertValid(
    plugin,
    `export class One extends LitElement {}
    customElements.define("x-one", One);`,
  );
});

Deno.test("require-custom-element-registration: allows an abstract base", () => {
  assertValid(plugin, "abstract class Base extends LitElement {}");
});

Deno.test("require-custom-element-registration: allows an exported base extended here", () => {
  assertValid(
    plugin,
    `export class Base extends LitElement {}
    @customElement("x-one")
    export class One extends Base {}`,
  );
});

Deno.test("require-custom-element-registration: ignores non-Lit classes", () => {
  assertValid(plugin, "class Plain {}");
  assertValid(plugin, "class Store extends EventTarget {}");
});

Deno.test("require-custom-element-registration: rejects an unregistered component", () => {
  assertInvalid(plugin, "export class One extends LitElement {}");
});

Deno.test("require-custom-element-registration: rejects a non-exported unregistered component", () => {
  assertInvalid(plugin, "class One extends LitElement {}");
});

Deno.test("require-custom-element-registration: rejects an unexported class extended here", () => {
  // Only an *exported* base gets the base-class exemption.
  assertInvalid(
    plugin,
    `class Base extends LitElement {}
    @customElement("x-one")
    export class One extends Base {}`,
  );
});

Deno.test("require-custom-element-registration: reports each unregistered component", () => {
  assertInvalid(
    plugin,
    `export class One extends LitElement {}
    export class Two extends ReactiveElement {}`,
    2,
  );
});

Deno.test("require-custom-element-registration: highlights the class name", () => {
  const code = "export class OneElement extends LitElement {}";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "OneElement");
});
