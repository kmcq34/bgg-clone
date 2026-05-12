const propositionLabels = {
  topRated: { label: 'Highest Rated', icon: '\u2B50', tag: 'Top Pick', tagClass: '' },
  gatewayGames: { label: 'Great for Beginners', icon: '\uD83C\uDF31', tag: 'Easy to Learn', tagClass: '' },
  heavyGames: { label: 'For Strategy Masters', icon: '\uD83C\uDFAF', tag: 'Deep Strategy', tagClass: 'purple' },
  soloGames: { label: 'Perfect for Solo Play', icon: '\uD83E\uDDD8', tag: 'Solo Friendly', tagClass: 'blue' },
  partyGames: { label: 'Game Night Favorites', icon: '\uD83C\uDF89', tag: 'Party Ready', tagClass: 'orange' },
  quickGames: { label: 'Quick Sessions', icon: '\u23F1\uFE0F', tag: 'Under 45min', tagClass: '' },
  hiddenGems: { label: 'Hidden Gems', icon: '\uD83D\uDC8E', tag: 'Underrated', tagClass: 'purple' },
  strategyGames: { label: 'Engine Builders', icon: '\u2699\uFE0F', tag: 'Strategy', tagClass: 'blue' },
  coOpGames: { label: 'Work Together', icon: '\uD83E\uDD1D', tag: 'Cooperative', tagClass: '' },
  basedOnCollection: { label: 'Based on Your Collection', icon: '\uD83D\uDCDA', tag: 'For You', tagClass: '' }
};

let activeCategory = '';
let allCategories = [];

async function loadCategories() {
  try {
    const res = await fetch(`${API_URL}/api/categories`);
    allCategories = await res.json();
    renderCategories();
  } catch (err) {
    console.error('Error loading categories:', err);
  }
}

function renderCategories() {
  const container = document.getElementById('category-chips');
  if (!allCategories.length) return;

  container.innerHTML = `
    <span class="chip active" onclick="filterByCategory('')">All <span class="count">(${allCategories.reduce((sum, c) => sum + c.count, 0)})</span></span>
    ${allCategories.map(cat => `
      <span class="chip" onclick="filterByCategory('${cat.name}')">${cat.name} <span class="count">(${cat.count})</span></span>
    `).join('')}
  `;
}

function filterByCategory(category) {
  activeCategory = category;
  document.querySelectorAll('#category-chips .chip').forEach(chip => {
    chip.classList.remove('active');
    if ((category === '' && chip.textContent.startsWith('All')) || chip.textContent.includes(category)) {
      chip.classList.add('active');
    }
  });
  searchGames();
}

async function searchGames() {
  const query = document.getElementById('search-input').value;
  const sort = document.getElementById('sort-select').value;
  const players = document.getElementById('players-filter').value;
  const complexity = document.getElementById('complexity-filter').value;

  let url = `${API_URL}/api/games?sort=${sort}&limit=100`;
  if (players) url += `&min_players=${players}`;
  if (complexity) url += `&max_complexity=${complexity}`;
  if (activeCategory) url += `&category=${encodeURIComponent(activeCategory)}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    let filtered = data.games;
    if (query) {
      filtered = filtered.filter(g =>
        g.name.toLowerCase().includes(query.toLowerCase()) ||
        g.description?.toLowerCase().includes(query.toLowerCase()) ||
        g.designer?.toLowerCase().includes(query.toLowerCase()) ||
        g.mechanism?.toLowerCase().includes(query.toLowerCase())
      );
    }

    const searchActive = query || activeCategory || players || complexity;

    if (searchActive) {
      renderResults(filtered, data.total);
      hideRecommendations();
    } else {
      document.getElementById('search-results').innerHTML = '';
      loadRecommendations();
    }
  } catch (err) {
    console.error('Error searching:', err);
    document.getElementById('search-results').innerHTML = '<p class="error-message">Search failed. Please try again.</p>';
  }
}

function renderResults(games, total) {
  const container = document.getElementById('search-results');
  if (!games.length) {
    container.innerHTML = `
      <p style="text-align: center; color: var(--text-muted); padding: 2rem;">No games found. Try adjusting your filters.</p>
    `;
    return;
  }

  container.innerHTML = `
    <div class="search-results-header">
      <p style="color: var(--text-muted);">Found <strong>${games.length}</strong> games</p>
    </div>
    <div class="games-grid">
      ${games.map(createGameCard).join('')}
    </div>
  `;
}

function hideRecommendations() {
  document.getElementById('recommendations-container').innerHTML = '';
}

async function loadRecommendations() {
  const userId = currentUser ? currentUser.id : '';
  try {
    const res = await fetch(`${API_URL}/api/recommendations?user_id=${userId}`);
    const propositions = await res.json();
    renderRecommendations(propositions);
  } catch (err) {
    console.error('Error loading recommendations:', err);
  }
}

function renderRecommendations(propositions) {
  const container = document.getElementById('recommendations-container');
  let html = '';

  for (const [key, games] of Object.entries(propositions)) {
    const config = propositionLabels[key];
    if (!config || !games.length) continue;

    html += `
      <div class="proposition-section">
        <div class="proposition-header">
          <h2><span class="icon">${config.icon}</span> ${config.label}</h2>
        </div>
        <div class="proposition-scroll">
          ${games.map(game => `
            <div class="proposition-card">
              <img src="${game.image_url}" alt="${game.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22240%22 height=%22160%22><rect fill=%22%23e0f0ff%22 width=%22240%22 height=%22160%22/><text fill=%22%230078d7%22 x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 font-size=%2214%22>${encodeURIComponent(game.name)}</text></svg>'">
              <div class="proposition-card-content">
                <span class="proposition-tag ${config.tagClass}">${config.tag}</span>
                <h4><a href="/game?id=${game.id}">${game.name}</a></h4>
                <div class="game-rating">
                  ${getRatingBadge(game.avg_rating)}
                  <span style="font-size: 0.8rem; color: var(--text-muted);">${game.total_ratings} ratings</span>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.3rem;">
                  ${game.min_players}-${game.max_players} players \u00B7 ${game.play_time}min
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

const urlParams = new URLSearchParams(window.location.search);
const initialQuery = urlParams.get('q');
if (initialQuery) {
  document.getElementById('search-input').value = initialQuery;
}

loadCategories();

document.getElementById('search-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') searchGames();
});

if (!initialQuery) {
  loadRecommendations();
} else {
  searchGames();
}
