/***************************************************************
 * actions.js — A Node/Express-based backend for competitions.
 * Run it by `node actions.js`.
 ***************************************************************/
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
// You can change the port or keep it as 3001
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// In-memory arrays/objects for demonstration
// In a real production app, you'd use a database (Mongo, Postgres, etc.)
let standings = [];
let matches = [];
let users = {}; // e.g. { "756297907170181292": {id, username, avatar} }

/***************************************************************
 * GET /api/standings?division=1
 * Returns teams belonging to that division.
 ***************************************************************/
app.get('/api/standings', (req, res) => {
  const division = parseInt(req.query.division, 10);
  if (!division) {
    return res
      .status(400)
      .json({ success: false, message: 'Division is required.' });
  }
  const filteredStandings = standings.filter((team) => team.division === division);
  res.json({ success: true, standings: filteredStandings });
});

/***************************************************************
 * POST /api/teams
 * Adds a new team to the specified division.
 ***************************************************************/
app.post('/api/teams', (req, res) => {
  const { name, image, division } = req.body;
  if (!name || !image || !division) {
    return res
      .status(400)
      .json({ success: false, message: 'All fields are required.' });
  }

  const newTeam = {
    id: Date.now(), // or use a proper unique ID generator
    name,
    image,
    division: parseInt(division, 10),
    // Optionally track stats:
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
  res.json({ success: true, team: newTeam });
});

/***************************************************************
 * PUT /api/teams/:id
 * Updates an existing team's name/image.
 ***************************************************************/
app.put('/api/teams/:id', (req, res) => {
  const teamId = parseInt(req.params.id, 10);
  const { name, image } = req.body;

  const teamIndex = standings.findIndex((team) => team.id === teamId);
  if (teamIndex === -1) {
    return res.status(404).json({ success: false, message: 'Team not found.' });
  }

  // Update only the fields provided
  if (name) standings[teamIndex].name = name;
  if (image) standings[teamIndex].image = image;

  res.json({ success: true, team: standings[teamIndex] });
});

/***************************************************************
 * DELETE /api/teams/:id
 * Removes a team from the standings array.
 ***************************************************************/
app.delete('/api/teams/:id', (req, res) => {
  const teamId = parseInt(req.params.id, 10);
  standings = standings.filter((team) => team.id !== teamId);
  res.json({ success: true, message: 'Team deleted successfully.' });
});

/***************************************************************
 * POST /oauth/callback
 * Mock "login" route (like a Discord OAuth exchange).
 * If code is present, we "create" an admin user with ID 756297907170181292.
 ***************************************************************/
app.post('/oauth/callback', (req, res) => {
  const { code } = req.body;

  // Mock user authentication
  if (code) {
    // For demonstration, we pretend the user is admin
    const user = {
      id: '756297907170181292',
      username: 'AdminUser',
      avatar: '',
    };
    users[user.id] = user;
    return res.json({ success: true, user });
  } else {
    return res
      .status(400)
      .json({ success: false, message: 'Invalid authorization code.' });
  }
});

/***************************************************************
 * GET /api/matches
 * Returns all matches
 ***************************************************************/
app.get('/api/matches', (req, res) => {
  res.json({ success: true, matches });
});

/***************************************************************
 * POST /api/matches
 * Adds a new match object (team1, team2, date).
 ***************************************************************/
app.post('/api/matches', (req, res) => {
  const { team1, team2, date } = req.body;
  if (!team1 || !team2 || !date) {
    return res
      .status(400)
      .json({ success: false, message: 'All fields are required.' });
  }
  const newMatch = {
    id: Date.now(),
    team1,
    team2,
    date,
    result: 'Pending', // or null, etc.
  };
  matches.push(newMatch);
  res.json({ success: true, match: newMatch });
});

/***************************************************************
 * PUT /api/matches/:id
 * Updates the match's result.
 ***************************************************************/
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

/***************************************************************
 * DELETE /api/matches/:id
 * Removes a match from the matches array.
 ***************************************************************/
app.delete('/api/matches/:id', (req, res) => {
  const matchId = parseInt(req.params.id, 10);
  matches = matches.filter((match) => match.id !== matchId);
  res.json({ success: true, message: 'Match deleted successfully.' });
});

/***************************************************************
 * Additional: Example "Generate Matches" endpoint
 * This could automatically create a round-robin for a given division
 ***************************************************************/
app.post('/api/matches/generate', (req, res) => {
  const { division } = req.body;
  if (!division) {
    return res.json({ success: false, message: 'Division is required.' });
  }
  // Grab all teams in that division:
  const divisionTeams = standings.filter(
    (team) => team.division === parseInt(division, 10)
  );

  if (divisionTeams.length < 2) {
    return res.json({
      success: false,
      message: 'Not enough teams in this division to generate matches.',
    });
  }

  // Example: Round-robin pairing for demonstration
  for (let i = 0; i < divisionTeams.length; i++) {
    for (let j = i + 1; j < divisionTeams.length; j++) {
      const match = {
        id: Date.now() + Math.floor(Math.random() * 10000), 
        team1: divisionTeams[i].name,
        team2: divisionTeams[j].name,
        date: 'TBD', 
        result: 'Pending',
      };
      matches.push(match);
    }
  }

  res.json({
    success: true,
    message: `Generated matches for Division ${division}`,
    matchesCreated: matches.filter((m) => m.result === 'Pending'),
  });
});

/***************************************************************
 * Start the server on PORT (default 3001).
 ***************************************************************/
app.listen(PORT, () => {
  console.log(`actions.js backend running on port ${PORT}`);
});
