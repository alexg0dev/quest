// server.js

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();

// ===========================
// Middleware Configuration
// ===========================

// Configure CORS to allow requests from your GitHub Pages frontend
app.use(cors({
  origin: 'https://alexg0dev.github.io', // Replace with your actual GitHub Pages URL if different
  credentials: true,
}));

// Parse incoming JSON requests
app.use(bodyParser.json());

// ===========================
// Environment Variables
// ===========================

// Replace with your actual Discord application credentials
const CLIENT_ID = '1324622665323118642'; // Your Discord Client ID
const CLIENT_SECRET = 'SOUH4ZSbsJMLMleztz9ySwlxPI5TvWCQ'; // Set this in Railway environment variables
const REDIRECT_URI = 'https://alexg0dev.github.io/qg/'; // Must match the Redirect URI in Discord Developer Portal

// ===========================
// Profiles Management
// ===========================

// Path to profiles.json
const profilesPath = path.join(__dirname, 'profiles.json');

// Ensure profiles.json exists; if not, create it as an empty object
if (!fs.existsSync(profilesPath)) {
  fs.writeFileSync(profilesPath, JSON.stringify({}));
}

// Helper function to read profiles.json
const readProfiles = () => {
  try {
    const data = fs.readFileSync(profilesPath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading profiles.json:', err);
    return {};
  }
};

// Helper function to write to profiles.json
const writeProfiles = (profiles) => {
  try {
    fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 2));
  } catch (err) {
    console.error('Error writing to profiles.json:', err);
  }
};

// ===========================
// Routes
// ===========================

/**
 * @route   GET /login
 * @desc    Redirects user to Discord's OAuth2 authorization URL
 */
app.get('/login', (req, res) => {
  const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20email`;
  res.redirect(discordAuthUrl);
});

/**
 * @route   POST /oauth/callback
 * @desc    Handles OAuth2 callback by exchanging code for tokens and fetching user data
 */
app.post('/oauth/callback', async (req, res) => {
  const { code } = req.body;

  // Validate the presence of the authorization code
  if (!code) {
    return res.status(400).json({ success: false, message: 'No code provided' });
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      scope: 'identify email',
    }).toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const accessToken = tokenResponse.data.access_token;

    // Fetch user data from Discord
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const user = userResponse.data;

    // Read existing profiles
    let profiles = readProfiles();

    // Update profiles with the new user data
    profiles[user.id] = {
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : null,
      email: user.email,
      // Add any additional fields if necessary
    };

    // Write updated profiles back to profiles.json
    writeProfiles(profiles);

    // Respond with user data
    res.json({
      success: true,
      user: profiles[user.id],
    });

  } catch (error) {
    console.error('OAuth2 Error:', error.response ? error.response.data : error.message);
    res.status(500).json({ success: false, message: 'Authentication failed' });
  }
});

// ===========================
// Start the Server
// ===========================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
