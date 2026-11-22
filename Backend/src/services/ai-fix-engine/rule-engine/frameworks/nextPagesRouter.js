import { parseTsx, printTsx } from "../parsers/tsxParser.js";
import { types } from "recast";

const b = types.builders;

/**
 * Patches Next.js Pages router files (_document, _app, or page).
 *
 * @param {Object} ctx - RuleContext
 * @param {string} workingContent
 * @param {Array<{ tag: string, props: Object, children?: string }>} headElements
 * @param {string} [langValue]
 * @returns {{ status: 'applied'|'noop'|'manual', patchedContent: string|null, manualSnippet: string|null, changes: Array, placeholders: Array, confidence: 'high'|'medium'|'low' }}
 */
export function patchNextPagesRouter(
  ctx,
  workingContent,
  headElements = [],
  langValue = null
) {
  const changes = [];
  const placeholders = [];

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

  const body = ast.program.body;
  let hasHeadImport = false;
  let headImportLocalName = "Head";

  body.forEach((node) => {
    if (node.type === "ImportDeclaration" && node.source?.value === "next/head") {
      hasHeadImport = true;
      const defaultSpec = node.specifiers?.find((s) => s.type === "ImportDefaultSpecifier");
      if (defaultSpec?.local?.name) {
        headImportLocalName = defaultSpec.local.name;
      }
    }
  });

  let modified = false;

  // 1. Update <Html lang="..."> if in _document
  if (langValue) {
    function walkHtml(node) {
      if (!node || typeof node !== "object") return;
      if (node.type === "JSXOpeningElement" && node.name?.name === "Html") {
        const langAttr = node.attributes?.find((a) => a.type === "JSXAttribute" && a.name?.name === "lang");
        if (!langAttr) {
          node.attributes = node.attributes || [];
          node.attributes.push(
            b.jsxAttribute(b.jsxIdentifier("lang"), b.stringLiteral(langValue))
          );
          modified = true;
          changes.push({
            description: `Added lang="${langValue}" to <Html> element.`,
            reason: "Declares primary document language in Next.js Pages _document.",
          });
        }
      }
      for (const key of Object.keys(node)) {
        if (key !== "parent" && Array.isArray(node[key])) node[key].forEach(walkHtml);
        else if (key !== "parent" && typeof node[key] === "object") walkHtml(node[key]);
      }
    }
    body.forEach(walkHtml);
  }

  // 2. Add elements to existing <Head> or create one
  if (headElements.length > 0) {
    let targetHeadNode = null;

    function findHead(node) {
      if (!node || typeof node !== "object") return;
      if (
        node.type === "JSXElement" &&
        node.openingElement?.name?.name === headImportLocalName
      ) {
        targetHeadNode = node;
        return;
      }
      for (const key of Object.keys(node)) {
        if (key !== "parent" && Array.isArray(node[key])) node[key].forEach(findHead);
        else if (key !== "parent" && typeof node[key] === "object") findHead(node[key]);
      }
    }

    body.forEach(findHead);

    if (targetHeadNode) {
      // Append JSX children to existing <Head>
      targetHeadNode.children = targetHeadNode.children || [];
      for (const elem of headElements) {
        const attrs = Object.entries(elem.props || {}).map(([k, v]) =>
          b.jsxAttribute(b.jsxIdentifier(k), b.stringLiteral(v))
        );
        const opening = b.jsxOpeningElement(b.jsxIdentifier(elem.tag), attrs, !elem.children);
        let jsxElem;
        if (elem.children) {
          jsxElem = b.jsxElement(
            opening,
            b.jsxClosingElement(b.jsxIdentifier(elem.tag)),
            [b.jsxText(elem.children)]
          );
        } else {
          jsxElem = b.jsxElement(opening, null, []);
        }
        targetHeadNode.children.push(b.jsxText("\n  "));
        targetHeadNode.children.push(jsxElem);
        modified = true;
        changes.push({
          description: `Added <${elem.tag}> into existing <${headImportLocalName}> block.`,
          reason: "Configures SEO metadata using next/head.",
        });
      }
    } else {
      // If no Head found, recommend manual snippet to avoid breaking custom JSX hierarchy
      return {
        status: "manual",
        patchedContent: null,
        manualSnippet: `import Head from 'next/head';\n\n// Add inside your JSX return:\n<Head>\n${headElements
          .map((e) =>
            e.children
              ? `  <${e.tag}>${e.children}</${e.tag}>`
              : `  <${e.tag} ${Object.entries(e.props || {})
                  .map(([k, v]) => `${k}="${v}"`)
                  .join(" ")} />`
          )
          .join("\n")}\n</Head>`,
        changes: [],
        placeholders: [],
        confidence: "medium",
        reason: "Could not safely locate an existing <Head> JSX element in the component.",
      };
    }
  }

  if (!modified) {
    return {
      status: "noop",
      patchedContent: workingContent,
      manualSnippet: null,
      changes: [],
      placeholders: [],
      confidence: "high",
    };
  }

  return {
    status: "applied",
    patchedContent: printTsx(ast),
    manualSnippet: null,
    changes,
    placeholders,
    confidence: "high",
  };
}
