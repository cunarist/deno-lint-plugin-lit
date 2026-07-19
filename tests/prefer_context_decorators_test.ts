import { preferContextDecorators } from "#strict";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("prefer-context-decorators", preferContextDecorators);

Deno.test("prefer-context-decorators: accepts the decorators", () => {
  assertValid(
    plugin,
    `class El extends LitElement {
      @provide({ context: appContext })
      accessor appState = initial;

      @consume({ context: appContext, subscribe: true })
      accessor consumed = initial;
    }`,
  );
});

Deno.test("prefer-context-decorators: rejects a hand-built provider", () => {
  assertInvalid(
    plugin,
    `import { ContextProvider } from "@lit/context";
    class El extends LitElement {
      #provider = new ContextProvider(this, { context: appContext });
    }`,
  );
});

Deno.test("prefer-context-decorators: rejects a hand-built consumer", () => {
  assertInvalid(
    plugin,
    `import { ContextConsumer } from "@lit/context";
    class El extends LitElement {
      #consumer = new ContextConsumer(this, { context: appContext });
    }`,
  );
});

Deno.test("prefer-context-decorators: follows a renamed import", () => {
  assertInvalid(
    plugin,
    `import { ContextProvider as Provider } from "@lit/context";
    class El extends LitElement {
      #provider = new Provider(this, { context: appContext });
    }`,
  );
});

Deno.test("prefer-context-decorators: ignores non-Lit classes", () => {
  assertValid(
    plugin,
    `import { ContextProvider } from "@lit/context";
    class Plain {
      provider = new ContextProvider(this, { context: appContext });
    }`,
  );
});

Deno.test("prefer-context-decorators: highlights the construction", () => {
  const code = `import { ContextProvider } from "@lit/context";
class El extends LitElement {
  #provider = new ContextProvider(this, { context: appContext });
}`;
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(
    code,
    diagnostic,
    "new ContextProvider(this, { context: appContext })",
  );
});
