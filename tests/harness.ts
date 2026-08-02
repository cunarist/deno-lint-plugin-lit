/** Shared test harness for rule tests. */

import { createDenoProgram } from "@cunarist/typescript-deno-lint/program";
import {
  clearTestProgram,
  useTestProgram,
} from "@cunarist/typescript-deno-lint/testing";
import { assertEquals } from "@std/assert";
import { join, resolve } from "@std/path";
import ts from "typescript";

export interface Case {
  /** Source snippet to lint. */
  readonly code: string;
  /** Expected diagnostic messages, in order. Empty means "no diagnostics". */
  readonly expected?: readonly string[];
  /** Expected substrings of the reported source text, in order. */
  readonly reported?: readonly string[];
}

// Most snippets omit imports. These are appended to the copy the checker sees,
// so Lit symbols resolve without moving any of the snippet's own offsets — the
// rules report ranges into the snippet, and a prefix would shift every one.
const LIT_IMPORTS =
  `import { ReactiveElement } from "@lit/reactive-element";\n` +
  `import { LitElement } from "lit";\n` +
  `import { customElement, property, state } from "lit/decorators.js";\n` +
  `import { html, svg, css } from "lit";\n`;

// The same options `createDenoProgram` builds under, so the sync per-snippet
// program checks types the way a real lint run does.
const OPTIONS: ts.CompilerOptions = {
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  module: ts.ModuleKind.ESNext,
  target: ts.ScriptTarget.ESNext,
  lib: ["lib.esnext.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"],
  allowJs: true,
  checkJs: false,
  noEmit: true,
  skipLibCheck: true,
  allowImportingTsExtensions: true,
};

// `getResolvedModuleFromModuleSpecifier` is a real method on the program but is
// absent from the published type, so it is reached through this narrow view.
interface ResolverProgram {
  getResolvedModuleFromModuleSpecifier(
    specifier: ts.StringLiteralLike,
    sourceFile: ts.SourceFile,
  ): ts.ResolvedModuleWithFailedLookupLocations | undefined;
}

/** The warm state built once, over a program that resolves Lit for real. */
interface Warm {
  /** Each specifier the probe imports, to the file it resolves to. */
  readonly probeEdges: ReadonlyMap<string, string>;
  /** Each `<referrer>\0<specifier>` to its target, for every other file. */
  readonly edges: ReadonlyMap<string, string>;
  /** Every resolved source file except the probe, reused across snippets. */
  readonly sources: ReadonlyMap<string, ts.SourceFile>;
  /** A reusable host whose only per-call change is the snippet source. */
  readonly baseHost: ts.CompilerHost;
}

/** Resolves Lit once and captures what a sync per-snippet program needs. */
async function warmUp(): Promise<Warm> {
  const dir = Deno.makeTempDirSync();
  try {
    const configPath = join(dir, "deno.json");
    Deno.writeTextFileSync(
      configPath,
      JSON.stringify({
        imports: {
          "@lit/reactive-element": "npm:@lit/reactive-element@^2",
          lit: "npm:lit@^3",
          "lit/": "npm:/lit@^3/",
        },
      }),
    );
    const probePath = join(dir, "probe.ts");
    Deno.writeTextFileSync(
      probePath,
      `${LIT_IMPORTS}export class Probe extends LitElement {}\n`,
    );
    const { program } = await createDenoProgram([probePath], configPath);
    const probeFile = program.getSourceFile(probePath)?.fileName ?? probePath;
    const resolver = program as unknown as ResolverProgram;
    const edges = new Map<string, string>();
    const sources = new Map<string, ts.SourceFile>();
    for (const source of program.getSourceFiles()) {
      if (source.fileName !== probeFile) {
        sources.set(source.fileName, source);
      }
      collectEdges(source, resolver, edges);
    }
    // The snippet stands where the probe stood, under whatever name the test
    // lints it as, so the probe's own resolutions are re-keyed by specifier
    // alone and reapplied to it.
    const probeEdges = new Map<string, string>();
    for (const [key, target] of edges) {
      const [referrer, specifier] = key.split("\0");
      if (referrer === probeFile && specifier !== undefined) {
        probeEdges.set(specifier, target);
      }
    }
    return {
      probeEdges,
      edges,
      sources,
      baseHost: ts.createCompilerHost(OPTIONS, true),
    };
  } finally {
    Deno.removeSync(dir, { recursive: true });
  }
}

