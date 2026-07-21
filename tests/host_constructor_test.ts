import { hostConstructor } from "#reactive-controller";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin(
  "host-constructor",
  hostConstructor,
);

Deno.test("host-constructor: allows the canonical constructor", () => {
  assertValid(
    plugin,
    `class BarController implements ReactiveController {
      constructor(host: ReactiveControllerHost) {
        host.addController(this);
      }
    }`,
  );
});

Deno.test("host-constructor: ignores non-controllers", () => {
  assertValid(plugin, "class Store { constructor(a: number, b: number) {} }");
});

Deno.test("host-constructor: rejects a missing constructor", () => {
  assertInvalid(
    plugin,
    "class BarController implements ReactiveController {}",
  );
});

Deno.test("host-constructor: rejects extra parameters", () => {
  assertInvalid(
    plugin,
    `class BarController implements ReactiveController {
      constructor(host: ReactiveControllerHost, count: number) {}
    }`,
  );
});

Deno.test("host-constructor: rejects a misnamed parameter", () => {
  assertInvalid(
    plugin,
    `class BarController implements ReactiveController {
      constructor(owner: ReactiveControllerHost) {}
    }`,
  );
});

Deno.test("host-constructor: rejects a wrong type", () => {
  assertInvalid(
    plugin,
    `class BarController implements ReactiveController {
      constructor(host: LitElement) {}
    }`,
  );
});

Deno.test("host-constructor: rejects an untyped parameter", () => {
  assertInvalid(
    plugin,
    `class BarController implements ReactiveController {
      constructor(host) {}
    }`,
  );
});

Deno.test("host-constructor: rejects an optional host", () => {
  assertInvalid(
    plugin,
    `class BarController implements ReactiveController {
      constructor(host?: ReactiveControllerHost) {}
    }`,
  );
});

Deno.test("host-constructor: highlights the parameter list", () => {
  const code =
    "class BarController implements ReactiveController {\n  constructor(host: ReactiveControllerHost, count: number) {}\n}";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(
    code,
    diagnostic,
    "host: ReactiveControllerHost, count: number",
  );
});

Deno.test("host-constructor: highlights the bad parameter", () => {
  const code =
    "class BarController implements ReactiveController {\n  constructor(owner: ReactiveControllerHost) {}\n}";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "owner: ReactiveControllerHost");
});

Deno.test("host-constructor: does not dictate the storage field", () => {
  // The constructor signature is all this rule checks. Sibling rules detect
  // whatever field the host lands in, so any name is allowed here.
  assertValid(
    plugin,
    `class C implements ReactiveController {
      #element;
      constructor(host: ReactiveControllerHost) {
        this.#element = host;
        host.addController(this);
      }
    }`,
  );
});

Deno.test("host-constructor: accepts #host, and storing nothing", () => {
  assertValid(
    plugin,
    `class C implements ReactiveController {
      #host;
      constructor(host: ReactiveControllerHost) {
        this.#host = host;
        host.addController(this);
      }
    }`,
  );
  assertValid(
    plugin,
    `class C implements ReactiveController {
      constructor(host: ReactiveControllerHost) {
        host.addController(this);
      }
    }`,
  );
});
