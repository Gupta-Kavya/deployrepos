const mongoose = require("mongoose");

const buildSchema = new mongoose.Schema(
  {
    username: { type: String, required: true},
    accessToken: { type: String, required: true},
    buildId: { type: String, required: true, unique: true },
    gitUrl: { type: String, required: true },
    projectName: { type: String, required: true },
    projectFramework: { type: String, required: true },
    rootDirectory: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("builds", buildSchema);
