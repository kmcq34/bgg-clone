const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get('id');
let selectedRating = 0;

async function loadGame() {
  if (!gameId) {
    window.location.href = '/';
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/games/${gameId}`);
    const data = await response.json();
    renderGame(data);
  } catch (err) {
    console.error('Error loading game:', err);
    document.getElementById('game-detail').innerHTML = '<p class="error-message">Failed to load game.</p>';
  }
}

function renderGame(data) {
  const { game, reviews, relatedGames } = data;
  document.title = `${game.name} - BoardGameGeek Clone`;

  document.getElementById('game-detail').innerHTML = `
    <div class="game-image">
      <img src="${game.image_url}" alt="${game.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22400%22><rect fill=%22%231a1a2e%22 width=%22300%22 height=%22400%22/><text fill=%22%23ff9900%22 x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22>${encodeURIComponent(game.name)}</text></svg>'">
    </div>
    <div class="game-info">
      <h1>${game.name}</h1>
      <div class="game-rating" style="margin-bottom: 1rem;">
        ${getRatingBadge(game.avg_rating)}
        <span>${game.total_ratings} ratings</span>
      </div>
      <p class="game-description">${game.description}</p>
      <div class="game-details-grid">
        <div class="detail-item">
          <label>Players</label>
          <value>${game.min_players}-${game.max_players}</value>
        </div>
        <div class="detail-item">
          <label>Play Time</label>
          <value>${game.play_time} min</value>
        </div>
        <div class="detail-item">
          <label>Min Age</label>
          <value>${game.min_age}+</value>
        </div>
        <div class="detail-item">
          <label>Complexity</label>
          <value>${game.complexity}/5</value>
        </div>
        <div class="detail-item">
          <label>Year</label>
          <value>${game.year_published}</value>
        </div>
        <div class="detail-item">
          <label>Designer</label>
          <value>${game.designer}</value>
        </div>
      </div>
      <div style="margin-bottom: 1rem;">
        <strong>Publisher:</strong> ${game.publisher}<br>
        <strong>Category:</strong> ${game.category}<br>
        <strong>Mechanisms:</strong> ${game.mechanism}
      </div>
      <div class="collection-status" id="collection-status" style="display: ${currentUser ? 'flex' : 'none'};">
        <button class="status-btn" onclick="updateCollection('own')">Own</button>
        <button class="status-btn" onclick="updateCollection('played')">Played</button>
        <button class="status-btn" onclick="updateCollection('want_to_play')">Want to Play</button>
        <button class="status-btn" onclick="updateCollection('want_to_buy')">Want to Buy</button>
      </div>
    </div>
  `;

  if (currentUser) {
    document.getElementById('rating-section').style.display = 'block';
    const ratingButtons = document.getElementById('rating-buttons');
    ratingButtons.innerHTML = Array.from({length: 10}, (_, i) => i + 1).map(n => 
      `<button onclick="selectRating(${n})">${n}</button>`
    ).join('');
    loadUserRating(gameId, currentUser.id);
  }

  document.getElementById('reviews').innerHTML = reviews.length ? 
    reviews.map(r => `
      <div class="review-item">
        <div class="review-header">
          <span class="review-author">${r.username}</span>
          <span class="review-date">${new Date(r.created_at).toLocaleDateString()}</span>
        </div>
        <span class="review-rating">${r.rating}/10</span>
        <p>${r.comment || 'No comment.'}</p>
      </div>
    `).join('') : 
    '<p>No reviews yet. Be the first to review!</p>';

  if (relatedGames && relatedGames.length) {
    document.getElementById('related-games').innerHTML = relatedGames.map(g => `
      <a href="/game?id=${g.id}" class="related-game-card" style="text-decoration:none;color:inherit;display:block;">
        <img src="${g.image_url}" alt="${g.name}" onerror="this.style.display='none'">
        <span style="display:block;padding:0.6rem;text-align:center;font-size:0.85rem;font-weight:600;">${g.name}</span>
      </a>
    `).join('');
  }
}

function selectRating(rating) {
  selectedRating = rating;
  document.querySelectorAll('#rating-buttons button').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.textContent) === rating);
  });
}

async function loadUserRating(gameId, userId) {
  try {
    const response = await fetch(`${API_URL}/api/games/${gameId}`);
    const data = await response.json();
    const userReview = data.reviews.find(r => r.user_id === userId);
    if (userReview) {
      selectRating(userReview.rating);
      document.getElementById('review-comment').value = userReview.comment || '';
    }
  } catch (err) {
    console.error('Error loading user rating:', err);
  }
}

async function submitReview() {
  if (!selectedRating) {
    alert('Please select a rating.');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game_id: gameId,
        user_id: currentUser.id,
        rating: selectedRating,
        comment: document.getElementById('review-comment').value
      })
    });

    if (response.ok) {
      loadGame();
    }
  } catch (err) {
    alert('Failed to submit review.');
  }
}

async function updateCollection(status) {
  if (!currentUser) return;

  try {
    await fetch(`${API_URL}/api/collection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: currentUser.id,
        game_id: gameId,
        status: status
      })
    });

    document.querySelectorAll('#collection-status .status-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    event.target.classList.add('active');
  } catch (err) {
    alert('Failed to update collection.');
  }
}

loadGame();
