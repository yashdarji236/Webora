import mongoose from "mongoose";

const fileEntrySchema = new mongoose.Schema(
  {
    path: { type: String, required: true },
    operation: { type: String, enum: ["create", "modify"], default: "modify" },
    fixId: { type: mongoose.Schema.Types.ObjectId, ref: "SeoFix" },
  },
  { _id: false }
);

const skippedEntrySchema = new mongoose.Schema(
  {
    fixId: { type: mongoose.Schema.Types.ObjectId, ref: "SeoFix" },
    reason: { type: String, required: true },
  },
  { _id: false }
);

const seoPublishSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    projectId: {
      type: String,
      default: "",
      index: true,
    },
    repoFullName: {
      type: String,
      required: true,
      index: true,
    },
    mode: {
      type: String,
      enum: ["pr", "direct"],
      default: "pr",
      required: true,
    },
    status: {
      type: String,
      enum: ["success", "failed", "partial"],
      default: "success",
      required: true,
      index: true,
    },
    branch: {
      type: String,
      default: "",
    },
    commitSha: {
      type: String,
      default: "",
    },
    prNumber: {
      type: Number,
      default: null,
    },
    prUrl: {
      type: String,
      default: "",
    },
    usedFork: {
      type: Boolean,
      default: false,
    },
    forkOwner: {
      type: String,
      default: null,
    },
    files: [fileEntrySchema],
    skipped: [skippedEntrySchema],
    baseSha: {
      type: String,
      default: "",
    },
    revertHint: {
      type: String,
      default: null,
    },
    error: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

seoPublishSchema.index({ repoFullName: 1, createdAt: -1 });
seoPublishSchema.index({ userId: 1, createdAt: -1 });

const SeoPublish = mongoose.models.SeoPublish || mongoose.model("SeoPublish", seoPublishSchema);

export default SeoPublish;
