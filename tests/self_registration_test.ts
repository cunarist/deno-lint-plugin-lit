import { selfRegistration } from "#reactive-controller";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin(
  "self-registration",
  selfRegistration,
);

Deno.test("self-registration: allows host.addController(this)", () => {
  assertValid(
    plugin,
    `class BarController implements ReactiveController {
      constructor(host: ReactiveControllerHost) {
        host.addController(this);
      }
    }`,
  );
});

Deno.test("self-registration: allows registering via a stored host", () => {
  assertValid(
    plugin,
    `class BarController implements ReactiveController {
      #host: ReactiveControllerHost;
      constructor(host: ReactiveControllerHost) {
        this.#host = host;
        this.#host.addController(this);
      }
    }`,
  );
});

Deno.test("self-registration: ignores non-controllers", () => {
  assertValid(plugin, "class Store { constructor() {} }");
});

Deno.test("self-registration: rejects a missing registration", () => {
  assertInvalid(
    plugin,
    `class BarController implements ReactiveController {
      constructor(host: ReactiveControllerHost) {}
    }`,
  );
});

Deno.test("self-registration: rejects registration outside the constructor", () => {
  assertInvalid(
    plugin,
    `class BarController implements ReactiveController {
      #host: ReactiveControllerHost;
      constructor(host: ReactiveControllerHost) {
        this.#host = host;
      }
      hostConnected(): void {
        this.#host.addController(this);
      }
    }`,
  );
});

Deno.test("self-registration: rejects registering something else", () => {
  assertInvalid(
    plugin,
    `class BarController implements ReactiveController {
      constructor(host: ReactiveControllerHost) {
        host.addController(other);
      }
    }`,
  );
});

Deno.test("self-registration: highlights the constructor keyword", () => {
  const code =
    "class BarController implements ReactiveController {\n  constructor(host: ReactiveControllerHost) {}\n}";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "constructor");
});
