import { assertEquals } from "@std/assert";
import { join } from "@std/path";

import { buildCache, createDenoProgram } from "#scanner";

Deno.test("scanner: follows both public Lit base classes", async () => {
  const root = await Deno.makeTempDir();
  try {
    const config = join(root, "deno.jsonc");
    const source = join(root, "components.ts");
    await Deno.writeTextFile(
      config,
      JSON.stringify({
        imports: {
          "@lit/reactive-element": "npm:@lit/reactive-element@^2",
          lit: "npm:lit@^3",
        },
      }),
    );
    const sourceText =
      `import { css, html as renderHtml, LitElement } from "lit";
import * as lit from "lit";
import { ReactiveElement } from "@lit/reactive-element";
import { customElement as register } from "lit/decorators.js";
@register("cl-lit-panel")
export class LitPanel extends LitElement {}
export class ReactivePanel extends ReactiveElement {}
export class Colliding extends LitElement {}
{
  class Colliding {}
}
export const Expression = class Expression extends LitElement {};
renderHtml\`<p></p>\`;
lit.svg\`<circle></circle>\`;
css\`:host {}\`;
{
  const html = (strings: TemplateStringsArray) => strings;
  html\`not Lit\`;
}
`;
    await Deno.writeTextFile(source, sourceText);
    const { program } = await createDenoProgram([source], config);
    const cache = buildCache(program, [source], root);
    assertEquals(cache.files["components.ts"]?.components, [
      sourceText.indexOf("LitPanel", sourceText.indexOf("class LitPanel")),
      sourceText.indexOf(
        "ReactivePanel",
        sourceText.indexOf("class ReactivePanel"),
      ),
      sourceText.indexOf("Colliding", sourceText.indexOf("class Colliding")),
      sourceText.indexOf("Expression", sourceText.indexOf("class Expression")),
    ]);
    assertEquals(cache.files["components.ts"]?.templates, [
      { kind: "html", start: sourceText.indexOf("renderHtml`") },
      { kind: "svg", start: sourceText.indexOf("lit.svg`") },
      { kind: "css", start: sourceText.indexOf("css`") },
    ]);
    assertEquals(cache.registrations["cl-lit-panel"], "components.ts");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
