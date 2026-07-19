import { noDuplicatePropertyDeclaration } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin(
  "no-duplicate-property-declaration",
  noDuplicatePropertyDeclaration,
);

Deno.test("no-duplicate-property-declaration: allows decorators only", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      @property({type: Number}) count = 0;
      @state() open = false;
    }`,
  );
});

Deno.test("no-duplicate-property-declaration: allows static properties only", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      static properties = { count: { type: Number } };
    }`,
  );
});

Deno.test("no-duplicate-property-declaration: allows disjoint names in both styles", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      static properties = { count: { type: Number } };
      @property() label = "";
    }`,
  );
});

Deno.test("no-duplicate-property-declaration: ignores non-Lit classes", () => {
  assertValid(
    plugin,
    `class Plain {
      static properties = { count: { type: Number } };
      @property() count = 0;
    }`,
  );
});

Deno.test("no-duplicate-property-declaration: rejects a name in both styles", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      static properties = { count: { type: Number } };
      @property({type: Number}) count = 0;
    }`,
  );
});

Deno.test("no-duplicate-property-declaration: rejects a @state name in static properties", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      static properties = { open: { type: Boolean } };
      @state() open = false;
    }`,
  );
});

Deno.test("no-duplicate-property-declaration: reports each duplicate", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      static properties = {
        count: { type: Number },
        label: { type: String },
        other: { type: String },
      };
      @property() count = 0;
      @property() label = "";
    }`,
    2,
  );
});

Deno.test("no-duplicate-property-declaration: highlights the static properties key", () => {
  const code = `class El extends LitElement {
  static properties = { count: { type: Number } };
  @property({type: Number}) count = 0;
}`;
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "count");
});
