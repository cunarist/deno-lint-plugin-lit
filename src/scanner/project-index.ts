import type { TypeServices } from "@cunarist/typescript-deno-lint/types";
import type ts from "typescript";

import { collectRegistrations } from "./registration.ts";
import { runtimeImportedFiles } from "./runtime-import.ts";

/**
 * Facts no single file can answer, computed once and kept.
 *
 * Almost everything these rules need is answerable from the node being visited:
 * the checker is right there, and asking it costs nothing worth caching. These
 * two are not. "Which module registers `<my-dialog>`?" has to walk every file in
 * the program, and doing that per rule, per file, would walk it thousands of
 * times.
 *
 * Both are keyed by the object they were derived from, so a rebuilt program or a
 * reparsed file recomputes rather than answering from the previous one.
 */

/** Every registered tag to the file registering it, per program. */
const registrations = new WeakMap<ts.Program, ReadonlyMap<string, string>>();

/** The files a source runs through its imports, per source file. */
const runtimeImports = new WeakMap<ts.SourceFile, ReadonlySet<string>>();

/** Where each custom element tag is registered, across the whole program. */
export function registrationIndex(
  services: TypeServices,
): ReadonlyMap<string, string> {
  const existing = registrations.get(services.program);
  if (existing !== undefined) {
    return existing;
  }
  const built = collectRegistrations(services.program, services.checker);
  registrations.set(services.program, built);
  return built;
}

/** The files the linted file runs, directly or through an imported `mod.ts`. */
export function runtimeImportIndex(
  services: TypeServices,
): ReadonlySet<string> {
  const existing = runtimeImports.get(services.sourceFile);
  if (existing !== undefined) {
    return existing;
  }
  const built = runtimeImportedFiles(services.sourceFile, services.checker);
  runtimeImports.set(services.sourceFile, built);
  return built;
}
