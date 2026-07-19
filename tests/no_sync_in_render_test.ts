import { noSyncInRender } from "#reactive-controller";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin(
  "no-sync-in-render",
  noSyncInRender,
);

Deno.test("no-sync-in-render: allows syncing from willUpdate", () => {
  assertValid(
    plugin,
    `class Bar extends LitElement {
      #barController = new BarController(this);
      willUpdate(): void {
        this.#barController.sync(this.value);
      }
      render() {
        return html\`<div></div>\`;
      }
    }`,
  );
});

Deno.test("no-sync-in-render: allows reading from render", () => {
  assertValid(
    plugin,
    `class Bar extends LitElement {
      #barController = new BarController(this);
      render() {
        return this.#barController.items;
      }
    }`,
  );
});

Deno.test("no-sync-in-render: ignores non-hosts", () => {
  assertValid(
    plugin,
    `class Store {
      #barController = new BarController(this);
      render() {
        this.#barController.sync();
      }
    }`,
  );
});

Deno.test("no-sync-in-render: rejects a sync call in render", () => {
  assertInvalid(
    plugin,
    `class Bar extends LitElement {
      #barController = new BarController(this);
      render() {
        this.#barController.sync(this.value);
        return html\`<div></div>\`;
      }
    }`,
  );
});

Deno.test("no-sync-in-render: finds fields assigned in the constructor", () => {
  assertInvalid(
    plugin,
    `class Bar extends LitElement {
      constructor() {
        super();
        this.bar = new BarController(this);
      }
      render() {
        this.bar.syncItems([]);
      }
    }`,
  );
});

Deno.test("no-sync-in-render: highlights the call", () => {
  const code =
    "class Bar extends LitElement {\n  #barController = new BarController(this);\n  render() {\n    this.#barController.sync(1);\n  }\n}";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "this.#barController.sync(1)");
});
