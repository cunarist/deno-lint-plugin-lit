import { lifecycleSuper } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("lifecycle-super", lifecycleSuper);

Deno.test("lifecycle-super: allows overrides that chain to super", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      connectedCallback() { super.connectedCallback(); this.setup(); }
      disconnectedCallback() { this.teardown(); super.disconnectedCallback(); }
      update(changed) { super.update(changed); }
      willUpdate(changed) { super.willUpdate(changed); }
    }`,
  );
});

Deno.test("lifecycle-super: allows a conditional super call", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      updated(changed) {
        if (changed.size) { super.updated(changed); }
      }
    }`,
  );
});

Deno.test("lifecycle-super: ignores non-lifecycle methods", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      render() { return html\`\`; }
      handleClick() {}
    }`,
  );
});

Deno.test("lifecycle-super: ignores non-Lit classes", () => {
  assertValid(
    plugin,
    `class Plain extends HTMLElement {
      connectedCallback() { this.setup(); }
    }`,
  );
});

Deno.test("lifecycle-super: rejects a missing super call", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      connectedCallback() { this.setup(); }
    }`,
  );
});

Deno.test("lifecycle-super: rejects a super call to a different method", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      connectedCallback() { super.disconnectedCallback(); }
    }`,
  );
});

Deno.test("lifecycle-super: reports each unchained override", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      connectedCallback() {}
      disconnectedCallback() {}
      update() {}
    }`,
    3,
  );
});

Deno.test("lifecycle-super: ignores hooks whose base impl is empty", () => {
  // `willUpdate`, `firstUpdated`, and `updated` exist to be overridden without
  // chaining. Requiring `super` there flags idiomatic components.
  assertValid(
    plugin,
    `class El extends LitElement {
      willUpdate() {}
      firstUpdated() {}
      updated() {}
      shouldUpdate() { return true; }
    }`,
  );
});

Deno.test("lifecycle-super: accepts a super call from a nested block", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      attributeChangedCallback(name, old, value) {
        try { super.attributeChangedCallback(name, old, value); } catch {}
      }
    }`,
  );
});

Deno.test("lifecycle-super: highlights the method name", () => {
  const code = `class El extends LitElement {
  connectedCallback() { this.setup(); }
}`;
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "connectedCallback");
});
