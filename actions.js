const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Dummy storage for standings, matches, and users
let standings = [];
let matches = [];
let users = {};

// API endpoint to fetch standings
app.get('/api/standings', (req, res) => {
  const division = parseInt(req.query.division, 10);
  if (!division) {
    return res.status(400).json({ success: false, message: 'Division is required.' });
  }
  const filteredStandings = standings.filter((team) => team.division === division);
  res.json({ success: true, standings: filteredStandings });
});

// Add a team to standings
app.post('/api/teams', (req, res) => {
  const { name, image, division } = req.body;
  if (!name || !image || !division) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }
  const newTeam = { id: Date.now(), name, image, division: parseInt(division, 10) };
  standings.push(newTeam);
  res.json({ success: true, team: newTeam });
});

// Update team details
app.put('/api/teams/:id', (req, res) => {
  const teamId = parseInt(req.params.id, 10);
  const { name, image } = req.body;

  const teamIndex = standings.findIndex((team) => team.id === teamId);
  if (teamIndex === -1) {
    return res.status(404).json({ success: false, message: 'Team not found.' });
  }

  standings[teamIndex] = { ...standings[teamIndex], name, image };
  res.json({ success: true, team: standings[teamIndex] });
});

// Delete a team from standings
app.delete('/api/teams/:id', (req, res) => {
  const teamId = parseInt(req.params.id, 10);
  standings = standings.filter((team) => team.id !== teamId);
  res.json({ success: true, message: 'Team deleted successfully.' });
});

// OAuth callback handling for login
app.post('/oauth/callback', (req, res) => {
  const { code } = req.body;

  // Mock user authentication
  if (code) {
    const user = { id: '756297907170181292', username: 'AdminUser', avatar: '' };
    users[user.id] = user;
    res.json({ success: true, user });
  } else {
    res.status(400).json({ success: false, message: 'Invalid authorization code.' });
  }
});

// Fetch all matches
app.get('/api/matches', (req, res) => {
  res.json({ success: true, matches });
});

// Add a match
app.post('/api/matches', (req, res) => {
  const { team1, team2, date } = req.body;
  if (!team1 || !team2 || !date) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }
  const newMatch = { id: Date.now(), team1, team2, date, result: 'Pending' };
  matches.push(newMatch);
  res.json({ success: true, match: newMatch });
});

// Update match result
app.put('/api/matches/:id', (req, res) => {
  const matchId = parseInt(req.params.id, 10);
  const { result } = req.body;

  const matchIndex = matches.findIndex((match) => match.id === matchId);
  if (matchIndex === -1) {
    return res.status(404).json({ success: false, message: 'Match not found.' });
  }

  matches[matchIndex].result = result;
  res.json({ success: true, match: matches[matchIndex] });
});

// Delete a match
app.delete('/api/matches/:id', (req, res) => {
  const matchId = parseInt(req.params.id, 10);
  matches = matches.filter((match) => match.id !== matchId);
  res.json({ success: true, message: 'Match deleted successfully.' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Actions.js backend running on port ${PORT}`);
});
