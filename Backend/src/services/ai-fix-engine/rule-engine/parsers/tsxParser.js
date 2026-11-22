import * as recast from "recast";
import * as babelParser from "@babel/parser";

const BABEL_PARSER_CONFIG = {
  sourceType: "module",
  plugins: [
    "typescript",
    "jsx",
    "classProperties",
    "dynamicImport",
    "exportDefaultFrom",
    "exportNamespaceFrom",
    "topLevelAwait",
  ],
  tokens: true,
};

/**
 * Parses JS/TS/TSX/JSX code with Recast and Babel.
 * @param {string} code
 * @returns {Object} AST root
 */
export function parseTsx(code) {
  const normalized = (code || "").replace(/\r\n/g, "\n");
  return recast.parse(normalized, {
    parser: {
      parse(source) {
        return babelParser.parse(source, BABEL_PARSER_CONFIG);
      },
    },
  });
}

/**
 * Validates that code parses cleanly with Babel parser.
 * @param {string} code
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateTsxSyntax(code) {
  try {
    babelParser.parse((code || "").replace(/\r\n/g, "\n"), BABEL_PARSER_CONFIG);
    return { valid: true };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

/**
 * Prints AST back to code preserving untouched formatting.
 * @param {Object} ast
 * @param {boolean} [useCrlf=false]
 * @returns {string}
 */
export function printTsx(ast, useCrlf = false) {
  const code = recast.print(ast).code;
  return useCrlf ? code.replace(/\n/g, "\r\n") : code.replace(/\r\n/g, "\n");
}

/**
 * Checks if the AST has a 'use client' directive.
 * @param {Object} ast
 * @returns {boolean}
 */
export function hasUseClientDirective(ast) {
  const directives = ast.program?.directives || [];
  for (const d of directives) {
    if (d.value?.value === "use client") return true;
  }
  const body = ast.program?.body || [];
  for (const node of body) {
    if (
      node.type === "ExpressionStatement" &&
      (node.expression?.value === "use client" ||
        (node.expression?.type === "StringLiteral" && node.expression.value === "use client"))
    ) {
      return true;
    }
    // Only directives at the top count
    if (node.type !== "ExpressionStatement" || node.expression?.type !== "StringLiteral") {
      break;
    }
  }
  return false;
}

/**
 * Checks if generateMetadata export exists in the AST.
 * @param {Object} ast
 * @returns {boolean}
 */
export function hasGenerateMetadataExport(ast) {
  const body = ast.program?.body || [];
  for (const node of body) {
    if (node.type === "ExportNamedDeclaration") {
      if (
        node.declaration?.type === "FunctionDeclaration" &&
        node.declaration.id?.name === "generateMetadata"
      ) {
        return true;
      }
      if (node.declaration?.type === "VariableDeclaration") {
        for (const decl of node.declaration.declarations) {
          if (decl.id?.name === "generateMetadata") return true;
        }
      }
    }
  }
  return false;
}
