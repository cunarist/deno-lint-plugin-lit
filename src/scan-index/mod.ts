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
 * the project being linted.
 *
 * Each file's facts carry the hash of the content they were derived from,
 * because an editor lints a buffer that no longer matches the file the scan
 * read. The facts are keyed by source offset, which every edit above them
 * shifts, so stale facts are not merely old but wrong. On a mismatch they are
 * rebuilt through `refresh` rather than discarded — a rule that goes silent the
 * moment you type is a rule that is off whenever it matters.
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
  /**
   * Recomputes one file's facts from its current text, or null when it cannot.
   *
   * Left undefined by a caller with no program to rebuild against — a test
   * harness injecting facts directly — in which case a changed file has no
   * facts at all.
   */
  readonly refresh?: (filename: string, text: string) => FileFacts | null;
}

let facts: ScanFacts | null = null;

/** Facts rebuilt since the scan, keyed by file, holding one hash each. */
const rebuilt = new Map<string, { hash: string; facts: FileFacts | null }>();

/** Publishes the facts a scan produced, for rules to read. */
export function setScanFacts(next: ScanFacts | null): void {
  facts = next;
  rebuilt.clear();
}

/**
 * The facts for the file being linted, rebuilding them when it has changed.
 *
 * Every rule on a file asks for this, so a rebuild is kept and reused until the
 * content changes again; a failed rebuild is kept too, so it is not retried once
 * per rule.
 */
export function currentFileFacts(
  filename: string,
  text: string,
): FileFacts | null {
  if (facts === null) {
    return null;
  }
  const key = fileKey(facts.root, filename);
  const hash = hashText(text);
  const scanned = facts.cache.files[key];
  if (scanned !== undefined && scanned.hash === hash) {
    return scanned;
  }
  const previous = rebuilt.get(key);
  if (previous !== undefined && previous.hash === hash) {
    return previous.facts;
  }
  const next = facts.refresh?.(filename, text) ?? null;
  rebuilt.set(key, { hash, facts: next });
  return next;
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
