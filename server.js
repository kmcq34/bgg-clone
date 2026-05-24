const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./database');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const requireDbInit = require('./database');

app.get('/favicon.ico', (req, res) => res.status(204).end());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/game', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'game.html'));
});

app.get('/search', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'search.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/add-game', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'add-game.html'));
});

app.get('/api/games', (req, res) => {
  const { sort = 'avg_rating', limit = 20, offset = 0, category, min_players, max_complexity } = req.query;

  let where = [];
  let params = [];

  if (category) {
    where.push('category LIKE ?');
    params.push(`%${category}%`);
  }
  if (min_players) {
    where.push('min_players <= ?');
    params.push(parseInt(min_players));
  }
  if (max_complexity) {
    where.push('complexity <= ?');
    params.push(parseFloat(max_complexity));
  }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const orderMap = {
    avg_rating: 'avg_rating DESC',
    name: 'name ASC',
    year_published: 'year_published DESC',
    complexity: 'complexity DESC',
    hot: '(avg_rating * total_ratings) DESC'
  };
  const orderBy = orderMap[sort] || orderMap.avg_rating;

  const games = db.prepare(`
    SELECT * FROM games ${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), parseInt(offset));

  const total = db.prepare(`SELECT COUNT(*) as count FROM games ${whereClause}`).get(...params);

  res.json({ games, total: total.count });
});

app.get('/api/games/:id', (req, res) => {
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Game not found' });

  const reviews = db.prepare(`
    SELECT r.*, u.username FROM reviews r 
    JOIN users u ON r.user_id = u.id 
    WHERE r.game_id = ? 
    ORDER BY r.created_at DESC
  `).all(req.params.id);

  const relatedGames = db.prepare(`
    SELECT * FROM games WHERE id != ? AND (category LIKE ? OR category LIKE ?)
    ORDER BY avg_rating DESC LIMIT 5
  `).all(req.params.id, `%${game.category.split(',')[0]}%`, `%${game.category.split(',')[1] || ''}%`);

  res.json({ game, reviews, relatedGames });
});

app.post('/api/games', (req, res) => {
  const { name, description, min_players, max_players, play_time, min_age, complexity, year_published, designer, publisher, category, mechanism, image_url } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Game name is required' });
  }

  const img = (image_url && image_url.trim())
    ? image_url.trim()
    : db.generateImagePlaceholder(name, year_published || new Date().getFullYear(), category || '');

  try {
    const result = db.prepare(`
      INSERT INTO games (name, description, min_players, max_players, play_time, min_age, complexity, year_published, designer, publisher, category, mechanism, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name, description || '',
      parseInt(min_players) || 1, parseInt(max_players) || 4,
      parseInt(play_time) || 30, parseInt(min_age) || 8,
      parseFloat(complexity) || 1, parseInt(year_published) || new Date().getFullYear(),
      designer || '', publisher || '', category || '', mechanism || '', img
    );

    res.json({ success: true, gameId: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add game: ' + err.message });
  }
});

app.post('/api/register', (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const hashedPw = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)').run(username, email, hashedPw);
    res.json({ success: true, userId: result.lastInsertRowid, username });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      res.status(409).json({ error: 'Username or email already exists' });
    } else {
      res.status(500).json({ error: 'Registration failed' });
    }
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  res.json({ success: true, user: { id: user.id, username: user.username, email: user.email } });
});

app.post('/api/reviews', (req, res) => {
  const { game_id, user_id, rating, comment } = req.body;

  if (!game_id || !user_id || !rating) {
    return res.status(400).json({ error: 'Game, user, and rating are required' });
  }

  const existing = db.prepare('SELECT id FROM reviews WHERE game_id = ? AND user_id = ?').get(game_id, user_id);

  if (existing) {
    db.prepare('UPDATE reviews SET rating = ?, comment = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?').run(rating, comment, existing.id);
  } else {
    db.prepare('INSERT INTO reviews (game_id, user_id, rating, comment) VALUES (?, ?, ?, ?)').run(game_id, user_id, rating, comment);
  }

  db.exec(`
    UPDATE games SET 
      avg_rating = COALESCE((SELECT AVG(rating) FROM reviews WHERE game_id = ${game_id}), 0),
      total_ratings = (SELECT COUNT(*) FROM reviews WHERE game_id = ${game_id})
    WHERE id = ${game_id}
  `);

  res.json({ success: true });
});

app.get('/api/collection/:userId', (req, res) => {
  const games = db.prepare(`
    SELECT g.*, c.status FROM collections c
    JOIN games g ON c.game_id = g.id
    WHERE c.user_id = ?
  `).all(req.params.userId);

  res.json(games);
});

app.post('/api/collection', (req, res) => {
  const { user_id, game_id, status } = req.body;

  try {
    db.prepare(`
      INSERT INTO collections (user_id, game_id, status) VALUES (?, ?, ?)
      ON CONFLICT(user_id, game_id) DO UPDATE SET status = ?
    `).run(user_id, game_id, status, status);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update collection' });
  }
});

