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
  hideSuggestions();
}

let suggestTimeout;
function setupLiveSearch() {
  const searchForm = document.querySelector('.search-bar');
  if (!searchForm) return;

  const wrap = document.createElement('div');
  wrap.className = 'search-bar-wrap';
  searchForm.parentNode.insertBefore(wrap, searchForm);
  wrap.appendChild(searchForm);

  const sugg = document.createElement('div');
  sugg.className = 'search-suggestions';
  sugg.id = 'search-suggestions';
  wrap.appendChild(sugg);

  const input = document.getElementById('quick-search-input');
  if (!input) return;

  input.addEventListener('input', () => {
    clearTimeout(suggestTimeout);
    const q = input.value.trim();
    if (q.length < 1) { hideSuggestions(); return; }
    suggestTimeout = setTimeout(() => fetchSuggestions(q), 250);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideSuggestions();
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-bar-wrap')) hideSuggestions();
  });
}

async function fetchSuggestions(query) {
  try {
    const res = await fetch(`${API_URL}/api/games?limit=8&sort=name`);
    const data = await res.json();
    const filtered = data.games.filter(g =>
      g.name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 8);
    renderSuggestions(filtered);
  } catch { hideSuggestions(); }
}

function renderSuggestions(games) {
  const container = document.getElementById('search-suggestions');
  if (!games.length) { hideSuggestions(); return; }
  container.innerHTML = games.map(g => `
    <a href="/game?id=${g.id}" class="search-suggestion-item">
      <div class="suggestion-name">${g.name}</div>
      <div class="suggestion-meta">${g.min_players}-${g.max_players} players &middot; ${g.play_time}min &middot; ${g.category ? g.category.split(',')[0] : ''}</div>
    </a>
  `).join('');
  container.classList.add('open');
}

function hideSuggestions() {
  const container = document.getElementById('search-suggestions');
  if (container) container.classList.remove('open');
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
    <a href="/game?id=${game.id}" class="game-card" style="text-decoration:none;color:inherit;display:block;">
      <img src="${game.image_url}" alt="${game.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22200%22><rect fill=%22%23e0f0ff%22 width=%22300%22 height=%22200%22/><text fill=%22%230078d7%22 x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 font-size=%2216%22>${encodeURIComponent(game.name)}</text></svg>'">
      <div class="game-card-content">
        <h3>${game.name}</h3>
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
    </a>
  `;
}

checkAuth();
updateNav();
setupLiveSearch();
