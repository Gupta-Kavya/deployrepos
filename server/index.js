const express = require("express");
require('dotenv').config();
const cors = require("cors");
const app = express();
const mongoose = require("mongoose");
const buildSchema = require("./schemas/builds");
const generateRandomName = require("./folderNamegenerate");
const {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const processQueue = require("./processQue");
const addToQueue = require("./addtoQue");
const http = require("http");
const server = http.createServer(app); // Create HTTP server
const io = require("socket.io")(server, {
  cors: {
    origin: "*", // Allow requests from all origins
    methods: ["GET", "POST"], // Allow only GET and POST methods
  },
});

main().catch((err) => console.log(err));

const s3Client = new S3Client({
  endpoint: "https://blr1.digitaloceanspaces.com", // Corrected endpoint URL
  forcePathStyle: false,
  region: "blr1",
  credentials: {
    accessKeyId: "DO002RQBGLUFKJE6K2H7",
    secretAccessKey: "DlR7RY7MxMREkp3Vj9yAdGYfHK3oxZ+0P9KCfb3/lgg",
  },
});

async function main() {
  try {
    await mongoose.connect(
      `${process.env.MONGO_URI}`
    );
    console.log("Connection to Mongodb is success");
  } catch (error) {
    console.log(error);
  }
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Start processing the queue
processQueue(io).catch((err) => console.error("Queue processing error:", err));

app.post("/cloneProject", async (req, res) => {
  try {
    const id = generateRandomName(6);
    const job = {
      gitUrl: req.body.gitUrl,
      id: id,
      rootDir: req.body.rootPath,
      frameWork: req.body.framework,
      userName: req.body.userName,
      accessToken: req.body.accessToken,
      projectName: req.body.projectName,
    };

    setTimeout(() => {
      addToQueue(job);

      res.status(200).json({
        success: true,
        id: id,
        message: "Build request added to queue.",
      });
      io.emit("status-update", "Added To Que");
    }, 2000);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Error adding build request to queue.",
    });
    io.emit("error", "Some Internal error occured");
  }
});

app.post("/fetchHistory", async (req, res) => {
  try {
    const userId = req.body.userId; // Extract user ID from request parameters
    // Fetch all data from the schema for the specified user ID
    let data = await buildSchema.find({ username: userId }).exec();

    res.send(data);
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
});




app.delete("/delete-folder", async (req, res) => {
  const folderPath = req.body.buildId;

  if (!folderPath) {
    return res.status(400).json({ error: "Bucket name and folder path are required." });
  }

  try {
    // List all objects in the folder
    const listParams = {
      Bucket: `${process.env.BUCKET_NAME}`,
      Prefix: folderPath,
    };

    const data = await s3Client.send(new ListObjectsV2Command(listParams));
    const objectsToDelete = data.Contents.map((obj) => ({ Key: obj.Key }));

    // Delete each object in the folder
    const deletePromises = objectsToDelete.map((obj) =>
      s3Client.send(new DeleteObjectCommand({
        Bucket: `${process.env.BUCKET_NAME}`,
        Key: obj.Key,
      }))
    );

    await Promise.all(deletePromises);

    // Delete corresponding data from the database
    await buildSchema.deleteMany({ buildId: folderPath }); // Assuming buildId matches folderPath

    res.status(201).json({ success: true });
  } catch (err) {
    console.error("Error deleting folder:", err);
    res.status(500).json({ error: "An error occurred while deleting the folder." });
  }
});

// Start the server
server.listen(3001, () => {
  console.log("Server working at PORT:3001");
});