/** Records every module specifier in a file and the file it resolved to. */
function collectEdges(
  source: ts.SourceFile,
  resolver: ResolverProgram,
  edges: Map<string, string>,
): void {
  const visit = (node: ts.Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      const target = resolver
        .getResolvedModuleFromModuleSpecifier(node.moduleSpecifier, source)
        ?.resolvedModule?.resolvedFileName;
      if (target !== undefined) {
        edges.set(`${source.fileName}\0${node.moduleSpecifier.text}`, target);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}

/** Rewrites platform separators as forward slashes. */
function normalize(path: string): string {
  return path.replaceAll("\\", "/");
}

/** The TypeScript extension a resolved file ends with. */
function extensionOf(file: string): ts.Extension {
  if (file.endsWith(".d.ts")) return ts.Extension.Dts;
  if (file.endsWith(".ts")) return ts.Extension.Ts;
  if (file.endsWith(".tsx")) return ts.Extension.Tsx;
  return ts.Extension.Js;
}

const warm = await warmUp();
let oldProgram: ts.Program | undefined;

/**
 * A program in which the snippet resolves Lit, under the name it is linted as.
 *
 * The rules read this through `useTestProgram`, which is what makes a snippet
 * with no imports type-checkable at all: nothing the plugin builds at load
 * contains it, so without an installed program every type-aware rule would go
 * silent and every test would pass vacuously.
 */
function programForSnippet(code: string, filename: string): ts.Program {
  // TypeScript resolves a root name against the current directory before it
  // asks the host for it, so the snippet is registered under that absolute path.
  // `Program.getSourceFile` resolves the same way, which is how the rules find
  // it again from the relative name they are linting under.
  const path = normalize(resolve(filename));
  const snippetFile = ts.createSourceFile(
    path,
    `${code}\n${LIT_IMPORTS}`,
    ts.ScriptTarget.ESNext,
    true,
  );
  const host: ts.CompilerHost = {
    ...warm.baseHost,
    getSourceFile: (
      fileName,
      languageVersionOrOptions,
      onError,
      shouldCreate,
    ) => {
      if (normalize(fileName) === path) return snippetFile;
      return warm.sources.get(fileName) ??
        warm.baseHost.getSourceFile(
          fileName,
          languageVersionOrOptions,
          onError,
          shouldCreate,
        );
    },
    resolveModuleNameLiterals: (literals, containingFile) =>
      literals.map((literal) => {
        const target = normalize(containingFile) === path
          ? warm.probeEdges.get(literal.text)
          : warm.edges.get(`${containingFile}\0${literal.text}`);
        if (target === undefined) return { resolvedModule: undefined };
        return {
          resolvedModule: {
            resolvedFileName: target,
            extension: extensionOf(target),
          },
        };
      }),
  };
  const program = ts.createProgram([path], OPTIONS, host, oldProgram);
  oldProgram = program;
  return program;
}

/** Run a plugin over a snippet and return its diagnostics. */
export function lint(
  plugin: Deno.lint.Plugin,
  code: string,
  filename = "component.ts",
): Deno.lint.Diagnostic[] {
  useTestProgram(programForSnippet(code, filename));
  try {
    return Deno.lint.runPlugin(plugin, filename, code);
  } finally {
    clearTestProgram();
  }
}

/** Assert a snippet produces no diagnostics. */
export function assertValid(plugin: Deno.lint.Plugin, code: string): void {
  const diagnostics = lint(plugin, code);
  assertEquals(
    diagnostics.map((d) => d.message),
    [],
    `expected no diagnostics for:\n${code}`,
  );
}

/** Assert a snippet produces exactly `count` diagnostics. */
export function assertInvalid(
  plugin: Deno.lint.Plugin,
  code: string,
  count = 1,
): Deno.lint.Diagnostic[] {
  const diagnostics = lint(plugin, code);
  assertEquals(
    diagnostics.length,
    count,
    `expected ${count} diagnostic(s), got ${diagnostics.length} for:\n${code}\n` +
      diagnostics.map((d) => `  - ${d.message}`).join("\n"),
  );
  return diagnostics;
}

/**
 * Assert the source text a diagnostic points at. This is what catches
 * broken template-location mapping — a rule can fire correctly while
 * highlighting the wrong characters.
 */
export function assertReportedText(
  code: string,
  diagnostic: Deno.lint.Diagnostic,
  expected: string,
): void {
  const actual = code.slice(diagnostic.range[0], diagnostic.range[1]);
  assertEquals(
    actual,
    expected,
    `diagnostic highlighted ${JSON.stringify(actual)}, expected ${
      JSON.stringify(expected)
    }`,
  );
}

/** Wrap a single rule in a throwaway plugin. */
export function rulePlugin(
  name: string,
  rule: Deno.lint.Rule,
): Deno.lint.Plugin {
  return { name: "lit", rules: { [name]: rule } };
}
