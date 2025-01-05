// server.js

// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const mongoose = require('mongoose');
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

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1); // Exit process with failure
});

// Define User Schema
const userSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  username: String,
  discriminator: String,
  avatar: String,
  email: String
});

const User = mongoose.model('User', userSchema);

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

    // Save Profile to MongoDB
    try {
      const existingUser = await User.findOne({ id: profile.id });
      if (existingUser) {
        console.log(`User with ID ${profile.id} already exists.`);
        return res.json({ success: true, user: existingUser });
      }

      const newUser = new User(profile);
      await newUser.save();
      console.log(`User ${profile.username}#${profile.discriminator} saved to MongoDB.`);

      // Respond with Success and User Data
      res.json({ success: true, user: newUser });
    } catch (dbError) {
      console.error('Error saving user to MongoDB:', dbError);
      res.status(500).json({ success: false, message: 'Error saving user data.' });
    }
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
