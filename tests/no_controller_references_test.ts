import { noControllerReferences } from "#reactive-controller";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("no-controller-references", noControllerReferences);

Deno.test("no-controller-references: allows the Lit controller types", () => {
  assertValid(
    plugin,
    `class BarController implements ReactiveController {
      #host: ReactiveControllerHost;
      constructor(host: ReactiveControllerHost) {
        this.#host = host;
        host.addController(this);
      }
    }`,
  );
});

Deno.test("no-controller-references: ignores hosts", () => {
  assertValid(
    plugin,
    `class Bar extends LitElement {
      #foo = new FooController(this);
      render() {
        return this.#foo.value;
      }
    }`,
  );
});

Deno.test("no-controller-references: rejects a controller-typed field", () => {
  assertInvalid(
    plugin,
    `class BarController implements ReactiveController {
      #other: FooController;
    }`,
  );
});

Deno.test("no-controller-references: rejects a controller-typed parameter", () => {
  assertInvalid(
    plugin,
    `class BarController implements ReactiveController {
      attach(other: FooController): void {}
    }`,
  );
});

Deno.test("no-controller-references: rejects constructing another controller", () => {
  assertInvalid(
    plugin,
    `class BarController implements ReactiveController {
      #other = new FooController(this);
    }`,
  );
});

Deno.test("no-controller-references: rejects passing another controller", () => {
  assertInvalid(
    plugin,
    `class BarController implements ReactiveController {
      #fooController = null;
      run(): void {
        register(this.#fooController);
      }
    }`,
  );
});

Deno.test("no-controller-references: highlights the referenced type", () => {
  const code =
    "class BarController implements ReactiveController {\n  #other: FooController;\n}";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "FooController");
});

Deno.test("no-controller-references: highlights the forwarded controller", () => {
  const code =
    "class BarController implements ReactiveController {\n  run(): void {\n    register(this.#fooController);\n  }\n}";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "this.#fooController");
});

Deno.test("no-controller-references: allows platform *Controller classes", () => {
  // Regression: the name heuristic used to fire on `AbortController`, which is
  // the exact resource-ownership pattern these rules encourage.
  assertValid(
    plugin,
    `class ItemsController implements ReactiveController {
      #abort: AbortController | undefined;
      hostConnected() { this.#abort = new AbortController(); }
      hostDisconnected() { this.#abort?.abort(); }
    }`,
  );
});
