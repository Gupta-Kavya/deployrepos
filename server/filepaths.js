const fs = require("fs").promises;
const path = require("path");
const uploadToS3 = require("./docean");
require('dotenv').config();




async function uploadDirectoryToS3(directoryPath, folderName) {
  try {
    const files = await fs.readdir(directoryPath);
    for (const file of files) {
      const filePath = path.join(directoryPath, file);
      const stats = await fs.stat(filePath);
      if (stats.isFile()) {
        // If it's a file, upload it
        const relativePath = path.relative(directoryPath, filePath);
        const fileKey = `${folderName}/${relativePath.replace(/\\/g, "/")}`; // Include folderName and relative path
        await uploadToS3(filePath, fileKey); // Upload with modified fileKey
      } else if (stats.isDirectory()) {
        // If it's a directory, recursively upload its contents
        await uploadDirectoryToS3(filePath, `${folderName}/${file}`);
      }
    }
  } catch (error) {
    console.log(error);
  }
}

module.exports = uploadDirectoryToS3;


