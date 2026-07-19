import { noRequestUpdateInUpdated } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin(
  "no-request-update-in-updated",
  noRequestUpdateInUpdated,
);

Deno.test("no-request-update-in-updated: allows requestUpdate elsewhere", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      onResize() { this.requestUpdate(); }
      updated() {}
    }`,
  );
});

Deno.test("no-request-update-in-updated: allows other calls in updated", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      updated() { this.measure(); }
    }`,
  );
});

Deno.test("no-request-update-in-updated: allows a host requestUpdate", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      updated() { this.host.requestUpdate(); }
    }`,
  );
});

Deno.test("no-request-update-in-updated: ignores non-Lit classes", () => {
  assertValid(
    plugin,
    `class Plain {
      updated() { this.requestUpdate(); }
    }`,
  );
});

Deno.test("no-request-update-in-updated: rejects it in updated", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      updated() { this.requestUpdate(); }
    }`,
  );
});

Deno.test("no-request-update-in-updated: rejects it in firstUpdated", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      firstUpdated() { this.requestUpdate(); }
    }`,
  );
});

Deno.test("no-request-update-in-updated: rejects it in a nested block", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      updated() { if (this.dirty) { this.requestUpdate(); } }
    }`,
  );
});

Deno.test("no-request-update-in-updated: highlights the call", () => {
  const code = `class El extends LitElement {
  updated() { this.requestUpdate(); }
}`;
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "this.requestUpdate()");
});
