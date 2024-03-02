const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs").promises;
const mimeTypes = require('mime-types');
require('dotenv').config();


const s3Client = new S3Client({
  endpoint: `${process.env.DIGITALOCEAN_ENDPOINT}`, // Corrected endpoint URL
  forcePathStyle: false,
  region: `${process.env.DIGITALOCEAN_REGION}`,
  credentials: {
    accessKeyId: `${process.env.DIGITALOCEAN_ACCESSKEY_ID}`,
    secretAccessKey: `${process.env.DIGITALOCEAN_SECRET_ACCESS_KEY}`
  }
});

const uploadToS3 = async (filePath, objectKey) => {
  try {
    const fileData = await fs.readFile(filePath);
    const contentType = mimeTypes.lookup(filePath) || 'application/octet-stream';

    const params = {
      Bucket: `${process.env.BUCKET_NAME}`,
      Key: objectKey,
      Body: fileData,
      ContentType: contentType,
      ACL: 'public-read'
    };

    const data = await s3Client.send(new PutObjectCommand(params));
    console.log("Successfully uploaded object:", params.Key);
    return data;
  } catch (err) {
    console.error("Error uploading to S3:", err);
    throw err;
  }
};

module.exports = uploadToS3;
