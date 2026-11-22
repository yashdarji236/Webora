import mongoose from "mongoose";

const seoFixSchema = new mongoose.Schema(
  {
    projectId: {
      type: String,
      required: true,
      index: true,
    },
    repoFullName: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    issueId: {
      type: String,
      required: true,
    },
    issueTitle: {
      type: String,
      required: true,
    },
    issueCategory: {
      type: String,
      required: true,
    },
    severity: {
      type: String,
      enum: ["critical", "high", "medium", "low", "info"],
      default: "medium",
    },
    affectedUrl: {
      type: String,
      default: "/",
    },
    framework: {
      name: { type: String, default: "React" },
      version: { type: String, default: "" },
      router: { type: String, default: "" },
    },
    analysis: {
      rootCause: { type: String, default: "" },
      explanation: { type: String, default: "" },
      recommendation: { type: String, default: "" },
      risk: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "low",
      },
      riskAssessment: { type: String, default: "" },
    },
    patch: {
      filePath: { type: String, required: true },
      targetFile: { type: String },
      action: {
        type: String,
        enum: ["modify", "create", "delete"],
        default: "modify",
      },
      originalContent: { type: String, default: "" },
      proposedContent: { type: String, default: "" },
      diff: { type: String, default: "" },
      originalHash: { type: String, default: "" },
      additions: { type: Number, default: 0 },
      deletions: { type: Number, default: 0 },
    },
    validation: {
      status: {
        type: String,
        enum: ["valid", "warning", "invalid"],
        default: "valid",
      },
      warnings: [{ type: String }],
      errors: [{ type: String }],
    },
    engine: {
      type: String,
      enum: ["rule", "ai"],
      default: "rule",
    },
    changes: [
      {
        description: { type: String },
        reason: { type: String },
      },
    ],
    placeholders: [{ type: String }],
    manualSnippet: {
      type: String,
      default: null,
    },
    confidence: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "high",
    },
    ruleIds: [{ type: String }],
    note: {
      type: String,
      default: null,
    },
    operation: {
      type: String,
      enum: ["create", "modify"],
      default: "modify",
    },
    isBootstrap: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["proposed", "approved", "rejected", "manual", "stale", "published"],
      default: "proposed",
      index: true,
    },
    publishId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SeoPublish",
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    userFeedback: {
      type: String,
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying fixes by project and status
seoFixSchema.index({ projectId: 1, status: 1 });
seoFixSchema.index({ projectId: 1, issueId: 1 });

const SeoFix = mongoose.models.SeoFix || mongoose.model("SeoFix", seoFixSchema);

export default SeoFix;

