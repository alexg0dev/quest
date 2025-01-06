// actions.js

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
  });
  
  function initializeApp() {
    initializeAOS();
    setupHamburgerMenu();
    handleOAuthCallback();
    checkExistingLogin();
    setupLogoutModal();
  }
  
  /* ===================================
     AOS Initialization
  =================================== */
  function initializeAOS() {
    AOS.init({ duration: 800, once: true, easing: 'ease-in-out' });
  }
  
  /* ===================================
     Hamburger Menu Setup
  =================================== */
  function setupHamburgerMenu() {
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobile-menu');
  
    hamburger.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('open');
      hamburger.classList.toggle('active');
      hamburger.setAttribute('aria-expanded', isOpen);
      mobileMenu.setAttribute('aria-hidden', !isOpen);
    });
  
    // Close mobile menu on link click
    const mobileLinks = mobileMenu.querySelectorAll('a, button');
    mobileLinks.forEach((link) => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        mobileMenu.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        mobileMenu.setAttribute('aria-hidden', 'true');
      });
    });
  }
  
  /* ===================================
     OAuth Callback Handling
  =================================== */
  function handleOAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const backendURL = 'https://quest-production-5c69.up.railway.app'; // Your backend URL
  
    if (code) {
      exchangeCodeForUser(code, backendURL);
    }
  }
  
  function exchangeCodeForUser(code, backendURL) {
    // Example: we assume your server uses POST /oauth/callback
    // and also has some client secret on the backend side.
    fetch(`${backendURL}/oauth/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success && data.user) {
          displayUserInfo(data.user);
          storeUserData(data.user);
  
          // If the user is the admin:
          if (data.user.id === '756297907170181292') {
            enableAdminFeatures();
          }
  
          removeOAuthCodeFromURL();
  
          // Once logged in, fetch standings and matches
          fetchAndRenderStandings();
          fetchAndRenderMatches();
        } else {
          console.error('Authentication failed:', data.message);
          alert('Login error. Please try again.');
        }
      })
      .catch((error) => {
        console.error('OAuth callback error:', error);
        alert('An error occurred during the login process. Please try again.');
      });
  }
  
  /* ===================================
     User Display & Storage
  =================================== */
  function displayUserInfo(user) {
    const userInfo = document.getElementById('userInfo');
    const userNameSpan = document.getElementById('userName');
    const userProfilePic = document.getElementById('userProfilePic');
    const mobileUserLinks = document.querySelectorAll('.mobileUserLink');
  
    userNameSpan.textContent = user.username;
    userProfilePic.src = user.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png';
    userProfilePic.alt = `${user.username}'s Profile Picture`;
  
    userInfo.classList.remove('hidden');
    mobileUserLinks.forEach((link) => link.classList.remove('hidden'));
  
    // Hide login buttons
    document.querySelectorAll('.auth-buttons').forEach((btn) => btn.classList.add('hidden'));
  }
  
  function storeUserData(user) {
    localStorage.setItem('userProfile', JSON.stringify(user));
  }
  
  function removeOAuthCodeFromURL() {
    const newURL = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, newURL);
  }
  
  function checkExistingLogin() {
    const storedUser = localStorage.getItem('userProfile');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      displayUserInfo(user);
  
      // If user is admin
      if (user.id === '756297907170181292') {
        enableAdminFeatures();
      }
  
      // If logged in, fetch current data
      fetchAndRenderStandings();
      fetchAndRenderMatches();
    }
  }
  
  /* ===================================
     Admin Features
  =================================== */
  function enableAdminFeatures() {
    // Show admin controls section
    const adminControls = document.getElementById('adminControls');
    if (adminControls) {
      adminControls.classList.add('active');
    }
  
    // Show admin columns in standings tables
    document.querySelectorAll('.admin-col').forEach((col) => (col.style.display = 'table-cell'));
  
    // Setup admin forms (e.g. Add Team, Add Match, etc.)
    setupAdminForms();
  }
  
  function setupAdminForms() {
    // Add Team Form
    const addTeamForm = document.getElementById('addTeamForm');
    if (addTeamForm) {
      addTeamForm.addEventListener('submit', handleAddTeam);
    }
  
    // Example: Add Match Form (if you create one in the HTML)
    const addMatchForm = document.getElementById('addMatchForm');
    if (addMatchForm) {
      addMatchForm.addEventListener('submit', handleAddMatch);
    }
  }
  
  function handleAddTeam(e) {
    e.preventDefault();
    const teamName = document.getElementById('teamName').value.trim();
    const teamImage = document.getElementById('teamImage').value.trim();
    const division = document.getElementById('divisionSelect').value;
  
    if (teamName && teamImage && division) {
      fetch('https://quest-production-5c69.up.railway.app/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: teamName, image: teamImage, division }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            alert(`Team "${teamName}" added to Division ${division}!`);
            document.getElementById('addTeamForm').reset();
            fetchAndRenderStandings();
          } else {
            alert(`Error: ${data.message}`);
          }
        })
        .catch((error) => {
          console.error('Error adding team:', error);
          alert('An error occurred while adding the team. Please try again.');
        });
    } else {
      alert('Please fill in all fields.');
    }
  }
  
  /* Example: Add Match Handler */
  function handleAddMatch(e) {
    e.preventDefault();
    const team1 = document.getElementById('matchTeam1').value.trim();
    const team2 = document.getElementById('matchTeam2').value.trim();
    const date = document.getElementById('matchDate').value.trim();
  
    if (team1 && team2 && date) {
      fetch('https://quest-production-5c69.up.railway.app/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team1, team2, date }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            alert('Match created successfully!');
            document.getElementById('addMatchForm').reset();
            fetchAndRenderMatches();
          } else {
            alert(`Error: ${data.message}`);
          }
        })
        .catch((error) => {
          console.error('Error creating match:', error);
          alert('An error occurred while creating the match. Please try again.');
        });
    } else {
      alert('Please fill in all match fields.');
    }
  }
  
  /* ===================================
     Logout Modal
  =================================== */
  function setupLogoutModal() {
    const logoutOption = document.getElementById('logoutOption');
    const logoutModal = document.getElementById('logoutModal');
    const confirmLogout = document.getElementById('confirmLogout');
    const cancelLogout = document.getElementById('cancelLogout');
    const userInfoDiv = document.getElementById('userInfo');
    const mobileUserLinks = document.querySelectorAll('.mobileUserLink');
  
    if (logoutOption && logoutModal && confirmLogout && cancelLogout) {
      logoutOption.addEventListener('click', (e) => {
        e.preventDefault();
        logoutModal.classList.remove('hidden');
      });
  
      confirmLogout.addEventListener('click', () => {
        localStorage.removeItem('userProfile');
        userInfoDiv.classList.add('hidden');
        mobileUserLinks.forEach((link) => link.classList.add('hidden'));
        document.querySelectorAll('.auth-buttons').forEach((btn) => btn.classList.remove('hidden'));
        logoutModal.classList.add('hidden');
      });
  
      cancelLogout.addEventListener('click', () => {
        logoutModal.classList.add('hidden');
      });
    }
  
    const mobileLogoutOption = document.getElementById('mobileLogoutOption');
    if (mobileLogoutOption && logoutModal && confirmLogout && cancelLogout) {
      mobileLogoutOption.addEventListener('click', (e) => {
        e.preventDefault();
        logoutModal.classList.remove('hidden');
  
        // Close the mobile menu
        const hamburger = document.getElementById('hamburger');
        const mobileMenu = document.getElementById('mobile-menu');
        hamburger.classList.remove('active');
        mobileMenu.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        mobileMenu.setAttribute('aria-hidden', 'true');
      });
    }
  }
  
  /* ===================================
     Fetch & Render Standings
  =================================== */
  function fetchAndRenderStandings() {
    const divisions = [1, 2, 3];
  
    divisions.forEach((division) => {
      fetch(`https://quest-production-5c69.up.railway.app/api/standings?division=${division}`)
        .then((response) => response.json())
        .then((data) => {
          if (data.success && data.standings) {
            renderStandingsTable(division, data.standings);
          } else {
            console.error(`Error fetching standings for Division ${division}:`, data.message);
          }
        })
        .catch((error) => {
          console.error(`Error fetching standings for Division ${division}:`, error);
        });
    });
  }
  
  function renderStandingsTable(division, standings) {
    const tbody = document.getElementById(`division${division}Body`);
    if (!tbody) return;
    tbody.innerHTML = '';
  
    standings.forEach((team, index) => {
      const tr = document.createElement('tr');
  
      // Apply custom style for W/D/L columns if needed
      const winClass = team.wins > team.draws && team.wins > team.losses ? 'win' : '';
      const drawClass = team.draws > team.wins && team.draws > team.losses ? 'draw' : '';
      const lossClass = team.losses > team.wins && team.losses > team.draws ? 'loss' : '';
  
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>
          <img
            src="${team.image}"
            alt="${team.name} Logo"
            style="width: 30px; height: 30px; border-radius: 50%; margin-right: 0.5rem;"
          >
          ${team.name}
        </td>
        <td>${team.matchesPlayed}</td>
        <td class="${winClass}">${team.wins}</td>
        <td class="${drawClass}">${team.draws}</td>
        <td class="${lossClass}">${team.losses}</td>
        <td>${team.goalsFor}</td>
        <td>${team.goalsAgainst}</td>
        <td>${team.goalDifference}</td>
        <td>${team.points}</td>
        <td class="admin-col">
          <div class="admin-actions">
            <button class="edit-btn" data-team-id="${team.id}"><i class="fas fa-edit"></i></button>
            <button class="delete-btn" data-team-id="${team.id}"><i class="fas fa-trash-alt"></i></button>
          </div>
        </td>
      `;
  
      tbody.appendChild(tr);
    });
  
    // If admin controls are active, attach button listeners
    const adminControls = document.getElementById('adminControls');
    if (adminControls && adminControls.classList.contains('active')) {
      attachAdminActionListeners(division);
    }
  }
  
  /* ===================================
     Fetch & Render Matches
  =================================== */
  function fetchAndRenderMatches() {
    // Example endpoint: /api/matches
    fetch('https://quest-production-5c69.up.railway.app/api/matches')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.matches) {
          renderMatchesTable(data.matches);
        }
      })
      .catch((error) => {
        console.error('Error fetching matches:', error);
      });
  }
  
  function renderMatchesTable(matches) {
    // Suppose you have a <tbody id="matchesBody"> in your competitions.html
    const matchesBody = document.getElementById('matchesBody');
    if (!matchesBody) return;
    matchesBody.innerHTML = '';
  
    matches.forEach((match) => {
      const tr = document.createElement('tr');
      // match.result can store something like "3-1" or "Pending"
      tr.innerHTML = `
        <td>${match.team1}</td>
        <td>${match.team2}</td>
        <td>${match.date}</td>
        <td>${match.result || 'Pending'}</td>
        <td class="admin-col">
          <button class="edit-match-btn" data-match-id="${match.id}"><i class="fas fa-edit"></i></button>
        </td>
      `;
      matchesBody.appendChild(tr);
    });
  
    // If admin, attach match-editing handlers here.
    const adminControls = document.getElementById('adminControls');
    if (adminControls && adminControls.classList.contains('active')) {
      attachMatchEditListeners();
    }
  }
  
  function attachMatchEditListeners() {
    const editMatchBtns = document.querySelectorAll('.edit-match-btn');
    editMatchBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const matchId = btn.getAttribute('data-match-id');
        editMatchResult(matchId);
      });
    });
  }
  
  function editMatchResult(matchId) {
    const newResult = prompt('Enter new match result (e.g., 3-1):', '');
    if (newResult) {
      // PUT to /api/matches/:id
      fetch(`https://quest-production-5c69.up.railway.app/api/matches/${matchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result: newResult }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            alert('Match result updated!');
            fetchAndRenderMatches();
          } else {
            alert(`Error: ${data.message}`);
          }
        })
        .catch((error) => {
          console.error('Error updating match result:', error);
          alert('An error occurred while updating the match result. Please try again.');
        });
    }
  }
  
  /* ===================================
     Admin-Action Listeners (Teams)
  =================================== */
  function attachAdminActionListeners(division) {
    const editButtons = document.querySelectorAll(`#division${division}Body .edit-btn`);
    const deleteButtons = document.querySelectorAll(`#division${division}Body .delete-btn`);
  
    editButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const teamId = button.getAttribute('data-team-id');
        editTeam(division, teamId);
      });
    });
  
    deleteButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const teamId = button.getAttribute('data-team-id');
        deleteTeam(division, teamId);
      });
    });
  }
  
  function editTeam(division, teamId) {
    fetch(`https://quest-production-5c69.up.railway.app/api/teams/${teamId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.team) {
          const newName = prompt('Enter new team name:', data.team.name);
          const newImage = prompt('Enter new team image URL:', data.team.image);
  
          if (newName && newImage) {
            fetch(`https://quest-production-5c69.up.railway.app/api/teams/${teamId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: newName, image: newImage }),
            })
              .then((res) => res.json())
              .then((updateData) => {
                if (updateData.success) {
                  alert(`Team "${newName}" updated successfully!`);
                  fetchAndRenderStandings();
                } else {
                  alert(`Error: ${updateData.message}`);
                }
              })
              .catch((error) => {
                console.error('Error updating team:', error);
                alert('An error occurred while updating the team. Please try again.');
              });
          }
        } else {
          console.error('Error fetching team details:', data.message);
        }
      })
      .catch((error) => {
        console.error('Error fetching team details:', error);
      });
  }
  
  function deleteTeam(division, teamId) {
    if (confirm('Are you sure you want to delete this team?')) {
      fetch(`https://quest-production-5c69.up.railway.app/api/teams/${teamId}`, {
        method: 'DELETE',
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            alert('Team deleted successfully!');
            fetchAndRenderStandings();
          } else {
            alert(`Error: ${data.message}`);
          }
        })
        .catch((error) => {
          console.error('Error deleting team:', error);
          alert('An error occurred while deleting the team. Please try again.');
        });
    }
  }
  