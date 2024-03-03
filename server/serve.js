const express = require("express");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const path = require("path");
require('dotenv').config();

const app = express();
const port = 3003;

// Configure AWS SDK with DigitalOcean Spaces credentials
const s3 = new S3Client({
  endpoint: `${process.env.DIGITALOCEAN_ENDPOINT}`,
  forcePathStyle: false,
  region: `${process.env.DIGITALOCEAN_REGION}`,
  credentials: {
    accessKeyId: `${process.env.DIGITALOCEAN_ACCESSKEY_ID}`,
    secretAccessKey: `${process.env.DIGITALOCEAN_SECRET_ACCESS_KEY}`
  }
});

// Serve static files from the DigitalOcean Spaces bucket
app.use(async (req, res, next) => {
  const host = req.hostname;
  const hostArr = host.split(".");
  const folderName = hostArr[0];

  try {
    // Check if the requested URL is the root path
    if (req.url === "/") {
      // Redirect to http://r3bnnf.localhost:3003/index.html
      return res.redirect(`${folderName}.localhost:3003/index.html`);
    }

    // Replace backslashes with forward slashes in the folderName
    const cleanFolderName = folderName.replace(/\\/g, "/");

    const getObjectCommand = new GetObjectCommand({
      Bucket: `${process.env.BUCKET_NAME}`,
      Key: `${cleanFolderName}${req.url}`, // Use the requested path as the key
    });

    const response = await s3.send(getObjectCommand);

    if (response) {
      const contentType = response.ContentType || "application/octet-stream"; // Set the content type based on the response headers
      res.setHeader("Content-Type", contentType);
      response.Body.pipe(res); // Pipe the response body to the response object
    } else {
      next(); // Pass control to the next middleware if file not found
    }
  } catch (error) {
    console.error("Error fetching file from DigitalOcean Spaces:", error);
    console.error("Error details:", error.stack); // Log the stack trace for more information
    res.status(404).sendFile(path.join(__dirname, '404.html'));
  }
});


// Serve the build directory containing static files
app.use(express.static(path.join(__dirname, 'build')));

// Define a route to serve the index.html file for any route not handled above
app.get('*', (req, res) => {
  
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
