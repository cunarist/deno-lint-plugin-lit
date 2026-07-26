import { relative, resolve } from "@std/path";

/** A tagged-template kind provided by Lit. */
export type LitTemplateKind = "html" | "svg" | "css";

/** A Lit tagged template identified by its tag's source offset. */
export interface LitTemplateFact {
  readonly kind: LitTemplateKind;
  readonly start: number;
}

/**
 * The fact store shared by the scanner that builds facts and the rules that
 * read them.
 *
 * A lint rule runs synchronously and cannot build a program, so the scanner
 * builds one at plugin load and leaves the facts here. Verified: `deno lint`
 * runs every rule in the isolate that loaded the plugin, so a module variable
 * reaches them all — the facts never touch the disk and nothing is written into
 * the project being linted. Each file's facts still carry the hash of the
 * content they were derived from, because an editor can lint a buffer that no
 * longer matches the file the scan read; a rule ignores facts whose hash no
 * longer matches.
 *
 * @module
 */

/** The facts derived for a single file. */
export interface FileFacts {
  /** Hash of the file content these facts were derived from. */
  readonly hash: string;
  /** Source offsets of Lit component class names in this file. */
  readonly components: readonly number[];
  /** Lit tagged templates in this file. */
  readonly templates: readonly LitTemplateFact[];
  /** Files this file runs through a direct import, relative to the root. */
  readonly imports: readonly string[];
}

/** The whole set of facts, with paths relative to the root. */
export interface ScanCache {
  /** Each custom element tag to the file that registers it. */
  readonly registrations: Record<string, string>;
  /** Each scanned file to its derived facts. */
  readonly files: Record<string, FileFacts>;
}

/** A built set of facts and the root its relative paths are keyed against. */
export interface ScanFacts {
  /** The directory the relative paths resolve against. */
  readonly root: string;
  /** The facts themselves. */
  readonly cache: ScanCache;
}

let facts: ScanFacts | null = null;

/** Publishes the facts a scan produced, for rules to read. */
export function setScanFacts(next: ScanFacts | null): void {
  facts = next;
}

/** The scan facts for this run, or null when no scan has produced any. */
export function scanFacts(): ScanFacts | null {
  return facts;
}

/** The relative key a file is stored under, matching the scanner's keys. */
export function fileKey(root: string, filename: string): string {
  return relative(root, resolve(filename)).replaceAll("\\", "/");
}

/** A stable, non-cryptographic hash of file content for change detection. */
export function hashText(text: string): string {
  let hash = 5381;
  for (let index = 0; index < text.length; index += 1) {
    hash = (Math.imul(hash, 33) + text.charCodeAt(index)) | 0;
  }
  return (hash >>> 0).toString(36);
}
