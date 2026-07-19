import { constructionArgs } from "#reactive-controller";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin(
  "construction-args",
  constructionArgs,
);

Deno.test("construction-args: allows passing only this", () => {
  assertValid(
    plugin,
    `class Bar extends LitElement {
      #barController = new BarController(this);
    }`,
  );
});

Deno.test("construction-args: allows constructor assignment", () => {
  assertValid(
    plugin,
    `class Bar extends LitElement {
      constructor() {
        super();
        this.bar = new BarController(this);
      }
    }`,
  );
});

Deno.test("construction-args: ignores non-hosts", () => {
  assertValid(
    plugin,
    `class Store {
      #barController = new BarController(this, 1);
    }`,
  );
});

Deno.test("construction-args: ignores non-controllers", () => {
  assertValid(
    plugin,
    `class Bar extends LitElement {
      #signal = new AbortSignal(1, 2);
    }`,
  );
});

Deno.test("construction-args: rejects extra arguments", () => {
  assertInvalid(
    plugin,
    `class Bar extends LitElement {
      #barController = new BarController(this, this.value);
    }`,
  );
});

Deno.test("construction-args: rejects a missing host", () => {
  assertInvalid(
    plugin,
    `class Bar extends LitElement {
      #barController = new BarController();
    }`,
  );
});

Deno.test("construction-args: rejects a non-this argument", () => {
  assertInvalid(
    plugin,
    `class Bar extends LitElement {
      #barController = new BarController(window);
    }`,
  );
});

Deno.test("construction-args: highlights the arguments", () => {
  const code =
    "class Bar extends LitElement {\n  #barController = new BarController(this, this.value);\n}";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "this, this.value");
});
