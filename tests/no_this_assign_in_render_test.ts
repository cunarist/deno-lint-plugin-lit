import { noThisAssignInRender } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("no-this-assign-in-render", noThisAssignInRender);

Deno.test("no-this-assign-in-render: allows reads and local assignment", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      render() {
        const label = this.name;
        let count = 0;
        count += 1;
        return html\`<p>\${label}</p>\`;
      }
    }`,
  );
});

Deno.test("no-this-assign-in-render: allows assignment in other methods", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      willUpdate() { this.label = "x"; }
      render() { return html\`<p>\${this.label}</p>\`; }
    }`,
  );
});

Deno.test("no-this-assign-in-render: ignores non-Lit classes", () => {
  assertValid(
    plugin,
    `class Plain {
      render() { this.count = 1; }
    }`,
  );
});

Deno.test("no-this-assign-in-render: rejects assignment to this", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      render() { this.count = 1; return html\`\`; }
    }`,
  );
});

Deno.test("no-this-assign-in-render: rejects nested and computed targets", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      render() { this.state.count = 1; return html\`\`; }
    }`,
  );
  assertInvalid(
    plugin,
    `class El extends LitElement {
      render() { this.items[0] = 1; return html\`\`; }
    }`,
  );
});

Deno.test("no-this-assign-in-render: rejects increment of this", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      render() { this.count++; return html\`\`; }
    }`,
  );
});

Deno.test("no-this-assign-in-render: rejects assignment in a nested callback", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      render() { [1].forEach(() => { this.count = 1; }); return html\`\`; }
    }`,
  );
});

Deno.test("no-this-assign-in-render: highlights the assignment", () => {
  const code = `class El extends LitElement {
  render() { this.count = 1; return html\`\`; }
}`;
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "this.count = 1");
});

Deno.test("no-this-assign-in-render: reports a handler written inline", () => {
  // Lexically inside render, so it fires. That form is separately rejected by
  // simple-template-expressions, which requires a bare name in a binding.
  assertInvalid(
    plugin,
    `class El extends LitElement {
      render() {
        return html\`<button @click=\${() => this.count++}>+</button>\`;
      }
    }`,
  );
});

Deno.test("no-this-assign-in-render: allows a handler kept as a class field", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      #onClick = () => { this.count++; };
      render() {
        return html\`<button @click=\${this.#onClick}>+</button>\`;
      }
    }`,
  );
});

Deno.test("no-this-assign-in-render: known limit — callback hoisted to a local", () => {
  // The arrow is declared in render and only *referenced* from the template.
  // Tracking that flow needs dataflow analysis, so this still reports. Keep
  // such callbacks as class fields, which the case above shows is clean.
  assertInvalid(
    plugin,
    `class El extends LitElement {
      render() {
        const setInput = (el) => { this.input = el; };
        return html\`<input \${ref(setInput)}>\`;
      }
    }`,
  );
});
