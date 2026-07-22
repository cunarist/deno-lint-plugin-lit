import { noFetchInComponent } from "#reactive-controller";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("no-fetch-in-component", noFetchInComponent);

Deno.test("no-fetch-in-component: allows fetch in a controller", () => {
  assertValid(
    plugin,
    [
      "class DataController implements ReactiveController {",
      "  async load() {",
      '    await fetch("/api");',
      "  }",
      "}",
    ].join("\n"),
  );
});

Deno.test("no-fetch-in-component: allows fetch at module scope", () => {
  assertValid(plugin, 'const data = await fetch("/api");');
});

Deno.test("no-fetch-in-component: allows a method named fetch on a member", () => {
  assertValid(
    plugin,
    [
      "class PathBar extends LitElement {",
      "  load() {",
      '    this.#api.fetch("/api");',
      "  }",
      "}",
    ].join("\n"),
  );
});

Deno.test("no-fetch-in-component: rejects fetch in a component", () => {
  const diagnostics = assertInvalid(
    plugin,
    [
      "class PathBar extends LitElement {",
      "  async load() {",
      '    await fetch("/api");',
      "  }",
      "}",
    ].join("\n"),
  );
  if (diagnostics[0]?.message !== "Lit component calls `fetch`.") {
    throw new Error(`unexpected message: ${diagnostics[0]?.message}`);
  }
});

Deno.test("no-fetch-in-component: rejects a signalled fetch too", () => {
  assertInvalid(
    plugin,
    [
      "class PathBar extends LitElement {",
      "  async load() {",
      '    await fetch("/api", { signal: this.#aborter.signal });',
      "  }",
      "}",
    ].join("\n"),
  );
});

Deno.test("no-fetch-in-component: catches a qualified fetch", () => {
  assertInvalid(
    plugin,
    [
      "class PathBar extends ReactiveElement {",
      "  async load() {",
      '    await window.fetch("/api");',
      "  }",
      "}",
    ].join("\n"),
  );
});

Deno.test("no-fetch-in-component: highlights the callee", () => {
  const code = [
    "class PathBar extends LitElement {",
    "  async load() {",
    '    await fetch("/api");',
    "  }",
    "}",
  ].join("\n");
  const diagnostics = assertInvalid(plugin, code);
  const [diagnostic] = diagnostics;
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "fetch");
});
