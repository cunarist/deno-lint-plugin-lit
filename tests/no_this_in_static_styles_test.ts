import { noThisInStaticStyles } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("no-this-in-static-styles", noThisInStaticStyles);

Deno.test("no-this-in-static-styles: allows a plain static styles", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      static styles = css\`:host { color: red; }\`;
    }`,
  );
});

Deno.test("no-this-in-static-styles: allows this in instance members", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      styles = this.color;
      render() { return html\`\${this.color}\`; }
    }`,
  );
});

Deno.test("no-this-in-static-styles: ignores other static fields", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      static properties = { color: {} };
      render() { return html\`\`; }
    }`,
  );
});

Deno.test("no-this-in-static-styles: ignores non-Lit classes", () => {
  // A static `styles` built from `css` now marks the class as Lit, so a genuine
  // non-Lit class must not use it — `this` here is the class object, not a host.
  assertValid(
    plugin,
    `class Plain {
      static styles = this.color;
    }`,
  );
});

Deno.test("no-this-in-static-styles: rejects this in the initialiser", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      static styles = css\`:host { color: \${this.color}; }\`;
    }`,
  );
});

Deno.test("no-this-in-static-styles: rejects this inside an arrow", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      static styles = [1].map(() => this.color);
    }`,
  );
});

Deno.test("no-this-in-static-styles: highlights the this expression", () => {
  const code = `class El extends LitElement {
  static styles = css\`\${this.color}\`;
}`;
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "this");
});