app.get('/api/search', (req, res) => {
  const { q, type = 'games' } = req.query;
  if (!q) return res.json({ games: [], users: [] });

  let games = [];
  if (type === 'all' || type === 'games') {
    games = db.prepare(`
      SELECT * FROM games 
      WHERE name LIKE ? OR description LIKE ? OR designer LIKE ?
      ORDER BY avg_rating DESC LIMIT 50
    `).all(`%${q}%`, `%${q}%`, `%${q}%`);
  }

  let users = [];
  if (type === 'all' || type === 'users') {
    users = db.prepare(`
      SELECT id, username, avatar FROM users WHERE username LIKE ? LIMIT 20
    `).all(`%${q}%`);
  }

  res.json({ games, users });
});

app.get('/api/recommendations', (req, res) => {
  const { user_id, exclude_id } = req.query;
  const excludeGameId = exclude_id ? parseInt(exclude_id) : 0;

  const propositions = {};

  const topRated = db.prepare(`
    SELECT * FROM games WHERE id != ? AND avg_rating > 0 AND total_ratings > 0
    ORDER BY avg_rating DESC, total_ratings DESC LIMIT 6
  `).all(excludeGameId);
  if (topRated.length) propositions.topRated = topRated;

  const gatewayGames = db.prepare(`
    SELECT * FROM games WHERE id != ? AND complexity <= 2.5 AND avg_rating > 0
    ORDER BY avg_rating DESC LIMIT 6
  `).all(excludeGameId);
  if (gatewayGames.length) propositions.gatewayGames = gatewayGames;

  const heavyGames = db.prepare(`
    SELECT * FROM games WHERE id != ? AND complexity >= 3.5 AND avg_rating > 0
    ORDER BY avg_rating DESC LIMIT 6
  `).all(excludeGameId);
  if (heavyGames.length) propositions.heavyGames = heavyGames;

  const soloGames = db.prepare(`
    SELECT * FROM games WHERE id != ? AND min_players = 1 AND avg_rating > 0
    ORDER BY avg_rating DESC LIMIT 6
  `).all(excludeGameId);
  if (soloGames.length) propositions.soloGames = soloGames;

  const partyGames = db.prepare(`
    SELECT * FROM games WHERE id != ? AND max_players >= 6
    ORDER BY avg_rating DESC, total_ratings DESC LIMIT 6
  `).all(excludeGameId);
  if (partyGames.length) propositions.partyGames = partyGames;

  const quickGames = db.prepare(`
    SELECT * FROM games WHERE id != ? AND play_time <= 45 AND avg_rating > 0
    ORDER BY avg_rating DESC LIMIT 6
  `).all(excludeGameId);
  if (quickGames.length) propositions.quickGames = quickGames;

  const hiddenGems = db.prepare(`
    SELECT * FROM games WHERE id != ? AND total_ratings >= 1 AND total_ratings <= 2
    ORDER BY avg_rating DESC LIMIT 6
  `).all(excludeGameId);
  if (hiddenGems.length) propositions.hiddenGems = hiddenGems;

  const strategyGames = db.prepare(`
    SELECT * FROM games WHERE id != ? AND mechanism LIKE '%Engine Building%' AND avg_rating > 0
    ORDER BY avg_rating DESC LIMIT 6
  `).all(excludeGameId);
  if (strategyGames.length) propositions.strategyGames = strategyGames;

  const coOpGames = db.prepare(`
    SELECT * FROM games WHERE id != ? AND category LIKE '%Cooperative%' AND avg_rating > 0
    ORDER BY avg_rating DESC LIMIT 6
  `).all(excludeGameId);
  if (coOpGames.length) propositions.coOpGames = coOpGames;

  if (user_id) {
    const userCollection = db.prepare(`
      SELECT game_id FROM collections WHERE user_id = ? AND status IN ('own', 'played')
    `).all(user_id).map(g => g.game_id);

    if (userCollection.length > 0) {
      const collectionIds = userCollection.join(',');
      const likedGames = db.prepare(`
        SELECT * FROM games WHERE id IN (${collectionIds}) AND category LIKE ?
      `).all(`%${db.prepare('SELECT category FROM games WHERE id = ?').get(userCollection[0]).category.split(',')[0].trim()}%`);

      if (likedGames.length) {
        const categories = likedGames.map(g => g.category.split(',').map(c => c.trim())).flat();
        const topCat = categories.sort((a, b) => categories.filter(v => v === a).length - categories.filter(v => v === b).length).pop();

        const basedOnCollection = db.prepare(`
          SELECT * FROM games WHERE id NOT IN (${collectionIds}) AND category LIKE ? AND avg_rating > 0
          ORDER BY avg_rating DESC LIMIT 6
        `).all(`%${topCat}%`);
        if (basedOnCollection.length) propositions.basedOnCollection = basedOnCollection;
      }
    }
  }

  res.json(propositions);
});

app.get('/api/categories', (req, res) => {
  const games = db.prepare('SELECT category FROM games WHERE category IS NOT NULL').all();
  const categoryCounts = {};

  games.forEach(g => {
    g.category.split(',').forEach(cat => {
      const trimmed = cat.trim();
      if (trimmed) {
        categoryCounts[trimmed] = (categoryCounts[trimmed] || 0) + 1;
      }
    });
  });

  const categories = Object.entries(categoryCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  res.json(categories);
});

const os = require('os');
const ifaces = os.networkInterfaces();
let ip = 'localhost';
Object.values(ifaces).forEach(iface => {
  iface.forEach(addr => { if (addr.family === 'IPv4' && !addr.internal) ip = addr.address; });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`BoardGameGeek Clone running at:`);
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  Network: http://${ip}:${PORT}`);
});
