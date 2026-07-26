import { exists, expandGlob } from "@std/fs";
import { join } from "@std/path";

import { setScanFacts } from "#scan-index";

/** Source kinds Deno lint can pass to a plugin. */
const SOURCE_PATTERN = "*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}";

/**
 * Builds the scanner's facts once, at plugin load, off no separate command.
 *
 * A lint rule cannot build a program, and `deno lint` awaits a plugin's
 * top-level `await` before running any rule, so the whole program is built here
 * while the plugin loads. The facts stay in memory — every rule runs in this
 * same isolate — so nothing is written into the project being linted. A build is
 * attempted on every plugin load, and any failure is swallowed so a scan
 * problem never stops the lint.
 *
 * @module
 */

await scan().catch(() => {});

/** Builds the program for the current project and publishes its facts. */
async function scan(): Promise<void> {
  const { buildCache, createDenoProgram, fileFacts } = await import("#scanner");
  const root = Deno.cwd();
  const json = join(root, "deno.json");
  const config = await exists(json, { isFile: true })
    ? json
    : join(root, "deno.jsonc");
  const files: string[] = [];
  for await (
    const entry of expandGlob(join(root, "**", SOURCE_PATTERN), {
      exclude: ["**/node_modules/**"],
    })
  ) {
    if (entry.isFile) {
      files.push(entry.path);
    }
  }
  const built = await createDenoProgram(files, config);
  setScanFacts({
    root,
    cache: buildCache(built.program, files, root),
    refresh: (filename, text) => {
      const program = built.rebuild(filename, text);
      return program === null ? null : fileFacts(program, filename, root);
    },
  });
}
