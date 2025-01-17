// server.js
const express = require('express');
const axios = require('axios');
const session = require('express-session');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ======== CONFIGURATION ========

// Replace these with your actual Discord application's credentials
const CLIENT_ID = '1324622665323118642';
const CLIENT_SECRET = 'rkS6P4PE3dd6kw5YwHZ7s0mI6TttelTZ'; // Keep this secret!
const REDIRECT_URI = 'https://alexg0dev.github.io/quest/';

// ======== MIDDLEWARE ========
app.use(express.json());

// Configure CORS to allow requests from your frontend
app.use(cors({
  origin: 'https://alexg0dev.github.io', // Update if your frontend is hosted elsewhere
  credentials: true
}));

// Configure session middleware
app.use(session({
  secret: process.env.SESSION_SECRET, // Use a strong, unique secret
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true, // Set to true if using HTTPS
    httpOnly: true,
    sameSite: 'lax',
  }
}));

// ======== ROUTES ========

// Health Check
app.get('/', (req, res) => {
  res.send('Quest for Glory Backend is running.');
});

// Callback Route - Exchange code for tokens and fetch user info
app.post('/callback', async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'No code provided.' });
  }

  try {
    // Exchange code for access token
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

    const accessToken = tokenResponse.data.access_token;

    // Fetch user information
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const user = userResponse.data;

    // Save user info in session
    req.session.user = {
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
      email: user.email,
      verified: user.verified
    };

    return res.status(200).json({ message: 'Authentication successful.' });
  } catch (error) {
    console.error('Error during OAuth callback:', error.response ? error.response.data : error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// User Info Route - Returns authenticated user's info
app.get('/user', (req, res) => {
  if (req.session.user) {
    return res.json({ user: req.session.user });
  } else {
    return res.status(401).json({ error: 'Not authenticated' });
  }
});

// Logout Route - Destroys user session
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).send('Could not log out.');
    } else {
      res.clearCookie('connect.sid'); // Name depends on session middleware
      return res.redirect('https://alexg0dev.github.io/quest/');
    }
  });
});

// ======== START SERVER ========
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});