const API_URL = '';

let currentUser = null;

function checkAuth() {
  const user = localStorage.getItem('bgg_user');
  if (user) {
    currentUser = JSON.parse(user);
  }
  return currentUser;
}

function updateNav() {
  const loginNav = document.getElementById('nav-login');
  const userNav = document.getElementById('nav-user');
  const logoutNav = document.getElementById('nav-logout');
  const usernameLink = document.getElementById('username-link');

  if (currentUser) {
    if (loginNav) loginNav.style.display = 'none';
    if (userNav) {
      userNav.style.display = 'block';
      usernameLink.textContent = currentUser.username;
    }
    if (logoutNav) logoutNav.style.display = 'block';
  } else {
    if (loginNav) loginNav.style.display = 'block';
    if (userNav) userNav.style.display = 'none';
    if (logoutNav) logoutNav.style.display = 'none';
  }
}

function logout() {
  localStorage.removeItem('bgg_user');
  currentUser = null;
  updateNav();
  window.location.href = '/';
}

function quickSearch(event) {
  event.preventDefault();
  const query = document.getElementById('quick-search-input').value;
  if (query) {
    window.location.href = `/search?q=${encodeURIComponent(query)}`;
  }
}

function formatRating(rating) {
  return rating ? rating.toFixed(2) : 'N/A';
}

function getRatingBadge(rating) {
  const color = rating >= 8 
    ? 'linear-gradient(180deg, #88e066 0%, #3da35d 100%)' 
    : rating >= 6 
      ? 'linear-gradient(180deg, #ffb347 0%, #ff9900 100%)' 
      : 'linear-gradient(180deg, #ff8a8a 0%, #dc3545 100%)';
  return `<span class="rating-badge" style="background: ${color};">${formatRating(rating)}</span>`;
}

function createGameCard(game) {
  return `
    <div class="game-card">
      <img src="${game.image_url}" alt="${game.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22200%22><rect fill=%22%231a1a2e%22 width=%22300%22 height=%22200%22/><text fill=%22%23ff9900%22 x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22>${encodeURIComponent(game.name)}</text></svg>'">
      <div class="game-card-content">
        <h3><a href="/game?id=${game.id}">${game.name}</a></h3>
        <div class="game-meta">
          <span>${game.min_players}-${game.max_players} players</span>
          <span>${game.play_time} min</span>
        </div>
        <div class="game-rating">
          ${getRatingBadge(game.avg_rating)}
          <span class="tag">${game.total_ratings} ratings</span>
        </div>
        <div class="game-tags">
          ${game.category ? game.category.split(',').slice(0, 3).map(c => `<span class="tag">${c.trim()}</span>`).join('') : ''}
        </div>
      </div>
    </div>
  `;
}

checkAuth();
updateNav();
