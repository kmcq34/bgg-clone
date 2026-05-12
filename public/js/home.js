async function loadGames(sort, containerId) {
  try {
    const response = await fetch(`${API_URL}/api/games?sort=${sort}&limit=8`);
    const data = await response.json();
    const container = document.getElementById(containerId);
    container.innerHTML = data.games.map(createGameCard).join('');

    if (containerId === 'top-games' && data.total) {
      updateStats(data.total);
    }
  } catch (err) {
    console.error('Error loading games:', err);
  }
}

async function updateStats(total) {
  try {
    const response = await fetch(`${API_URL}/api/games?limit=1`);
    const data = await response.json();
    document.getElementById('total-games').textContent = data.total;

    const reviewsRes = await fetch(`${API_URL}/api/games?limit=50`);
    const reviewsData = await reviewsRes.json();

    let totalReviews = 0;
    let totalRating = 0;
    reviewsData.games.forEach(g => {
      totalReviews += g.total_ratings;
      totalRating += g.avg_rating * g.total_ratings;
    });

    document.getElementById('total-reviews').textContent = totalReviews;
    document.getElementById('avg-rating').textContent = totalReviews > 0 ? (totalRating / totalReviews).toFixed(1) : 'N/A';
  } catch (err) {
    console.error('Error updating stats:', err);
  }
}

loadGames('avg_rating', 'top-games');
loadGames('hot', 'hot-games');
loadGames('year_published', 'recent-games');
