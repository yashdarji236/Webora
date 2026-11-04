/**
 * GitHub File Content Service
 * Safely fetches and decodes repository file contents with caching and size guards.
 */

const GITHUB_API_BASE = "https://api.github.com";

// In-memory cache for file contents
const fileCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_READ_SIZE_BYTES = 1024 * 1024; // 1 MB limit per file

/**
 * Fetch raw content of a file in the repository
 * @param {string} owner
 * @param {string} repo
 * @param {string} path
 * @param {string} branch
 * @param {string} accessToken
 * @returns {Promise<string|null>} decoded text content or null if not found
 */
export async function fetchFileContent(owner, repo, path, branch = "main", accessToken) {
  if (!path) return null;
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  const cacheKey = `${owner}/${repo}:${branch}:${cleanPath}`;

  const cached = fileCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.content;
  }

  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(cleanPath)}?ref=${encodeURIComponent(branch)}`;
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "MetaMend-Repo-Inspector",
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  try {
    const response = await fetch(url, { headers });

    if (response.status === 404) {
      fileCache.set(cacheKey, { timestamp: Date.now(), content: null });
      return null;
    }

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    // If file is too large or not a file (e.g. directory)
    if (data.type !== "file") {
      return null;
    }

    if (data.size > MAX_READ_SIZE_BYTES) {
      console.warn(`File ${path} exceeds 1MB limit (${data.size} bytes). Skipping content read.`);
      return null;
    }

    let decodedContent = "";
    if (data.encoding === "base64" && data.content) {
      decodedContent = Buffer.from(data.content, "base64").toString("utf-8");
    } else if (typeof data.content === "string") {
      decodedContent = data.content;
    }

    fileCache.set(cacheKey, { timestamp: Date.now(), content: decodedContent });
    return decodedContent;
  } catch (error) {
    console.warn(`Error reading file ${path}:`, error.message);
    return null;
  }
}

/**
 * Fetch and parse a JSON file safely
 */
export async function fetchJsonFile(owner, repo, path, branch = "main", accessToken) {
  const content = await fetchFileContent(owner, repo, path, branch, accessToken);
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Clear file cache for a repo
 */
export function clearFileCache(owner, repo) {
  for (const key of fileCache.keys()) {
    if (key.startsWith(`${owner}/${repo}:`)) {
      fileCache.delete(key);
    }
  }
}

