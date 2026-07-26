/** Shared test harness for rule tests. */

import { assertEquals } from "@std/assert";
import { join } from "@std/path";
import ts from "typescript";

import { hashText, type ScanCache, setScanFacts } from "#scan-index";
import { collectLitFacts, createDenoProgram } from "#scanner";

export interface Case {
  /** Source snippet to lint. */
  readonly code: string;
  /** Expected diagnostic messages, in order. Empty means "no diagnostics". */
  readonly expected?: readonly string[];
  /** Expected substrings of the reported source text, in order. */
  readonly reported?: readonly string[];
}

// Most snippets omit imports. These imports are appended to a checker-only copy,
// so Lit symbols resolve without changing any original source offsets.
const LIT_IMPORTS =
  `import { ReactiveElement } from "@lit/reactive-element";\n` +
  `import { LitElement } from "lit";\n` +
  `import { customElement, property, state } from "lit/decorators.js";\n` +
  `import { html, svg, css } from "lit";\n`;

// The same options `createDenoProgram` builds under, so the sync per-snippet
// program checks types the way the scanner does.
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

/** The warm detection state built once, over a program that resolves Lit. */
interface Warm {
  /** The probe file's canonical name, as the program keys it. */
  readonly probeFile: string;
  /** Each `<referrer>\0<specifier>` to the file it resolves to. */
  readonly edges: ReadonlyMap<string, string>;
  /** Every resolved source file except the probe, reused across snippets. */
  readonly sources: ReadonlyMap<string, ts.SourceFile>;
  /** A reusable host whose only per-call change is the probe source. */
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
    return {
      probeFile,
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
 * The checker-derived Lit facts for a snippet, at its original source offsets.
 */
function detectLitFacts(
  code: string,
): ReturnType<typeof collectLitFacts> {
  const probeSource = ts.createSourceFile(
    warm.probeFile,
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
      if (fileName === warm.probeFile) return probeSource;
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
        const target = warm.edges.get(`${containingFile}\0${literal.text}`);
        if (target === undefined) return { resolvedModule: undefined };
        return {
          resolvedModule: {
            resolvedFileName: target,
            extension: extensionOf(target),
          },
        };
      }),
  };
  const program = ts.createProgram([warm.probeFile], OPTIONS, host, oldProgram);
  oldProgram = program;
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(warm.probeFile);
  return source === undefined
    ? { components: [], templates: [] }
    : collectLitFacts(source, checker);
}

/** Run a plugin over a snippet and return its diagnostics. */
export function lint(
  plugin: Deno.lint.Plugin,
  code: string,
  filename = "component.ts",
): Deno.lint.Diagnostic[] {
  const lit = detectLitFacts(code);
  const cache: ScanCache = {
    registrations: {},
    files: {
      [filename]: {
        hash: hashText(code),
        components: lit.components,
        templates: lit.templates,
        imports: [],
      },
    },
  };
  setScanFacts({ root: Deno.cwd(), cache });
  try {
    return Deno.lint.runPlugin(plugin, filename, code);
  } finally {
    setScanFacts(null);
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
