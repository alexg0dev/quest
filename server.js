// server.js

// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware Setup
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configure CORS to allow requests from your frontend
app.use(cors({
  origin: 'https://alexg0dev.github.io', // Replace with your actual frontend URL
  methods: ['POST'],
  allowedHeaders: ['Content-Type']
}));

// Function to Save User Profiles to profiles.json
const saveProfile = async (profile) => {
  const filePath = path.join(__dirname, 'profiles.json');
  let profiles = [];

  // Check if profiles.json exists
  if (await fs.pathExists(filePath)) {
    try {
      profiles = JSON.parse(await fs.readFile(filePath, 'utf8'));
    } catch (err) {
      console.error('Error parsing profiles.json:', err);
      profiles = [];
    }
  }

  // Check if user already exists
  const userExists = profiles.some(p => p.id === profile.id);
  if (userExists) {
    console.log(`User with ID ${profile.id} already exists in profiles.json.`);
    return;
  }

  // Append new profile
  profiles.push(profile);

  // Write updated profiles back to profiles.json
  try {
    await fs.writeFile(filePath, JSON.stringify(profiles, null, 2));
    console.log(`Added to profiles.json: ${JSON.stringify(profile)}`);
  } catch (err) {
    console.error('Error writing to profiles.json:', err);
  }
};

// POST OAuth2 Callback Route
app.post('/oauth/callback', async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ success: false, message: 'No code provided.' });
  }

  try {
    // Exchange Code for Access Token
    const tokenResponse = await axios.post(
      'https://discord.com/api/oauth2/token',
      new URLSearchParams({
        client_id: '1324622665323118642',
        client_secret: 'SOUH4ZSbsJMLMleztz9ySwlxPI5TvWCQ',
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: 'https://alexg0dev.github.io/quest/',
        scope: 'identify email'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // Fetch User Information
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const user = userResponse.data;

    // Prepare User Profile Data
    const profile = {
      id: user.id,
      username: `${user.username}#${user.discriminator}`,
      avatar: user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=512` // Default to PNG, Discord handles the format
        : `https://cdn.discordapp.com/embed/avatars/${user.discriminator % 5}.png?size=512`, // Default Discord avatar
      email: user.email || 'No Email Provided'
    };

    // Save Profile to profiles.json
    await saveProfile(profile);

    // Respond with Success and User Data
    res.json({ success: true, user: profile });
  } catch (error) {
    if (error.response) {
      console.error('Error during OAuth callback:', error.response.data);
      res.status(500).json({ success: false, message: error.response.data });
    } else {
      console.error('Error during OAuth callback:', error.message);
      res.status(500).json({ success: false, message: 'An error occurred during the OAuth process.' });
    }
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
