import { noStringContextKey } from "#strict";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("no-string-context-key", noStringContextKey);

Deno.test("no-string-context-key: allows a symbol key", () => {
  assertValid(
    plugin,
    'const boardContext = createContext<BoardContext>(Symbol("board"));',
  );
  assertValid(plugin, "const c = createContext<Theme>(Symbol());");
});

Deno.test("no-string-context-key: allows a referenced key", () => {
  assertValid(plugin, "const c = createContext<Theme>(BOARD_KEY);");
});

Deno.test("no-string-context-key: ignores unrelated calls", () => {
  assertValid(plugin, 'const c = createThing("board");');
});

Deno.test("no-string-context-key: rejects a string key", () => {
  assertInvalid(
    plugin,
    'const boardContext = createContext<BoardContext>("board");',
  );
});

Deno.test("no-string-context-key: rejects a namespaced string key", () => {
  assertInvalid(plugin, 'const c = context.createContext<Theme>("theme");');
});

Deno.test("no-string-context-key: reports each string key", () => {
  const code = [
    'const a = createContext<A>("a");',
    'const b = createContext<B>("b");',
  ].join("\n");
  assertInvalid(plugin, code, 2);
});

Deno.test("no-string-context-key: highlights the key literal", () => {
  const code = 'const boardContext = createContext<BoardContext>("board");';
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, '"board"');
});
