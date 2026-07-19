import { noSelfSync } from "#reactive-controller";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("no-self-sync", noSelfSync);

Deno.test("no-self-sync: allows a private helper", () => {
  assertValid(
    plugin,
    `class BarController implements ReactiveController {
      sync(value: string): void {
        this.#syncInternal(value);
      }
      #syncInternal(value: string): void {}
    }`,
  );
});

Deno.test("no-self-sync: allows other self calls", () => {
  assertValid(
    plugin,
    `class BarController implements ReactiveController {
      run(): void {
        this.reload();
      }
    }`,
  );
});

Deno.test("no-self-sync: ignores hosts", () => {
  assertValid(
    plugin,
    `class Bar extends LitElement {
      willUpdate(): void {
        this.sync();
      }
    }`,
  );
});

Deno.test("no-self-sync: rejects this.sync()", () => {
  assertInvalid(
    plugin,
    `class BarController implements ReactiveController {
      hostConnected(): void {
        this.sync();
      }
      hostDisconnected(): void {}
    }`,
  );
});

Deno.test("no-self-sync: rejects a prefixed sync method", () => {
  assertInvalid(
    plugin,
    `class BarController implements ReactiveController {
      reload(): void {
        this.syncItems([]);
      }
    }`,
  );
});

Deno.test("no-self-sync: highlights the call", () => {
  const code =
    "class BarController implements ReactiveController {\n  reload(): void {\n    this.syncItems([]);\n  }\n}";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "this.syncItems([])");
});
