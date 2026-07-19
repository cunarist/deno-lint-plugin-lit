import { noPropertyNamedLikeLifecycle } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin(
  "no-property-named-like-lifecycle",
  noPropertyNamedLikeLifecycle,
);

Deno.test("no-property-named-like-lifecycle: allows lifecycle methods", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      render() { return html\`\`; }
      willUpdate() {}
      connectedCallback() { super.connectedCallback(); }
    }`,
  );
});

Deno.test("no-property-named-like-lifecycle: allows unrelated fields", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      @property() label = "";
      updatedAt = 0;
      renderer = null;
    }`,
  );
});

Deno.test("no-property-named-like-lifecycle: allows a declare redeclaration", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      declare update: () => void;
    }`,
  );
});

Deno.test("no-property-named-like-lifecycle: ignores non-Lit classes", () => {
  assertValid(
    plugin,
    `class Plain {
      render = 1;
    }`,
  );
});

Deno.test("no-property-named-like-lifecycle: rejects a field named render", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      render = 1;
    }`,
  );
});

Deno.test("no-property-named-like-lifecycle: rejects an arrow field named update", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      update = () => {};
    }`,
  );
});

Deno.test("no-property-named-like-lifecycle: rejects a decorated lifecycle name", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      @property({type: Boolean}) updated = false;
    }`,
  );
});

Deno.test("no-property-named-like-lifecycle: rejects an accessor named shouldUpdate", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      accessor shouldUpdate = true;
    }`,
  );
});

Deno.test("no-property-named-like-lifecycle: rejects a lifecycle name in static properties", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      static properties = { firstUpdated: { type: Boolean } };
    }`,
  );
});

Deno.test("no-property-named-like-lifecycle: highlights the member name", () => {
  const code = `class El extends LitElement {
  @property() requestUpdate = 1;
}`;
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "requestUpdate");
});
