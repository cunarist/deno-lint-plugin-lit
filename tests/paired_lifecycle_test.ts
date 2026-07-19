import { pairedLifecycle } from "#reactive-controller";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin(
  "paired-lifecycle",
  pairedLifecycle,
);

Deno.test("paired-lifecycle: allows both hooks", () => {
  assertValid(
    plugin,
    `class BarController implements ReactiveController {
      hostConnected(): void {}
      hostDisconnected(): void {}
    }`,
  );
});

Deno.test("paired-lifecycle: allows neither hook", () => {
  assertValid(
    plugin,
    `class BarController implements ReactiveController {
      constructor(host: ReactiveControllerHost) {
        host.addController(this);
      }
    }`,
  );
});

Deno.test("paired-lifecycle: ignores non-controllers", () => {
  assertValid(plugin, "class Store { load() {} }");
  assertValid(
    plugin,
    "class Bar extends LitElement { connectedCallback() {} }",
  );
});

Deno.test("paired-lifecycle: rejects hostConnected alone", () => {
  assertInvalid(
    plugin,
    `class BarController implements ReactiveController {
      hostConnected(): void {}
    }`,
  );
});

Deno.test("paired-lifecycle: rejects hostDisconnected alone", () => {
  assertInvalid(
    plugin,
    `class BarController implements ReactiveController {
      hostDisconnected(): void {}
    }`,
  );
});

Deno.test("paired-lifecycle: counts arrow-function fields", () => {
  assertValid(
    plugin,
    `class BarController implements ReactiveController {
      hostConnected = (): void => {};
      hostDisconnected = (): void => {};
    }`,
  );
});

Deno.test("paired-lifecycle: highlights the lone hook", () => {
  const code =
    "class BarController implements ReactiveController {\n  hostConnected(): void {}\n}";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "hostConnected");
});
