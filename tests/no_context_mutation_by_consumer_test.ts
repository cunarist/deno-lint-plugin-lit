import { noContextMutationByConsumer } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin(
  "no-context-mutation-by-consumer",
  noContextMutationByConsumer,
);

Deno.test("no-context-mutation-by-consumer: allows reading a consumed field", () => {
  assertValid(
    plugin,
    `class A extends LitElement {
      @consume({ context: themeContext, subscribe: true })
      accessor theme = EMPTY_THEME;
      render() { return this.theme.name; }
    }`,
  );
});

Deno.test("no-context-mutation-by-consumer: allows writing a provided field", () => {
  assertValid(
    plugin,
    `class A extends LitElement {
      @provide({ context: boardContext })
      accessor board = EMPTY_BOARD;
      go() { this.board = next; }
    }`,
  );
});

Deno.test("no-context-mutation-by-consumer: allows writing an ordinary field", () => {
  assertValid(
    plugin,
    `class A extends LitElement {
      @consume({ context: themeContext })
      accessor theme = EMPTY_THEME;
      accessor other = 0;
      go() { this.other = 1; }
    }`,
  );
});

Deno.test("no-context-mutation-by-consumer: rejects assigning a consumed field", () => {
  assertInvalid(
    plugin,
    `class A extends LitElement {
      @consume({ context: themeContext })
      accessor theme = EMPTY_THEME;
      go() { this.theme = next; }
    }`,
  );
});

Deno.test("no-context-mutation-by-consumer: rejects a private consumed field", () => {
  assertInvalid(
    plugin,
    `class A extends LitElement {
      @consume({ context: themeContext, subscribe: true })
      accessor #theme = EMPTY_THEME;
      go() { this.#theme = next; }
    }`,
  );
});

Deno.test("no-context-mutation-by-consumer: rejects a plain property field", () => {
  assertInvalid(
    plugin,
    `class A extends LitElement {
      @consume({ context: themeContext })
      theme = EMPTY_THEME;
      go() { this.theme = next; }
    }`,
  );
});

Deno.test("no-context-mutation-by-consumer: rejects compound and update writes", () => {
  assertInvalid(
    plugin,
    `class A extends LitElement {
      @consume({ context: countContext })
      accessor count = 0;
      go() { this.count += 1; this.count++; }
    }`,
    2,
  );
});

Deno.test("no-context-mutation-by-consumer: highlights the assignment target", () => {
  const code = `class A extends LitElement {
      @consume({ context: themeContext })
      accessor #theme = EMPTY_THEME;
      go() { this.#theme = next; }
    }`;
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "this.#theme");
});
