import { noNativeAttributes } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("no-native-attributes", noNativeAttributes);

Deno.test("no-native-attributes: allows non-native names", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      @property() label = "";
      @property() headingId = "";
      @state() open = false;
    }`,
  );
});

Deno.test("no-native-attributes: ignores undecorated fields", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      title = "";
      #role = "";
    }`,
  );
});

Deno.test("no-native-attributes: ignores non-Lit classes", () => {
  assertValid(
    plugin,
    `class Plain {
      @property() title = "";
    }`,
  );
});

Deno.test("no-native-attributes: rejects native attribute names", () => {
  for (const name of ["role", "title", "id", "slot", "style", "hidden"]) {
    assertInvalid(
      plugin,
      `class El extends LitElement {
        @property() ${name} = "";
      }`,
    );
  }
});

Deno.test("no-native-attributes: rejects case variants", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      @property({ type: Number }) tabIndex = 0;
    }`,
  );
});

Deno.test("no-native-attributes: rejects static properties entries", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      static properties = { title: { type: String }, label: { type: String } };
    }`,
  );
});

Deno.test("no-native-attributes: highlights the property name", () => {
  const code = `class El extends LitElement {
  @property() title = "";
}`;
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "title");
});
