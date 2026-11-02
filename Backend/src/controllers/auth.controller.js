import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

/**
 * Exchange GitHub code for access token and profile info, upsert user in DB, and issue JWT.
 */
async function processGithubCode(code) {
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SEC;
  const jwtSecret = process.env.JWT_SEC;

  if (!clientId || !clientSecret || !jwtSecret) {
    throw new Error("Missing GitHub OAuth or JWT configuration in environment");
  }

  // 1. Exchange code for access_token
  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  const tokenData = await tokenResponse.json();

  if (tokenData.error || !tokenData.access_token) {
    throw new Error(
      tokenData.error_description || tokenData.error || "Failed to exchange GitHub authorization code"
    );
  }

  const accessToken = tokenData.access_token;

  // 2. Fetch User Profile from GitHub
  const userResponse = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "MetaMend-SEOForge",
      Accept: "application/vnd.github+json",
    },
  });

  if (!userResponse.ok) {
    throw new Error(`Failed to fetch GitHub user details: ${userResponse.statusText}`);
  }

  const ghUser = await userResponse.json();

  // 3. Fetch primary email if user profile email is private
  let userEmail = ghUser.email;
  if (!userEmail) {
    try {
      const emailResponse = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "MetaMend-SEOForge",
          Accept: "application/vnd.github+json",
        },
      });
      if (emailResponse.ok) {
        const emails = await emailResponse.json();
        if (Array.isArray(emails)) {
          const primaryVerified = emails.find((e) => e.primary && e.verified);
          const anyVerified = emails.find((e) => e.verified);
          userEmail = (primaryVerified || anyVerified || emails[0])?.email;
        }
      }
    } catch (e) {
      console.warn("Could not retrieve emails from GitHub:", e.message);
    }
  }

  if (!userEmail) {
    userEmail = `${ghUser.login}@users.noreply.github.com`;
  }

  // 4. Upsert user in MongoDB
  let user = await User.findOne({ githubId: String(ghUser.id) });

  if (!user) {
    user = new User({
      githubId: String(ghUser.id),
      username: ghUser.login,
      name: ghUser.name || ghUser.login,
      email: userEmail,
      avatar: ghUser.avatar_url || "",
      profileUrl: ghUser.html_url || `https://github.com/${ghUser.login}`,
      bio: ghUser.bio || "",
      location: ghUser.location || "",
      company: ghUser.company || "",
      publicReposCount: ghUser.public_repos || 0,
      accessToken,
    });
  } else {
    user.username = ghUser.login;
    if (ghUser.name) user.name = ghUser.name;
    if (userEmail) user.email = userEmail;
    user.avatar = ghUser.avatar_url || user.avatar;
    user.profileUrl = ghUser.html_url || user.profileUrl;
    user.bio = ghUser.bio || user.bio;
    user.location = ghUser.location || user.location;
    user.company = ghUser.company || user.company;
    user.publicReposCount = ghUser.public_repos ?? user.publicReposCount;
    user.accessToken = accessToken;
  }

  await user.save();

  // 5. Generate JWT token
  const token = jwt.sign(
    {
      userId: user._id,
      githubId: user.githubId,
      username: user.username,
    },
    jwtSecret,
    { expiresIn: "7d" }
  );

  const safeUser = user.toObject();
  delete safeUser.accessToken;

  return { token, user: safeUser };
}

/**
 * GET /api/auth/github
 * Redirects the browser directly to GitHub's OAuth dialog.
 */
export const redirectToGithub = (req, res) => {
  const clientId = process.env.CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ success: false, message: "GitHub CLIENT_ID not configured in backend" });
  }

  const scope = encodeURIComponent("read:user user:email repo");
  const redirectUri = process.env.REDIRECT_URI || process.env.CALLBACK_URL;

  // If no explicit redirectUri is defined, omit redirect_uri param so GitHub uses the registered callback URL
  const githubAuthUrl = redirectUri
    ? `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}`
    : `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=${scope}`;

  return res.redirect(githubAuthUrl);
};

/**
 * GET /api/auth/github/callback
 * Handles callback when GitHub redirects back to the backend.
 */
export const githubCallback = async (req, res) => {
  const { code, error, error_description } = req.query;
  const clientUrl = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");

  if (error) {
    console.error("GitHub OAuth Error:", error, error_description);
    return res.redirect(`${clientUrl}/?auth_error=${encodeURIComponent(error_description || error)}`);
  }

  if (!code) {
    return res.redirect(`${clientUrl}/?auth_error=No_authorization_code_received`);
  }

  try {
    const { token } = await processGithubCode(code);
    return res.redirect(`${clientUrl}/#dashboard?token=${token}`);
  } catch (err) {
    console.error("Error processing GitHub OAuth callback:", err);
    return res.redirect(`${clientUrl}/?auth_error=${encodeURIComponent(err.message)}`);
  }
};

/**
 * POST /api/auth/github/exchange
 * Handles code exchange when GitHub callback is directed to frontend.
 */
export const exchangeGithubCode = async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ success: false, message: "Authorization code is required" });
  }

  try {
    const { token, user } = await processGithubCode(code);
    return res.status(200).json({
      success: true,
      token,
      user,
    });
  } catch (err) {
    console.error("Error exchanging code:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to exchange GitHub authorization code",
    });
  }
};

/**
 * GET /api/auth/me
 * Retrieves current authenticated user.
 */
export const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user,
  });
};

/**
 * GET /api/auth/config
 * Returns public OAuth configuration (like client_id).
 */
export const getAuthConfig = (req, res) => {
  return res.status(200).json({
    clientId: process.env.CLIENT_ID || "",
    clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  });
};

