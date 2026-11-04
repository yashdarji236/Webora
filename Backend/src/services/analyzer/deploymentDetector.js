/**
 * Deployment Configuration Detector
 * Identifies deployment platforms through configuration evidence in repository files.
 */

export function detectDeployment(treeItems = [], repoHomepage = "") {
  const filePaths = new Set(treeItems.map((item) => item.path.toLowerCase()));

  // 1. Vercel
  if (filePaths.has("vercel.json") || filePaths.has(".vercel/project.json")) {
    return {
      platform: "Vercel",
      slug: "vercel",
      configurationDetected: true,
      configFile: filePaths.has("vercel.json") ? "vercel.json" : ".vercel/project.json",
      liveDeploymentVerified: Boolean(repoHomepage && repoHomepage.includes("vercel.app")),
      deploymentUrl: repoHomepage || null,
      details: "Vercel deployment configuration file detected.",
    };
  }

  // 2. Netlify
  if (filePaths.has("netlify.toml")) {
    return {
      platform: "Netlify",
      slug: "netlify",
      configurationDetected: true,
      configFile: "netlify.toml",
      liveDeploymentVerified: Boolean(repoHomepage && repoHomepage.includes("netlify.app")),
      deploymentUrl: repoHomepage || null,
      details: "Netlify configuration file detected.",
    };
  }

  // 3. Cloudflare Pages / Workers
  if (filePaths.has("wrangler.toml") || filePaths.has("wrangler.json")) {
    return {
      platform: "Cloudflare",
      slug: "cloudflare",
      configurationDetected: true,
      configFile: filePaths.has("wrangler.toml") ? "wrangler.toml" : "wrangler.json",
      liveDeploymentVerified: Boolean(repoHomepage && repoHomepage.includes("pages.dev")),
      deploymentUrl: repoHomepage || null,
      details: "Cloudflare Wrangler configuration detected.",
    };
  }

  // 4. Railway
  if (filePaths.has("railway.json") || filePaths.has("railway.toml")) {
    return {
      platform: "Railway",
      slug: "railway",
      configurationDetected: true,
      configFile: filePaths.has("railway.json") ? "railway.json" : "railway.toml",
      liveDeploymentVerified: Boolean(repoHomepage && repoHomepage.includes("railway.app")),
      deploymentUrl: repoHomepage || null,
      details: "Railway deployment configuration detected.",
    };
  }

  // 5. Render
  if (filePaths.has("render.yaml")) {
    return {
      platform: "Render",
      slug: "render",
      configurationDetected: true,
      configFile: "render.yaml",
      liveDeploymentVerified: Boolean(repoHomepage && repoHomepage.includes("onrender.com")),
      deploymentUrl: repoHomepage || null,
      details: "Render blueprint configuration detected.",
    };
  }

  // 6. Docker
  if (filePaths.has("dockerfile") || filePaths.has("docker-compose.yml") || filePaths.has("docker-compose.yaml")) {
    return {
      platform: "Docker Container",
      slug: "docker",
      configurationDetected: true,
      configFile: filePaths.has("dockerfile") ? "Dockerfile" : "docker-compose.yml",
      liveDeploymentVerified: Boolean(repoHomepage),
      deploymentUrl: repoHomepage || null,
      details: "Docker containerization setup detected.",
    };
  }

  // If live site homepage is present (e.g. GitHub Pages or custom domain)
  if (repoHomepage) {
    const isGithubPages = repoHomepage.includes("github.io");
    return {
      platform: isGithubPages ? "GitHub Pages" : "Custom Domain / Verified Live Site",
      slug: isGithubPages ? "github-pages" : "custom",
      configurationDetected: false,
      configFile: null,
      liveDeploymentVerified: true,
      deploymentUrl: repoHomepage,
      details: isGithubPages ? "Live deployment verified via GitHub Pages URL" : "Live deployment URL verified via repository metadata",
    };
  }

  return {
    platform: "Unknown / Unconfigured",
    slug: "unknown",
    configurationDetected: false,
    configFile: null,
    liveDeploymentVerified: false,
    deploymentUrl: null,
    details: "No explicit deployment configuration files found in repository root.",
  };
}

