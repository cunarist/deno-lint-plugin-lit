import { implementsReactiveController } from "#reactive-controller";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin(
  "implements-reactive-controller",
  implementsReactiveController,
);

Deno.test("implements-reactive-controller: allows a declared controller", () => {
  assertValid(
    plugin,
    `class BarController implements ReactiveController {
      hostConnected(): void {}
      hostDisconnected(): void {}
    }`,
  );
});

Deno.test("implements-reactive-controller: ignores unrelated classes", () => {
  assertValid(plugin, "class Store { load() {} }");
  assertValid(plugin, "class Bar extends LitElement { render() {} }");
});

Deno.test("implements-reactive-controller: rejects a controller by name", () => {
  assertInvalid(plugin, "class BarController { hostConnected() {} }");
});

Deno.test("implements-reactive-controller: rejects a controller by hooks", () => {
  assertInvalid(
    plugin,
    `class Bar {
      hostConnected(): void {}
      hostDisconnected(): void {}
    }`,
  );
});

Deno.test("implements-reactive-controller: covers exported classes", () => {
  assertInvalid(plugin, "export class BarController {}");
});

Deno.test("implements-reactive-controller: highlights the class name", () => {
  const code = "class BarController { hostConnected() {} }";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "BarController");
});
