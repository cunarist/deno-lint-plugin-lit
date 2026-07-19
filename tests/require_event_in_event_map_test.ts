import { requireEventInEventMap } from "#strict";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("require-event-in-event-map", requireEventInEventMap);

const MAP = [
  "declare global {",
  "  interface HTMLElementEventMap {",
  '    "cl-picked": CustomEvent<string>;',
  "  }",
  "}",
].join("\n");

Deno.test("require-event-in-event-map: allows a declared event", () => {
  assertValid(
    plugin,
    [
      MAP,
      "class PathBar extends LitElement {",
      "  fire() {",
      '    this.dispatchEvent(new CustomEvent("cl-picked", { detail: 1 }));',
      "  }",
      "}",
    ].join("\n"),
  );
});

Deno.test("require-event-in-event-map: accepts the entry declared after", () => {
  assertValid(
    plugin,
    [
      "class PathBar extends LitElement {",
      "  fire() {",
      '    this.dispatchEvent(new CustomEvent("cl-picked"));',
      "  }",
      "}",
      MAP,
    ].join("\n"),
  );
});

Deno.test("require-event-in-event-map: ignores non-components", () => {
  assertValid(
    plugin,
    [
      "class Plain {",
      "  fire() {",
      '    this.dispatchEvent(new CustomEvent("cl-picked"));',
      "  }",
      "}",
    ].join("\n"),
  );
});

Deno.test("require-event-in-event-map: ignores a computed event name", () => {
  assertValid(
    plugin,
    [
      "class PathBar extends LitElement {",
      "  fire() {",
      "    this.dispatchEvent(new CustomEvent(this.eventName));",
      "  }",
      "}",
    ].join("\n"),
  );
});

Deno.test("require-event-in-event-map: rejects an undeclared event", () => {
  assertInvalid(
    plugin,
    [
      MAP,
      "class PathBar extends LitElement {",
      "  fire() {",
      '    this.dispatchEvent(new CustomEvent("cl-dropped"));',
      "  }",
      "}",
    ].join("\n"),
  );
});

Deno.test("require-event-in-event-map: rejects a plain Event too", () => {
  assertInvalid(
    plugin,
    [
      "class PathBar extends LitElement {",
      "  fire() {",
      '    this.dispatchEvent(new Event("cl-reset"));',
      "  }",
      "}",
    ].join("\n"),
  );
});

Deno.test("require-event-in-event-map: reports each undeclared name", () => {
  const diagnostics = assertInvalid(
    plugin,
    [
      "class PathBar extends LitElement {",
      "  fire() {",
      '    this.dispatchEvent(new CustomEvent("cl-a"));',
      '    this.dispatchEvent(new CustomEvent("cl-b"));',
      "  }",
      "}",
    ].join("\n"),
    2,
  );
  if (diagnostics[0]?.message !== 'No HTMLElementEventMap entry for "cl-a".') {
    throw new Error(`unexpected message: ${diagnostics[0]?.message}`);
  }
});

Deno.test("require-event-in-event-map: highlights the event name", () => {
  const code = [
    "class PathBar extends LitElement {",
    "  fire() {",
    '    this.dispatchEvent(new CustomEvent("cl-dropped"));',
    "  }",
    "}",
  ].join("\n");
  const diagnostics = assertInvalid(plugin, code);
  const [diagnostic] = diagnostics;
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, '"cl-dropped"');
});
