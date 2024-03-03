const Redis = require("ioredis");
const REDIS_PORT = 6379; // Redis default port
const redisClient = Redis.createClient(REDIS_PORT);
require('dotenv').config();

// Function to add a job to the Redis queue
async function addToQueue(job) {
 
  try {
    await redisClient.rpush(
      "project_queue",
      JSON.stringify(job),
      (err, reply) => {
        if (err) {
          console.error("Error adding job to queue:", err);
        } else {
          console.log("Job added to queue:", job.id);
        }
      }
    );
  } catch (error) {
    console.log(error);
    // Handle error
  }
}

module.exports = addToQueue;
