import { parseTsx, printTsx, hasUseClientDirective, hasGenerateMetadataExport } from "../parsers/tsxParser.js";
import { types } from "recast";

const b = types.builders;

/**
 * Checks framework version is >= 14
 * @param {string|null} version
 * @returns {boolean}
 */
export function isNext14Plus(version) {
  if (!version) return true; // Default to modern Next.js conventions
  const majorMatch = version.match(/(\d+)/);
  if (!majorMatch) return true;
  return parseInt(majorMatch[1], 10) >= 14;
}

/**
 * Applies Next.js App Router metadata edits using Recast and AST manipulation.
 *
 * @param {Object} ctx - RuleContext
 * @param {string} workingContent
 * @param {Object} metadataEntries - Key/values to merge into metadata export
 * @param {Object} [viewportEntries] - Key/values for viewport export (Next 14+)
 * @param {string} [langValue] - HTML lang attribute
 * @returns {{ status: 'applied'|'noop'|'manual', patchedContent: string|null, manualSnippet: string|null, changes: Array, placeholders: Array, confidence: 'high'|'medium'|'low' }}
 */
export function patchNextAppRouterLayout(
  ctx,
  workingContent,
  metadataEntries = {},
  viewportEntries = null,
  langValue = null
) {
  const changes = [];
  const placeholders = [];
  let confidence = "high";

  // Check client component
  let ast;
  try {
    ast = parseTsx(workingContent);
  } catch (err) {
    return {
      status: "manual",
      patchedContent: null,
      manualSnippet: null,
      changes: [],
      placeholders: [],
      confidence: "low",
      reason: `Could not parse AST: ${err.message}`,
    };
  }

  if (hasUseClientDirective(ast)) {
    return {
      status: "manual",
      patchedContent: null,
      manualSnippet: `// Cannot export metadata from a client component ('use client').
// Move metadata to a parent server layout or a server page.tsx, or export generateMetadata from a server component.`,
      changes: [],
      placeholders: [],
      confidence: "low",
      reason: "Root layout is marked with 'use client'. Metadata exports are only supported in Server Components.",
    };
  }

  if (hasGenerateMetadataExport(ast)) {
    return {
      status: "manual",
      patchedContent: null,
      manualSnippet: `// Detected dynamic generateMetadata() in layout.
// Add your SEO metadata properties directly inside your existing generateMetadata function:
export async function generateMetadata() {
  return {
${Object.entries(metadataEntries)
  .map(([k, v]) => `    ${k}: ${JSON.stringify(v)},`)
  .join("\n")}
  };
}`,
      changes: [],
      placeholders: [],
      confidence: "medium",
      reason: "Layout uses dynamic generateMetadata(). Dynamic metadata must be updated manually.",
    };
  }

  const body = ast.program.body;

  // Normalize favicon to icons entry if present
  if (metadataEntries.favicon && !metadataEntries.icons) {
    metadataEntries.icons = { icon: metadataEntries.favicon };
  }

  // 1. Check or update <html lang="..."> attribute in JSX
  if (langValue) {
    let htmlTagFound = false;
    let htmlLangUpdated = false;

    function walkJsx(node) {
      if (!node || typeof node !== "object") return;
      if (node.type === "JSXOpeningElement" && node.name?.name === "html") {
        htmlTagFound = true;
        const langAttr = node.attributes?.find((a) => a.type === "JSXAttribute" && a.name?.name === "lang");
        if (!langAttr) {
          node.attributes = node.attributes || [];
          node.attributes.push(
            b.jsxAttribute(b.jsxIdentifier("lang"), b.stringLiteral(langValue))
          );
          htmlLangUpdated = true;
          changes.push({
            description: `Added lang="${langValue}" to <html> tag.`,
            reason: "Improves accessibility and search crawler language detection.",
          });
        }
      }
      for (const key of Object.keys(node)) {
        if (key !== "parent" && Array.isArray(node[key])) {
          node[key].forEach(walkJsx);
        } else if (key !== "parent" && typeof node[key] === "object") {
          walkJsx(node[key]);
        }
      }
    }

    body.forEach(walkJsx);
  }

  // 2. Find existing metadata declaration
  let metadataDeclaration = null;
  let metadataObjectNode = null;
  let defaultExportIndex = -1;
  let nextImportNode = null;
  let hasMetadataTypeImport = false;
  let hasViewportTypeImport = false;

  body.forEach((node, index) => {
    if (node.type === "ImportDeclaration" && node.source?.value === "next") {
      nextImportNode = node;
      node.specifiers?.forEach((spec) => {
        if (spec.imported?.name === "Metadata") hasMetadataTypeImport = true;
        if (spec.imported?.name === "Viewport") hasViewportTypeImport = true;
      });
    }

    if (node.type === "ExportNamedDeclaration") {
      const decl = node.declaration;
      if (decl?.type === "VariableDeclaration") {
        decl.declarations?.forEach((d) => {
          if (d.id?.name === "metadata") {
            metadataDeclaration = node;
            if (d.init?.type === "ObjectExpression") {
              metadataObjectNode = d.init;
            }
          }
        });
      }
    }

    if (node.type === "ExportDefaultDeclaration") {
      defaultExportIndex = index;
    }
  });

  // If metadata is defined but not an ObjectExpression (e.g. identifier or call), return manual
  if (metadataDeclaration && !metadataObjectNode) {
    return {
      status: "manual",
      patchedContent: null,
      manualSnippet: `export const metadata = {
  // Add metadata keys here
};`,
      changes: [],
      placeholders: [],
      confidence: "low",
      reason: "Metadata export is computed dynamically or spread, which cannot be safely merged.",
    };
  }

  const isNext14 = isNext14Plus(ctx.frameworkVersion);
  let metadataModified = false;

  // Helper to convert JS value to AST Expression
  function toAstValue(val) {
    if (val === null || val === undefined) return b.nullLiteral();
    if (typeof val === "string") {
      if (val.startsWith("TODO:")) placeholders.push(val);
      return b.stringLiteral(val);
    }
    if (typeof val === "number") return b.numericLiteral(val);
    if (typeof val === "boolean") return b.booleanLiteral(val);
    if (Array.isArray(val)) {
      return b.arrayExpression(val.map(toAstValue));
    }
    if (typeof val === "object") {
      const props = Object.entries(val).map(([k, v]) =>
        b.objectProperty(b.identifier(k), toAstValue(v))
      );
      return b.objectExpression(props);
    }
    return b.stringLiteral(String(val));
  }

  // 3. Insert or Merge Metadata
  if (!metadataObjectNode) {
    // Need to create metadata export
    const props = [];
    for (const [key, val] of Object.entries(metadataEntries)) {
      if (val !== undefined && val !== null) {
        props.push(b.objectProperty(b.identifier(key), toAstValue(val)));
        metadataModified = true;
        changes.push({
          description: `Added ${key} to metadata export.`,
          reason: `Required for SEO compliance.`,
        });
      }
    }

    if (props.length > 0) {
      // Ensure import type { Metadata } from 'next' if TypeScript
      if (ctx.usesTypeScript) {
        if (!nextImportNode) {
          const importDecl = b.importDeclaration(
            [b.importSpecifier(b.identifier("Metadata"))],
            b.stringLiteral("next")
          );
          importDecl.importKind = "type";
          body.unshift(importDecl);
        } else if (!hasMetadataTypeImport) {
          const spec = b.importSpecifier(b.identifier("Metadata"));
          spec.importKind = "type";
          nextImportNode.specifiers = nextImportNode.specifiers || [];
          nextImportNode.specifiers.push(spec);
        }
      }

      const varDeclarator = b.variableDeclarator(
        b.identifier("metadata"),
        b.objectExpression(props)
      );
      if (ctx.usesTypeScript) {
        varDeclarator.id.typeAnnotation = b.tsTypeAnnotation(
          b.tsTypeReference(b.identifier("Metadata"))
        );
      }

      const exportDecl = b.exportNamedDeclaration(
        b.variableDeclaration("const", [varDeclarator])
      );

      // Insert right above default export if found, else at end
      if (defaultExportIndex !== -1) {
        body.splice(defaultExportIndex, 0, exportDecl);
      } else {
        body.push(exportDecl);
      }
    }
  } else {
    // Merge into existing metadata ObjectExpression
    const existingProps = new Map();
    metadataObjectNode.properties.forEach((prop) => {
      if (prop.type === "ObjectProperty" && prop.key?.name) {
        existingProps.set(prop.key.name, prop);
      }
    });

    for (const [key, val] of Object.entries(metadataEntries)) {
      if (val === undefined || val === null) continue;

      if (!existingProps.has(key)) {
        metadataObjectNode.properties.push(
          b.objectProperty(b.identifier(key), toAstValue(val))
        );
        metadataModified = true;
        changes.push({
          description: `Added ${key} to existing metadata export.`,
          reason: `Configured missing SEO metadata.`,
        });
      } else if (typeof val === "object" && !Array.isArray(val) && val !== null) {
        // Deep merge sub-objects (e.g. openGraph, twitter, alternates, icons)
        const existingSubProp = existingProps.get(key);
        if (existingSubProp?.value?.type === "ObjectExpression") {
          const subExistingProps = new Map();
          existingSubProp.value.properties.forEach((p) => {
            if (p.type === "ObjectProperty" && p.key?.name) {
              subExistingProps.set(p.key.name, p);
            }
          });

          for (const [subKey, subVal] of Object.entries(val)) {
            if (subVal !== undefined && subVal !== null) {
              if (!subExistingProps.has(subKey)) {
                existingSubProp.value.properties.push(
                  b.objectProperty(b.identifier(subKey), toAstValue(subVal))
                );
                metadataModified = true;
                changes.push({
                  description: `Added ${key}.${subKey} to existing metadata export.`,
                  reason: `Expanded ${key} configuration.`,
                });
              } else if (metadataEntries._forceUpdate || ctx.userOptions?.forceUpdate) {
                const subPropNode = subExistingProps.get(subKey);
                if (subPropNode.value?.type === "StringLiteral" && subPropNode.value.value !== subVal) {
                  subPropNode.value = toAstValue(subVal);
                  metadataModified = true;
                  changes.push({
                    description: `Updated ${key}.${subKey} in metadata export: "${subVal}".`,
                    reason: `Updated ${key} configuration.`,
                  });
                }
              }
            }
          }
        }
      } else if (metadataEntries._forceUpdate || ctx.userOptions?.forceUpdate) {
        // Primitive property (e.g. title, description) when forceUpdate is requested
        const existingProp = existingProps.get(key);
        if (existingProp?.value?.type === "StringLiteral" && existingProp.value.value !== val) {
          existingProp.value = toAstValue(val);
          metadataModified = true;
          changes.push({
            description: `Updated ${key} in metadata export: "${val}".`,
            reason: `Updated SEO metadata value.`,
          });
        }
      }
    }
  }

  // 4. Handle Viewport export in Next 14+
  if (isNext14 && viewportEntries && Object.keys(viewportEntries).length > 0) {
    let viewportExport = null;
    body.forEach((node) => {
      if (node.type === "ExportNamedDeclaration") {
        node.declaration?.declarations?.forEach((d) => {
          if (d.id?.name === "viewport") viewportExport = d;
        });
      }
    });

    if (!viewportExport) {
      if (ctx.usesTypeScript) {
        if (!nextImportNode) {
          const importDecl = b.importDeclaration(
            [b.importSpecifier(b.identifier("Viewport"))],
            b.stringLiteral("next")
          );
          importDecl.importKind = "type";
          body.unshift(importDecl);
        } else if (!hasViewportTypeImport) {
          const spec = b.importSpecifier(b.identifier("Viewport"));
          spec.importKind = "type";
          nextImportNode.specifiers.push(spec);
        }
      }

      const vpProps = Object.entries(viewportEntries).map(([k, v]) =>
        b.objectProperty(b.identifier(k), toAstValue(v))
      );

      const vpDeclarator = b.variableDeclarator(
        b.identifier("viewport"),
        b.objectExpression(vpProps)
      );
      if (ctx.usesTypeScript) {
        vpDeclarator.id.typeAnnotation = b.tsTypeAnnotation(
          b.tsTypeReference(b.identifier("Viewport"))
        );
      }

      const vpExportDecl = b.exportNamedDeclaration(
        b.variableDeclaration("const", [vpDeclarator])
      );

      if (defaultExportIndex !== -1) {
        body.splice(defaultExportIndex, 0, vpExportDecl);
      } else {
        body.push(vpExportDecl);
      }

      metadataModified = true;
      changes.push({
        description: "Added separate export const viewport (Next.js 14+ standard).",
        reason: "Next 14+ moved viewport tags out of metadata export into viewport export.",
      });
    }
  }

  if (!metadataModified && changes.length === 0) {
    return {
      status: "noop",
      patchedContent: workingContent,
      manualSnippet: null,
      changes: [],
      placeholders: [],
      confidence: "high",
    };
  }

  if (placeholders.length > 0) {
    confidence = "medium";
  }

  const patchedContent = printTsx(ast);

  return {
    status: "applied",
    patchedContent,
    manualSnippet: null,
    changes,
    placeholders,
    confidence,
  };
}
