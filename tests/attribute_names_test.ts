import { attributeNames } from "#naming";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("attribute-names", attributeNames);

Deno.test("attribute-names: allows all-lowercase property names", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      @property() label = "";
      @property({ type: Number }) count = 0;
    }`,
  );
});

Deno.test("attribute-names: allows an explicit attribute name", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      @property({ attribute: "my-prop" }) myProp = "";
      @property({ attribute: false }) internalValue = "";
    }`,
  );
});

Deno.test("attribute-names: ignores @state and undecorated fields", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      @state() isOpen = false;
      someField = 1;
    }`,
  );
});

Deno.test("attribute-names: ignores non-Lit classes", () => {
  assertValid(
    plugin,
    `class Plain {
      @property() myProp = "";
    }`,
  );
});

Deno.test("attribute-names: rejects a camelCase property with no attribute option", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      @property() myProp = "";
    }`,
  );
});

Deno.test("attribute-names: rejects when other options are given", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      @property({ type: Boolean, reflect: true }) isOpen = false;
    }`,
  );
});

Deno.test("attribute-names: rejects static properties entries", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      static properties = { myProp: { type: String }, label: { type: String } };
    }`,
  );
});

Deno.test("attribute-names: highlights the property name", () => {
  const code = `class El extends LitElement {
  @property() myProp = "";
}`;
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "myProp");
});
