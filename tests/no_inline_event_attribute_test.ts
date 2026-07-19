import { noInlineEventAttribute } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("no-inline-event-attribute", noInlineEventAttribute);

Deno.test("no-inline-event-attribute: allows Lit event bindings", () => {
  assertValid(plugin, "html`<button @click=${this.go}>Go</button>`;");
  assertValid(plugin, "html`<div @pointerdown=${this.down}></div>`;");
});

Deno.test("no-inline-event-attribute: allows ordinary attributes", () => {
  assertValid(plugin, 'html`<button class="a" type="submit">Go</button>`;');
});

Deno.test("no-inline-event-attribute: allows attributes that merely start with on", () => {
  assertValid(plugin, 'html`<wa-tooltip once="true" only="a"></wa-tooltip>`;');
});

Deno.test("no-inline-event-attribute: ignores non-html templates", () => {
  assertValid(plugin, "css`button { color: red; }`;");
  assertValid(plugin, 'other`<button onclick="go()"></button>`;');
});

Deno.test("no-inline-event-attribute: rejects a string onclick handler", () => {
  assertInvalid(plugin, 'html`<button onclick="doThing()">Go</button>`;');
});

Deno.test("no-inline-event-attribute: rejects a bound on* attribute", () => {
  assertInvalid(plugin, "html`<button onclick=${this.go}>Go</button>`;");
});

Deno.test("no-inline-event-attribute: rejects a camelCase inline handler", () => {
  assertInvalid(plugin, 'html`<div onMouseOver="hover()"></div>`;');
});

Deno.test("no-inline-event-attribute: reports each inline handler", () => {
  assertInvalid(
    plugin,
    'html`<button onclick="a()" onfocus="b()">Go</button>`;',
    2,
  );
});

Deno.test("no-inline-event-attribute: suggests the matching Lit binding", () => {
  const [diagnostic] = assertInvalid(
    plugin,
    'html`<button onclick="doThing()">Go</button>`;',
  );
  if (!diagnostic) throw new Error("expected a diagnostic");
  if (!diagnostic.hint?.includes("@click=")) {
    throw new Error(`unexpected hint: ${diagnostic.hint}`);
  }
});

Deno.test("no-inline-event-attribute: highlights the whole attribute", () => {
  const code = 'html`<button onclick="doThing()">Go</button>`;';
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, 'onclick="doThing()"');
});
