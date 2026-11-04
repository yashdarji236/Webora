/**
 * GitHub Repository Metadata Service
 * Fetches repository details, commits, rate limits, and visibility safely.
 */

const GITHUB_API_BASE = "https://api.github.com";

/**
 * Standardized headers with authentication
 */
function getHeaders(accessToken) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "MetaMend-Repo-Inspector",
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
}

/**
 * Fetch repository metadata from GitHub API
 * @param {string} owner - Repository owner/organization
 * @param {string} repo - Repository name
 * @param {string} accessToken - User's GitHub OAuth token
 */
export async function fetchRepositoryMetadata(owner, repo, accessToken) {
  if (!owner || !repo) {
    throw new Error("Repository owner and name are required.");
  }

  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}`;
  const response = await fetch(url, { headers: getHeaders(accessToken) });

  // Rate limit handling
  const rateLimitRemaining = response.headers.get("x-ratelimit-remaining");
  const rateLimitReset = response.headers.get("x-ratelimit-reset");

  if (response.status === 403 && rateLimitRemaining === "0") {
    const resetDate = rateLimitReset ? new Date(parseInt(rateLimitReset, 10) * 1000).toLocaleTimeString() : "soon";
    throw new Error(`GitHub API rate limit exceeded. Reset expected at ${resetDate}.`);
  }

  if (response.status === 404) {
    throw new Error(`Repository "${owner}/${repo}" was not found or access is restricted.`);
  }

  if (!response.ok) {
    throw new Error(`GitHub API returned error ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  // Fetch latest commit on default branch if repo is not empty
  let latestCommit = null;
  if (!data.empty && data.default_branch) {
    try {
      const commitRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/commits/${data.default_branch}`, {
        headers: getHeaders(accessToken),
      });
      if (commitRes.ok) {
        const commitData = await commitRes.json();
        latestCommit = {
          sha: commitData.sha ? commitData.sha.substring(0, 7) : "",
          fullSha: commitData.sha || "",
          message: commitData.commit?.message || "",
          author: commitData.commit?.author?.name || commitData.author?.login || "Unknown",
          date: commitData.commit?.author?.date || null,
        };
      }
    } catch (err) {
      console.warn(`Could not fetch latest commit for ${owner}/${repo}:`, err.message);
    }
  }

  return {
    id: data.id,
    name: data.name,
    fullName: data.full_name,
    owner: data.owner?.login || owner,
    description: data.description || "",
    defaultBranch: data.default_branch || "main",
    visibility: data.private ? "private" : "public",
    isPrivate: Boolean(data.private),
    isEmpty: Boolean(data.empty || data.size === 0),
    language: data.language || "Unknown",
    stars: data.stargazers_count || 0,
    forks: data.forks_count || 0,
    openIssuesCount: data.open_issues_count || 0,
    htmlUrl: data.html_url || `https://github.com/${owner}/${repo}`,
    homepage: data.homepage || "",
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    pushedAt: data.pushed_at,
    latestCommit,
  };
}

