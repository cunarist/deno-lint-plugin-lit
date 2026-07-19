import { requireDispatchOnThis } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("require-dispatch-on-this", requireDispatchOnThis);

Deno.test("require-dispatch-on-this: accepts dispatch on the component", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      #go() { this.dispatchEvent(new CustomEvent("edit")); }
    }`,
  );
});

Deno.test("require-dispatch-on-this: rejects dispatch elsewhere", () => {
  // A parent's `@edit=` binding listens on the element, so this never arrives.
  assertInvalid(
    plugin,
    `class El extends LitElement {
      #go() { this.#bus.dispatchEvent(new CustomEvent("edit")); }
    }`,
  );
});

Deno.test("require-dispatch-on-this: ignores non-Lit classes", () => {
  assertValid(
    plugin,
    "class Plain { go() { this.bus.dispatchEvent(new Event('x')); } }",
  );
});

Deno.test("require-dispatch-on-this: highlights the call", () => {
  const code = `class El extends LitElement {
  go() { this.bus.dispatchEvent(new CustomEvent("edit")); }
}`;
  const [d] = assertInvalid(plugin, code);
  if (!d) throw new Error("expected a diagnostic");
  assertReportedText(
    code,
    d,
    'this.bus.dispatchEvent(new CustomEvent("edit"))',
  );
});
