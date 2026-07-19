import { requireScalarReflect } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin(
  "require-scalar-reflect",
  requireScalarReflect,
);

Deno.test("require-scalar-reflect: allows reflecting scalars", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      @property({type: Boolean, reflect: true}) open = false;
      @property({type: Number, reflect: true}) count = 0;
      @property({type: String, reflect: true}) label = "";
    }`,
  );
});

Deno.test("require-scalar-reflect: allows complex properties without reflect", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      @property({type: Object}) data = {};
      @property({type: Array, reflect: false}) items = [];
    }`,
  );
});

Deno.test("require-scalar-reflect: ignores non-Lit classes", () => {
  assertValid(
    plugin,
    `class Plain {
      @property({type: Object, reflect: true}) data = {};
    }`,
  );
});

Deno.test("require-scalar-reflect: rejects reflecting an object", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      @property({type: Object, reflect: true}) data = {};
    }`,
  );
});

Deno.test("require-scalar-reflect: rejects reflecting an array", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      @property({reflect: true, type: Array}) items = [];
    }`,
  );
});

Deno.test("require-scalar-reflect: rejects it in static properties", () => {
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

Deno.test("require-scalar-reflect: highlights the reflect option", () => {
  const code = `class El extends LitElement {
  @property({type: Object, reflect: true}) data = {};
}`;
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "reflect: true");
});

Deno.test("require-scalar-reflect: reports reflect with no type at all", () => {
  // The worst case: the identity converter writes `[object Object]` into the
  // DOM. An earlier version only looked for `type: Object` and missed this.
  assertInvalid(
    plugin,
    "class El extends LitElement { @property({ reflect: true }) accessor data = {}; }",
  );
});

Deno.test("require-scalar-reflect: reports an unreadable type", () => {
  assertInvalid(
    plugin,
    "class El extends LitElement { @property({ reflect: true, type: TYPES.obj }) accessor d = {}; }",
  );
});

Deno.test("require-scalar-reflect: accepts a custom converter", () => {
  assertValid(
    plugin,
    "class El extends LitElement { @property({ reflect: true, converter: c }) accessor at; }",
  );
});
