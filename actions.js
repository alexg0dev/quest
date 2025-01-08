// actions.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = 3001; // As per your existing setup

// Middleware
app.use(cors({
  origin: 'https://alexg0dev.github.io',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());

/**
 * Load user profiles from profiles.json
 */
const profilesFilePath = path.join(__dirname, 'profiles.json');
let profiles = [];

const loadProfiles = async () => {
  try {
    await fs.ensureFile(profilesFilePath);
    const data = await fs.readFile(profilesFilePath, 'utf8');
    profiles = data ? JSON.parse(data) : [];
    console.log('Loaded profiles:', profiles);
  } catch (err) {
    console.error('Error loading profiles.json:', err);
    profiles = [];
  }
};

loadProfiles();

/**
 * Middleware to authenticate user
 * Expects user ID in Authorization header as 'Bearer USER_ID'
 */
const authenticateUser = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'No authorization header provided.' });
  }
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ success: false, message: 'Invalid authorization header format.' });
  }
  const userId = parts[1];
  const user = profiles.find(p => p.id === userId);
  if (!user) {
    return res.status(401).json({ success: false, message: 'User not found.' });
  }
  req.user = user;
  next();
};

/**
 * Middleware to check admin role
 */
const checkAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin privileges required.' });
  }
  next();
};

/**
 * Load standings and matches from JSON files or initialize empty arrays
 */
const standingsFilePath = path.join(__dirname, 'standings.json');
const matchesFilePath = path.join(__dirname, 'matches.json');

let standings = [];
let matches = [];

const loadData = async () => {
  try {
    await fs.ensureFile(standingsFilePath);
    const standingsData = await fs.readFile(standingsFilePath, 'utf8');
    standings = standingsData ? JSON.parse(standingsData) : [];
  } catch (err) {
    console.error('Error reading standings.json:', err);
    standings = [];
  }

  try {
    await fs.ensureFile(matchesFilePath);
    const matchesData = await fs.readFile(matchesFilePath, 'utf8');
    matches = matchesData ? JSON.parse(matchesData) : [];
  } catch (err) {
    console.error('Error reading matches.json:', err);
    matches = [];
  }
};

/**
 * Save standings and matches to JSON files
 */
const saveStandings = async () => {
  try {
    await fs.writeFile(standingsFilePath, JSON.stringify(standings, null, 2));
    console.log('Standings saved.');
  } catch (err) {
    console.error('Error saving standings:', err);
  }
};

const saveMatches = async () => {
  try {
    await fs.writeFile(matchesFilePath, JSON.stringify(matches, null, 2));
    console.log('Matches saved.');
  } catch (err) {
    console.error('Error saving matches:', err);
  }
};

/**
 * Initialize data
 */
loadData();

/**
 * GET /api/standings?division=1
 * Returns teams belonging to that division.
 */
app.get('/api/standings', authenticateUser, (req, res) => {
  const division = parseInt(req.query.division, 10);
  if (!division) {
    return res.status(400).json({ success: false, message: 'Division is required.' });
  }
  const filteredStandings = standings.filter((team) => team.division === division);
  res.json({ success: true, standings: filteredStandings });
});

/**
 * POST /api/teams
 * Adds a new team to the specified division. Only admin can perform this.
 */
app.post('/api/teams', authenticateUser, checkAdmin, async (req, res) => {
  const { name, image, division } = req.body;
  if (!name || !image || !division) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  const newTeam = {
    id: Date.now(), // Ensure unique ID
    name,
    image,
    division: parseInt(division, 10),
    matchesPlayed: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
  };

  standings.push(newTeam);
  await saveStandings();
  res.json({ success: true, team: newTeam });
});

/**
 * PUT /api/teams/:id
 * Updates an existing team's name/image. Only admin can perform this.
 */
app.put('/api/teams/:id', authenticateUser, checkAdmin, async (req, res) => {
  const teamId = parseInt(req.params.id, 10);
  const { name, image } = req.body;

  const teamIndex = standings.findIndex((team) => team.id === teamId);
  if (teamIndex === -1) {
    return res.status(404).json({ success: false, message: 'Team not found.' });
  }

  if (name) standings[teamIndex].name = name;
  if (image) standings[teamIndex].image = image;

  await saveStandings();
  res.json({ success: true, team: standings[teamIndex] });
});

