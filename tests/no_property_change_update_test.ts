import { noPropertyChangeUpdate } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("no-property-change-update", noPropertyChangeUpdate);

Deno.test("no-property-change-update: allows changes outside update()", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      @property() name = "";
      willUpdate() { this.name = "x"; }
      updated() { this.name = "y"; }
    }`,
  );
});

Deno.test("no-property-change-update: allows non-reactive fields in update()", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      @property() name = "";
      #cache = 0;
      update(changed) { this.#cache = 1; super.update(changed); }
    }`,
  );
});

Deno.test("no-property-change-update: ignores non-Lit classes", () => {
  assertValid(
    plugin,
    `class Plain {
      @property() name = "";
      update() { this.name = "x"; }
    }`,
  );
});

Deno.test("no-property-change-update: rejects assignment to a decorated property", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      @property() name = "";
      update(changed) { this.name = "x"; super.update(changed); }
    }`,
  );
});

Deno.test("no-property-change-update: rejects assignment to a @state property", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      @state() open = false;
      update(changed) { this.open = true; super.update(changed); }
    }`,
  );
});

Deno.test("no-property-change-update: rejects static properties entries", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      static properties = { name: { type: String } };
      update(changed) { this.name = "x"; super.update(changed); }
    }`,
  );
});

Deno.test("no-property-change-update: rejects increment of a reactive property", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      @property({ type: Number }) count = 0;
      update(changed) { this.count++; super.update(changed); }
    }`,
  );
});

Deno.test("no-property-change-update: rejects changes in a nested callback", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      @property() name = "";
      update(changed) { [1].forEach(() => { this.name = "x"; }); }
    }`,
  );
});

Deno.test("no-property-change-update: highlights the assignment", () => {
  const code = `class El extends LitElement {
  @property() name = "";
  update(changed) { this.name = "next"; super.update(changed); }
}`;
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, 'this.name = "next"');
});
