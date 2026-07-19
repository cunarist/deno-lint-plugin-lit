import { propertyTypeMatchesDeclaration } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin(
  "property-type-matches-declaration",
  propertyTypeMatchesDeclaration,
);

Deno.test("property-type-matches-declaration: allows matching declarations", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      @property({type: Number}) count = 0;
      @property({type: Boolean}) open: boolean = false;
      @property({type: String}) label = "";
      @property({type: Array}) items: string[] = [];
      @property({type: Object}) data = {};
    }`,
  );
});

Deno.test("property-type-matches-declaration: allows Object on an array", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      @property({type: Object}) items: string[] = [];
      @property({type: Array}) data: Record<string, string> = {};
    }`,
  );
});

Deno.test("property-type-matches-declaration: ignores undecidable field shapes", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      @property({type: Number}) value: Foo = makeFoo();
      @property({type: Number}) other;
    }`,
  );
});

Deno.test("property-type-matches-declaration: ignores non-Lit classes", () => {
  assertValid(
    plugin,
    `class Plain {
      @property({type: Number}) label: string = "x";
    }`,
  );
});

Deno.test("property-type-matches-declaration: rejects Number on a string field", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      @property({type: Number}) label: string = "x";
    }`,
  );
});

Deno.test("property-type-matches-declaration: rejects Boolean on a number field", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      @property({type: Boolean}) count = 0;
    }`,
  );
});

Deno.test("property-type-matches-declaration: rejects String on an array field", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      @property({type: String}) items: string[] = [];
    }`,
  );
});

Deno.test("property-type-matches-declaration: rejects a mismatch declared in static properties", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      static properties = { label: { type: Number } };
      declare label: string;
    }`,
  );
});

Deno.test("property-type-matches-declaration: highlights the type constructor", () => {
  const code = `class El extends LitElement {
  @property({type: Number}) label: string = "x";
}`;
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "Number");
});
