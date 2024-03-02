const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  accessToken: { type: String, required: true, unique: true },
});

module.exports = mongoose.model("users", userSchema);
