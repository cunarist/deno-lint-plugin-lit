import { noAsyncLifecycle } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("no-async-lifecycle", noAsyncLifecycle);

Deno.test("no-async-lifecycle: allows synchronous hooks", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      willUpdate() {}
      updated() {}
      connectedCallback() { super.connectedCallback(); }
    }`,
  );
});

Deno.test("no-async-lifecycle: allows async performUpdate", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      async performUpdate() { await 0; super.performUpdate(); }
    }`,
  );
});

Deno.test("no-async-lifecycle: allows async on ordinary methods", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      async loadItems() { await fetch("/x"); }
    }`,
  );
});

Deno.test("no-async-lifecycle: ignores non-Lit classes", () => {
  assertValid(
    plugin,
    `class Plain {
      async updated() {}
    }`,
  );
});

Deno.test("no-async-lifecycle: rejects async willUpdate", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      async willUpdate() { await this.load(); }
    }`,
  );
});

Deno.test("no-async-lifecycle: rejects each banned hook", () => {
  const hooks = [
    "willUpdate",
    "update",
    "shouldUpdate",
    "firstUpdated",
    "updated",
    "connectedCallback",
    "disconnectedCallback",
  ];
  for (const hook of hooks) {
    assertInvalid(
      plugin,
      `class El extends LitElement {
        async ${hook}() { await 0; }
      }`,
    );
  }
});

Deno.test("no-async-lifecycle: highlights the hook name", () => {
  const code = `class El extends LitElement {
  async firstUpdated() { await 0; }
}`;
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "firstUpdated");
});
