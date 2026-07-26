import ts from "typescript";

/** The directory a `mod.ts` covers, or null for any other file. */
function modScope(fileName: string): string | null {
  const cut = fileName.lastIndexOf("/");
  return fileName.slice(cut + 1) === "mod.ts"
    ? fileName.slice(0, cut + 1)
    : null;
}

/**
 * The files a source runs through its own runtime imports and re-exports, plus
 * the ones an imported `mod.ts` runs from inside its own directory tree.
 *
 * A `mod.ts` stands for the folder it sits in, so importing it is a real reason
 * for anything under that folder to have run. An arbitrary barrel is not — it
 * can pull in a module from anywhere, which is the borrowed import this rule
 * exists to reject.
 */
export function runtimeImportedFiles(
  source: ts.SourceFile,
  checker: ts.TypeChecker,
): Set<string> {
  const files = new Set<string>();
  const visited = new Set([source.fileName]);
  const pending: { file: ts.SourceFile; scope: string | null }[] = [
    { file: source, scope: null },
  ];
  for (let index = 0; index < pending.length; index += 1) {
    const current = pending[index];
    if (current === undefined) continue;
    for (const statement of current.file.statements) {
      const specifier = runtimeSpecifier(statement);
      if (specifier === null) continue;
      const imported = moduleSource(specifier, checker);
      if (imported === null || visited.has(imported.fileName)) continue;
      if (
        current.scope !== null && !imported.fileName.startsWith(current.scope)
      ) {
        continue;
      }
      visited.add(imported.fileName);
      files.add(imported.fileName);
      const scope = modScope(imported.fileName);
      if (scope !== null) pending.push({ file: imported, scope });
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
    : ts.isExportDeclaration(statement) && runsExport(statement)
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

/** Whether a re-export executes its module rather than being fully erased. */
function runsExport(statement: ts.ExportDeclaration): boolean {
  if (statement.isTypeOnly) return false;
  const clause = statement.exportClause;
  return clause === undefined || ts.isNamespaceExport(clause) ||
    clause.elements.length === 0 ||
    clause.elements.some((element) => !element.isTypeOnly);
}

/** The resolved source a module specifier points at. */
function moduleSource(
  specifier: ts.StringLiteral,
  checker: ts.TypeChecker,
): ts.SourceFile | null {
  const symbol = checker.getSymbolAtLocation(specifier);
  const declaration = symbol?.getDeclarations()?.[0];
  return declaration !== undefined && ts.isSourceFile(declaration)
    ? declaration
    : null;
}
