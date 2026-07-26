/**
 * Parsing `html` tagged templates with parse5, and mapping parse5 source
 * locations back to ranges in the original TypeScript file.
 *
 * Bindings are replaced by a placeholder before parsing so that the markup is
 * well-formed HTML. The placeholder is deliberately ugly and fixed-width per
 * index so offsets stay easy to map back.
 */

import { parseFragment } from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";

export type ParsedElement = DefaultTreeAdapterMap["element"];
export type ParsedNode = DefaultTreeAdapterMap["node"];

/** Marker substituted for each `${…}` binding. */
export function bindingPlaceholder(index: number): string {
  return `{{__lit_${index}__}}`;
}

const PLACEHOLDER_PATTERN = /\{\{__lit_(\d+)__\}\}/g;

/** Whether a string contains at least one binding placeholder. */
export function hasPlaceholder(text: string): boolean {
  PLACEHOLDER_PATTERN.lastIndex = 0;
  return PLACEHOLDER_PATTERN.test(text);
}

/** Indices of the bindings appearing in a string. */
export function placeholderIndices(text: string): number[] {
  const indices: number[] = [];
  PLACEHOLDER_PATTERN.lastIndex = 0;
  let match = PLACEHOLDER_PATTERN.exec(text);
  while (match !== null) {
    const raw = match[1];
    if (raw !== undefined) indices.push(Number(raw));
    match = PLACEHOLDER_PATTERN.exec(text);
  }
  return indices;
}

export interface TemplateSource {
  /** The template text with bindings replaced by placeholders. */
  readonly text: string;
  /**
   * Maps an offset within `text` back to an absolute offset in the source file.
   */
  toSourceOffset(offset: number): number;
  /** Builds an absolute source range from a parse5 offset pair. */
  toSourceRange(start: number, end: number): Deno.lint.Range;
}

interface Segment {
  /** Start offset within the placeholder-substituted text. */
  readonly textStart: number;
  /** Length of this segment in the substituted text. */
  readonly length: number;
  /** Absolute offset in the source file that `textStart` corresponds to. */
  readonly sourceStart: number;
  /** Absolute end offset in the source file. */
  readonly sourceEnd: number;
  /**
   * Placeholder segments have no character-by-character correspondence with
   * the source (`{{__lit_0__}}` is not the same length as `${this.tag}`), so
   * any offset inside one snaps to the whole `${…}` span.
   */
  readonly isPlaceholder: boolean;
}

/**
 * Build the placeholder-substituted text for a template plus a mapping back to
 * source offsets.
 *
 * Only the static quasis map back faithfully; an offset landing inside a
 * placeholder maps to the start of the corresponding binding expression.
 */
export function templateSource(
  node: Deno.lint.TaggedTemplateExpression,
): TemplateSource {
  const quasis = node.quasi.quasis;
  const expressions = node.quasi.expressions;
  const segments: Segment[] = [];
  let text = "";

  for (let index = 0; index < quasis.length; index += 1) {
    const quasi = quasis[index];
    if (!quasi) continue;
    // `range` of a TemplateElement covers the raw text between delimiters.
    segments.push({
      textStart: text.length,
      length: quasi.raw.length,
      sourceStart: quasi.range[0],
      sourceEnd: quasi.range[0] + quasi.raw.length,
      isPlaceholder: false,
    });
    text += quasi.raw;

    if (index < expressions.length) {
      const expression = expressions[index];
      const placeholder = bindingPlaceholder(index);
      // `${` opens two characters before the expression, `}` closes one after.
      const openStart = expression
        ? expression.range[0] - 2
        : quasi.range[0] + quasi.raw.length;
      const closeEnd = expression ? expression.range[1] + 1 : openStart;
      segments.push({
        textStart: text.length,
        length: placeholder.length,
        sourceStart: openStart,
        sourceEnd: closeEnd,
        isPlaceholder: true,
      });
      text += placeholder;
    }
  }

  function segmentAt(offset: number): Segment | null {
    for (const segment of segments) {
      if (
        offset >= segment.textStart &&
        offset < segment.textStart + segment.length
      ) {
        return segment;
      }
    }
    return null;
  }

  function toSourceOffset(offset: number): number {
    const segment = segmentAt(offset);
    if (!segment) return node.quasi.range[0];
    if (segment.isPlaceholder) return segment.sourceStart;
    return segment.sourceStart + (offset - segment.textStart);
  }

  function toSourceRange(start: number, end: number): Deno.lint.Range {
    const from = toSourceOffset(start);
    const lastSegment = segmentAt(Math.max(start, end - 1));
    let to: number;
    if (!lastSegment) {
      to = from + 1;
    } else if (lastSegment.isPlaceholder) {
      to = lastSegment.sourceEnd;
    } else {
      to = lastSegment.sourceStart + (Math.max(start, end - 1) -
        lastSegment.textStart) +
        1;
    }
    return [from, Math.max(from + 1, to)];
  }

  return { text, toSourceOffset, toSourceRange };
}

/** Parse a template's substituted text into a parse5 fragment. */
export function parseTemplate(
  text: string,
): DefaultTreeAdapterMap["parentNode"] {
  return parseFragment(text, { sourceCodeLocationInfo: true });
}

/** Whether a parse5 node is an element. */
export function isElement(node: ParsedNode): node is ParsedElement {
  return "tagName" in node && "attrs" in node;
}

/**
 * Depth-first walk over parse5 element nodes, in **document order**.
 *
 * Order matters for any rule that reports "the second and later occurrence" —
 * a stack-based walk visits siblings in reverse, which silently flags the first
 * occurrence and spares the last.
 */
export function walkElements(
  root: DefaultTreeAdapterMap["parentNode"],
  visit: (element: ParsedElement) => void,
): void {
  const visitNode = (node: ParsedNode): void => {
    if (isElement(node)) visit(node);
    if ("childNodes" in node && node.childNodes) {
      for (const child of node.childNodes) visitNode(child);
    }
  };
  for (const child of root.childNodes) visitNode(child);
}
