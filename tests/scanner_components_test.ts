import { createDenoProgram } from "@cunarist/typescript-deno-lint/program";
import { assertEquals } from "@std/assert";
import { join } from "@std/path";
import ts from "typescript";

import {
  collectRegistrations,
  isLitComponent,
  type LitTemplateKind,
  litTemplateKind,
} from "#scanner";

/** Every Lit component class name and Lit template kind in a source file. */
function detect(
  source: ts.SourceFile,
  checker: ts.TypeChecker,
): { components: string[]; templates: LitTemplateKind[] } {
  const components: string[] = [];
  const templates: LitTemplateKind[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isClassLike(node) && node.name !== undefined &&
      isLitComponent(checker, node)
    ) {
      components.push(node.name.text);
    }
    if (ts.isTaggedTemplateExpression(node)) {
      const kind = litTemplateKind(checker, node);
      if (kind !== null) {
        templates.push(kind);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { components, templates };
}

Deno.test("scanner: follows both public Lit base classes", async () => {
  const root = await Deno.makeTempDir();
  try {
    const config = join(root, "deno.jsonc");
    const file = join(root, "components.ts");
    await Deno.writeTextFile(
      config,
      JSON.stringify({
        imports: {
          "@lit/reactive-element": "npm:@lit/reactive-element@^2",
          lit: "npm:lit@^3",
        },
      }),
    );
    await Deno.writeTextFile(
      file,
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
`,
    );
    const { program } = await createDenoProgram([file], config);
    const checker = program.getTypeChecker();
    const source = program.getSourceFile(file);
    if (source === undefined) throw new Error("the fixture was not parsed");
    // An aliased import, a namespace access, and a subclassed base are all
    // followed; a local class or tag that merely shares a name is not.
    assertEquals(detect(source, checker), {
      components: ["LitPanel", "ReactivePanel", "Colliding", "Expression"],
      templates: ["html", "svg", "css"],
    });
    const registrations = collectRegistrations(program, checker);
    assertEquals(registrations.get("cl-lit-panel"), file.replaceAll("\\", "/"));
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
