import ts from "typescript";

/** A tagged-template kind provided by Lit. */
export type LitTemplateKind = "html" | "svg" | "css";

/**
 * Type-aware Lit detection, over a program the analyzer resolved.
 *
 * The type checker follows the whole heritage chain, across files and packages,
 * and identifies Lit's `LitElement`/`ReactiveElement` by both symbol name and
 * declaration package. An aliased or subclassed base is seen, while a same-named
 * local class is not mistaken for it.
 */

/** The classes every Lit component ultimately extends. */
const LIT_BASE_NAMES: ReadonlySet<string> = new Set([
  "LitElement",
  "ReactiveElement",
]);

// The base classes are declared in these packages; `lit` re-exports them, so the
// declaration a symbol resolves to lives in one of the first two.
const LIT_BASE_PACKAGES = /\/(lit-element|@lit\/reactive-element)\//;

const LIT_TEMPLATE_DECLARATIONS: Readonly<
  Record<LitTemplateKind, RegExp>
> = {
  html: /\/lit-html\/.*\/(?:lit-html|static)\.d\.[cm]?ts$/,
  svg: /\/lit-html\/.*\/lit-html\.d\.[cm]?ts$/,
  css: /\/@lit\/reactive-element\/.*\/css-tag\.d\.[cm]?ts$/,
};

/** Whether a class extends a Lit base anywhere in its heritage chain. */
export function isLitComponent(
  checker: ts.TypeChecker,
  node: ts.ClassLikeDeclaration,
): boolean {
  const type = checker.getTypeAtLocation(node);
  return extendsLitBase(checker, type, new Set());
}

/** Walks a type's base chain for a Lit base class. */
function extendsLitBase(
  checker: ts.TypeChecker,
  type: ts.Type,
  seen: Set<ts.Type>,
): boolean {
  if (seen.has(type)) {
    return false;
  }
  seen.add(type);
  for (const base of checker.getBaseTypes(type as ts.InterfaceType)) {
    if (isLitBase(base) || extendsLitBase(checker, base, seen)) {
      return true;
    }
  }
  return false;
}

/** Whether a type is Lit's `LitElement` or `ReactiveElement` itself. */
function isLitBase(type: ts.Type): boolean {
  const symbol = type.getSymbol();
  if (symbol === undefined || !LIT_BASE_NAMES.has(symbol.getName())) {
    return false;
  }
  const declaration = symbol.getDeclarations()?.[0];
  const file = (declaration?.getSourceFile().fileName ?? "").replaceAll(
    "\\",
    "/",
  );
  return LIT_BASE_PACKAGES.test(file);
}

/** The Lit tag a template expression resolves to, or null for another symbol. */
export function litTemplateKind(
  checker: ts.TypeChecker,
  node: ts.TaggedTemplateExpression,
): LitTemplateKind | null {
  let symbol = checker.getSymbolAtLocation(node.tag);
  if (symbol === undefined && ts.isPropertyAccessExpression(node.tag)) {
    symbol = checker.getSymbolAtLocation(node.tag.name);
  }
  if (symbol === undefined) return null;
  if ((symbol.flags & ts.SymbolFlags.Alias) !== 0) {
    symbol = checker.getAliasedSymbol(symbol);
  }
  const name = symbol.getName();
  if (name !== "html" && name !== "svg" && name !== "css") return null;
  const declarationPattern = LIT_TEMPLATE_DECLARATIONS[name];
  return symbol.getDeclarations()?.some((declaration) =>
      declarationPattern.test(
        declaration.getSourceFile().fileName.replaceAll("\\", "/"),
      )
    )
    ? name
    : null;
}
