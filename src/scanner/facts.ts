import { relative } from "@std/path";
import ts from "typescript";

import {
  type FileFacts,
  hashText,
  type LitTemplateFact,
  type ScanCache,
} from "#scan-index";

import { directlyImportedFiles } from "./direct-import.ts";
import { isLitComponent, litTemplateKind } from "./lit.ts";
import { collectRegistrations } from "./registration.ts";

/**
 * Turns a program into the fact cache the lint rules read.
 *
 * A rule cannot build a program or run a checker, so the scanner precomputes
 * what a rule needs. Paths are relative to the project root, and every file
 * carries a content hash so a rule can tell whether its facts still apply.
 */

/** Builds the fact cache for a program, with paths relative to the root. */
export function buildCache(
  program: ts.Program,
  files: readonly string[],
  root: string,
): ScanCache {
  const checker = program.getTypeChecker();
  const registrations: Record<string, string> = {};
  for (const [tag, file] of collectRegistrations(program, checker)) {
    registrations[tag] = toRoot(root, file);
  }
  const cache: ScanCache = { registrations, files: {} };
  for (const file of files) {
    const facts = fileFacts(program, file, root);
    if (facts !== null) {
      cache.files[toRoot(root, file)] = facts;
    }
  }
  return cache;
}

/**
 * The facts for a single file, or null when the program does not have it.
 *
 * A rebuild recomputes only the file that changed. Calling `buildCache` again
 * would walk every file with a checker that no longer has any of the previous
 * one's inference cached, which is the whole cost the rebuild exists to avoid.
 */
export function fileFacts(
  program: ts.Program,
  file: string,
  root: string,
): FileFacts | null {
  const source = program.getSourceFile(file);
  if (source === undefined) {
    return null;
  }
  const checker = program.getTypeChecker();
  const lit = collectLitFacts(source, checker);
  return {
    hash: hashText(source.text),
    components: lit.components,
    templates: lit.templates,
    imports: [...directlyImportedFiles(source, checker)].map((imported) =>
      toRoot(root, imported)
    ),
  };
}

/** Lit classes and template tags declared in a source file. */
export function collectLitFacts(
  source: ts.SourceFile,
  checker: ts.TypeChecker,
): { components: number[]; templates: LitTemplateFact[] } {
  const components: number[] = [];
  const templates: LitTemplateFact[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isClassLike(node) &&
      node.name !== undefined &&
      ts.isIdentifier(node.name) &&
      isLitComponent(checker, node)
    ) {
      components.push(node.name.getStart(source));
    }
    if (ts.isTaggedTemplateExpression(node)) {
      const kind = litTemplateKind(checker, node);
      if (kind !== null) {
        templates.push({ kind, start: node.tag.getStart(source) });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { components, templates };
}

/** A path relative to the root, in forward slashes for a stable key. */
function toRoot(root: string, path: string): string {
  return relative(root, path).replaceAll("\\", "/");
}
