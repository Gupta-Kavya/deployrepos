const express = require("express");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
require('dotenv').config();

const app = express();
const port = 3003;

// Configure AWS SDK with DigitalOcean Spaces credentials
const s3 = new S3Client({
  endpoint: `${process.env.DIGITALOCEAN_ENDPOINT}`, // Corrected endpoint URL
  forcePathStyle: false,
  region: `${process.env.DIGITALOCEAN_REGION}`,
  credentials: {
    accessKeyId: `${process.env.DIGITALOCEAN_ACCESSKEY_ID}`,
    secretAccessKey: `${process.env.DIGITALOCEAN_SECRET_ACCESS_KEY}`
  }
});

// Define a route to serve files from DigitalOcean Spaces
app.get("/*", async (req, res) => {
  const host = req.hostname;
  const hostArr = host.split(".");
  const folderName = hostArr[0];

  try {
    // Replace backslashes with forward slashes in the folderName
    const cleanFolderName = folderName.replace(/\\/g, "/");

    const getObjectCommand = new GetObjectCommand({
      Bucket: `${process.env.BUCKET_NAME}`,
      Key: `${cleanFolderName}/index.html`, // Use the requested path as the key
    });

    const response = await s3.send(getObjectCommand);
    const contentType = response.ContentType || "application/octet-stream"; // Set the content type based on the response headers
    res.setHeader("Content-Type", contentType);
    response.Body.pipe(res); // Pipe the response body to the response object
  } catch (error) {
    console.error("Error fetching file from DigitalOcean Spaces:", error);
    console.error("Error details:", error.stack); // Log the stack trace for more information
    res.status(500).send("Error fetching file from DigitalOcean Spaces");
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
