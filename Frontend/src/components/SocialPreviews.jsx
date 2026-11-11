import React, { useState, useMemo } from "react";
import {
  Globe,
  Monitor,
  Smartphone,
  RotateCcw,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ImageOff,
  ExternalLink,
  Search,
  RefreshCw,
  ArrowRight,
  Info,
  Sparkles,
  Check,
  ShieldCheck,
} from "lucide-react";

/* ─── CLIENT-SIDE DETERMINISTIC FALLBACK & PREVIEW HELPERS ───────── */
function resolveClientUrl(raw, baseUrl) {
  if (!raw || typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed || /^(javascript|vbscript|data:text\/html):/i.test(trimmed)) return "";
  try {
    const parsed = baseUrl ? new URL(trimmed, baseUrl) : new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : "";
  } catch {
    return "";
  }
}

function isValidHttpUrl(val) {
  if (!val || typeof val !== "string") return false;
  try {
    const u = new URL(val.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function getDomainInfo(websiteUrl) {
  if (!websiteUrl) return { domain: "", breadcrumb: "" };
  try {
    const parsed = new URL(websiteUrl);
    const domain = parsed.hostname.replace(/^www\./i, "");
    const segs = parsed.pathname.split("/").filter(Boolean);
    return {
      domain,
      breadcrumb: segs.length > 0 ? `${domain} › ${segs.join(" › ")}` : domain,
    };
  } catch {
    return { domain: websiteUrl, breadcrumb: websiteUrl };
  }
}

function buildClientPreviews(meta = {}, websiteUrl = "", sourceType = "extracted") {
  const og = meta.openGraph || {};
  const tw = meta.twitter || {};
  const domainInfo = getDomainInfo(websiteUrl);

  const title = (meta.title || "").trim();
  const description = (meta.description || "").trim();
  const canonical = resolveClientUrl(meta.canonical, websiteUrl) || (meta.canonical || "").trim();
  const favicon = resolveClientUrl(meta.favicon, websiteUrl);

  const ogTitle = (og.title || "").trim();
  const ogDesc = (og.description || "").trim();
  const ogImage = resolveClientUrl(og.image, websiteUrl);
  const ogUrl = resolveClientUrl(og.url, websiteUrl) || websiteUrl;
  const ogSiteName = (og.siteName || "").trim();

  const twCardRaw = (tw.card || "").trim().toLowerCase();
  const twCard = twCardRaw === "summary" || twCardRaw === "summary_large_image" ? twCardRaw : "summary";
  const twTitle = (tw.title || "").trim();
  const twDesc = (tw.description || "").trim();
  const twImage = resolveClientUrl(tw.image, websiteUrl);
  const twSite = (tw.site || "").trim();

  // Google
  const googleWarnings = [];
  if (!title) googleWarnings.push("Missing <title> tag.");
  else if (title.length > 60) googleWarnings.push(`Title (${title.length} chars) exceeds ~60 char display limit.`);
  else if (title.length < 25) googleWarnings.push(`Title (${title.length} chars) is shorter than recommended (30–60).`);

  if (!description) googleWarnings.push("Missing meta description.");
  else if (description.length > 160) googleWarnings.push(`Description (${description.length} chars) may truncate above 160 chars.`);
  else if (description.length < 50) googleWarnings.push(`Description (${description.length} chars) is short (target 120–160).`);

  // Twitter fallbacks
  const resolvedTwTitle = twTitle || ogTitle || title || "";
  const twTitleSource = twTitle ? "twitter:title" : ogTitle ? "fallback:og:title" : title ? "fallback:title" : "missing";
  const resolvedTwDesc = twDesc || ogDesc || description || "";
  const twDescSource = twDesc ? "twitter:description" : ogDesc ? "fallback:og:description" : description ? "fallback:description" : "missing";
  const resolvedTwImage = twImage || ogImage || "";
  const twImageSource = twImage ? "twitter:image" : ogImage ? "fallback:og:image" : "missing";

  const twFallbacks = [];
  if (!twCardRaw) twFallbacks.push('twitter:card missing (showing "summary" fallback)');
  if (twTitleSource.startsWith("fallback:")) twFallbacks.push(`Title via ${twTitleSource.replace("fallback:", "")}`);
  if (twDescSource.startsWith("fallback:")) twFallbacks.push(`Description via ${twDescSource.replace("fallback:", "")}`);
  if (twImageSource.startsWith("fallback:")) twFallbacks.push("Image via og:image");

  // LinkedIn & WhatsApp
  const missingOgTags = [];
  if (!ogTitle) missingOgTags.push("og:title");
  if (!ogDesc) missingOgTags.push("og:description");
  if (!ogImage) missingOgTags.push("og:image");

  // Diagnostics
  const missingFields = [];
  if (!title) missingFields.push({ key: "title", label: "Page Title (<title>)", priority: "critical" });
  if (!description) missingFields.push({ key: "description", label: "Meta Description", priority: "high" });
  if (!canonical) missingFields.push({ key: "canonical", label: "Canonical URL", priority: "medium" });
  if (!ogTitle) missingFields.push({ key: "og:title", label: "OpenGraph Title (og:title)", priority: "high" });
  if (!ogDesc) missingFields.push({ key: "og:description", label: "OpenGraph Description (og:description)", priority: "medium" });
  if (!ogImage) missingFields.push({ key: "og:image", label: "Social Image (og:image)", priority: "high" });
  if (!twCardRaw) missingFields.push({ key: "twitter:card", label: "Twitter Card Type (twitter:card)", priority: "medium" });

  return {
    sourceType,
    domainInfo,
    missingFields,
    warnings: googleWarnings,
    google: {
      siteName: ogSiteName || domainInfo.domain,
      domain: domainInfo.domain,
      breadcrumb: domainInfo.breadcrumb,
      displayUrl: canonical || websiteUrl,
      favicon,
      title,
      titleTruncated: title.length > 60 ? `${title.slice(0, 58)}...` : title,
      description,
      descriptionTruncated: description.length > 160 ? `${description.slice(0, 157)}...` : description,
      warnings: googleWarnings,
    },
    twitter: {
      cardType: twCard,
      domain: domainInfo.domain,
      siteHandle: twSite,
      title: resolvedTwTitle,
      titleSource: twTitleSource,
      description: resolvedTwDesc,
      descriptionSource: twDescSource,
      image: resolvedTwImage,
      imageSource: twImageSource,
      fallbacksUsed: twFallbacks,
    },
    linkedin: {
      domain: domainInfo.domain,
      siteName: ogSiteName || domainInfo.domain,
      url: ogUrl,
      title: ogTitle || title || "",
      titleSource: ogTitle ? "og:title" : title ? "fallback:title" : "missing",
      description: ogDesc || description || "",
      descriptionSource: ogDesc ? "og:description" : description ? "fallback:description" : "missing",
      image: ogImage,
      missingOgTags,
    },
    whatsapp: {
      domain: domainInfo.domain,
      url: ogUrl,
      title: ogTitle || title || "",
      titleSource: ogTitle ? "og:title" : title ? "fallback:title" : "missing",
      description: ogDesc || description || "",
      descriptionSource: ogDesc ? "og:description" : description ? "fallback:description" : "missing",
      image: ogImage,
      missingOgTags,
    },
  };
}

/* ─── SAFE IMAGE COMPONENT (Handles Missing, Invalid, Broken States) ─ */
const SafeSocialImage = ({ src, alt = "Social preview", className = "", emptyLabel = "No social image detected" }) => {
  const [failedSrc, setFailedSrc] = useState(null);
  const valid = isValidHttpUrl(src);
  const hasError = Boolean(src && failedSrc === src);

  if (!src || !valid || hasError) {
    return (
      <div className={`bg-[#0B0B0D] border border-dashed border-[#2A2A35] flex flex-col items-center justify-center text-center p-4 gap-1.5 ${className}`}>
        <ImageOff size={20} className="text-neutral-500" />
        <span className="text-[11px] font-mono text-neutral-400">
          {hasError
            ? "Image failed to load"
            : src && !valid
            ? "Invalid image URL format"
            : emptyLabel}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailedSrc(src)}
      className={`object-cover bg-neutral-900 ${className}`}
    />
  );
};

/* ─── PLATFORM PREVIEW CARDS ──────────────────────────────────────── */
const GooglePreviewCard = ({ data, isMobile }) => {
  const [faviconFailed, setFaviconFailed] = useState(false);

  return (
    <div className="space-y-3 w-full flex flex-col items-center">
      <div
        className={`w-full rounded-xl border border-[#2A2A34] bg-[#17171B] p-4 sm:p-5 text-left transition-all ${
          isMobile ? "max-w-[360px]" : "max-w-[600px]"
        }`}
      >
        {/* Top Row: Favicon + Site Name + Breadcrumb */}
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="w-7 h-7 rounded-full bg-[#24242B] border border-[#32323D] flex items-center justify-center overflow-hidden shrink-0">
            {data.favicon && !faviconFailed ? (
              <img
                src={data.favicon}
                alt="favicon"
                className="w-4 h-4 object-contain"
                onError={() => setFaviconFailed(true)}
              />
            ) : (
              <Globe size={14} className="text-neutral-400" />
            )}
          </div>
          <div className="min-w-0 leading-tight">
            <span className="text-xs font-medium text-neutral-200 block truncate">
              {data.siteName || data.domain || "Website Name"}
            </span>
            <span className="text-[11px] text-neutral-400 block truncate font-mono">
              {data.breadcrumb || data.displayUrl || "https://example.com"}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3
          className={`font-medium leading-snug mb-1 ${
            isMobile ? "text-base" : "text-lg"
          } ${data.title ? "text-[#8AB4F8] hover:underline cursor-pointer" : "text-rose-400/80 italic"}`}
        >
          {data.titleTruncated || "[ Missing <title> tag — not detected ]"}
        </h3>

        {/* Description */}
        <p
          className={`text-xs leading-relaxed ${
            data.description ? "text-[#BDC1C6]" : "text-neutral-500 italic"
          }`}
        >
          {data.descriptionTruncated ||
            "[ Missing meta description — Google will generate a snippet from page text ]"}
        </p>

        {/* Character Warnings */}
        {data.warnings?.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-white/5 space-y-1">
            {data.warnings.map((w, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-[11px] text-amber-400">
                <AlertTriangle size={12} className="shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[11px] text-neutral-500 text-center max-w-lg">
        Preview is an approximation. Google may rewrite titles and descriptions based on the search query and page content.
      </p>
    </div>
  );
};

const TwitterPreviewCard = ({ data, isMobile, overrideCardType, onSwitchCardType }) => {
  const effectiveCard = overrideCardType || data.cardType;

  return (
    <div className="space-y-3 w-full flex flex-col items-center">
      {onSwitchCardType && (
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#0B0B0D] border border-[#22222A] text-[11px]">
          <button
            type="button"
            onClick={() => onSwitchCardType("summary_large_image")}
            className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
              effectiveCard === "summary_large_image"
                ? "bg-white/[0.1] text-white"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Summary Large Image
          </button>
          <button
            type="button"
            onClick={() => onSwitchCardType("summary")}
            className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
              effectiveCard === "summary"
                ? "bg-white/[0.1] text-white"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Summary Card
          </button>
        </div>
      )}

      {effectiveCard === "summary_large_image" ? (
        <div
          className={`w-full rounded-2xl border border-[#2F3336] bg-black overflow-hidden text-left transition-all ${
            isMobile ? "max-w-[340px]" : "max-w-[500px]"
          }`}
        >
          <SafeSocialImage
            src={data.image}
            alt="X preview"
            className="w-full h-52 sm:h-60"
            emptyLabel="Missing twitter:image / og:image"
          />
          <div className="p-3.5 border-t border-[#2F3336] bg-black space-y-1">
            <span className="text-[11px] text-[#71767B] block truncate">
              {data.domain || "example.com"} {data.siteHandle ? `· ${data.siteHandle}` : ""}
            </span>
            <h4 className={`text-sm font-bold line-clamp-1 ${data.title ? "text-[#E7E9EA]" : "text-rose-400 italic"}`}>
              {data.title || "[ Missing title ]"}
            </h4>
            <p className={`text-xs line-clamp-2 ${data.description ? "text-[#71767B]" : "text-neutral-600 italic"}`}>
              {data.description || "[ Missing description ]"}
            </p>
          </div>
        </div>
      ) : (
        <div
          className={`w-full rounded-2xl border border-[#2F3336] bg-black overflow-hidden flex items-stretch text-left transition-all ${
            isMobile ? "max-w-[340px]" : "max-w-[500px]"
          }`}
        >
          <div className="w-28 sm:w-32 shrink-0 border-r border-[#2F3336]">
            <SafeSocialImage
              src={data.image}
              alt="X summary thumb"
              className="w-full h-full min-h-[110px]"
              emptyLabel="No image"
            />
          </div>
          <div className="p-3.5 flex-1 min-w-0 flex flex-col justify-center space-y-1">
            <span className="text-[11px] text-[#71767B] truncate">{data.domain || "example.com"}</span>
            <h4 className={`text-sm font-bold line-clamp-2 ${data.title ? "text-[#E7E9EA]" : "text-rose-400 italic"}`}>
              {data.title || "[ Missing title ]"}
            </h4>
            <p className={`text-xs line-clamp-2 ${data.description ? "text-[#71767B]" : "text-neutral-600 italic"}`}>
              {data.description || "[ Missing description ]"}
            </p>
          </div>
        </div>
      )}

      {/* Fallback Badges */}
      {data.fallbacksUsed?.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-lg">
          {data.fallbacksUsed.map((fb, idx) => (
            <span
              key={idx}
              className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20"
            >
              Fallback: {fb}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const LinkedInPreviewCard = ({ data, isMobile }) => (
  <div className="space-y-3 w-full flex flex-col items-center">
    <div
      className={`w-full rounded-lg border border-[#38434F] bg-[#1B1F23] overflow-hidden text-left transition-all ${
        isMobile ? "max-w-[340px]" : "max-w-[520px]"
      }`}
    >
      <SafeSocialImage
        src={data.image}
        alt="LinkedIn preview"
        className="w-full h-56"
        emptyLabel="Missing og:image (1200×627 recommended)"
      />
      <div className="p-3.5 bg-[#282E35] border-t border-[#38434F] space-y-1">
        <h4 className={`text-sm font-semibold line-clamp-2 ${data.title ? "text-white" : "text-rose-400 italic"}`}>
          {data.title || "[ Missing og:title / page title ]"}
        </h4>
        <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
          <span className="truncate">{data.siteName || data.domain}</span>
          {data.titleSource?.startsWith("fallback:") && (
            <span className="text-[10px] text-amber-300 ml-2 shrink-0">via &lt;title&gt; fallback</span>
          )}
        </div>
      </div>
    </div>

    {data.missingOgTags?.length > 0 && (
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {data.missingOgTags.map((tag) => (
          <span
            key={tag}
            className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20"
          >
            Missing {tag}
          </span>
        ))}
      </div>
    )}
  </div>
);

const WhatsappPreviewCard = ({ data, isMobile }) => (
  <div className="space-y-3 w-full flex flex-col items-center">
    <div
      className={`w-full rounded-2xl bg-[#0B141A] border border-[#222E35] p-4 flex justify-end transition-all ${
        isMobile ? "max-w-[340px]" : "max-w-[440px]"
      }`}
    >
      <div className="w-full rounded-xl bg-[#005C4B] p-1.5 space-y-1.5 shadow-md text-left">
        {/* Link Attachment Box */}
        <div className="rounded-lg bg-[#025144] overflow-hidden border border-black/15">
          {data.image ? (
            <SafeSocialImage
              src={data.image}
              alt="WhatsApp preview"
              className="w-full h-40"
              emptyLabel="No og:image found"
            />
          ) : (
            <div className="p-3 bg-[#014237] border-b border-black/15 flex items-center gap-2 text-[11px] text-emerald-200/70 font-mono">
              <ImageOff size={14} className="shrink-0" />
              <span>Missing og:image — no rich banner rendered</span>
            </div>
          )}

          <div className="p-2.5 space-y-1">
            <h4 className={`text-xs font-semibold line-clamp-2 ${data.title ? "text-white" : "text-rose-200 italic"}`}>
              {data.title || "[ Missing OpenGraph title ]"}
            </h4>
            <p className={`text-[11px] line-clamp-2 leading-snug ${data.description ? "text-emerald-100/80" : "text-emerald-200/50 italic"}`}>
              {data.description || "[ Missing OpenGraph description ]"}
            </p>
            <span className="text-[10px] text-emerald-200/70 font-mono block truncate">
              {data.domain || "example.com"}
            </span>
          </div>
        </div>

        {/* Message Text */}
        <div className="px-1.5 pb-0.5 flex items-center justify-between gap-2">
          <span className="text-xs text-[#53BDEB] underline truncate font-mono">
            {data.url || "https://example.com"}
          </span>
          <span className="text-[10px] text-emerald-200/60 shrink-0">11:42</span>
        </div>
      </div>
    </div>

    {data.missingOgTags?.length > 0 && (
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {data.missingOgTags.map((tag) => (
          <span
            key={tag}
            className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20"
          >
            Missing {tag}
          </span>
        ))}
      </div>
    )}

    <p className="text-[11px] text-neutral-500 text-center max-w-md">
      Actual appearance may vary depending on WhatsApp&apos;s link-preview generation and caching.
    </p>
  </div>
);

/* ─── MAIN FEATURE 3 COMPONENT ───────────────────────────────────── */
export const SocialPreviews = ({
  repoName = "",
  projectSlug = "",
  token = "",
  previewData,
  isLoadingPreviews = false,
  onNavigateToAudit,
}) => {
  const hasAudit = Boolean(previewData?.hasAudit);
  const websiteUrl = previewData?.websiteUrl || "";
  const auditedAt = previewData?.auditedAt;

  // Baseline extracted immutable metadata ("Before")
  const originalMetadata = useMemo(() => {
    const m = previewData?.before?.metadata || {};
    return {
      title: m.title || "",
      description: m.description || "",
      canonical: m.canonical || "",
      favicon: m.favicon || "",
      openGraph: {
        title: m.openGraph?.title || "",
        description: m.openGraph?.description || "",
        image: m.openGraph?.image || "",
        url: m.openGraph?.url || "",
        siteName: m.openGraph?.siteName || "",
      },
      twitter: {
        card: m.twitter?.card || "summary_large_image",
        title: m.twitter?.title || "",
        description: m.twitter?.description || "",
        image: m.twitter?.image || "",
        site: m.twitter?.site || "",
      },
    };
  }, [previewData]);

  // Editable Simulation state ("After") — keyed by auditId so switching projects resets cleanly
  const [proposedMetadata, setProposedMetadata] = useState(null);
  const effectiveProposed = proposedMetadata || originalMetadata;

  const [activePlatform, setActivePlatform] = useState("google"); // google | twitter | linkedin | whatsapp | compare
  const [viewMode, setViewMode] = useState("after"); // before | after | compare
  const [deviceMode, setDeviceMode] = useState("desktop"); // desktop | mobile
  const [editorSection, setEditorSection] = useState("basic"); // basic | og | twitter
  const [twitterCardOverride, setTwitterCardOverride] = useState(null);
  const [comparePlatform, setComparePlatform] = useState("google");

  // Image server validation state
  const [imageCheckState, setImageCheckState] = useState({
    checking: false,
    result: null,
  });

  // Build deterministic Before & After models instantly
  const beforeModel = useMemo(
    () => buildClientPreviews(originalMetadata, websiteUrl, "extracted"),
    [originalMetadata, websiteUrl]
  );

  const afterModel = useMemo(
    () => buildClientPreviews(effectiveProposed, websiteUrl, "proposed"),
    [effectiveProposed, websiteUrl]
  );

  const hasChanges = useMemo(
    () => JSON.stringify(effectiveProposed) !== JSON.stringify(originalMetadata),
    [effectiveProposed, originalMetadata]
  );

  const updateBasicField = (field, value) => {
    setProposedMetadata((prev) => {
      const base = prev || originalMetadata;
      return { ...base, [field]: value };
    });
    setViewMode((m) => (m === "before" ? "after" : m));
  };

  const updateOgField = (field, value) => {
    setProposedMetadata((prev) => {
      const base = prev || originalMetadata;
      return { ...base, openGraph: { ...base.openGraph, [field]: value } };
    });
    setViewMode((m) => (m === "before" ? "after" : m));
    if (field === "image") setImageCheckState({ checking: false, result: null });
  };

  const updateTwitterField = (field, value) => {
    setProposedMetadata((prev) => {
      const base = prev || originalMetadata;
      return { ...base, twitter: { ...base.twitter, [field]: value } };
    });
    setViewMode((m) => (m === "before" ? "after" : m));
  };

  const handleReset = () => {
    setProposedMetadata(null);
    setTwitterCardOverride(null);
    setImageCheckState({ checking: false, result: null });
  };

  const handleVerifyImage = async (imgUrl) => {
    if (!imgUrl || !token || !projectSlug) return;
    setImageCheckState({ checking: true, result: null });
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectSlug)}/previews/validate-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ imageUrl: imgUrl }),
      });
      const data = await res.json();
      setImageCheckState({ checking: false, result: data });
    } catch {
      setImageCheckState({
        checking: false,
        result: { accessible: false, error: "Could not reach backend validation endpoint." },
      });
    }
  };

  // Loading state
  if (isLoadingPreviews) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6 select-none">
        <div className="text-center space-y-3">
          <RefreshCw size={24} className="animate-spin text-neutral-400 mx-auto" />
          <p className="text-xs font-mono text-neutral-400">
            Extracting metadata from latest audit for {repoName || "repository"}...
          </p>
        </div>
      </div>
    );
  }

  // Empty State: No Audit Available (Scenario 9)
  if (!hasAudit) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6 select-none">
        <div className="w-full max-w-lg p-8 rounded-2xl border border-[#22222A] bg-[#121216] text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white/[0.04] border border-neutral-800 flex items-center justify-center text-rose-400">
            <Search size={26} strokeWidth={1.7} />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">
              {repoName || "Social Previews"}
            </span>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              SEO Audit Required First
            </h2>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-md mx-auto">
              Run an SEO Audit on your deployed site for{" "}
              <code className="text-neutral-200 font-mono">{repoName || "this repository"}</code>{" "}
              so MetaMend can extract your real title, meta description, OpenGraph tags, and Twitter card metadata.
            </p>
          </div>

          <div className="pt-1 flex items-center justify-center">
            <button
              onClick={onNavigateToAudit}
              className="px-7 py-3 rounded-xl font-bold text-xs sm:text-sm text-black bg-white hover:bg-neutral-200 transition-all active:scale-95 shadow-lg inline-flex items-center gap-2 cursor-pointer"
            >
              <span>Go to SEO Audit</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeModel = viewMode === "before" ? beforeModel : afterModel;
  const isMobile = deviceMode === "mobile";

  return (
    <div className="space-y-6 select-none">
      {/* ─── HEADER & SIMULATION DISCLAIMER ──────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Visual Social & Search Previews
          </h1>
          <div className="flex items-center gap-3 flex-wrap mt-1 text-xs text-neutral-400">
            <span>
              Baseline from{" "}
              <a
                href={websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:underline font-mono inline-flex items-center gap-1"
              >
                {websiteUrl}
                <ExternalLink size={11} />
              </a>
            </span>
            {auditedAt && (
              <span className="text-neutral-500 font-mono">
                · Audited {new Date(auditedAt).toLocaleString()}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <button
              type="button"
              onClick={handleReset}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RotateCcw size={13} />
              <span>Reset Proposed</span>
            </button>
          )}
        </div>
      </div>

      {/* Critical Distinction Disclaimer */}
      <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-start gap-2.5 text-xs text-amber-200/90">
        <Info size={15} className="text-amber-400 shrink-0 mt-0.5" />
        <span>
          These changes are preview simulations. Your live website will remain unchanged until the corresponding code changes are implemented and deployed.
        </span>
      </div>

      {/* ─── 3-COLUMN WORKSPACE ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* ═════════════════════════════════════════════════════════════ */}
        {/* LEFT COLUMN (4 cols): METADATA EDITOR                        */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <div className="xl:col-span-4 rounded-2xl border border-[#22222A] bg-[#121216] p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white tracking-tight">
              Metadata Editor
            </h2>
            <span
              className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                viewMode === "before"
                  ? "bg-neutral-800 text-neutral-300 border-neutral-700"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              }`}
            >
              {viewMode === "before" ? "Inspecting Before" : hasChanges ? "Proposed (Edited)" : "Simulation Ready"}
            </span>
          </div>

          {/* Section Switch Tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#0B0B0D] border border-[#1E1E23] text-xs font-medium">
            {[
              { id: "basic", label: "Basic SEO" },
              { id: "og", label: "Open Graph" },
              { id: "twitter", label: "Twitter / X" },
            ].map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => setEditorSection(sec.id)}
                className={`py-1.5 rounded-lg cursor-pointer transition-colors ${
                  editorSection === sec.id
                    ? "bg-white/[0.08] text-white font-semibold"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                {sec.label}
              </button>
            ))}
          </div>

          {/* Editor Fields */}
          {editorSection === "basic" && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-mono uppercase text-neutral-400 font-bold">
                    Page Title
                  </label>
                  <span
                    className={`text-[11px] font-mono ${
                      effectiveProposed.title.length === 0
                        ? "text-rose-400"
                        : effectiveProposed.title.length > 60
                        ? "text-amber-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {effectiveProposed.title.length}/60 chars
                  </span>
                </div>
                <input
                  type="text"
                  value={viewMode === "before" ? originalMetadata.title : effectiveProposed.title}
                  disabled={viewMode === "before"}
                  onChange={(e) => updateBasicField("title", e.target.value)}
                  placeholder="Enter simulated page title..."
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0B0D] border border-[#22222A] text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 disabled:opacity-60"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-mono uppercase text-neutral-400 font-bold">
                    Meta Description
                  </label>
                  <span
                    className={`text-[11px] font-mono ${
                      effectiveProposed.description.length === 0
                        ? "text-rose-400"
                        : effectiveProposed.description.length > 160
                        ? "text-amber-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {effectiveProposed.description.length}/160 chars
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={viewMode === "before" ? originalMetadata.description : effectiveProposed.description}
                  disabled={viewMode === "before"}
                  onChange={(e) => updateBasicField("description", e.target.value)}
                  placeholder="Enter simulated meta description..."
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0B0D] border border-[#22222A] text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 disabled:opacity-60 resize-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase text-neutral-400 font-bold block mb-1">
                  Canonical URL
                </label>
                <input
                  type="url"
                  value={viewMode === "before" ? originalMetadata.canonical : effectiveProposed.canonical}
                  disabled={viewMode === "before"}
                  onChange={(e) => updateBasicField("canonical", e.target.value)}
                  placeholder="https://example.com/"
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0B0D] border border-[#22222A] text-xs text-white font-mono placeholder-neutral-600 focus:outline-none focus:border-neutral-500 disabled:opacity-60"
                />
                {effectiveProposed.canonical && !isValidHttpUrl(effectiveProposed.canonical) && (
                  <p className="text-[11px] text-amber-400 mt-1">
                    Use a valid https:// absolute canonical URL.
                  </p>
                )}
              </div>
            </div>
          )}

          {editorSection === "og" && (
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-mono uppercase text-neutral-400 font-bold block mb-1">
                  og:title
                </label>
                <input
                  type="text"
                  value={viewMode === "before" ? originalMetadata.openGraph.title : effectiveProposed.openGraph.title}
                  disabled={viewMode === "before"}
                  onChange={(e) => updateOgField("title", e.target.value)}
                  placeholder="Social headline for LinkedIn & WhatsApp..."
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0B0D] border border-[#22222A] text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase text-neutral-400 font-bold block mb-1">
                  og:description
                </label>
                <textarea
                  rows={2}
                  value={viewMode === "before" ? originalMetadata.openGraph.description : effectiveProposed.openGraph.description}
                  disabled={viewMode === "before"}
                  onChange={(e) => updateOgField("description", e.target.value)}
                  placeholder="Social summary snippet..."
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0B0D] border border-[#22222A] text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 disabled:opacity-60 resize-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-mono uppercase text-neutral-400 font-bold">
                    og:image URL
                  </label>
                  {effectiveProposed.openGraph.image && (
                    <button
                      type="button"
                      onClick={() => handleVerifyImage(effectiveProposed.openGraph.image)}
                      disabled={imageCheckState.checking}
                      className="text-[10px] font-mono text-emerald-400 hover:underline cursor-pointer disabled:opacity-50"
                    >
                      {imageCheckState.checking ? "Checking..." : "Check Image"}
                    </button>
                  )}
                </div>
                <input
                  type="url"
                  value={viewMode === "before" ? originalMetadata.openGraph.image : effectiveProposed.openGraph.image}
                  disabled={viewMode === "before"}
                  onChange={(e) => updateOgField("image", e.target.value)}
                  placeholder="https://example.com/og-image.png"
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0B0D] border border-[#22222A] text-xs text-white font-mono placeholder-neutral-600 focus:outline-none focus:border-neutral-500 disabled:opacity-60"
                />
                {imageCheckState.result && (
                  <p
                    className={`text-[11px] mt-1 font-mono ${
                      imageCheckState.result.accessible ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {imageCheckState.result.accessible
                      ? `✓ Accessible (${imageCheckState.result.contentType})`
                      : `✕ ${imageCheckState.result.error}`}
                  </p>
                )}

                <div className="mt-2">
                  <SafeSocialImage
                    src={viewMode === "before" ? originalMetadata.openGraph.image : effectiveProposed.openGraph.image}
                    className="w-full h-24 rounded-xl border border-[#22222A]"
                    emptyLabel="No og:image URL entered"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono uppercase text-neutral-400 font-bold block mb-1">
                    og:site_name
                  </label>
                  <input
                    type="text"
                    value={viewMode === "before" ? originalMetadata.openGraph.siteName : effectiveProposed.openGraph.siteName}
                    disabled={viewMode === "before"}
                    onChange={(e) => updateOgField("siteName", e.target.value)}
                    placeholder="Site Name"
                    className="w-full px-3 py-2 rounded-xl bg-[#0B0B0D] border border-[#22222A] text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono uppercase text-neutral-400 font-bold block mb-1">
                    og:url
                  </label>
                  <input
                    type="url"
                    value={viewMode === "before" ? originalMetadata.openGraph.url : effectiveProposed.openGraph.url}
                    disabled={viewMode === "before"}
                    onChange={(e) => updateOgField("url", e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 rounded-xl bg-[#0B0B0D] border border-[#22222A] text-xs text-white font-mono placeholder-neutral-600 focus:outline-none focus:border-neutral-500 disabled:opacity-60"
                  />
                </div>
              </div>
            </div>
          )}

          {editorSection === "twitter" && (
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-mono uppercase text-neutral-400 font-bold block mb-1">
                  twitter:card
                </label>
                <select
                  value={viewMode === "before" ? originalMetadata.twitter.card : effectiveProposed.twitter.card}
                  disabled={viewMode === "before"}
                  onChange={(e) => updateTwitterField("card", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0B0D] border border-[#22222A] text-xs text-white focus:outline-none focus:border-neutral-500 disabled:opacity-60"
                >
                  <option value="summary_large_image">summary_large_image</option>
                  <option value="summary">summary</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase text-neutral-400 font-bold block mb-1">
                  twitter:title
                </label>
                <input
                  type="text"
                  value={viewMode === "before" ? originalMetadata.twitter.title : effectiveProposed.twitter.title}
                  disabled={viewMode === "before"}
                  onChange={(e) => updateTwitterField("title", e.target.value)}
                  placeholder="Falls back to og:title if empty..."
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0B0D] border border-[#22222A] text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase text-neutral-400 font-bold block mb-1">
                  twitter:description
                </label>
                <textarea
                  rows={2}
                  value={viewMode === "before" ? originalMetadata.twitter.description : effectiveProposed.twitter.description}
                  disabled={viewMode === "before"}
                  onChange={(e) => updateTwitterField("description", e.target.value)}
                  placeholder="Falls back to og:description if empty..."
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0B0D] border border-[#22222A] text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 disabled:opacity-60 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono uppercase text-neutral-400 font-bold block mb-1">
                    twitter:image
                  </label>
                  <input
                    type="url"
                    value={viewMode === "before" ? originalMetadata.twitter.image : effectiveProposed.twitter.image}
                    disabled={viewMode === "before"}
                    onChange={(e) => updateTwitterField("image", e.target.value)}
                    placeholder="Falls back to og:image"
                    className="w-full px-3 py-2 rounded-xl bg-[#0B0B0D] border border-[#22222A] text-xs text-white font-mono placeholder-neutral-600 focus:outline-none focus:border-neutral-500 disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono uppercase text-neutral-400 font-bold block mb-1">
                    twitter:site
                  </label>
                  <input
                    type="text"
                    value={viewMode === "before" ? originalMetadata.twitter.site : effectiveProposed.twitter.site}
                    disabled={viewMode === "before"}
                    onChange={(e) => updateTwitterField("site", e.target.value)}
                    placeholder="@handle"
                    className="w-full px-3 py-2 rounded-xl bg-[#0B0B0D] border border-[#22222A] text-xs text-white font-mono placeholder-neutral-600 focus:outline-none focus:border-neutral-500 disabled:opacity-60"
                  />
                </div>
              </div>
            </div>
          )}

          {viewMode === "before" && (
            <button
              type="button"
              onClick={() => setViewMode("after")}
              className="w-full py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-white cursor-pointer transition-colors"
            >
              Switch to Proposed Mode to Edit
            </button>
          )}
        </div>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* CENTER COLUMN (5 cols): LIVE PREVIEW STAGE                   */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <div className="xl:col-span-5 rounded-2xl border border-[#22222A] bg-[#121216] p-5 space-y-5">
          {/* Platform Tabs */}
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#1E1E23] pb-3">
            <div className="flex items-center gap-1 flex-wrap text-xs font-semibold">
              {[
                { id: "google", label: "Google" },
                { id: "twitter", label: "X / Twitter" },
                { id: "linkedin", label: "LinkedIn" },
                { id: "whatsapp", label: "WhatsApp" },
                { id: "compare", label: "Before / After" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActivePlatform(tab.id)}
                  className={`px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                    activePlatform === tab.id
                      ? "bg-white/[0.1] text-white"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Desktop / Mobile Switch */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0B0B0D] border border-[#1E1E23]">
              <button
                type="button"
                onClick={() => setDeviceMode("desktop")}
                title="Desktop Preview"
                className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                  deviceMode === "desktop" ? "bg-white/[0.1] text-white" : "text-neutral-500 hover:text-white"
                }`}
              >
                <Monitor size={13} />
              </button>
              <button
                type="button"
                onClick={() => setDeviceMode("mobile")}
                title="Mobile Preview"
                className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                  deviceMode === "mobile" ? "bg-white/[0.1] text-white" : "text-neutral-500 hover:text-white"
                }`}
              >
                <Smartphone size={13} />
              </button>
            </div>
          </div>

          {/* Before / After Selector (shown on single-platform tabs) */}
          {activePlatform !== "compare" && (
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-[#0B0B0D] border border-[#1E1E23] text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => setViewMode("before")}
                  className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                    viewMode === "before"
                      ? "bg-white/[0.1] text-white font-semibold"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Current (Before)
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("after")}
                  className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                    viewMode === "after"
                      ? "bg-emerald-500/20 text-emerald-300 font-semibold"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Proposed (After)
                </button>
              </div>

              <span className="text-[11px] font-mono text-neutral-500">
                {deviceMode === "mobile" ? "Mobile viewport" : "Desktop viewport"}
              </span>
            </div>
          )}

          {/* Render Active Preview */}
          <div className="p-4 rounded-xl bg-[#0B0B0D] border border-[#1E1E23] min-h-[320px] flex items-center justify-center">
            {activePlatform === "google" && (
              <GooglePreviewCard data={activeModel.google} isMobile={isMobile} />
            )}

            {activePlatform === "twitter" && (
              <TwitterPreviewCard
                data={activeModel.twitter}
                isMobile={isMobile}
                overrideCardType={twitterCardOverride}
                onSwitchCardType={(c) => setTwitterCardOverride(c)}
              />
            )}

            {activePlatform === "linkedin" && (
              <LinkedInPreviewCard data={activeModel.linkedin} isMobile={isMobile} />
            )}

            {activePlatform === "whatsapp" && (
              <WhatsappPreviewCard data={activeModel.whatsapp} isMobile={isMobile} />
            )}

            {activePlatform === "compare" && (
              <div className="w-full space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-400" />
                    Before vs After Comparison
                  </span>

                  <div className="flex items-center gap-1 text-[11px]">
                    {["google", "twitter", "linkedin", "whatsapp"].map((plat) => (
                      <button
                        key={plat}
                        type="button"
                        onClick={() => setComparePlatform(plat)}
                        className={`px-2 py-1 rounded capitalize cursor-pointer ${
                          comparePlatform === plat
                            ? "bg-white/[0.1] text-white font-semibold"
                            : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        {plat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Before Block */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700 font-bold">
                      BEFORE · Live Audit Baseline
                    </span>
                  </div>
                  {comparePlatform === "google" && (
                    <GooglePreviewCard data={beforeModel.google} isMobile={isMobile} />
                  )}
                  {comparePlatform === "twitter" && (
                    <TwitterPreviewCard data={beforeModel.twitter} isMobile={isMobile} />
                  )}
                  {comparePlatform === "linkedin" && (
                    <LinkedInPreviewCard data={beforeModel.linkedin} isMobile={isMobile} />
                  )}
                  {comparePlatform === "whatsapp" && (
                    <WhatsappPreviewCard data={beforeModel.whatsapp} isMobile={isMobile} />
                  )}
                </div>

                {/* After Block */}
                <div className="space-y-2 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                      AFTER · Proposed Simulation
                    </span>
                    {!hasChanges && (
                      <span className="text-neutral-500">Edit fields on left to preview changes</span>
                    )}
                  </div>
                  {comparePlatform === "google" && (
                    <GooglePreviewCard data={afterModel.google} isMobile={isMobile} />
                  )}
                  {comparePlatform === "twitter" && (
                    <TwitterPreviewCard data={afterModel.twitter} isMobile={isMobile} />
                  )}
                  {comparePlatform === "linkedin" && (
                    <LinkedInPreviewCard data={afterModel.linkedin} isMobile={isMobile} />
                  )}
                  {comparePlatform === "whatsapp" && (
                    <WhatsappPreviewCard data={afterModel.whatsapp} isMobile={isMobile} />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* RIGHT COLUMN (3 cols): DIAGNOSTICS & METADATA STATUS         */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <div className="xl:col-span-3 space-y-4">
          {/* Metadata Source Matrix */}
          <div className="rounded-2xl border border-[#22222A] bg-[#121216] p-5 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={15} className="text-emerald-400" />
              <h3 className="text-sm font-bold text-white tracking-tight">
                Metadata Status
              </h3>
            </div>

            <div className="space-y-2 text-xs">
              {[
                { label: "Title", orig: originalMetadata.title, curr: effectiveProposed.title },
                { label: "Description", orig: originalMetadata.description, curr: effectiveProposed.description },
                { label: "Canonical", orig: originalMetadata.canonical, curr: effectiveProposed.canonical },
                { label: "og:title", orig: originalMetadata.openGraph.title, curr: effectiveProposed.openGraph.title },
                { label: "og:image", orig: originalMetadata.openGraph.image, curr: effectiveProposed.openGraph.image },
                { label: "twitter:card", orig: originalMetadata.twitter.card, curr: effectiveProposed.twitter.card },
              ].map((row) => {
                const isProposed = row.curr !== row.orig && row.curr;
                const isPresent = Boolean(row.curr);

                return (
                  <div
                    key={row.label}
                    className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0"
                  >
                    <span className="font-mono text-neutral-300">{row.label}</span>
                    {isProposed ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">
                        Proposed
                      </span>
                    ) : isPresent ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Check size={10} />
                        Extracted
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        Missing
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Missing Fields & Recommendations */}
          <div className="rounded-2xl border border-[#22222A] bg-[#121216] p-5 space-y-3">
            <h3 className="text-sm font-bold text-white tracking-tight">
              Missing & Recommendations
            </h3>

            {afterModel.missingFields.length === 0 && afterModel.warnings.length === 0 ? (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-300">
                <CheckCircle2 size={15} className="shrink-0" />
                <span>All essential search & social preview tags are configured.</span>
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                {afterModel.missingFields.map((mf) => (
                  <div
                    key={mf.key}
                    className="p-2.5 rounded-lg bg-[#0B0B0D] border border-[#1E1E23] flex items-start gap-2"
                  >
                    <AlertCircle size={13} className="text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-neutral-200 font-medium block">{mf.label}</span>
                      <span className="text-[10px] font-mono uppercase text-rose-400">
                        {mf.priority} priority
                      </span>
                    </div>
                  </div>
                ))}

                {afterModel.warnings.map((w, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-[#0B0B0D] border border-[#1E1E23] flex items-start gap-2 text-amber-300"
                  >
                    <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                    <span className="text-[11px] leading-snug">{w}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

