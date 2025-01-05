// server.js

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// =============================
// Configuration
// =============================

// Ensure you have a .env file with the following variables:
// CLIENT_ID=your_discord_client_id
// CLIENT_SECRET=your_discord_client_secret
// REDIRECT_URI=https://alexg0dev.github.io/qg/
// FRONTEND_URL=https://alexg0dev.github.io/qg/ (Optional, for CORS)

const CLIENT_ID = process.env.CLIENT_ID || '1324622665323118642'; // As per your OAuth2 link
const CLIENT_SECRET = process.env.CLIENT_SECRET; // Should be set in .env
const REDIRECT_URI = process.env.REDIRECT_URI || 'https://alexg0dev.github.io/qg/';
const TOKEN_ENDPOINT = 'https://discord.com/api/oauth2/token';
const USER_API_ENDPOINT = 'https://discord.com/api/users/@me';

// Path to profiles.json
const PROFILES_FILE = path.join(__dirname, 'profiles.json');

// =============================
// Middleware
// =============================

app.use(bodyParser.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://alexg0dev.github.io',
}));

// =============================
// Initialize profiles.json
// =============================

if (!fs.existsSync(PROFILES_FILE)) {
  fs.writeFileSync(PROFILES_FILE, JSON.stringify([]));
}

// =============================
// Routes
// =============================

// Endpoint to handle OAuth2 code from frontend
app.post('/callback', async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ success: false, message: 'No code provided.' });
  }

  try {
    // Exchange code for access token
    const tokenResponse = await axios.post(
      TOKEN_ENDPOINT,
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
        scope: 'email identify',
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // Fetch user information from Discord
    const userResponse = await axios.get(USER_API_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const user = userResponse.data;

    // Prepare user data
    const userData = {
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
        : null,
      email: user.email, // Since you requested 'email' scope
    };

    // Read existing profiles
    const profilesData = JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf-8'));

    // Check if user already exists
    const existingUserIndex = profilesData.findIndex((u) => u.id === user.id);

    if (existingUserIndex === -1) {
      // Add new user
      profilesData.push(userData);
    } else {
      // Update existing user
      profilesData[existingUserIndex] = userData;
    }

    // Save updated profiles to profiles.json
    fs.writeFileSync(PROFILES_FILE, JSON.stringify(profilesData, null, 2));

    // Respond back to frontend with user data
    res.json({ success: true, user: userData });
  } catch (error) {
    console.error('Error during OAuth2 callback:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: 'Authentication failed.' });
  }
});

// Optional: Endpoint to fetch all saved profiles
app.get('/profiles', (req, res) => {
  try {
    const profilesData = JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf-8'));
    res.json(profilesData);
  } catch (error) {
    console.error('Error reading profiles.json:', error.message);
    res.status(500).send('Internal Server Error');
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
