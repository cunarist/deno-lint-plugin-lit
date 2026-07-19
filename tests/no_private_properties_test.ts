import { noPrivateProperties } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("no-private-properties", noPrivateProperties);

Deno.test("no-private-properties: allows public reactive properties", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      @property() label = "";
    }`,
  );
});

Deno.test("no-private-properties: allows private @state", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      @state() _open = false;
      @state() accessor #count = 0;
    }`,
  );
});

Deno.test("no-private-properties: allows undecorated private fields", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      #cache = new Map();
      _scratch = 0;
    }`,
  );
});

Deno.test("no-private-properties: ignores non-Lit classes", () => {
  assertValid(
    plugin,
    `class Plain {
      @property() _open = false;
    }`,
  );
});

Deno.test("no-private-properties: rejects an underscore-prefixed property", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      @property() _open = false;
    }`,
  );
});

Deno.test("no-private-properties: rejects a hash private property", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      @property() accessor #count = 0;
    }`,
  );
});

Deno.test("no-private-properties: rejects static properties entries", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      static properties = { _open: { type: Boolean }, label: { type: String } };
    }`,
  );
});

Deno.test("no-private-properties: highlights the property name", () => {
  const code = `class El extends LitElement {
  @property() _open = false;
}`;
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "_open");
});
