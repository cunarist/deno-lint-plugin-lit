import { preferCreateRef } from "#dom-ref";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("prefer-create-ref", preferCreateRef);

Deno.test("prefer-create-ref: flags an inline stash arrow", () => {
  assertInvalid(
    plugin,
    "class A extends LitElement { render() { const r = ref((el) => (this.#input = el)); return html`<b>`; } }",
  );
});

Deno.test("prefer-create-ref: flags ?? null, ?? undefined, as T, and !", () => {
  for (
    const rhs of [
      "el ?? null",
      "el ?? undefined",
      "el as HTMLInputElement",
      "el!",
    ]
  ) {
    assertInvalid(
      plugin,
      `class A extends LitElement { render() { const r = ref((el) => (this.#input = ${rhs})); return html\`<b>\`; } }`,
    );
  }
});

Deno.test("prefer-create-ref: flags a block-body stash arrow", () => {
  assertInvalid(
    plugin,
    "class A extends LitElement { render() { const r = ref((el) => { this.#input = el ?? null; }); return html`<b>`; } }",
  );
});

Deno.test("prefer-create-ref: flags a this-referenced arrow field", () => {
  assertInvalid(
    plugin,
    "class A extends LitElement { #store = (el) => { this.#input = el ?? null; }; render() { const r = ref(this.#store); return html`<b>`; } }",
  );
});

Deno.test("prefer-create-ref: flags a this-referenced method", () => {
  assertInvalid(
    plugin,
    "class A extends LitElement { #store(el) { this.#input = el; } render() { const r = ref(this.#store); return html`<b>`; } }",
  );
});

Deno.test("prefer-create-ref: flags a free const arrow in the same file", () => {
  assertInvalid(
    plugin,
    "let saved; const store = (el) => { saved = el; }; class A extends LitElement { render() { const r = ref(store); return html`<b>`; } }",
  );
});

Deno.test("prefer-create-ref: flags a free function declaration", () => {
  assertInvalid(
    plugin,
    "let saved; function store(el) { saved = el; } class A extends LitElement { render() { const r = ref(store); return html`<b>`; } }",
  );
});

Deno.test("prefer-create-ref: flags a local const arrow in render", () => {
  assertInvalid(
    plugin,
    "class A extends LitElement { render() { const store = (el) => { this.#input = el; }; const r = ref(store); return html`<b>`; } }",
  );
});

Deno.test("prefer-create-ref: allows a callback that does more", () => {
  assertValid(
    plugin,
    "class A extends LitElement { render() { const r = ref((el) => { this.#input = el; el?.focus(); }); return html`<b>`; } }",
  );
});

Deno.test("prefer-create-ref: flags a type-narrowing ternary stash", () => {
  assertInvalid(
    plugin,
    "class A extends LitElement { render() { const r = ref((el) => { this.#input = el instanceof HTMLDivElement ? el : null; }); return html`<b>`; } }",
  );
});

Deno.test("prefer-create-ref: flags a ?? fallback stash", () => {
  assertInvalid(
    plugin,
    "class A extends LitElement { render() { const r = ref((el) => (this.#input = el ?? this.#fallback)); return html`<b>`; } }",
  );
});

Deno.test("prefer-create-ref: allows storing a value derived from the element", () => {
  assertValid(
    plugin,
    "class A extends LitElement { render() { const r = ref((el) => (this.#width = el?.offsetWidth)); return html`<b>`; } }",
  );
  assertValid(
    plugin,
    "class A extends LitElement { render() { const r = ref((el) => (this.#input = document.activeElement)); return html`<b>`; } }",
  );
});

Deno.test("prefer-create-ref: allows a destructured parameter", () => {
  assertValid(
    plugin,
    "class A extends LitElement { render() { const r = ref(({ el }) => (this.#input = el)); return html`<b>`; } }",
  );
});

Deno.test("prefer-create-ref: allows ref of an existing createRef field", () => {
  assertValid(
    plugin,
    "class A extends LitElement { #input = createRef(); render() { const r = ref(this.#input); return html`<b>`; } }",
  );
});

Deno.test("prefer-create-ref: allows a getter/setter, not matched as a callback", () => {
  assertValid(
    plugin,
    "class A extends LitElement { set store(el) { this.#input = el; } render() { const r = ref(this.store); return html`<b>`; } }",
  );
});

Deno.test("prefer-create-ref: bails on a reassigned binding", () => {
  assertValid(
    plugin,
    "class A extends LitElement { render() { let store = (el) => { this.#input = el; }; store = other; const r = ref(store); return html`<b>`; } }",
  );
});

Deno.test("prefer-create-ref: bails on a parameter of the same name", () => {
  assertValid(
    plugin,
    "class A extends LitElement { render(store) { const r = ref(store); return html`<b>`; } }",
  );
});

Deno.test("prefer-create-ref: bails on an imported binding", () => {
  assertValid(
    plugin,
    'import { store } from "./x.js"; class A extends LitElement { render() { const r = ref(store); return html`<b>`; } }',
  );
});

Deno.test("prefer-create-ref: ignores a non-ref callee", () => {
  assertValid(
    plugin,
    "class A extends LitElement { render() { const r = wire((el) => (this.#input = el)); return html`<b>`; } }",
  );
});

Deno.test("prefer-create-ref: catches an inline stash inside the html template", () => {
  const code =
    "class A extends LitElement { render() { return html`<b ${ref((el) => (this.#input = el ?? null))}></b>`; } }";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(
    code,
    diagnostic,
    "ref((el) => (this.#input = el ?? null))",
  );
});
