import { noQueryDecorators } from "#dom-ref";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("no-query-decorators", noQueryDecorators);

Deno.test("no-query-decorators: allows the other lit decorators", () => {
  assertValid(
    plugin,
    `import { customElement, property, state } from "lit/decorators.js";
     class A extends LitElement { @property() name = ""; @state() open = false; }`,
  );
});

Deno.test("no-query-decorators: allows the ref directive", () => {
  assertValid(plugin, 'import { ref } from "lit/directives/ref.js";');
});

Deno.test("no-query-decorators: allows a same-named import elsewhere", () => {
  assertValid(plugin, 'import { query } from "./db.ts";');
});

Deno.test("no-query-decorators: rejects each query decorator import", () => {
  for (
    const name of [
      "query",
      "queryAll",
      "queryAsync",
      "queryAssignedElements",
      "queryAssignedNodes",
    ]
  ) {
    assertInvalid(plugin, `import { ${name} } from "lit/decorators.js";`);
  }
});

Deno.test("no-query-decorators: rejects the decorator on a field", () => {
  assertInvalid(
    plugin,
    "class A extends LitElement { @query('input') input; }",
  );
});

Deno.test("no-query-decorators: rejects the decorator on a getter", () => {
  assertInvalid(
    plugin,
    "class A extends LitElement { @queryAll('li') get items() { return []; } }",
  );
});

Deno.test("no-query-decorators: ignores decorators on non-Lit classes", () => {
  assertValid(plugin, "class A { @query('input') input; }");
});

Deno.test("no-query-decorators: reports import and usage together", () => {
  assertInvalid(
    plugin,
    `import { query } from "lit/decorators.js";
     class A extends LitElement { @query('input') input; }`,
    2,
  );
});

Deno.test("no-query-decorators: highlights the decorator", () => {
  const code = "class A extends LitElement { @query('input') input; }";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "@query('input')");
});

Deno.test("no-query-decorators: highlights the import specifier", () => {
  const code = 'import { queryAll } from "lit/decorators.js";';
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "queryAll");
});
