// SPDX-License-Identifier: Apache-2.0

import ts from "typescript-floor";
import { BASE32HEX_NAME, BASE64URL_NAME } from "../src/alphabet.ts";
import { ERROR_CODES } from "../src/errors.ts";
import { SEEDED_MASK_FORMAT, PLAIN_SLUG_FORMAT, FIXED_MASK_FORMAT } from "../src/types.ts";

const owners = new Map<string, string>([
  ...ERROR_CODES.map((code) => [code, "errors.ts"] as const),
  [BASE32HEX_NAME, "alphabet.ts"],
  [BASE64URL_NAME, "base64url-name.ts"],
  [SEEDED_MASK_FORMAT, "types.ts"],
  [PLAIN_SLUG_FORMAT, "types.ts"],
  [FIXED_MASK_FORMAT, "types.ts"],
]);
const violations: string[] = [];

function isTypeofOperand(node: ts.StringLiteral): boolean {
  const expression = node.parent;
  if (!ts.isBinaryExpression(expression)) return false;
  const other = expression.left === node ? expression.right : expression.left;
  return ts.isTypeOfExpression(other);
}

for await (const path of new Bun.Glob("**/*.ts").scan("src")) {
  const source = ts.createSourceFile(
    path,
    await Bun.file(`src/${path}`).text(),
    ts.ScriptTarget.Latest,
    true,
  );
  const localStrings = new Map<string, number[]>();
  const visit = (node: ts.Node): void => {
    // Module paths and type literals are not runtime values. Empty strings are independent
    // accumulator identities; `typeof` literals stay inline because TypeScript narrows from them.
    if (
      ts.isStringLiteral(node) &&
      node.text !== "" &&
      !ts.isLiteralTypeNode(node.parent) &&
      !ts.isImportDeclaration(node.parent) &&
      !ts.isExportDeclaration(node.parent) &&
      !isTypeofOperand(node)
    ) {
      const { line, character } = source.getLineAndCharacterOfPosition(node.getStart(source));
      const owner = owners.get(node.text);
      if (owner && path !== owner) {
        violations.push(
          `src/${path}:${line + 1}:${character + 1} uses ${JSON.stringify(node.text)}; import its named constant from src/${owner}`,
        );
      }
      const lines = localStrings.get(node.text) ?? [];
      lines.push(line + 1);
      localStrings.set(node.text, lines);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  for (const [value, lines] of localStrings) {
    if (lines.length > 1) {
      violations.push(
        `src/${path}:${lines.join(",")} repeats ${JSON.stringify(value)}; declare one named constant in this file`,
      );
    }
  }
}

if (violations.length > 0) {
  throw new Error(
    `Shared runtime strings must use their semantic owners:\n${violations.join("\n")}`,
  );
}
