import ts from "typescript";

/** The files a source runs through a direct import or re-export. */
export function directlyImportedFiles(
  source: ts.SourceFile,
  checker: ts.TypeChecker,
): Set<string> {
  const files = new Set<string>();
  for (const statement of source.statements) {
    const specifier = runtimeSpecifier(statement);
    if (specifier !== null) {
      const file = moduleFile(specifier, checker);
      if (file !== null) {
        files.add(file);
      }
    }
  }
  return files;
}

// A type-only import or re-export is erased and never runs its module, so it
// registers nothing; only a statement that executes the module counts.
/** The module specifier of a statement that runs its module, else null. */
function runtimeSpecifier(statement: ts.Statement): ts.StringLiteral | null {
  const specifier = ts.isImportDeclaration(statement)
    ? runsImport(statement) ? statement.moduleSpecifier : undefined
    : ts.isExportDeclaration(statement) && !statement.isTypeOnly
    ? statement.moduleSpecifier
    : undefined;
  return specifier !== undefined && ts.isStringLiteral(specifier)
    ? specifier
    : null;
}

/** Whether an import executes its module rather than being fully erased. */
function runsImport(statement: ts.ImportDeclaration): boolean {
  const clause = statement.importClause;
  if (clause === undefined) {
    return true;
  }
  if (clause.isTypeOnly) {
    return false;
  }
  if (clause.name !== undefined) {
    return true;
  }
  const bindings = clause.namedBindings;
  if (bindings === undefined || ts.isNamespaceImport(bindings)) {
    return true;
  }
  return bindings.elements.length === 0 ||
    bindings.elements.some((element) => !element.isTypeOnly);
}

/** The resolved file a module specifier points at. */
function moduleFile(
  specifier: ts.StringLiteral,
  checker: ts.TypeChecker,
): string | null {
  const symbol = checker.getSymbolAtLocation(specifier);
  const declaration = symbol?.getDeclarations()?.[0];
  return declaration !== undefined && ts.isSourceFile(declaration)
    ? declaration.fileName
    : null;
}
