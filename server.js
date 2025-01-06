// server.js

// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Middleware
 */

// Apply CORS before other middleware
app.use(cors({
  origin: 'https://alexg0dev.github.io',
  methods: ['POST'],
  allowedHeaders: ['Content-Type']
}));

// Body parsing middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/**
 * OAuth2 Callback
 */
app.post('/oauth/callback', async (req, res) => {
  const { code } = req.body;
  console.log('Received OAuth2 code:', code);

  if (!code) {
    console.error('No code provided in the request body.');
    return res.status(400).json({ success: false, message: 'No code provided.' });
  }

  try {
    // Exchange code for token
    console.log('Exchanging code for access token...');
    const tokenResponse = await axios.post(
      'https://discord.com/api/oauth2/token',
      new URLSearchParams({
        client_id: '1324622665323118642', // Put into .env in production
        client_secret: 'K0cIXhm1ZweOvtoRqMdOsaUk5DFZFV7f', // Put into .env in production
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'https://alexg0dev.github.io/quest/', // Must match your Discord app settings
        scope: 'identify email'
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    console.log('Access token obtained:', tokenResponse.data.access_token);
    const accessToken = tokenResponse.data.access_token;

    // Fetch User Info
    console.log('Fetching user information from Discord...');
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const user = userResponse.data;
    console.log('User data fetched:', user);

    // Prepare profile
    const profile = {
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=512`
        : `https://cdn.discordapp.com/embed/avatars/${user.id % 5}.png?size=512`,
      email: user.email || 'No Email Provided'
    };

    // Respond with user data without saving
    res.json({ success: true, user: profile });
  } catch (error) {
    if (error.response) {
      console.error('Error during OAuth callback (response):', error.response.data);
      return res.status(500).json({ success: false, message: error.response.data });
    } else {
      console.error('Error during OAuth callback (message):', error.message);
      return res
        .status(500)
        .json({ success: false, message: 'An error occurred during the OAuth process.' });
    }
  }
});

/**
 * Start the server
 */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
