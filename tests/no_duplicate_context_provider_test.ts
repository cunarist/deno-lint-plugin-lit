import { noDuplicateContextProvider } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin(
  "no-duplicate-context-provider",
  noDuplicateContextProvider,
);

Deno.test("no-duplicate-context-provider: allows distinct contexts", () => {
  assertValid(
    plugin,
    `class A extends LitElement {
      @provide({ context: boardContext })
      accessor board = EMPTY_BOARD;
      @provide({ context: dialogContext })
      accessor dialog = EMPTY_DIALOG;
    }`,
  );
});

Deno.test("no-duplicate-context-provider: allows the same context in two classes", () => {
  assertValid(
    plugin,
    `class A extends LitElement {
      @provide({ context: boardContext })
      accessor board = EMPTY_BOARD;
    }
    class B extends LitElement {
      @provide({ context: boardContext })
      accessor board = EMPTY_BOARD;
    }`,
  );
});

Deno.test("no-duplicate-context-provider: allows provide beside consume", () => {
  assertValid(
    plugin,
    `class A extends LitElement {
      @provide({ context: boardContext })
      accessor board = EMPTY_BOARD;
      @consume({ context: boardContext, subscribe: true })
      accessor seen = EMPTY_BOARD;
    }`,
  );
});

Deno.test("no-duplicate-context-provider: rejects the same context twice", () => {
  assertInvalid(
    plugin,
    `class A extends LitElement {
      @provide({ context: boardContext })
      accessor board = EMPTY_BOARD;
      @provide({ context: boardContext })
      accessor alsoBoard = EMPTY_BOARD;
    }`,
  );
});

Deno.test("no-duplicate-context-provider: matches a namespaced context reference", () => {
  assertInvalid(
    plugin,
    `class A extends LitElement {
      @provide({ context: contexts.board })
      accessor board = EMPTY_BOARD;
      @provide({ context: contexts.board })
      accessor alsoBoard = EMPTY_BOARD;
    }`,
  );
});

Deno.test("no-duplicate-context-provider: reports every extra provider", () => {
  assertInvalid(
    plugin,
    `class A extends LitElement {
      @provide({ context: boardContext })
      accessor a = EMPTY_BOARD;
      @provide({ context: boardContext })
      accessor b = EMPTY_BOARD;
      @provide({ context: boardContext })
      accessor c = EMPTY_BOARD;
    }`,
    2,
  );
});

Deno.test("no-duplicate-context-provider: highlights the duplicate decorator", () => {
  const code = `class A extends LitElement {
      @provide({ context: boardContext })
      accessor board = EMPTY_BOARD;
      @provide({ context: boardContext })
      accessor alsoBoard = EMPTY_BOARD;
    }`;
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "@provide({ context: boardContext })");
});
