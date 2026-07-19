import { noDomQuery } from "#dom-ref";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("no-dom-query", noDomQuery);

Deno.test("no-dom-query: allows querying outside a component", () => {
  assertValid(plugin, "document.querySelector('#root');");
  assertValid(
    plugin,
    "class C { find() { return root.querySelectorAll('a'); } }",
  );
});

Deno.test("no-dom-query: allows a ref callback in a component", () => {
  assertValid(
    plugin,
    "class A extends LitElement { #onInput(el) { this.#input = el; } }",
  );
});

Deno.test("no-dom-query: rejects querySelector in a component", () => {
  assertInvalid(
    plugin,
    "class A extends LitElement { go() { this.renderRoot.querySelector('input'); } }",
  );
});

Deno.test("no-dom-query: rejects querySelectorAll in a component", () => {
  assertInvalid(
    plugin,
    "class A extends LitElement { go() { this.shadowRoot.querySelectorAll('li'); } }",
  );
});

Deno.test("no-dom-query: rejects it on a ReactiveElement subclass too", () => {
  assertInvalid(
    plugin,
    "class A extends ReactiveElement { go() { document.querySelector('b'); } }",
  );
});

Deno.test("no-dom-query: highlights the callee", () => {
  const code =
    "class A extends LitElement { go() { this.renderRoot.querySelector('input'); } }";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "this.renderRoot.querySelector");
});
