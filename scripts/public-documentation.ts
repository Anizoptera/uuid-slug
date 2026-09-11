// SPDX-License-Identifier: Apache-2.0

import ts from "typescript-floor";

const hasDocumentation = (checker: ts.TypeChecker, symbol: ts.Symbol): boolean =>
  ts.displayPartsToString(symbol.getDocumentationComment(checker)).trim().length > 0;

/** Return built-package exports and public members whose language-service documentation is empty. */
export function publicDocumentationIssues(entry: string): string[] {
  const program = ts.createProgram([entry], {
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES2022,
  });
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(entry);
  const moduleSymbol = source && checker.getSymbolAtLocation(source);
  if (!source || !moduleSymbol)
    throw new Error(`Cannot inspect public declarations from ${entry}.`);

  const issues: string[] = [];
  for (const exported of checker.getExportsOfModule(moduleSymbol)) {
    const symbol =
      exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
    if (!hasDocumentation(checker, symbol)) issues.push(exported.name);

    for (const declaration of symbol.declarations ?? []) {
      if (!ts.isInterfaceDeclaration(declaration) && !ts.isClassDeclaration(declaration)) continue;
      for (const member of declaration.members) {
        const name = ts.getNameOfDeclaration(member);
        if (
          !name ||
          (!ts.isIdentifier(name) && !ts.isStringLiteral(name) && !ts.isNumericLiteral(name))
        )
          continue;
        if (
          ts.canHaveModifiers(member) &&
          ts
            .getModifiers(member)
            ?.some((modifier) => modifier.kind === ts.SyntaxKind.PrivateKeyword)
        )
          continue;
        const memberSymbol = checker.getSymbolAtLocation(name);
        if (memberSymbol && !hasDocumentation(checker, memberSymbol))
          issues.push(`${exported.name}.${name.getText()}`);
      }
    }
  }
  return [...new Set(issues)];
}

/** Reject a built package whose public declarations lose caller-facing JSDoc. */
export function checkPublicDocumentation(entry: string): void {
  const issues = publicDocumentationIssues(entry);
  if (issues.length)
    throw new Error(
      `Public declarations need caller-facing JSDoc:\n${issues.map((issue) => `- ${issue}`).join("\n")}`,
    );
}
