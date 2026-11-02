import React, { useState, useEffect, useCallback } from "react";
import { AuthContext } from "./auth-context-def.js";

const BACKEND_URL = "http://localhost:5000";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("metamend_token"));
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [view, setView] = useState(() => (window.location.hash.includes("dashboard") ? "dashboard" : "landing"));

  // Fetch current user using token
  const fetchCurrentUser = useCallback(async (authToken) => {
    try {
      const activeToken = authToken || token;
      if (!activeToken) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const res = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });

      if (!res.ok) {
        // Fallback to absolute backend URL if proxy isn't used
        const fallbackRes = await fetch(`${BACKEND_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${activeToken}`,
          },
        });
        if (!fallbackRes.ok) throw new Error("Session expired or invalid");
        const data = await fallbackRes.json();
        setUser(data.user);
        return;
      }

      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
      } else {
        throw new Error(data.message || "Failed to load user profile");
      }
    } catch (err) {
      console.warn("Auth token invalid or expired:", err.message);
      localStorage.removeItem("metamend_token");
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Handle OAuth code or token from URL on mount
  useEffect(() => {
    const handleUrlAuth = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash;
      const hashParams = new URLSearchParams(hash.includes("?") ? hash.substring(hash.indexOf("?")) : "");

      const urlToken = searchParams.get("token") || hashParams.get("token");
      const urlCode = searchParams.get("code") || hashParams.get("code");
      const urlError = searchParams.get("auth_error") || hashParams.get("error");

      if (urlError) {
        setAuthError(decodeURIComponent(urlError));
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        setIsLoading(false);
        return;
      }

      // Case 1: Backend redirected back with JWT token
      if (urlToken) {
        localStorage.setItem("metamend_token", urlToken);
        setToken(urlToken);
        setView("dashboard");
        window.location.hash = "dashboard";
        window.history.replaceState({}, document.title, window.location.pathname + "#dashboard");
        await fetchCurrentUser(urlToken);
        return;
      }

      // Case 2: GitHub redirected directly to frontend with code
      if (urlCode) {
        try {
          setIsLoading(true);
          let exchangeRes;
          try {
            exchangeRes = await fetch("/api/auth/github/exchange", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code: urlCode }),
            });
            if (!exchangeRes.ok) throw new Error("Proxy fetch failed");
          } catch {
            exchangeRes = await fetch(`${BACKEND_URL}/api/auth/github/exchange`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code: urlCode }),
            });
          }

          const exchangeData = await exchangeRes.json();
          if (exchangeData.success && exchangeData.token) {
            localStorage.setItem("metamend_token", exchangeData.token);
            setToken(exchangeData.token);
            setUser(exchangeData.user);
            setView("dashboard");
            window.location.hash = "dashboard";
            window.history.replaceState({}, document.title, window.location.pathname + "#dashboard");
          } else {
            setAuthError(exchangeData.message || "Failed to authenticate with GitHub");
          }
        } catch (exchangeErr) {
          console.error("Code exchange failed:", exchangeErr);
          setAuthError(exchangeErr.message || "GitHub OAuth exchange failed");
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // Case 3: Stored token exists in localStorage
      const storedToken = localStorage.getItem("metamend_token");
      if (storedToken) {
        await fetchCurrentUser(storedToken);
      } else {
        setIsLoading(false);
      }
    };

    handleUrlAuth();
  }, [fetchCurrentUser]);

  // Sync hash changes with view state
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash.includes("dashboard")) {
        setView("dashboard");
      } else {
        setView("landing");
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Initiate GitHub Login
  const loginWithGithub = () => {
    setAuthError(null);
    // Redirect to backend OAuth endpoint which handles client_id and scopes
    window.location.href = `${BACKEND_URL}/api/auth/github`;
  };

  // Logout
  const logout = () => {
    localStorage.removeItem("metamend_token");
    setToken(null);
    setUser(null);
    setView("landing");
    window.location.hash = "";
  };

  const navigateToDashboard = () => {
    setView("dashboard");
    window.location.hash = "dashboard";
  };

  const navigateToLanding = () => {
    setView("landing");
    window.location.hash = "";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        authError,
        view,
        setView,
        loginWithGithub,
        logout,
        navigateToDashboard,
        navigateToLanding,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
