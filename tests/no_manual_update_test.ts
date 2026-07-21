import { noManualUpdate } from "#strict";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("no-manual-update", noManualUpdate);

Deno.test("no-manual-update: rejects a component scheduling itself", () => {
  for (const name of ["requestUpdate", "performUpdate", "scheduleUpdate"]) {
    assertInvalid(
      plugin,
      `class El extends LitElement { go() { this.${name}(); } }`,
    );
  }
});

Deno.test("no-manual-update: allows a controller nudging its host", () => {
  assertValid(
    plugin,
    `class ClockController implements ReactiveController {
      #host: ReactiveControllerHost;
      constructor(host: ReactiveControllerHost) {
        this.#host = host;
      }
      tick() {
        this.#host.requestUpdate();
      }
    }`,
  );
});

Deno.test("no-manual-update: allows a renamed host field in a controller", () => {
  assertValid(
    plugin,
    `class ClockController implements ReactiveController {
      _host: ReactiveControllerHost;
      constructor(host: ReactiveControllerHost) {
        this._host = host;
      }
      tick() {
        this._host.requestUpdate();
      }
    }`,
  );
});

Deno.test("no-manual-update: ignores code outside a component", () => {
  assertValid(plugin, "element.requestUpdate();");
  assertValid(plugin, "class Store { go() { this.requestUpdate(); } }");
});

Deno.test("no-manual-update: detects the component by any Lit signal", () => {
  // @customElement
  assertInvalid(
    plugin,
    '@customElement("x-el") class El { go() { this.requestUpdate(); } }',
  );
  // render() returning an html template
  assertInvalid(
    plugin,
    "class El { render() { return html`<b></b>`; } go() { this.requestUpdate(); } }",
  );
  // static styles built from css
  assertInvalid(
    plugin,
    "class El { static styles = css`:host{}`; go() { this.requestUpdate(); } }",
  );
  // a same-file base that extends a Lit base
  assertInvalid(
    plugin,
    `class Base extends LitElement {}
     class El extends Base { go() { this.requestUpdate(); } }`,
  );
});

Deno.test("no-manual-update: cannot see an off-file base with no local signal", () => {
  // The base is imported, and nothing local marks the class as Lit. There is no
  // cross-file resolution, so this is an accepted miss.
  assertValid(
    plugin,
    "class El extends ImportedBase { go() { this.requestUpdate(); } }",
  );
});

Deno.test("no-manual-update: allows super delegation", () => {
  assertValid(
    plugin,
    "class El extends LitElement { performUpdate() { super.performUpdate(); } }",
  );
});

Deno.test("no-manual-update: ignores unrelated methods on this", () => {
  assertValid(
    plugin,
    "class El extends LitElement { go() { this.render(); } }",
  );
});

Deno.test("no-manual-update: highlights the callee", () => {
  const code = "class El extends LitElement { go() { this.requestUpdate(); } }";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "this.requestUpdate");
});
