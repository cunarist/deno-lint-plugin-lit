import { requireAbortSignalInFetch } from "#reactive-controller";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin(
  "require-abort-signal-in-fetch",
  requireAbortSignalInFetch,
);

Deno.test("require-abort-signal-in-fetch: allows a signal", () => {
  assertValid(
    plugin,
    [
      "class DataController implements ReactiveController {",
      "  async load() {",
      '    await fetch("/api", { signal: this.#aborter.signal });',
      "  }",
      "}",
    ].join("\n"),
  );
});

Deno.test("require-abort-signal-in-fetch: allows spread options", () => {
  assertValid(
    plugin,
    [
      "class DataController implements ReactiveController {",
      "  async load() {",
      '    await fetch("/api", { ...this.#init });',
      "  }",
      "}",
    ].join("\n"),
  );
});

Deno.test("require-abort-signal-in-fetch: allows non-literal options", () => {
  assertValid(
    plugin,
    [
      "class DataController implements ReactiveController {",
      "  async load() {",
      '    await fetch("/api", this.#init);',
      "  }",
      "}",
    ].join("\n"),
  );
});

Deno.test("require-abort-signal-in-fetch: ignores components", () => {
  assertValid(
    plugin,
    [
      "class PathBar extends LitElement {",
      "  async load() {",
      '    await fetch("/api");',
      "  }",
      "}",
    ].join("\n"),
  );
});

Deno.test("require-abort-signal-in-fetch: ignores plain classes", () => {
  assertValid(
    plugin,
    [
      "class ApiClient {",
      "  async load() {",
      '    await fetch("/api");',
      "  }",
      "}",
    ].join("\n"),
  );
});

Deno.test("require-abort-signal-in-fetch: rejects a bare fetch", () => {
  assertInvalid(
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

Deno.test("require-abort-signal-in-fetch: rejects options without a signal", () => {
  const diagnostics = assertInvalid(
    plugin,
    [
      "class SearchController implements ReactiveController {",
      "  hostDisconnected() {}",
      "  async load() {",
      '    await fetch("/api", { method: "POST" });',
      "  }",
      "}",
    ].join("\n"),
  );
  if (
    diagnostics[0]?.message !==
      "`fetch` in a reactive controller without a `signal`."
  ) {
    throw new Error(`unexpected message: ${diagnostics[0]?.message}`);
  }
});

Deno.test("require-abort-signal-in-fetch: catches a qualified fetch", () => {
  assertInvalid(
    plugin,
    [
      "class DataController implements ReactiveController {",
      "  async load() {",
      '    await globalThis.fetch("/api");',
      "  }",
      "}",
    ].join("\n"),
  );
});

Deno.test("require-abort-signal-in-fetch: highlights the callee", () => {
  const code = [
    "class DataController implements ReactiveController {",
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
