/**
 * Project Structure Analyzer
 * Analyzes directory structure, identifies important configuration files,
 * and builds a simplified hierarchical visual tree.
 */

// Key directories of interest for web projects
const KEY_DIRECTORIES = new Set([
  "src",
  "app",
  "pages",
  "public",
  "components",
  "layouts",
  "assets",
  "styles",
  "lib",
  "hooks",
  "utils",
  "routes",
  "views",
  "content",
]);

// Important configuration filenames
const CONFIG_FILE_PATTERNS = [
  /^package\.json$/i,
  /^tsconfig(\..+)?\.json$/i,
  /^jsconfig(\..+)?\.json$/i,
  /^vite\.config\.(js|ts|mjs|cjs)$/i,
  /^next\.config\.(js|ts|mjs)$/i,
  /^astro\.config\.(js|ts|mjs)$/i,
  /^nuxt\.config\.(js|ts|mjs)$/i,
  /^svelte\.config\.(js|ts)$/i,
  /^tailwind\.config\.(js|ts|cjs|mjs)$/i,
  /^postcss\.config\.(js|cjs|mjs)$/i,
  /^vercel\.json$/i,
  /^netlify\.toml$/i,
  /^robots\.txt$/i,
  /^sitemap\.(xml|ts|js)$/i,
  /^Dockerfile$/i,
  /^docker-compose\.(yml|yaml)$/i,
];

/**
 * Analyze tree and build visual hierarchy and key directories
 * @param {Array<{path: string, type: string, size: number}>} treeItems
 * @param {string} rootRepoName
 */
export function analyzeStructure(treeItems = [], rootRepoName = "repository") {
  const detectedDirectories = new Set();
  const importantFiles = [];

  // 1. Identify important files & directories
  for (const item of treeItems) {
    const parts = item.path.split("/");
    const topFolder = parts[0];
    if (KEY_DIRECTORIES.has(topFolder.toLowerCase())) {
      detectedDirectories.add(topFolder);
    }
    if (parts.length > 1 && KEY_DIRECTORIES.has(parts[1].toLowerCase())) {
      detectedDirectories.add(`${topFolder}/${parts[1]}`);
    }

    const filename = parts[parts.length - 1];
    for (const pattern of CONFIG_FILE_PATTERNS) {
      if (pattern.test(filename)) {
        importantFiles.push({
          path: item.path,
          name: filename,
          type: item.type,
          size: item.size || 0,
        });
        break;
      }
    }
  }

  // 2. Build a simplified, clean hierarchical tree (max depth 3 to keep UI fast and legible)
  const root = {
    name: rootRepoName,
    path: "",
    type: "dir",
    children: [],
  };

  // Helper to place item in tree
  const findOrCreateDir = (parent, segment, currentPath) => {
    let dir = parent.children.find((c) => c.name === segment && c.type === "dir");
    if (!dir) {
      dir = {
        name: segment,
        path: currentPath,
        type: "dir",
        children: [],
      };
      parent.children.push(dir);
    }
    return dir;
  };

  // Sort: prioritize important files, top-level items, and key directories
  const priorityItems = treeItems.filter((item) => {
    const parts = item.path.split("/");
    if (parts.length <= 3) return true; // Keep top 3 levels
    // Keep root config files
    if (parts.length === 1) return true;
    // Keep files in app/, src/app/, pages/, public/
    const firstTwo = parts.slice(0, 2).join("/").toLowerCase();
    return (
      firstTwo.startsWith("app") ||
      firstTwo.startsWith("src/app") ||
      firstTwo.startsWith("pages") ||
      firstTwo.startsWith("src/pages") ||
      firstTwo.startsWith("public")
    );
  });

  // Limit to 60 representative items to prevent bloated rendering
  const sampleItems = priorityItems.slice(0, 60);

  for (const item of sampleItems) {
    const parts = item.path.split("/");
    let current = root;
    let accumulatedPath = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      accumulatedPath = accumulatedPath ? `${accumulatedPath}/${part}` : part;
      const isFile = i === parts.length - 1 && item.type === "blob";

      if (isFile) {
        current.children.push({
          name: part,
          path: accumulatedPath,
          type: "file",
          size: item.size || 0,
        });
      } else {
        current = findOrCreateDir(current, part, accumulatedPath);
      }
    }
  }

  // Sort children: directories first, then files alphabetically
  const sortTree = (node) => {
    if (node.children && node.children.length > 0) {
      node.children.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === "dir" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      node.children.forEach(sortTree);
    }
  };
  sortTree(root);

  return {
    directories: Array.from(detectedDirectories),
    importantFiles,
    totalFilesCount: treeItems.length,
    visualTree: root,
  };
}

