import { noUnusedHost } from "#reactive-controller";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("no-unused-host", noUnusedHost);

Deno.test("no-unused-host: allows a host that is read", () => {
  assertValid(
    plugin,
    `class BarController implements ReactiveController {
      #host: ReactiveControllerHost;
      constructor(host: ReactiveControllerHost) {
        this.#host = host;
        host.addController(this);
      }
      hostConnected(): void {
        this.#host.requestUpdate();
      }
      hostDisconnected(): void {}
    }`,
  );
});

Deno.test("no-unused-host: allows storing nothing", () => {
  assertValid(
    plugin,
    `class BarController implements ReactiveController {
      constructor(host: ReactiveControllerHost) {
        host.addController(this);
      }
    }`,
  );
});

Deno.test("no-unused-host: ignores non-controllers", () => {
  assertValid(plugin, "class Store { #host = 1; }");
});

Deno.test("no-unused-host: rejects a write-only private host", () => {
  assertInvalid(
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

Deno.test("no-unused-host: rejects a write-only public host", () => {
  assertInvalid(
    plugin,
    `class BarController implements ReactiveController {
      host: ReactiveControllerHost;
      constructor(host: ReactiveControllerHost) {
        this.host = host;
        host.addController(this);
      }
    }`,
  );
});

Deno.test("no-unused-host: rejects a write-only host under any field name", () => {
  assertInvalid(
    plugin,
    `class BarController implements ReactiveController {
      _host: ReactiveControllerHost;
      constructor(host: ReactiveControllerHost) {
        this._host = host;
        host.addController(this);
      }
    }`,
  );
});

Deno.test("no-unused-host: allows a read under a renamed field", () => {
  assertValid(
    plugin,
    `class BarController implements ReactiveController {
      _host: ReactiveControllerHost;
      constructor(host: ReactiveControllerHost) {
        this._host = host;
      }
      hostConnected(): void {
        this._host.requestUpdate();
      }
    }`,
  );
});

Deno.test("no-unused-host: finds the host by type when the param is renamed", () => {
  assertInvalid(
    plugin,
    `class BarController implements ReactiveController {
      #host: ReactiveControllerHost;
      constructor(controllerHost: ReactiveControllerHost) {
        this.#host = controllerHost;
        controllerHost.addController(this);
      }
    }`,
  );
});

Deno.test("no-unused-host: counts a read anywhere in the class", () => {
  assertValid(
    plugin,
    `class BarController implements ReactiveController {
      #host: ReactiveControllerHost;
      constructor(host: ReactiveControllerHost) {
        this.#host = host;
      }
      #notify = (): void => {
        this.#host.requestUpdate();
      };
    }`,
  );
});

Deno.test("no-unused-host: highlights the stored field", () => {
  const code =
    "class BarController implements ReactiveController {\n  #host: ReactiveControllerHost;\n  constructor(host: ReactiveControllerHost) {\n    this.#host = host;\n  }\n}";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "#host");
});
