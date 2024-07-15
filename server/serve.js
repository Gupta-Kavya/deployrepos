const express = require("express");
const {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
} = require("@aws-sdk/client-s3");
const path = require("path");
require("dotenv").config();

const app = express();
const port = 3003;

// Configure AWS SDK with AWS S3 credentials
const s3 = new S3Client({
  endpoint: process.env.DIGITALOCEAN_ENDPOINT,
  region: process.env.DIGITALOCEAN_REGION,
  credentials: {
    accessKeyId: process.env.DIGITALOCEAN_ACCESSKEY_ID,
    secretAccessKey: process.env.DIGITALOCEAN_SECRET_ACCESS_KEY,
  },
});

// Middleware to list files in the folder derived from the subdomain
app.use(async (req, res, next) => {
  const host = req.hostname;
  const folderName = host.split(".")[0]; // Extract folder name from subdomain

  try {
    const listObjectsCommand = new ListObjectsV2Command({
      Bucket: process.env.BUCKET_NAME,
      Prefix: `${folderName}/`, // Ensure the folder prefix ends with a slash
    });

    const response = await s3.send(listObjectsCommand);

    if (response.Contents) {
      // Extract file names from the response
      const fileNames = response.Contents.map((obj) =>
        obj.Key.replace(`${folderName}/`, "")
      );

      // Log the file names
      console.log("Files in folder:", fileNames);
    } else {
      console.log("No files found in folder:", folderName);
    }

    next(); // Proceed to the next middleware
  } catch (error) {
    console.error("Error listing files in AWS S3 folder:", error);
    console.error("Error details:", error.stack); // Log the stack trace for more information
    res.status(500).send("Error listing files."); // Respond with an error message
  }
});

// Middleware to serve index.html and other static files from AWS S3 bucket
app.use(async (req, res, next) => {
  const host = req.hostname;
  const folderName = host.split(".")[0]; // Extract folder name from subdomain

  try {
    let key = req.path.replace(/^\/|\/$/g, ""); // Remove leading and trailing slashes

    // Handle special case for serving index.html from root
    if (key === "" || key === "index.html") {
      key = "index.html";
    }

    console.log("Requested key:", key);

    const getObjectCommand = new GetObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: `${folderName}/${key}`, // Construct the key including the folder name
    });

    const response = await s3.send(getObjectCommand);

    if (response.Body) {
      const contentType = response.ContentType || "application/octet-stream";
      res.setHeader("Content-Type", contentType);
      response.Body.pipe(res);
    } else {
      next(); // Pass control to the next middleware if file not found
    }
  } catch (error) {
    console.error("Error fetching file from AWS S3:", error);
    console.error("Error details:", error.stack);
    next(); // Pass control to the next middleware in case of an error
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
