import mongoose from "mongoose";

const seoItemSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["present", "missing", "partial", "dynamic", "unable-to-verify"],
      default: "missing",
    },
    sources: {
      type: [String],
      default: [],
    },
    details: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const repositoryAnalysisSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    repository: {
      name: { type: String, required: true },
      fullName: { type: String, required: true, index: true },
      owner: { type: String, required: true },
      description: { type: String, default: "" },
      defaultBranch: { type: String, default: "main" },
      language: { type: String, default: "Unknown" },
      visibility: { type: String, default: "public" },
      isPrivate: { type: Boolean, default: false },
      isEmpty: { type: Boolean, default: false },
      stars: { type: Number, default: 0 },
      forks: { type: Number, default: 0 },
      latestCommit: {
        sha: { type: String, default: "" },
        message: { type: String, default: "" },
        author: { type: String, default: "" },
        date: { type: Date, default: null },
      },
      htmlUrl: { type: String, default: "" },
      homepage: { type: String, default: "" },
      lastUpdated: { type: Date, default: Date.now },
    },
    framework: {
      name: { type: String, default: "Unknown" },
      slug: { type: String, default: "unknown" },
      version: { type: String, default: null },
      language: { type: String, default: "JavaScript" },
      packageManager: { type: String, default: "npm" },
      reactVersion: { type: String, default: null },
      nodeRequirement: { type: String, default: null },
      isMonorepo: { type: Boolean, default: false },
      workspacePackages: { type: [String], default: [] },
      confidence: { type: String, enum: ["high", "medium", "low"], default: "low" },
    },
    router: {
      type: { type: String, default: "unknown" },
      framework: { type: String, default: "unknown" },
      confidence: { type: String, enum: ["high", "medium", "low"], default: "low" },
      details: { type: String, default: "" },
    },
    structure: {
      directories: { type: [String], default: [] },
      importantFiles: { type: [mongoose.Schema.Types.Mixed], default: [] },
      totalFilesCount: { type: Number, default: 0 },
      visualTree: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    seoConfiguration: {
      title: { type: seoItemSchema, default: () => ({}) },
      description: { type: seoItemSchema, default: () => ({}) },
      openGraph: { type: seoItemSchema, default: () => ({}) },
      twitterCards: { type: seoItemSchema, default: () => ({}) },
      canonical: { type: seoItemSchema, default: () => ({}) },
      robots: { type: seoItemSchema, default: () => ({}) },
      sitemap: { type: seoItemSchema, default: () => ({}) },
      favicon: { type: seoItemSchema, default: () => ({}) },
      structuredData: { type: seoItemSchema, default: () => ({}) },
      language: { type: seoItemSchema, default: () => ({}) },
      viewport: { type: seoItemSchema, default: () => ({}) },
    },
    deployment: {
      platform: { type: String, default: "Unknown" },
      slug: { type: String, default: "unknown" },
      configurationDetected: { type: Boolean, default: false },
      configFile: { type: String, default: null },
      liveDeploymentVerified: { type: Boolean, default: false },
      deploymentUrl: { type: String, default: null },
      details: { type: String, default: "" },
    },
    analysis: {
      status: {
        type: String,
        enum: ["idle", "analyzing", "completed", "failed"],
        default: "idle",
      },
      lastAnalyzedAt: { type: Date, default: null },
      errors: { type: [String], default: [] },
    },
  },
  { timestamps: true }
);

// Compound index for unique analysis per user per repo
repositoryAnalysisSchema.index({ userId: 1, "repository.fullName": 1 }, { unique: true });

const RepositoryAnalysis =
  mongoose.models.RepositoryAnalysis || mongoose.model("RepositoryAnalysis", repositoryAnalysisSchema);

export default RepositoryAnalysis;

