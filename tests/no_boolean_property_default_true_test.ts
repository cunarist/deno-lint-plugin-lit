import { noBooleanPropertyDefaultTrue } from "#strict";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin(
  "no-boolean-property-default-true",
  noBooleanPropertyDefaultTrue,
);

Deno.test("no-boolean-property-default-true: allows a false default", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      @property({type: Boolean}) open = false;
      @property({type: Boolean}) disabled: boolean = false;
    }`,
  );
});

Deno.test("no-boolean-property-default-true: allows non-boolean properties", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      @property({type: Number}) count = 1;
      @property() label = "x";
    }`,
  );
});

Deno.test("no-boolean-property-default-true: allows attribute: false", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      @property({type: Boolean, attribute: false}) open = true;
    }`,
  );
});

Deno.test("no-boolean-property-default-true: ignores @state", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      @state() open = true;
    }`,
  );
});

Deno.test("no-boolean-property-default-true: ignores non-Lit classes", () => {
  assertValid(
    plugin,
    `class Plain {
      @property({type: Boolean}) open = true;
    }`,
  );
});

Deno.test("no-boolean-property-default-true: rejects an explicit boolean default", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      @property({type: Boolean}) open = true;
    }`,
  );
});

Deno.test("no-boolean-property-default-true: rejects an annotated boolean default", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      @property() enabled: boolean = true;
    }`,
  );
});

Deno.test("no-boolean-property-default-true: rejects it in static properties", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      static properties = { open: { type: Boolean } };
      open = true;
    }`,
  );
});

Deno.test("no-boolean-property-default-true: highlights the default value", () => {
  const code = `class El extends LitElement {
  @property({type: Boolean}) open = true;
}`;
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "true");
});
