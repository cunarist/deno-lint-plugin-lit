import { noTimers } from "#strict";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("no-timers", noTimers);

Deno.test("no-timers: allows timers outside a component", () => {
  assertValid(plugin, "setTimeout(() => run(), 10);");
  assertValid(plugin, "class C { hostConnected() { setInterval(tick, 10); } }");
});

Deno.test("no-timers: allows unrelated calls in a component", () => {
  assertValid(
    plugin,
    "class A extends LitElement { go() { this.#load(); } }",
  );
});

Deno.test("no-timers: rejects each timer in a component", () => {
  for (
    const name of [
      "setTimeout",
      "setInterval",
      "requestAnimationFrame",
      "queueMicrotask",
    ]
  ) {
    assertInvalid(
      plugin,
      `class A extends LitElement { go() { ${name}(() => this.x, 0); } }`,
    );
  }
});

Deno.test("no-timers: rejects a namespaced timer", () => {
  assertInvalid(
    plugin,
    "class A extends LitElement { go() { globalThis.setTimeout(tick, 0); } }",
  );
});

Deno.test("no-timers: highlights the callee", () => {
  const code =
    "class A extends LitElement { go() { queueMicrotask(this.#tick); } }";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "queueMicrotask");
});
