import ts from "typescript";

/**
 * Where each custom element tag is registered, across the whole program.
 *
 * A custom element is usable wherever its defining module has run, so a template
 * can reach a tag through any transitive import and a lint plugin, seeing one
 * file, cannot tell a direct registration from an inherited one. The program
 * makes the link explicit through any of the three ways a tag is declared: a
 * `customElements.define("tag", …)` call, a `@customElement("tag")` decorator,
 * or an `HTMLElementTagNameMap` augmentation mapping `"tag"` to its class. The
 * first two name the registering module directly; the augmentation is followed
 * to the mapped class's declaration. Compiled dependencies keep only the
 * augmentation in their `.d.ts`, so all three are needed to cover source and
 * package elements alike.
 */

/** The interface an element module augments to type its tag. */
const TAG_NAME_MAP = "HTMLElementTagNameMap";

/** The decorator that registers a Lit element. */
const CUSTOM_ELEMENT = "customElement";

/** The global registry and its registering method. */
const REGISTRY = "customElements";
const DEFINE = "define";

/** Maps every registered tag to the file that registers it. */
export function collectRegistrations(
  program: ts.Program,
  checker: ts.TypeChecker,
): Map<string, string> {
  const registrations = new Map<string, string>();
  for (const source of program.getSourceFiles()) {
    collectFromFile(source, checker, registrations);
  }
  return registrations;
}

/** Records every tag a file registers by any of the three means. */
function collectFromFile(
  source: ts.SourceFile,
  checker: ts.TypeChecker,
  registrations: Map<string, string>,
): void {
  const visit = (node: ts.Node): void => {
    if (isTagNameMap(node, checker)) {
      recordAugmentation(node, checker, registrations);
    } else if (ts.isClassLike(node)) {
      recordDecorator(node, checker, registrations);
    } else if (isDefineCall(node, checker)) {
      record(literalArgument(node), node.getSourceFile(), registrations);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}

// A custom element name always contains a hyphen, which keeps the built-in tags
// of `lib.dom`'s own `HTMLElementTagNameMap` out of the index.
/** Whether a tag names a custom element rather than a built-in one. */
function isCustomTag(tag: string | null): tag is string {
  return tag !== null && tag.includes("-");
}

/** Sets a tag against a file, keeping the first registration seen. */
function record(
  tag: string | null,
  source: ts.SourceFile,
  registrations: Map<string, string>,
): void {
  if (isCustomTag(tag) && !registrations.has(tag)) {
    registrations.set(tag, source.fileName);
  }
}

/**
 * Whether a node augments the real global `HTMLElementTagNameMap`.
 *
 * A module-local interface with the same spelling is unrelated and must not
 * become registration evidence.
 */
function isTagNameMap(
  node: ts.Node,
  checker: ts.TypeChecker,
): node is ts.InterfaceDeclaration {
  if (!ts.isInterfaceDeclaration(node) || node.name.text !== TAG_NAME_MAP) {
    return false;
  }
  const symbol = checker.getSymbolAtLocation(node.name);
  return symbol !== undefined && declaredInDom(symbol);
}

/** Records every `"tag": ElementClass` entry against the class's own module. */
function recordAugmentation(
  node: ts.InterfaceDeclaration,
  checker: ts.TypeChecker,
  registrations: Map<string, string>,
): void {
  for (const member of node.members) {
    if (!ts.isPropertySignature(member) || member.type === undefined) {
      continue;
    }
    const tag = tagOf(member.name);
    const file = declaringFile(member.type, checker);
    if (isCustomTag(tag) && file !== null && !registrations.has(tag)) {
      registrations.set(tag, file);
    }
  }
}

/** Records a `@customElement("tag")` decorator against its own module. */
function recordDecorator(
  node: ts.ClassLikeDeclaration,
  checker: ts.TypeChecker,
  registrations: Map<string, string>,
): void {
  for (const decorator of ts.getDecorators(node) ?? []) {
    const call = decorator.expression;
    if (
      ts.isCallExpression(call) &&
      isLitCustomElement(call.expression, checker)
    ) {
      record(literalArgument(call), node.getSourceFile(), registrations);
    }
  }
}

/** Whether a node calls the real global `customElements.define(…)`. */
function isDefineCall(
  node: ts.Node,
  checker: ts.TypeChecker,
): node is ts.CallExpression {
  if (
    !ts.isCallExpression(node) ||
    !ts.isPropertyAccessExpression(node.expression) ||
    node.expression.name.text !== DEFINE ||
    !ts.isIdentifier(node.expression.expression) ||
    node.expression.expression.text !== REGISTRY
  ) {
    return false;
  }
  const registry = checker.getSymbolAtLocation(node.expression.expression);
  const define = checker.getSymbolAtLocation(node.expression.name);
  return registry !== undefined &&
    define !== undefined &&
    declaredInDom(resolveAlias(registry, checker)) &&
    declaredInDom(resolveAlias(define, checker));
}

/** Whether an expression resolves to Lit's `customElement` decorator. */
function isLitCustomElement(
  expression: ts.LeftHandSideExpression,
  checker: ts.TypeChecker,
): boolean {
  const symbol = checker.getSymbolAtLocation(expression) ??
    (ts.isPropertyAccessExpression(expression)
      ? checker.getSymbolAtLocation(expression.name)
      : undefined);
  if (symbol === undefined) {
    return false;
  }
  const target = resolveAlias(symbol, checker);
  return target.getName() === CUSTOM_ELEMENT &&
    target.getDeclarations()?.some((declaration) =>
        /\/@lit\/reactive-element\/.*\/?custom-element\.d\.[cm]?ts$/.test(
          normalizedFile(declaration),
        )
      ) === true;
}

/** Follows an import alias to the symbol it denotes. */
function resolveAlias(symbol: ts.Symbol, checker: ts.TypeChecker): ts.Symbol {
  return (symbol.flags & ts.SymbolFlags.Alias) !== 0
    ? checker.getAliasedSymbol(symbol)
    : symbol;
}

/** Whether a symbol has a declaration in TypeScript's DOM library. */
function declaredInDom(symbol: ts.Symbol): boolean {
  return symbol.getDeclarations()?.some((declaration) =>
    /\/lib\.dom\.d\.ts$/.test(normalizedFile(declaration))
  ) === true;
}

/** The normalized source file containing a declaration. */
function normalizedFile(declaration: ts.Declaration): string {
  return declaration.getSourceFile().fileName.replaceAll("\\", "/");
}

/** The first argument of a call when it is a string literal. */
function literalArgument(call: ts.CallExpression): string | null {
  const first = call.arguments[0];
  return first !== undefined && ts.isStringLiteralLike(first)
    ? first.text
    : null;
}

/** The string literal key of a tag entry, or null for a computed one. */
function tagOf(name: ts.PropertyName): string | null {
  if (ts.isStringLiteral(name)) {
    return name.text;
  }
  if (ts.isComputedPropertyName(name) && ts.isStringLiteral(name.expression)) {
    return name.expression.text;
  }
  return null;
}

/** The file that declares the element class a tag entry maps to. */
function declaringFile(
  type: ts.TypeNode,
  checker: ts.TypeChecker,
): string | null {
  const symbol = checker.getTypeFromTypeNode(type).getSymbol();
  const declaration = symbol?.getDeclarations()?.[0];
  return declaration?.getSourceFile().fileName ?? null;
}
