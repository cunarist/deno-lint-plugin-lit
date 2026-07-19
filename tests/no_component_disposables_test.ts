import { noComponentDisposables } from "#strict";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("no-component-disposables", noComponentDisposables);

Deno.test("no-component-disposables: allows resources in a controller", () => {
  assertValid(
    plugin,
    "class C { hostConnected() { this.#observer = new ResizeObserver(this.#onResize); } }",
  );
  assertValid(
    plugin,
    "class C { hostDisconnected() { this.#observer.disconnect(); } }",
  );
});

Deno.test("no-component-disposables: allows ordinary component work", () => {
  assertValid(
    plugin,
    "class A extends LitElement { render() { return html`<b @click=${this.#onClick}></b>`; } }",
  );
});

Deno.test("no-component-disposables: rejects each disposable constructor", () => {
  for (
    const name of [
      "AbortController",
      "EventSource",
      "IntersectionObserver",
      "MutationObserver",
      "ResizeObserver",
      "WebSocket",
      "Worker",
    ]
  ) {
    assertInvalid(
      plugin,
      `class A extends LitElement { go() { this.#x = new ${name}(); } }`,
    );
  }
});

Deno.test("no-component-disposables: rejects each disposable method", () => {
  for (
    const name of [
      "addEventListener",
      "removeEventListener",
    ]
  ) {
    assertInvalid(
      plugin,
      `class A extends LitElement { go() { this.#x.${name}(); } }`,
    );
  }
});

Deno.test("no-component-disposables: highlights the constructor", () => {
  const code =
    "class A extends LitElement { go() { this.#x = new ResizeObserver(this.#onResize); } }";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "ResizeObserver");
});

Deno.test("no-component-disposables: highlights the method callee", () => {
  const code =
    "class A extends LitElement { go() { this.#el.addEventListener('x', this.#on); } }";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "this.#el.addEventListener");
});
