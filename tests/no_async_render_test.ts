import { noAsyncRender } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("no-async-render", noAsyncRender);

Deno.test("no-async-render: allows a synchronous render", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      render() { return html\`<p></p>\`; }
    }`,
  );
});

Deno.test("no-async-render: allows async on other methods", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      async load() { await fetch("/x"); }
      render() { return html\`\`; }
    }`,
  );
});

Deno.test("no-async-render: ignores non-Lit classes", () => {
  assertValid(
    plugin,
    `class Plain {
      async render() { return 1; }
    }`,
  );
});

Deno.test("no-async-render: ignores a static render", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      static async render() { return 1; }
    }`,
  );
});

Deno.test("no-async-render: rejects async render", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      async render() { return html\`\`; }
    }`,
  );
});

Deno.test("no-async-render: rejects on a ReactiveElement subclass", () => {
  assertInvalid(
    plugin,
    `class El extends ReactiveElement {
      async render() { return html\`\`; }
    }`,
  );
});

Deno.test("no-async-render: highlights the method name", () => {
  const code = `class El extends LitElement {
  async render() { return html\`\`; }
}`;
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "render");
});
