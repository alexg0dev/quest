// server.js

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 8080;

// ======== CONFIGURATION ========

// Hard-coded configuration variables
const CLIENT_ID = '1324622665323118642';
const CLIENT_SECRET = 'rkS6P4PE3dd6kw5YwHZ7s0mI6TttelTZ'; // Your actual Discord Client Secret
const REDIRECT_URI = 'https://alexg0dev.github.io/quest/';

// Path to profiles.json
const profilesPath = path.join(__dirname, 'profiles.json');

// ======== MIDDLEWARE ========
app.use(express.json());

// Configure CORS to allow requests from your frontend
app.use(cors({
  origin: 'https://alexg0dev.github.io', // Update if your frontend is hosted elsewhere
  credentials: true
}));

// ======== ROUTES ========

// Health Check
app.get('/', (req, res) => {
  console.log('Health check accessed.');
  res.send('Quest for Glory Backend is running.');
});

// Callback Route - Exchange code for tokens and fetch user info
app.post('/callback', async (req, res) => {
  const { code } = req.body;
  console.log('Received /callback with code:', code);

  if (!code) {
    console.log('No code provided in /callback.');
    return res.status(400).json({ error: 'No code provided.' });
  }

  try {
    // Exchange code for access token
    console.log('Exchanging code for access token...');
    const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI,
      scope: 'identify email'
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('Access token received:', tokenResponse.data.access_token);
    const accessToken = tokenResponse.data.access_token;

    // Fetch user information
    console.log('Fetching user information...');
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const user = userResponse.data;
    console.log('User information fetched:', user);

    // Read existing profiles
    console.log('Reading existing profiles...');
    let profiles = [];
    if (fs.existsSync(profilesPath)) {
      const data = fs.readFileSync(profilesPath, 'utf8');
      profiles = JSON.parse(data);
      console.log('Existing profiles loaded.');
    } else {
      console.log('profiles.json does not exist. Creating a new one.');
    }

    // Check if user already exists
    const existingUserIndex = profiles.findIndex(u => u.id === user.id);
    if (existingUserIndex !== -1) {
      // Update existing user
      console.log(`Updating existing user with ID: ${user.id}`);
      profiles[existingUserIndex] = {
        id: user.id,
        username: user.username,
        discriminator: user.discriminator,
        avatar: user.avatar,
        email: user.email,
        verified: user.verified
      };
    } else {
      // Add new user
      console.log(`Adding new user with ID: ${user.id}`);
      profiles.push({
        id: user.id,
        username: user.username,
        discriminator: user.discriminator,
        avatar: user.avatar,
        email: user.email,
        verified: user.verified
      });
    }

    // Write back to profiles.json
    console.log('Writing back to profiles.json...');
    fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 2));
    console.log('profiles.json updated.');

    return res.status(200).json({ message: 'Authentication successful.', user: user });
  } catch (error) {
    console.error('Error during OAuth callback:', error.response ? error.response.data : error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// User Info Route - Returns authenticated user's info
// Since there's no session or token, require user ID as a URL parameter
app.get('/user/:id', (req, res) => {
  const userId = req.params.id;
  console.log(`Received /user/${userId} request.`);

  if (!userId) {
    console.log('No user ID provided in /user/:id.');
    return res.status(400).json({ error: 'No user ID provided.' });
  }

  // Read profiles
  console.log('Reading profiles.json...');
  if (!fs.existsSync(profilesPath)) {
    console.log('profiles.json does not exist.');
    return res.status(404).json({ error: 'No profiles found.' });
  }

  const data = fs.readFileSync(profilesPath, 'utf8');
  const profiles = JSON.parse(data);
  console.log('profiles.json loaded.');

  const user = profiles.find(u => u.id === userId);

  if (!user) {
    console.log(`User with ID ${userId} not found.`);
    return res.status(404).json({ error: 'User not found.' });
  }

  console.log(`User with ID ${userId} found. Sending response.`);
  return res.json({ user });
});

// Logout Route - Since there's no session or token, inform the client to handle logout
app.post('/logout', (req, res) => {
  console.log('Received /logout request.');
  // Inform the client to handle logout (e.g., delete token on the client side)
  return res.status(200).json({ message: 'Logout successful. Please handle logout on the client side.' });
});

// ======== START SERVER ========
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// ======== ERROR HANDLING ========
// Catch unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Catch uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
  process.exit(1); // Exit to let the container restart the server
});
