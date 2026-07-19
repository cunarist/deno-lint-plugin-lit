import { noDispatchInRender } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("no-dispatch-in-render", noDispatchInRender);

Deno.test("no-dispatch-in-render: allows dispatch from other methods", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      onClick() { this.dispatchEvent(new CustomEvent("pick")); }
      render() { return html\`\`; }
    }`,
  );
});

Deno.test("no-dispatch-in-render: allows other calls in render", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      render() { return html\`\${this.format(this.value)}\`; }
    }`,
  );
});

Deno.test("no-dispatch-in-render: ignores non-Lit classes", () => {
  assertValid(
    plugin,
    `class Plain {
      render() { this.dispatchEvent(new Event("x")); }
    }`,
  );
});

Deno.test("no-dispatch-in-render: rejects dispatch on this", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      render() { this.dispatchEvent(new Event("x")); return html\`\`; }
    }`,
  );
});

Deno.test("no-dispatch-in-render: rejects dispatch on another target", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      render() { window.dispatchEvent(new Event("x")); return html\`\`; }
    }`,
  );
});

Deno.test("no-dispatch-in-render: rejects dispatch in a nested callback", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      render() {
        [1].forEach(() => { this.dispatchEvent(new Event("x")); });
        return html\`\`;
      }
    }`,
  );
});

Deno.test("no-dispatch-in-render: highlights the call", () => {
  const code = `class El extends LitElement {
  render() { this.dispatchEvent(new Event("x")); return html\`\`; }
}`;
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, 'this.dispatchEvent(new Event("x"))');
});
