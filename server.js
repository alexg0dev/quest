require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Save profiles to profiles.json
const saveProfile = async (profile) => {
  const filePath = path.join(__dirname, "profiles.json");
  let profiles = [];
  if (await fs.pathExists(filePath)) {
    profiles = JSON.parse(await fs.readFile(filePath, "utf8"));
  }
  profiles.push(profile);
  await fs.writeFile(filePath, JSON.stringify(profiles, null, 2));
};

// OAuth callback
app.get("/oauth/callback", async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).send("No code provided.");
  }

  try {
    // Exchange code for access token
    const tokenResponse = await axios.post(
      "https://discord.com/api/oauth2/token",
      new URLSearchParams({
        client_id: 'process.env.DISCORD_CLIENT_ID',
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.REDIRECT_URI
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const accessToken = tokenResponse.data.access_token;

    // Fetch user info
    const userResponse = await axios.get("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const user = userResponse.data;

    // Save user profile
    await saveProfile({
      id: user.id,
      username: `${user.username}#${user.discriminator}`,
      avatar: user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
        : null
    });

    res.redirect("/success");
  } catch (err) {
    console.error("Error during OAuth callback:", err.response?.data || err);
    res.status(500).send("An error occurred during the OAuth process.");
  }
});

// Serve success page
app.get("/success", (req, res) => {
  res.send("OAuth Success! Your profile has been saved.");
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
