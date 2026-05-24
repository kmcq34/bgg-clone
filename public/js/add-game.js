async function addGame(event) {
  event.preventDefault();

  const messageEl = document.getElementById('form-message');
  messageEl.style.display = 'none';

  const payload = {
    name: document.getElementById('game-name').value.trim(),
    description: document.getElementById('game-description').value.trim(),
    min_players: document.getElementById('game-min-players').value,
    max_players: document.getElementById('game-max-players').value,
    play_time: document.getElementById('game-play-time').value,
    min_age: document.getElementById('game-min-age').value,
    complexity: document.getElementById('game-complexity').value,
    year_published: document.getElementById('game-year').value,
    designer: document.getElementById('game-designer').value.trim(),
    publisher: document.getElementById('game-publisher').value.trim(),
    category: document.getElementById('game-category').value.trim(),
    mechanism: document.getElementById('game-mechanism').value.trim(),
    image_url: document.getElementById('game-image-url').value.trim()
  };

  try {
    const res = await fetch(`${API_URL}/api/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (res.ok) {
      messageEl.className = 'success-message';
      messageEl.textContent = `"${payload.name}" added successfully! View it now.`;
      messageEl.style.display = 'block';

      document.getElementById('add-game-form').reset();
      document.getElementById('game-min-players').value = '1';
      document.getElementById('game-max-players').value = '4';
      document.getElementById('game-play-time').value = '45';
      document.getElementById('game-min-age').value = '8';
      document.getElementById('game-complexity').value = '2';
      document.getElementById('game-year').value = '2026';

      setTimeout(() => {
        window.location.href = `/game?id=${data.gameId}`;
      }, 1500);
    } else {
      messageEl.className = 'error-message';
      messageEl.textContent = data.error || 'Failed to add game.';
      messageEl.style.display = 'block';
    }
  } catch (err) {
    messageEl.className = 'error-message';
    messageEl.textContent = 'Failed to add game. Please try again.';
    messageEl.style.display = 'block';
  }
}
