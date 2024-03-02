const express = require("express");
const passport = require("passport");
require("dotenv").config();
const GitHubStrategy = require("passport-github2").Strategy;
const app = express();
const partials = require("express-partials");
const bodyParser = require("body-parser");
const session = require("express-session");
const methodOverride = require("method-override");
const axios = require("axios");
const mongoose = require("mongoose");
const userSchema = require("./schemas/users");
const jwt = require('jsonwebtoken');

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

try {
  // Configure passport session serialization/deserialization
  passport.serializeUser(function (user, done) {
    done(null, user);
  });

  passport.deserializeUser(function (obj, done) {
    done(null, obj);
  });

  // Configure GitHub authentication strategy
  passport.use(
    new GitHubStrategy(
      {
        clientID: `${process.env.GITHUB_CLIENT_ID}`,
        clientSecret: `${process.env.GITHUB_CLIENT_SECRET}`,
        callbackURL: `${process.env.GITHUB_CALLBACK_URL}`,
      },
      async function (accessToken, refreshToken, profile, done) {
        console.log("GitHub authentication successful");
        console.log("Access Token:", accessToken);
        // You may want to save user profile information to the database here

        done(null, { accessToken, profile });
      }
    )
  );

  // Initialize Express application and configure middleware
  app.set("views", __dirname + "/views");
  app.set("view engine", "ejs");
  app.use(partials());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.use(methodOverride());
  app.use(
    session({ secret: `${process.env.GITHUB_JWT_SECRET}`, resave: false, saveUninitialized: false })
  );
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure routes for GitHub authentication
  app.get("/auth/github", (req, res) => {
    // Redirect the user to GitHub for authentication
    res.redirect(
      `${process.env.GITHUB_REDIRECT_LOGIN_URI}`
    );
  });

  // Handle GitHub OAuth callback
  app.get("/auth/github/callback", async (req, res) => {
    const code = req.query.code; // Get the authorization code from the query parameters

    try {
      // Make a POST request to GitHub's token endpoint to exchange the authorization code for an access token
      const response = await axios.post(
        "https://github.com/login/oauth/access_token",
        {
          client_id: `${process.env.GITHUB_CLIENT_ID}`,
          client_secret: `${process.env.GITHUB_CLIENT_SECRET}`,
          code: code,
        },
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      // Extract the access token from the response
      const accessToken = response.data.access_token;

      // Use the access token to make a request to GitHub's API to fetch user information
      const githubResponse = await axios.get("https://api.github.com/user", {
        headers: {
          Authorization: `token ${accessToken}`,
        },
      });

      // Extract email and username from the GitHub response
      const username = githubResponse.data.login;

      // Check if the user already exists in the database
      const existingUser = await userSchema.findOne({ username });

      if (existingUser) {
        // If the user exists, update their access token
        existingUser.accessToken = accessToken;
        await existingUser.save();
      } else {
        // If the user does not exist, create a new user entry
        const newUser = new userSchema({ username, accessToken });
        await newUser.save();
      }
      const token = jwt.sign({ accessToken: accessToken , userName :username  }, `${process.env.GITHUB_JWT_SECRET}`);

      // Redirect the user or do other actions based on your application's logic
      res.redirect(`${process.env.REACT_APP_FRONTEND_URI}/?accessToken=${accessToken}&userName=${username}&jwtToken=${token}`);
    } catch (error) {
      console.error("Error occurred:", error);
      res
        .status(500)
        .send("Error occurred while processing GitHub authentication.");
    }
  });

  // Start server
  app.listen(3002, () => {
    console.log("Server is running on port 3002");
  });
} catch (error) {
  console.error("Error occurred:", error);
}
