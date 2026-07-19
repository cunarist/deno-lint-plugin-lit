import { noArrayMutationWithoutReassign } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin(
  "no-array-mutation-without-reassign",
  noArrayMutationWithoutReassign,
);

Deno.test("no-array-mutation-without-reassign: allows replacing the array", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      @property({ type: Array }) items = [];
      add(item) { this.items = [...this.items, item]; }
    }`,
  );
});

Deno.test("no-array-mutation-without-reassign: allows mutating a local array", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      @property({ type: Array }) items = [];
      add(item) {
        const next = [...this.items];
        next.push(item);
        this.items = next;
      }
    }`,
  );
});

Deno.test("no-array-mutation-without-reassign: allows mutating a non-reactive field", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      cache = [];
      add(item) { this.cache.push(item); }
    }`,
  );
});

Deno.test("no-array-mutation-without-reassign: allows non-mutating methods", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      @state() items = [];
      count() { return this.items.filter(Boolean).length; }
    }`,
  );
});

Deno.test("no-array-mutation-without-reassign: ignores non-Lit classes", () => {
  assertValid(
    plugin,
    `class Plain {
      @property() items = [];
      add(item) { this.items.push(item); }
    }`,
  );
});

Deno.test("no-array-mutation-without-reassign: rejects push on a reactive property", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      @property({ type: Array }) items = [];
      add(item) { this.items.push(item); }
    }`,
  );
});

Deno.test("no-array-mutation-without-reassign: rejects every mutating method", () => {
  const methods = [
    "push",
    "pop",
    "shift",
    "unshift",
    "splice",
    "sort",
    "reverse",
    "fill",
    "copyWithin",
  ];
  for (const method of methods) {
    assertInvalid(
      plugin,
      `class El extends LitElement {
        @state() items = [];
        go() { this.items.${method}(); }
      }`,
    );
  }
});

Deno.test("no-array-mutation-without-reassign: rejects static properties entries", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      static properties = { items: { type: Array } };
      add(item) { this.items.push(item); }
    }`,
  );
});

Deno.test("no-array-mutation-without-reassign: highlights the call", () => {
  const code = `class El extends LitElement {
  @state() items = [];
  add(item) { this.items.push(item); }
}`;
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "this.items.push(item)");
});
