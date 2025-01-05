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
  origin: process.env.FRONTEND_URL, // Ensure this matches your frontend URL
  methods: ['POST'],
  allowedHeaders: ['Content-Type']
}));

// Function to Save User Profiles to profiles.json
const saveProfile = async (profile) => {
  const filePath = path.join(__dirname, 'profiles.json');
  let profiles = [];

  try {
    // Ensure profiles.json exists; if not, create it with an empty array
    await fs.ensureFile(filePath);
    const data = await fs.readFile(filePath, 'utf8');
    profiles = data ? JSON.parse(data) : [];
    console.log('Current profiles loaded:', profiles);
  } catch (err) {
    console.error('Error reading profiles.json:', err);
    profiles = [];
  }

  // Check if user already exists
  const userExists = profiles.some(p => p.id === profile.id);
  if (userExists) {
    console.log(`User with ID ${profile.id} already exists in profiles.json.`);
    return profiles.find(p => p.id === profile.id);
  }

  // Append new profile
  profiles.push(profile);
  console.log('New profile to add:', profile);

  // Write updated profiles back to profiles.json
  try {
    await fs.writeFile(filePath, JSON.stringify(profiles, null, 2));
    console.log(`Added to profiles.json: ${JSON.stringify(profile)}`);
  } catch (err) {
    console.error('Error writing to profiles.json:', err);
  }

  return profile;
};

// POST OAuth2 Callback Route
app.post('/oauth/callback', async (req, res) => {
  const { code } = req.body;
  console.log('Received OAuth2 code:', code);

  if (!code) {
    console.error('No code provided in the request body.');
    return res.status(400).json({ success: false, message: 'No code provided.' });
  }

  try {
    // Exchange Code for Access Token
    console.log('Exchanging code for access token...');
    const tokenResponse = await axios.post(
      'https://discord.com/api/oauth2/token',
      new URLSearchParams({
        client_id: '1297728075340972073', // Use environment variable
        client_secret: 'K0cIXhm1ZweOvtoRqMdOsaUk5DFZFV7f', // Use environment variable
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: 'https://alexg0dev.github.io/quest/', // Use environment variable
        scope: 'identify email'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log('Access token obtained:', tokenResponse.data.access_token);
    const accessToken = tokenResponse.data.access_token;

    // Fetch User Information
    console.log('Fetching user information from Discord...');
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const user = userResponse.data;
    console.log('User data fetched:', user);

    // Prepare User Profile Data
    const profile = {
      id: user.id,
      username: user.username,
      discriminator: user.discriminator, // Include discriminator for uniqueness
      avatar: user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=512`
        : `https://cdn.discordapp.com/embed/avatars/${user.id % 5}.png?size=512`,
      email: user.email || 'No Email Provided'
    };

    console.log('Prepared user profile:', profile);

    // Save Profile to profiles.json
    const savedUser = await saveProfile(profile);

    // Respond with Success and User Data
    res.json({ success: true, user: savedUser });
  } catch (error) {
    if (error.response) {
      console.error('Error during OAuth callback (response):', error.response.data);
      res.status(500).json({ success: false, message: error.response.data });
    } else {
      console.error('Error during OAuth callback (message):', error.message);
      res.status(500).json({ success: false, message: 'An error occurred during the OAuth process.' });
    }
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
