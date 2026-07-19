import { simpleTemplateExpressions } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin(
  "simple-template-expressions",
  simpleTemplateExpressions,
);

Deno.test("simple-template-expressions: allows simple references", () => {
  assertValid(plugin, "const t = html`<div>${name}</div>`;");
  assertValid(plugin, "const t = html`<div>${this}</div>`;");
  assertValid(plugin, "const t = html`<div>${this.name}</div>`;");
  assertValid(plugin, "const t = html`<div>${this.a.b.c.d}</div>`;");
  assertValid(plugin, "const t = html`<div @click=${this.#onClick}></div>`;");
  assertValid(plugin, "const t = html`<x-y .prop=${this.value}></x-y>`;");
});

Deno.test("simple-template-expressions: allows the hoisted-out directive form", () => {
  assertValid(
    plugin,
    [
      "const renderedItems = repeat(this.items, (i) => this.itemId(i), this.#renderNode);",
      "return html`<div>${renderedItems}</div>`;",
    ].join("\n"),
  );
});

Deno.test("simple-template-expressions: rejects directive calls", () => {
  const [diagnostic] = assertInvalid(
    plugin,
    "const t = html`<div>${repeat(this.items, k, v)}</div>`;",
  );
  if (!diagnostic) throw new Error("expected a diagnostic");
  if (!diagnostic.message.includes("Directive call `repeat(…)`")) {
    throw new Error(`unexpected message: ${diagnostic.message}`);
  }
  if (!diagnostic.hint?.includes("hoisted out")) {
    throw new Error(`unexpected hint: ${diagnostic.hint}`);
  }
});

Deno.test("simple-template-expressions: rejects plain calls", () => {
  const [diagnostic] = assertInvalid(
    plugin,
    "const t = html`<div>${this.label()}</div>`;",
  );
  if (!diagnostic) throw new Error("expected a diagnostic");
  if (diagnostic.message !== "Call expression in template.") {
    throw new Error(`unexpected message: ${diagnostic.message}`);
  }
});

Deno.test("simple-template-expressions: rejects arrow functions", () => {
  const [diagnostic] = assertInvalid(
    plugin,
    "const t = html`<div @click=${() => this.go()}></div>`;",
  );
  if (!diagnostic) throw new Error("expected a diagnostic");
  if (diagnostic.message !== "Inline arrow function in template.") {
    throw new Error(`unexpected message: ${diagnostic.message}`);
  }
  if (!diagnostic.hint?.includes("private method field")) {
    throw new Error(`unexpected hint: ${diagnostic.hint}`);
  }
});

Deno.test("simple-template-expressions: rejects .bind(this)", () => {
  const [diagnostic] = assertInvalid(
    plugin,
    "const t = html`<div @click=${this.go.bind(this)}></div>`;",
  );
  if (!diagnostic) throw new Error("expected a diagnostic");
  if (diagnostic.message !== "`.bind(this)` in template.") {
    throw new Error(`unexpected message: ${diagnostic.message}`);
  }
});

Deno.test("simple-template-expressions: rejects .map(…)", () => {
  const [diagnostic] = assertInvalid(
    plugin,
    "const t = html`<ul>${this.items.map((i) => i.name)}</ul>`;",
  );
  if (!diagnostic) throw new Error("expected a diagnostic");
  if (diagnostic.message !== "`.map(…)` call in template.") {
    throw new Error(`unexpected message: ${diagnostic.message}`);
  }
  if (!diagnostic.hint?.includes("repeat")) {
    throw new Error(`unexpected hint: ${diagnostic.hint}`);
  }
});

Deno.test("simple-template-expressions: rejects conditionals", () => {
  const [diagnostic] = assertInvalid(
    plugin,
    "const t = html`<div>${cond ? a : b}</div>`;",
  );
  if (!diagnostic) throw new Error("expected a diagnostic");
  if (diagnostic.message !== "Conditional expression in template.") {
    throw new Error(`unexpected message: ${diagnostic.message}`);
  }
  if (!diagnostic.hint?.includes("Precompute")) {
    throw new Error(`unexpected hint: ${diagnostic.hint}`);
  }
});

Deno.test("simple-template-expressions: rejects logical expressions", () => {
  assertInvalid(plugin, "const t = html`<div>${a && b}</div>`;");
  assertInvalid(plugin, "const t = html`<div>${a || b}</div>`;");
});

Deno.test("simple-template-expressions: rejects computed member access", () => {
  const [diagnostic] = assertInvalid(
    plugin,
    "const t = html`<div>${this.items[0]}</div>`;",
  );
  if (!diagnostic) throw new Error("expected a diagnostic");
  if (diagnostic.message !== "Computed member access in template.") {
    throw new Error(`unexpected message: ${diagnostic.message}`);
  }
});

Deno.test("simple-template-expressions: rejects other complex shapes", () => {
  assertInvalid(plugin, "const t = html`<div>${`x${y}`}</div>`;");
  assertInvalid(plugin, "const t = html`<div .x=${{ a: 1 }}></div>`;");
  assertInvalid(plugin, "const t = html`<div .x=${[1, 2]}></div>`;");
  assertInvalid(plugin, "const t = html`<div>${await this.load()}</div>`;");
  assertInvalid(plugin, "const t = html`<div>${a + b}</div>`;");
});

Deno.test("simple-template-expressions: reports every offending binding", () => {
  assertInvalid(
    plugin,
    "const t = html`<div>${a()}${b ? c : d}${this.x}</div>`;",
    2,
  );
});

Deno.test("simple-template-expressions: ignores non-html templates", () => {
  assertValid(plugin, "const t = sql`${a ? b : c}`;");
});

Deno.test("simple-template-expressions: rejects a conditional return in render()", () => {
  const code = [
    "class X extends LitElement {",
    "  render() {",
    "    return this.open ? html`<a></a>` : html`<b></b>`;",
    "  }",
    "}",
  ].join("\n");
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  if (
    diagnostic.message !== "Conditional expression returned from `render()`."
  ) {
    throw new Error(`unexpected message: ${diagnostic.message}`);
  }
});

Deno.test("simple-template-expressions: allows an early return inside an if", () => {
  assertValid(
    plugin,
    [
      "class X extends LitElement {",
      "  render() {",
      "    if (this.open) {",
      "      return html`<a></a>`;",
      "    }",
      "    return html`<b></b>`;",
      "  }",
      "}",
    ].join("\n"),
  );
});

Deno.test("simple-template-expressions: ignores conditional returns outside render()", () => {
  assertValid(
    plugin,
    [
      "class X extends LitElement {",
      "  label() {",
      "    return this.open ? 1 : 2;",
      "  }",
      "}",
    ].join("\n"),
  );
});

Deno.test("simple-template-expressions: highlights the offending expression", () => {
  const code = "const t = html`<div>${repeat(this.items, k, v)}</div>`;";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "repeat(this.items, k, v)");
});

Deno.test("simple-template-expressions: highlights the arrow function only", () => {
  const code = "const t = html`<div @click=${() => this.go()}></div>`;";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "() => this.go()");
});
