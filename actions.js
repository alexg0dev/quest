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
  
  function initializeAOS() {
    AOS.init({ duration: 800, once: true, easing: 'ease-in-out' });
  }
  
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
    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        mobileMenu.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        mobileMenu.setAttribute('aria-hidden', 'true');
      });
    });
  }
  
  function handleOAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const backendURL = 'https://quest-production-5c69.up.railway.app'; // Replace with your backend URL
  
    if (code) {
      exchangeCodeForUser(code, backendURL);
    }
  }
  
  function exchangeCodeForUser(code, backendURL) {
    fetch(`${backendURL}/oauth/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.success && data.user) {
          displayUserInfo(data.user);
          storeUserData(data.user);
          if (data.user.id === '756297907170181292') {
            enableAdminFeatures();
          }
          removeOAuthCodeFromURL();
          fetchAndRenderStandings();
        } else {
          console.error('Authentication failed:', data.message);
          alert('Login error. Please try again.');
        }
      })
      .catch(error => {
        console.error('OAuth callback error:', error);
        alert('An error occurred during the login process. Please try again.');
      });
  }
  
  function displayUserInfo(user) {
    const userInfo = document.getElementById('userInfo');
    const userNameSpan = document.getElementById('userName');
    const userProfilePic = document.getElementById('userProfilePic');
    const mobileUserLinks = document.querySelectorAll('.mobileUserLink');
  
    userNameSpan.textContent = user.username;
    userProfilePic.src = user.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png';
    userProfilePic.alt = `${user.username}'s Profile Picture`;
  
    userInfo.classList.remove('hidden');
    mobileUserLinks.forEach(link => link.classList.remove('hidden'));
  
    // Hide auth buttons
    document.querySelectorAll('.auth-buttons').forEach(btn => btn.classList.add('hidden'));
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
      if (user.id === '756297907170181292') {
        enableAdminFeatures();
      }
      fetchAndRenderStandings();
    }
  }
  
  function enableAdminFeatures() {
    // Show admin controls
    const adminControls = document.getElementById('adminControls');
    if (adminControls) {
      adminControls.classList.add('active');
    }
  
    // Show admin columns in standings tables
    document.querySelectorAll('.admin-col').forEach(col => col.style.display = 'table-cell');
  
    // Setup admin form submissions
    setupAdminForms();
  }
  
  function setupAdminForms() {
    const addTeamForm = document.getElementById('addTeamForm');
    if (addTeamForm) {
      addTeamForm.addEventListener('submit', handleAddTeam);
    }
  
    // Additional admin forms (e.g., addMatchForm) can be initialized here
  }
  
  function handleAddTeam(e) {
    e.preventDefault();
    const teamName = document.getElementById('teamName').value.trim();
    const teamImage = document.getElementById('teamImage').value.trim();
    const division = document.getElementById('divisionSelect').value;
  
    if (teamName && teamImage && division) {
      // Send data to backend to add the team
      fetch('https://quest-production-5c69.up.railway.app/api/teams', { // Replace with your API endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: teamName, image: teamImage, division: division }),
      })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            alert(`Team "${teamName}" added to Division ${division}!`);
            // Clear form
            document.getElementById('addTeamForm').reset();
            // Refresh standings
            fetchAndRenderStandings();
          } else {
            alert(`Error: ${data.message}`);
          }
        })
        .catch(error => {
          console.error('Error adding team:', error);
          alert('An error occurred while adding the team. Please try again.');
        });
    } else {
      alert('Please fill in all fields.');
    }
  }
  
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
        // Clear data
        localStorage.removeItem('userProfile');
        userInfoDiv.classList.add('hidden');
        mobileUserLinks.forEach(link => link.classList.add('hidden')); // Hide in mobile
        document.querySelectorAll('.auth-buttons').forEach(btn => btn.classList.remove('hidden'));
  
        logoutModal.classList.add('hidden');
      });
  
      cancelLogout.addEventListener('click', () => {
        logoutModal.classList.add('hidden');
      });
    }
  
    // MOBILE LOGOUT (uses same modal)
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
  
  function fetchAndRenderStandings() {
    const divisions = [1, 2, 3];
    divisions.forEach(division => {
      fetch(`https://quest-production-5c69.up.railway.app/api/standings?division=${division}`) // Replace with your API endpoint
        .then(response => response.json())
        .then(data => {
          if (data.success && data.standings) {
            renderStandingsTable(division, data.standings);
          } else {
            console.error(`Error fetching standings for Division ${division}:`, data.message);
          }
        })
        .catch(error => {
          console.error(`Error fetching standings for Division ${division}:`, error);
        });
    });
  }
  
  function renderStandingsTable(division, standings) {
    const tbody = document.getElementById(`division${division}Body`);
    tbody.innerHTML = ''; // Clear existing rows
  
    standings.forEach((team, index) => {
      const tr = document.createElement('tr');
  
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>
          <img src="${team.image}" alt="${team.name} Logo" style="width: 30px; height: 30px; border-radius: 50%; margin-right: 0.5rem;">
          ${team.name}
        </td>
        <td>${team.matchesPlayed}</td>
        <td class="${team.wins > team.draws && team.wins > team.losses ? 'win' : ''}">${team.wins}</td>
        <td class="${team.draws > team.wins && team.draws > team.losses ? 'draw' : ''}">${team.draws}</td>
        <td class="${team.losses > team.wins && team.losses > team.draws ? 'loss' : ''}">${team.losses}</td>
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
  
    // Attach event listeners to edit and delete buttons if admin is active
    if (!document.getElementById('adminControls').classList.contains('hidden')) {
      attachAdminActionListeners(division);
    }
  }
  
  function attachAdminActionListeners(division) {
    const editButtons = document.querySelectorAll(`#division${division}Body .edit-btn`);
    const deleteButtons = document.querySelectorAll(`#division${division}Body .delete-btn`);
  
    editButtons.forEach(button => {
      button.addEventListener('click', () => {
        const teamId = button.getAttribute('data-team-id');
        editTeam(division, teamId);
      });
    });
  
    deleteButtons.forEach(button => {
      button.addEventListener('click', () => {
        const teamId = button.getAttribute('data-team-id');
        deleteTeam(division, teamId);
      });
    });
  }
  
  function editTeam(division, teamId) {
    // Fetch team details
    fetch(`https://quest-production-5c69.up.railway.app/api/teams/${teamId}`) // Replace with your API endpoint
      .then(response => response.json())
      .then(data => {
        if (data.success && data.team) {
          // Populate a modal or form with team details for editing
          // For simplicity, using prompt dialogs
          const newName = prompt('Enter new team name:', data.team.name);
          const newImage = prompt('Enter new team image URL:', data.team.image);
  
          if (newName && newImage) {
            // Send update to backend
            fetch(`https://quest-production-5c69.up.railway.app/api/teams/${teamId}`, { // Replace with your API endpoint
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: newName, image: newImage }),
            })
              .then(response => response.json())
              .then(updateData => {
                if (updateData.success) {
                  alert(`Team "${newName}" updated successfully!`);
                  fetchAndRenderStandings();
                } else {
                  alert(`Error: ${updateData.message}`);
                }
              })
              .catch(error => {
                console.error('Error updating team:', error);
                alert('An error occurred while updating the team. Please try again.');
              });
          }
        } else {
          console.error('Error fetching team details:', data.message);
        }
      })
      .catch(error => {
        console.error('Error fetching team details:', error);
      });
  }
  
  function deleteTeam(division, teamId) {
    if (confirm('Are you sure you want to delete this team?')) {
      fetch(`https://quest-production-5c69.up.railway.app/api/teams/${teamId}`, { // Replace with your API endpoint
        method: 'DELETE',
      })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            alert('Team deleted successfully!');
            fetchAndRenderStandings();
          } else {
            alert(`Error: ${data.message}`);
          }
        })
        .catch(error => {
          console.error('Error deleting team:', error);
          alert('An error occurred while deleting the team. Please try again.');
        });
    }
  }
  