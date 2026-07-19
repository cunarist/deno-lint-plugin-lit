import { noPropertyChangeInUpdated } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin(
  "no-property-change-in-updated",
  noPropertyChangeInUpdated,
);

Deno.test("no-property-change-in-updated: allows non-reactive writes", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      @property({ type: Number }) count = 0;
      cache = 0;
      updated() { this.cache = this.count; }
    }`,
  );
});

Deno.test("no-property-change-in-updated: allows writes in willUpdate", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      @state() count = 0;
      willUpdate() { this.count = 1; }
    }`,
  );
});

Deno.test("no-property-change-in-updated: ignores non-Lit classes", () => {
  assertValid(
    plugin,
    `class Plain {
      @property() count = 0;
      updated() { this.count = 1; }
    }`,
  );
});

Deno.test("no-property-change-in-updated: rejects a write in updated", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      @property({ type: Number }) count = 0;
      updated() { this.count = 1; }
    }`,
  );
});

Deno.test("no-property-change-in-updated: rejects a write in firstUpdated", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      @state() ready = false;
      firstUpdated() { this.ready = true; }
    }`,
  );
});

Deno.test("no-property-change-in-updated: rejects an increment", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      @state() count = 0;
      updated() { this.count++; }
    }`,
  );
});

Deno.test("no-property-change-in-updated: rejects static properties entries", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      static properties = { count: { type: Number } };
      updated() { this.count = 1; }
    }`,
  );
});

Deno.test("no-property-change-in-updated: highlights the assignment", () => {
  const code = `class El extends LitElement {
  @state() count = 0;
  updated() { this.count = 1; }
}`;
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "this.count = 1");
});
