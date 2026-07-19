import { requireContextType } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("require-context-type", requireContextType);

Deno.test("require-context-type: allows a typed context", () => {
  assertValid(
    plugin,
    'export const boardContext = createContext<BoardContext>("board");',
  );
  assertValid(
    plugin,
    "export const themeContext = createContext<Theme>(Symbol('theme'));",
  );
});

Deno.test("require-context-type: allows a namespaced typed call", () => {
  assertValid(
    plugin,
    "const c = context.createContext<BoardContext>(Symbol('board'));",
  );
});

Deno.test("require-context-type: ignores unrelated calls", () => {
  assertValid(plugin, "const c = createThing(Symbol('board'));");
  assertValid(plugin, "const c = makeContext(Symbol('board'));");
});

Deno.test("require-context-type: rejects an untyped context", () => {
  assertInvalid(plugin, "const c = createContext(Symbol('board'));");
});

Deno.test("require-context-type: rejects an untyped namespaced call", () => {
  assertInvalid(plugin, "const c = context.createContext(Symbol('board'));");
});

Deno.test("require-context-type: rejects an untyped no-argument call", () => {
  assertInvalid(plugin, "const c = createContext();");
});

Deno.test("require-context-type: highlights the callee", () => {
  const code = "const c = createContext(Symbol('board'));";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "createContext");
});
