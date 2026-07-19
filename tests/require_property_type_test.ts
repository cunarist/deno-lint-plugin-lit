import { requirePropertyType } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("require-property-type", requirePropertyType);

Deno.test("require-property-type: allows a string property with no type", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      @property() label = "";
      @property() title: string = "x";
    }`,
  );
});

Deno.test("require-property-type: allows a declared type", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      @property({type: Number}) count = 0;
      @property({type: Boolean}) open = false;
      @property({type: Array}) items: string[] = [];
    }`,
  );
});

Deno.test("require-property-type: allows attribute: false and a custom converter", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      @property({attribute: false}) data: object = {};
      @property({converter: myConverter}) count = 0;
    }`,
  );
});

Deno.test("require-property-type: ignores @state", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      @state() count = 0;
    }`,
  );
});

Deno.test("require-property-type: ignores undecidable shapes", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      @property() value: Foo = makeFoo();
      @property() other;
    }`,
  );
});

Deno.test("require-property-type: ignores non-Lit classes", () => {
  assertValid(
    plugin,
    `class Plain {
      @property() count = 0;
    }`,
  );
});

Deno.test("require-property-type: rejects an untyped number", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      @property() count = 0;
    }`,
  );
});

Deno.test("require-property-type: rejects an untyped boolean", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      @property() open: boolean = false;
    }`,
  );
});

Deno.test("require-property-type: rejects an untyped array and object", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      @property() items: string[] = [];
      @property() data = {};
    }`,
    2,
  );
});

Deno.test("require-property-type: rejects a negative number initialiser", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      @property() offset = -1;
    }`,
  );
});

Deno.test("require-property-type: rejects an untyped accessor property", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      @property() accessor count = 0;
    }`,
  );
});

Deno.test("require-property-type: highlights the property name", () => {
  const code = `class El extends LitElement {
  @property() count = 0;
}`;
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "count");
});
