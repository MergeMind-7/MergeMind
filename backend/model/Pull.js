const mongoose = require("mongoose");
const { formatToReadable } = require("../config/dateFunction");
const Repo = require("./Repo");

const pullSchema = new mongoose.Schema(
  {
    repo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Repo",
      required: true,
    },
    prNumber: { type: Number },
    title: { type: String },
    user: {
      username: { type: String },
      avatar: { type: String },
      profile: { type: String },
    },

    actions: [
      {
        action: { type: String },
        timestamp: {
          type: String,
          default: () => formatToReadable(new Date()),
        },
      },
    ],
    state: {
      type: String,
      enum: ["open", "closed", "merged"],
      default: "open",
    },
    fileStats: {
      totalFilesChanged: { type: Number, default: 0 },
      totalAdditions: { type: Number, default: 0 },
      totalDeletions: { type: Number, default: 0 },
    },
    healthScore: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  },
);

async function updateRepoStats(repoId) {
  const Pull = mongoose.model("Pull");

  const stats = await Pull.aggregate([
    { $match: { repo: repoId } },
    {
      $group: {
        _id: null,
        totalPRs: { $sum: 1 },
        openPRs: {
          $sum: { $cond: [{ $eq: ["$state", "open"] }, 1, 0] },
        },
        totalAnalyzedPRs: {
          $sum: { $cond: [{ $gt: ["$healthScore", 0] }, 1, 0] },
        },
        avgHealthScore: { $avg: "$healthScore" },
      },
    },
  ]);

  const repoStats = stats[0] || {
    totalPRs: 0,
    openPRs: 0,
    totalAnalyzedPRs: 0,
    avgHealthScore: 0,
  };

  await Repo.findByIdAndUpdate(repoId, {
    $set: {
      "stats.totalPRs": repoStats.totalPRs,
      "stats.openPRs": repoStats.openPRs,
      "stats.totalAnalyzedPRs": repoStats.totalAnalyzedPRs,
      "stats.averageHealthScore": Math.round(repoStats.avgHealthScore || 0),
    },
  });
}

pullSchema.post("save", async function () {
  await updateRepoStats(this.repo);
});

pullSchema.post(
  "deleteOne",
  { document: true, query: false },
  async function () {
    await updateRepoStats(this.repo);
  },
);

pullSchema.index({ repo: 1 });
pullSchema.index({ repo: 1, prNumber: 1 });

const Pull = mongoose.model("Pull", pullSchema);

module.exports = Pull;
