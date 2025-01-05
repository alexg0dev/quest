// server.js
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

// Enable CORS for your frontend domain
app.use(cors({
  origin: 'https://alexg0dev.github.io',
  methods: ['POST'],
  credentials: true,
}));

// Discord OAuth2 Credentials
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

// Route to handle OAuth callback
app.post('/oauth/callback', async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ success: false, message: 'Code is required' });
  }

  try {
    // Exchange code for access token
    const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI,
      scope: 'identify email guilds connections',
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const accessToken = tokenResponse.data.access_token;

    // Use access token to get user data
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const user = userResponse.data;
    const avatarURL = user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
      : `https://cdn.discordapp.com/embed/avatars/${user.discriminator % 5}.png`;

    // Save user data to profiles.json
    const profilesPath = path.join(__dirname, 'profiles.json');
    let profiles = {};

    if (fs.existsSync(profilesPath)) {
      const data = fs.readFileSync(profilesPath);
      profiles = JSON.parse(data);
    }

    profiles[`${user.username}#${user.discriminator}`] = {
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: avatarURL,
      email: user.email || null,
      guilds: user.guilds || [],
      connections: user.connections || [],
    };

    fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 2));

    // Respond with user data
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        discriminator: user.discriminator,
        avatar: avatarURL,
      },
    });
  } catch (error) {
    console.error('Error during OAuth callback:', error.response ? error.response.data : error.message);
    res.status(500).json({ success: false, message: 'OAuth callback failed' });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
