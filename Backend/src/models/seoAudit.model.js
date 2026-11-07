import mongoose from "mongoose";

const issueSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    category: {
      type: String,
      enum: ["Basic SEO", "Technical SEO", "Social Metadata", "Content SEO", "Structured Data", "Performance & Mobile"],
      required: true,
    },
    severity: {
      type: String,
      enum: ["critical", "high", "medium", "low", "informational"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["unfixed", "fixed", "ignored"],
      default: "unfixed",
    },
    affectedUrl: { type: String, default: "" },
    affectedUrls: { type: [String], default: [] },
    description: { type: String, default: "" },
    impact: { type: String, default: "" },
    recommendation: { type: String, default: "" },
    autoFixable: { type: Boolean, default: false },
    source: { type: String, default: "crawler" },
    evidence: { type: String, default: "" },
  },
  { _id: false }
);

const seoAuditSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    projectId: {
      type: String,
      required: true,
      index: true,
    },
    repoFullName: {
      type: String,
      default: "",
      index: true,
    },
    websiteUrl: {
      type: String,
      required: true,
    },
    audit: {
      status: {
        type: String,
        enum: ["queued", "running", "completed", "failed"],
        default: "completed",
      },
      overallScore: { type: Number, default: 0 },
      grade: { type: String, default: "F" },
      totalPages: { type: Number, default: 0 },
      totalIssues: { type: Number, default: 0 },
      criticalIssues: { type: Number, default: 0 },
      highIssues: { type: Number, default: 0 },
      mediumIssues: { type: Number, default: 0 },
      lowIssues: { type: Number, default: 0 },
      autoFixableIssues: { type: Number, default: 0 },
    },
    categories: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    issues: {
      type: [issueSchema],
      default: [],
    },
    crawl: {
      pagesScanned: { type: Number, default: 0 },
      pagesFailed: { type: Number, default: 0 },
      startedAt: { type: Date, default: Date.now },
      completedAt: { type: Date, default: Date.now },
      durationMs: { type: Number, default: 0 },
      visitedUrls: { type: [String], default: [] },
      brokenLinks: { type: [mongoose.Schema.Types.Mixed], default: [] },
      redirects: { type: [mongoose.Schema.Types.Mixed], default: [] },
      robots: { type: mongoose.Schema.Types.Mixed, default: {} },
      sitemap: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    performance: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Compound index for querying latest audits per user & project
seoAuditSchema.index({ userId: 1, projectId: 1, createdAt: -1 });

const SeoAudit = mongoose.models.SeoAudit || mongoose.model("SeoAudit", seoAuditSchema);

export default SeoAudit;

