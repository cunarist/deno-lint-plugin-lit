import { assert, assertEquals, assertNotEquals } from "@std/assert";
import { dirname, fromFileUrl, join } from "@std/path";

import { currentFileFacts, setScanFacts } from "#scan-index";
import { buildCache, createDenoProgram, fileFacts } from "#scanner";

const COMPONENT = `import { html, LitElement } from "lit";
export class Panel extends LitElement {
  override render() {
    return html\`<p></p>\`;
  }
}
`;

/** A project with one real Lit component, since the facts follow the base. */
async function litProject(): Promise<
  { root: string; config: string; source: string }
> {
  const root = await Deno.makeTempDir();
  const config = join(root, "deno.json");
  const source = join(root, "panel.ts");
  await Deno.writeTextFile(
    config,
    JSON.stringify({ imports: { lit: "npm:lit@^3" } }),
  );
  await Deno.writeTextFile(source, COMPONENT);
  return { root, config, source };
}

Deno.test("scanner rebuild: follows an offset shifted by an edit", async () => {
  const { root, config, source } = await litProject();
  try {
    const built = await createDenoProgram([source], config);
    const scanned = fileFacts(built.program, source, root);
    assertEquals(scanned?.components.length, 1);
    assertEquals(scanned?.templates.length, 1);

    // Anything inserted above the class moves its name's offset, which is what
    // the facts are keyed by. The rebuilt facts must name the new offset.
    const prefix = "// a comment added since the scan\n";
    const program = built.rebuild(source, `${prefix}${COMPONENT}`);
    assert(program !== null);
    const rebuilt = fileFacts(program, source, root);
    assertEquals(rebuilt?.components.length, 1);
    assertNotEquals(rebuilt?.components[0], scanned?.components[0]);
    assertEquals(
      rebuilt?.components[0],
      (scanned?.components[0] ?? 0) + prefix.length,
    );
    assertEquals(
      rebuilt?.templates[0]?.start,
      (scanned?.templates[0]?.start ?? 0) + prefix.length,
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("scanner rebuild: reaches a rule through the store", async () => {
  const { root, config, source } = await litProject();
  try {
    const built = await createDenoProgram([source], config);
    setScanFacts({
      root,
      cache: buildCache(built.program, [source], root),
      refresh: (filename, text) => {
        const program = built.rebuild(filename, text);
        return program === null ? null : fileFacts(program, filename, root);
      },
    });
    const facts = currentFileFacts(source, `\n${COMPONENT}`);
    assertEquals(facts?.components.length, 1);
  } finally {
    setScanFacts(null);
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("scanner rebuild: survives an import added since the scan", async () => {
  const { root, config, source } = await litProject();
  try {
    const built = await createDenoProgram([source], config);
    const prefix = `import "npm:never-warmed-by-the-loader";\n`;
    const program = built.rebuild(source, `${prefix}${COMPONENT}`);
    assert(program !== null);
    const facts = fileFacts(program, source, root);
    // The loader never warmed that specifier and cannot without awaiting, so it
    // resolves to nothing — the rest of the file's facts are still right.
    assert(
      facts?.imports.every((path) => !path.includes("never-warmed")) ?? false,
    );
    assertEquals(facts?.components.length, 1);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("scanner rebuild: costs a fraction of the initial build", async () => {
  const fixture = (name: string): string =>
    fromFileUrl(new URL(`./scanner_fixture/${name}`, import.meta.url))
      .replaceAll("\\", "/");
  const config = fixture("deno.json");
  const root = dirname(config);
  const files = [
    "bad.ts",
    "good.ts",
    "element-a.ts",
    "element-b.ts",
    "element-c.ts",
    "element-d.ts",
    "type-only.ts",
    "uses-c.ts",
  ].map(fixture);

  const start = performance.now();
  const built = await createDenoProgram(files, config);
  buildCache(built.program, files, root);
  const initial = performance.now() - start;

  const target = fixture("good.ts");
  const edited = `\n${Deno.readTextFileSync(target)}`;
  const rebuildStart = performance.now();
  const program = built.rebuild(target, edited);
  assert(program !== null);
  fileFacts(program, target, root);
  const rebuild = performance.now() - rebuildStart;

  // Measured on this fixture: about 250ms to build, about 3ms to rebuild. The
  // margin below is wide enough that only a lost reuse path trips it.
  assert(
    rebuild < initial / 4,
    `rebuild ${rebuild}ms is not clearly cheaper than ${initial}ms`,
  );
});
