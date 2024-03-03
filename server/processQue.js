const simpleGit = require("simple-git");
const uploadDirectoryToS3 = require("./filepaths");
const addDomain = require("./domain");
const { exec } = require("child_process");
const fs = require("fs").promises;
const Redis = require("ioredis");
const REDIS_PORT = 6379; // Redis default port
const redisClient = Redis.createClient(REDIS_PORT);
const mongoose = require("mongoose");
const buildSchema = require("./schemas/builds");
require('dotenv').config();

main().catch((err) => console.log(err));

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

async function deleteDirectory(directoryPath) {
  try {
    await fs.rm(directoryPath, { recursive: true });
    console.log(`Directory ${directoryPath} deleted successfully.`);
  } catch (error) {
    console.error(`Error deleting directory ${directoryPath}:`, error);
  }
}

// exec command

async function executeCommand(command, io, socketId) {
  return new Promise((resolve, reject) => {
    // Ensure that the socket ID is passed to the child process
    const childProcess = exec(command, { env: { SOCKET_ID: socketId } });

    // Emit build log and error messages to the specified socket
    childProcess.stdout.on("data", (data) => {
      io.to(socketId).emit("build-log", data.toString());
    });
    childProcess.stderr.on("data", (data) => {
      io.to(socketId).emit("build-error", data.toString());
    });

    // Handle the close event of the child process
    childProcess.on("close", (code) => {
      if (code === 0) {
        resolve(); // Resolve when command execution completes successfully
      } else {
        reject(new Error(`Command '${command}' exited with code ${code}`)); // Reject with error if command fails
      }
    });
  });
}


async function checkIfGitRepoIsEmpty(directoryPath) {
  try {
    const files = await fs.readdir(directoryPath);
    if (files.length === 1 && files.includes(".git")) {
      return 0;
    } else {
      return 1;
    }
  } catch (error) {
    throw error;
  }
}

async function processQueue(io) {
  while (true) {
    const job = await new Promise((resolve, reject) => {
      redisClient.lpop("project_queue", (err, reply) => {
        if (err) {
          reject(err);
        } else {
          resolve(reply ? JSON.parse(reply) : null);
        }
      });
    });

    if (job) {
      const socketId = job.socketId; // Store the socket ID associated with this job

      try {
        // Check if a build with the same projectName already exists in the database
        const existingBuild = await buildSchema.findOne({
          projectName: job.projectName,
        });
        if (existingBuild) {
          io.to(socketId).emit("error", "Only 1 build per project is allowed");
          console.log("A build with the same project name already exists.");
          continue; // Skip further processing for this job
        }

        // Clone the project from GitHub
        await simpleGit().clone(job.gitUrl, job.id + "/");

        // Emit message indicating repository is cloned
        io.to(socketId).emit("status-update", "Repo Cloned Successfully");

        // Check if the repository is empty
        if ((await checkIfGitRepoIsEmpty(job.id + "/")) === 0) {
          console.log("Repo is empty");
          io.to(socketId).emit("error", "Repository is empty");

          // Remove the directory
          await fs.rm(job.id + "/", { recursive: true });
        } else {
          // Build the project
          io.to(socketId).emit("status-update", "Project Build Started");
          try {
            // Execute npm install
            await executeCommand(
              `cd ${job.id}/${job.rootDir}/ && npm install`,
              io,
              socketId
            );

            // Execute npm run build
            await executeCommand(
              `cd ${job.id}/${job.rootDir}/ && npm run build`,
              io,
              socketId
            );
            io.to(socketId).emit("status-update", "Build Completed");

            // Check if the build directory exists before uploading to S3
            const buildPath = `${job.id}/${job.rootDir}/build`;
            const buildExists = await fs
              .access(buildPath)
              .then(() => true)
              .catch(() => false);

            if (buildExists) {
              // Upload to S3 only if npm install and npm build succeed and build directory exists
              await io.to(socketId).emit("status-update", "Deployment Started");

              await uploadDirectoryToS3(buildPath, job.id);
              // await addDomain(job.id);

              // Emit message indicating files uploaded
              await io.to(socketId).emit("status-update", "Deployment Successfull");

              const newBuild = new buildSchema({
                username: job.userName,
                accessToken: job.accessToken,
                buildId: job.id,
                gitUrl: job.gitUrl,
                projectName: job.projectName,
                projectFramework: job.frameWork,
                rootDirectory: job.rootDir,
              });
              await newBuild.save();

              // Delete the directory after successful upload
              await deleteDirectory(`${job.id}/`);
            } else {
              io.to(socketId).emit("error", "Invalid Root Directory");
              console.error("Invalid Root Directory");
            }
          } catch (error) {
            io.to(socketId).emit("error", "An error occurred during build");
            console.error(`Error executing command: ${error.message}`);
          }
        }
      } catch (error) {
        if (
          error.message &&
          (error.message.includes("Repository not found") ||
            error.message.includes("does not exist"))
        ) {
          io.to(socketId).emit("error", "Invalid Repository URL");
          console.log("Repository not found");
        } else {
          io.to(socketId).emit("error", "An error occurred during processing");
          console.error("Error processing job:", error);
        }
      }
    } else {
      // If queue is empty, wait for 1 second before checking again
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}


module.exports = processQueue;
