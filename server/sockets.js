const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http); // Initialize Socket.IO


function emitMessage(message) {
    io.emit("status-update", message);
  }
  

  module.exports = emitMessage;