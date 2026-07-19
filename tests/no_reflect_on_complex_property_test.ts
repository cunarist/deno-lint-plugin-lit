import { noReflectOnComplexProperty } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin(
  "no-reflect-on-complex-property",
  noReflectOnComplexProperty,
);

Deno.test("no-reflect-on-complex-property: allows reflecting scalars", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      @property({type: Boolean, reflect: true}) open = false;
      @property({type: Number, reflect: true}) count = 0;
      @property({type: String, reflect: true}) label = "";
    }`,
  );
});

Deno.test("no-reflect-on-complex-property: allows complex properties without reflect", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      @property({type: Object}) data = {};
      @property({type: Array, reflect: false}) items = [];
    }`,
  );
});

Deno.test("no-reflect-on-complex-property: ignores non-Lit classes", () => {
  assertValid(
    plugin,
    `class Plain {
      @property({type: Object, reflect: true}) data = {};
    }`,
  );
});

Deno.test("no-reflect-on-complex-property: rejects reflecting an object", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      @property({type: Object, reflect: true}) data = {};
    }`,
  );
});

Deno.test("no-reflect-on-complex-property: rejects reflecting an array", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      @property({reflect: true, type: Array}) items = [];
    }`,
  );
});

Deno.test("no-reflect-on-complex-property: rejects it in static properties", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      static properties = {
        data: { type: Object, reflect: true },
        count: { type: Number, reflect: true },
      };
    }`,
  );
});

Deno.test("no-reflect-on-complex-property: highlights the reflect option", () => {
  const code = `class El extends LitElement {
  @property({type: Object, reflect: true}) data = {};
}`;
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "reflect: true");
});
