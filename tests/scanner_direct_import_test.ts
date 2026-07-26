import { assertEquals } from "@std/assert";
import { dirname, fromFileUrl, join } from "@std/path";

import { buildCache, createDenoProgram } from "#scanner";

const fixture = (name: string): string =>
  fromFileUrl(new URL(`./scanner_fixture/${name}`, import.meta.url))
    .replaceAll("\\", "/");

const config = fixture("deno.json");
const root = dirname(config);

Deno.test("scanner facts: records direct runtime imports", async () => {
  const bad = fixture("bad.ts");
  const good = fixture("good.ts");
  const { program } = await createDenoProgram([bad, good], config);
  const cache = buildCache(program, [bad, good], root);
  assertEquals(cache.files["bad.ts"]?.imports, ["element-a.ts"]);
  assertEquals(cache.files["good.ts"]?.imports, [
    "element-a.ts",
    "element-b.ts",
  ]);
});

Deno.test("scanner facts: follows an imported `mod.ts` within its folder", async () => {
  const source = fixture("uses-mod.ts");
  const { program } = await createDenoProgram([source], config);
  const cache = buildCache(program, [source], root);
  assertEquals(cache.files["uses-mod.ts"]?.imports, [
    "widgets/mod.ts",
    "widgets/nested/mod.ts",
    "widgets/element-e.ts",
    "widgets/nested/element-f.ts",
  ]);
  assertEquals(cache.registrations["cl-e"], "widgets/element-e.ts");
  assertEquals(cache.registrations["cl-f"], "widgets/nested/element-f.ts");
  // `#outside` sits outside the folder `widgets/mod.ts` stands for, and
  // `./element-g.ts` is re-exported type-only, so neither is reached.
  assertEquals(cache.registrations["cl-a"], "element-a.ts");
  assertEquals(cache.registrations["cl-g"], "widgets/element-g.ts");
});

Deno.test("scanner facts: does not follow a barrel that is not `mod.ts`", async () => {
  const source = fixture("indirect.ts");
  const { program } = await createDenoProgram([source], config);
  const cache = buildCache(program, [source], root);
  assertEquals(cache.files["indirect.ts"]?.imports, ["register-elements.ts"]);
  assertEquals(cache.registrations["cl-b"], "element-b.ts");
});

Deno.test("scanner facts: excludes type-only imports", async () => {
  const element = fixture("element-d.ts");
  const source = fixture("type-only.ts");
  const { program } = await createDenoProgram([element, source], config);
  const cache = buildCache(program, [element, source], root);
  assertEquals(cache.files["type-only.ts"]?.imports, []);
  assertEquals(cache.registrations["cl-d"], "element-d.ts");
});

Deno.test("scanner facts: records define registrations", async () => {
  const element = fixture("element-c.ts");
  const source = fixture("uses-c.ts");
  const { program } = await createDenoProgram([element, source], config);
  const cache = buildCache(program, [element, source], root);
  assertEquals(cache.registrations["cl-c"], "element-c.ts");
});

Deno.test("scanner facts: ignores shadowed registration names", async () => {
  const root = await Deno.makeTempDir();
  try {
    const config = join(root, "deno.json");
    const source = join(root, "shadowed.ts");
    await Deno.writeTextFile(config, `{ "imports": {} }`);
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
    const { program } = await createDenoProgram([source], config);
    const cache = buildCache(program, [source], root);
    assertEquals(cache.registrations, {});
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