/**
 * DELETE /api/teams/:id
 * Removes a team from the standings array. Only admin can perform this.
 */
app.delete('/api/teams/:id', authenticateUser, checkAdmin, async (req, res) => {
  const teamId = parseInt(req.params.id, 10);
  const teamIndex = standings.findIndex((team) => team.id === teamId);
  if (teamIndex === -1) {
    return res.status(404).json({ success: false, message: 'Team not found.' });
  }

  standings.splice(teamIndex, 1);
  await saveStandings();
  res.json({ success: true, message: 'Team deleted successfully.' });
});

/**
 * GET /api/matches
 * Returns all matches
 */
app.get('/api/matches', authenticateUser, (req, res) => {
  res.json({ success: true, matches });
});

/**
 * POST /api/matches
 * Adds a new match object (team1, team2, date). Only admin can perform this.
 */
app.post('/api/matches', authenticateUser, checkAdmin, async (req, res) => {
  const { team1, team2, date } = req.body;
  if (!team1 || !team2 || !date) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }
  const newMatch = {
    id: Date.now(),
    team1,
    team2,
    date,
    result: 'Pending',
  };
  matches.push(newMatch);
  await saveMatches();
  res.json({ success: true, match: newMatch });
});

/**
 * PUT /api/matches/:id
 * Updates the match's result. Only admin can perform this.
 */
app.put('/api/matches/:id', authenticateUser, checkAdmin, async (req, res) => {
  const matchId = parseInt(req.params.id, 10);
  const { result } = req.body;

  const matchIndex = matches.findIndex((match) => match.id === matchId);
  if (matchIndex === -1) {
    return res.status(404).json({ success: false, message: 'Match not found.' });
  }

  matches[matchIndex].result = result;
  await saveMatches();
  res.json({ success: true, match: matches[matchIndex] });
});

/**
 * DELETE /api/matches/:id
 * Removes a match from the matches array. Only admin can perform this.
 */
app.delete('/api/matches/:id', authenticateUser, checkAdmin, async (req, res) => {
  const matchId = parseInt(req.params.id, 10);
  const matchIndex = matches.findIndex((match) => match.id === matchId);
  if (matchIndex === -1) {
    return res.status(404).json({ success: false, message: 'Match not found.' });
  }

  matches.splice(matchIndex, 1);
  await saveMatches();
  res.json({ success: true, message: 'Match deleted successfully.' });
});

/**
 * POST /api/matches/generate
 * Automatically creates a round-robin for a given division. Only admin can perform this.
 */
app.post('/api/matches/generate', authenticateUser, checkAdmin, async (req, res) => {
  const { division } = req.body;
  if (!division) {
    return res.json({ success: false, message: 'Division is required.' });
  }

  const divisionTeams = standings.filter(
    (team) => team.division === parseInt(division, 10)
  );

  if (divisionTeams.length < 2) {
    return res.json({
      success: false,
      message: 'Not enough teams in this division to generate matches.',
    });
  }

  // Clear existing pending matches for the division to avoid duplicates
  matches = matches.filter(match => !(match.division === parseInt(division, 10) && match.result === 'Pending'));

  // Round-robin pairing
  for (let i = 0; i < divisionTeams.length; i++) {
    for (let j = i + 1; j < divisionTeams.length; j++) {
      const match = {
        id: Date.now() + Math.floor(Math.random() * 10000),
        team1: divisionTeams[i].name,
        team2: divisionTeams[j].name,
        date: 'TBD',
        result: 'Pending',
        division: parseInt(division, 10),
      };
      matches.push(match);
    }
  }

  await saveMatches();
  res.json({
    success: true,
    message: `Generated matches for Division ${division}`,
    matchesCreated: matches.filter((m) => m.division === parseInt(division, 10) && m.result === 'Pending'),
  });
});

/**
 * Start the server on PORT (default 3001).
 */
app.listen(PORT, () => {
  console.log(`actions.js backend running on port ${PORT}`);
});
