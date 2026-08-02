import { createDenoProgram } from "@cunarist/typescript-deno-lint/program";
import { assertEquals } from "@std/assert";
import { dirname, fromFileUrl, join, relative } from "@std/path";
import type ts from "typescript";

import { collectRegistrations, runtimeImportedFiles } from "#scanner";

const fixture = (name: string): string =>
  fromFileUrl(new URL(`./scanner_fixture/${name}`, import.meta.url))
    .replaceAll("\\", "/");

const config = fixture("deno.json");
const root = dirname(config).replaceAll("\\", "/");

/** A fixture path relative to the fixture root, for a readable assertion. */
function toRoot(file: string): string {
  return relative(root, file).replaceAll("\\", "/");
}

/**
 * The fixture files a source runs, relative to the fixture root.
 *
 * `bad.ts` and `good.ts` import Lit itself, for the real `html` tag the rule
 * needs; the package is a genuine runtime import but says nothing about which
 * fixture module registers what, so only the fixture's own files are asserted.
 */
async function importsOf(name: string): Promise<string[]> {
  const file = fixture(name);
  const { program } = await createDenoProgram([file], config);
  const source = program.getSourceFile(file);
  if (source === undefined) {
    return [];
  }
  return [...runtimeImportedFiles(source, program.getTypeChecker())]
    .filter((imported) => imported.startsWith(`${root}/`))
    .map(toRoot);
}

/** Every tag the program registers, mapped to a fixture-relative path. */
function registrationsIn(program: ts.Program): Record<string, string> {
  const found: Record<string, string> = {};
  for (
    const [tag, file] of collectRegistrations(program, program.getTypeChecker())
  ) {
    found[tag] = toRoot(file);
  }
  return found;
}

Deno.test("scanner: records direct runtime imports", async () => {
  assertEquals(await importsOf("bad.ts"), ["element-a.ts"]);
  assertEquals(await importsOf("good.ts"), ["element-a.ts", "element-b.ts"]);
});

Deno.test("scanner: follows an imported `mod.ts` within its folder", async () => {
  assertEquals(await importsOf("uses-mod.ts"), [
    "widgets/mod.ts",
    "widgets/nested/mod.ts",
    "widgets/element-e.ts",
    "widgets/nested/element-f.ts",
  ]);
  const { program } = await createDenoProgram([fixture("uses-mod.ts")], config);
  const registrations = registrationsIn(program);
  assertEquals(registrations["cl-e"], "widgets/element-e.ts");
  assertEquals(registrations["cl-f"], "widgets/nested/element-f.ts");
  // `#outside` sits outside the folder `widgets/mod.ts` stands for, and
  // `./element-g.ts` is re-exported type-only, so neither is reached.
  assertEquals(registrations["cl-a"], "element-a.ts");
  assertEquals(registrations["cl-g"], "widgets/element-g.ts");
});

Deno.test("scanner: does not follow a barrel that is not `mod.ts`", async () => {
  assertEquals(await importsOf("indirect.ts"), ["register-elements.ts"]);
  const { program } = await createDenoProgram([fixture("indirect.ts")], config);
  assertEquals(registrationsIn(program)["cl-b"], "element-b.ts");
});

Deno.test("scanner: excludes type-only imports", async () => {
  assertEquals(await importsOf("type-only.ts"), []);
  const { program } = await createDenoProgram(
    [fixture("element-d.ts"), fixture("type-only.ts")],
    config,
  );
  assertEquals(registrationsIn(program)["cl-d"], "element-d.ts");
});

Deno.test("scanner: records define registrations", async () => {
  const { program } = await createDenoProgram(
    [fixture("element-c.ts"), fixture("uses-c.ts")],
    config,
  );
  assertEquals(registrationsIn(program)["cl-c"], "element-c.ts");
});

Deno.test("scanner: ignores shadowed registration names", async () => {
  const temporary = await Deno.makeTempDir();
  try {
    const localConfig = join(temporary, "deno.json");
    const source = join(temporary, "shadowed.ts");
    await Deno.writeTextFile(localConfig, `{ "imports": {} }`);
    await Deno.writeTextFile(
      source,
      `export {};
const customElements = {
  define(_tag: string, _element: unknown): void {},
};
class LocalElement {}
customElements.define("cl-shadowed-registry", LocalElement);

const customElement = (_tag: string) => (_element: unknown): void => {};
@customElement("cl-shadowed-decorator")
class Decorated {}

interface HTMLElementTagNameMap {
  "cl-shadowed-map": LocalElement;
}
`,
    );
    const { program } = await createDenoProgram([source], localConfig);
    assertEquals(
      [...collectRegistrations(program, program.getTypeChecker())],
      [],
    );
  } finally {
    await Deno.remove(temporary, { recursive: true });
  }
});
