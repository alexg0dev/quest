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
app.use(cors());

// Function to Save User Profiles to profiles.json
const saveProfile = async (profile) => {
  const filePath = path.join(__dirname, 'profiles.json');
  let profiles = [];

  // Check if profiles.json exists
  if (await fs.pathExists(filePath)) {
    profiles = JSON.parse(await fs.readFile(filePath, 'utf8'));
  }

  // Append new profile
  profiles.push(profile);

  // Write updated profiles back to profiles.json
  await fs.writeFile(filePath, JSON.stringify(profiles, null, 2));
};

// OAuth2 Callback Route
app.get('/oauth/callback', async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).send('No code provided.');
  }

  try {
    // Exchange Code for Access Token
    const tokenResponse = await axios.post(
      'https://discord.com/api/oauth2/token',
      new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.REDIRECT_URI,
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
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
        : null,
      email: user.email || 'No Email Provided'
    };

    // Save Profile to profiles.json
    await saveProfile(profile);

    // Redirect to Success Page or Frontend
    res.redirect('/success');
  } catch (error) {
    console.error('Error during OAuth callback:', error.response ? error.response.data : error.message);
    res.status(500).send('An error occurred during the OAuth process.');
  }
});

// Success Route
app.get('/success', (req, res) => {
  res.send('OAuth Success! Your profile has been saved.');
});

// Health Check Route (Optional)
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running.' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
