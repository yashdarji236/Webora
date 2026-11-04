/**
 * GitHub Repository Tree Service
 * Recursively fetches git repository trees with intelligent path filtering, depth limits, and caching.
 */

const GITHUB_API_BASE = "https://api.github.com";

// In-memory cache for git trees: key = `${owner}/${repo}:${branch}`, value = { timestamp, tree }
const treeCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Excluded directories for analysis efficiency
const IGNORED_PATH_PREFIXES = [
  "node_modules/",
  ".git/",
  ".next/",
  ".nuxt/",
  ".output/",
  "dist/",
  "build/",
  ".turbo/",
  ".cache/",
  "coverage/",
  "vendor/",
  ".yarn/",
];

/**
 * Fetch git tree recursively
 * @param {string} owner
 * @param {string} repo
 * @param {string} branch
 * @param {string} accessToken
 */
export async function fetchRepositoryTree(owner, repo, branch = "main", accessToken) {
  const cacheKey = `${owner}/${repo}:${branch}`;
  const cached = treeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.tree;
  }

  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`;
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "MetaMend-Repo-Inspector",
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, { headers });

  if (response.status === 404) {
    throw new Error(`Git tree for branch "${branch}" was not found.`);
  }

  if (response.status === 403) {
    const rateLimitRemaining = response.headers.get("x-ratelimit-remaining");
    if (rateLimitRemaining === "0") {
      throw new Error("GitHub API rate limit exceeded while retrieving tree.");
    }
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch git tree (${response.status}): ${response.statusText}`);
  }

  const data = await response.json();
  const rawTree = Array.isArray(data.tree) ? data.tree : [];

  // Filter out noise (node_modules, .git, build artifacts)
  const filteredTree = rawTree.filter((item) => {
    if (!item.path) return false;
    const lower = item.path.toLowerCase();
    for (const prefix of IGNORED_PATH_PREFIXES) {
      if (lower === prefix.slice(0, -1) || lower.startsWith(prefix) || lower.includes(`/${prefix}`)) {
        return false;
      }
    }
    return true;
  });

  const processedTree = {
    sha: data.sha,
    truncated: Boolean(data.truncated),
    totalCount: filteredTree.length,
    items: filteredTree.map((item) => ({
      path: item.path,
      type: item.type === "tree" ? "tree" : "blob",
      sha: item.sha,
      size: item.size || 0,
    })),
  };

  treeCache.set(cacheKey, { timestamp: Date.now(), tree: processedTree });
  return processedTree;
}

/**
 * Clear cached tree for a repo
 */
export function clearTreeCache(owner, repo) {
  for (const key of treeCache.keys()) {
    if (key.startsWith(`${owner}/${repo}:`)) {
      treeCache.delete(key);
    }
  }
}

