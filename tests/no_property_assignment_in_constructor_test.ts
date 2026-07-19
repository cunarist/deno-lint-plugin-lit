import { noPropertyAssignmentInConstructor } from "#strict";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin(
  "no-property-assignment-in-constructor",
  noPropertyAssignmentInConstructor,
);

Deno.test("no-property-assignment-in-constructor: allows field initialisers", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      @property() label = "";
      constructor() { super(); }
    }`,
  );
});

Deno.test("no-property-assignment-in-constructor: allows non-reactive assignments", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      @property() label = "";
      #cache = null;
      constructor() {
        super();
        this.#cache = new Map();
        this.internal = 1;
      }
    }`,
  );
});

Deno.test("no-property-assignment-in-constructor: allows assignment in other methods", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      @property() label = "";
      connectedCallback() { this.label = "x"; }
    }`,
  );
});

Deno.test("no-property-assignment-in-constructor: allows assignment inside a callback", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      @property() label = "";
      constructor() {
        super();
        this.addEventListener("x", () => { this.label = "y"; });
      }
    }`,
  );
});

Deno.test("no-property-assignment-in-constructor: ignores non-Lit classes", () => {
  assertValid(
    plugin,
    `class Plain {
      @property() label = "";
      constructor() { this.label = "x"; }
    }`,
  );
});

Deno.test("no-property-assignment-in-constructor: rejects assigning a decorated property", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      @property() label = "";
      constructor() {
        super();
        this.label = "x";
      }
    }`,
  );
});

Deno.test("no-property-assignment-in-constructor: rejects assigning a @state property", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      @state() open = false;
      constructor() {
        super();
        this.open = true;
      }
    }`,
  );
});

Deno.test("no-property-assignment-in-constructor: rejects a static properties entry", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      static properties = { count: { type: Number } };
      constructor() {
        super();
        this.count = 0;
      }
    }`,
  );
});

Deno.test("no-property-assignment-in-constructor: rejects a nested and a compound assignment", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      @property({type: Number}) count = 0;
      constructor() {
        super();
        if (cond) { this.count = 1; }
        this.count += 2;
      }
    }`,
    2,
  );
});

Deno.test("no-property-assignment-in-constructor: highlights the assignment target", () => {
  const code = `class El extends LitElement {
  @property() label = "";
  constructor() {
    super();
    this.label = "x";
  }
}`;
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "this.label");
});
