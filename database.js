const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'bgg.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      avatar TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      min_players INTEGER,
      max_players INTEGER,
      play_time INTEGER,
      min_age INTEGER,
      complexity REAL,
      year_published INTEGER,
      designer TEXT,
      publisher TEXT,
      category TEXT,
      mechanism TEXT,
      image_url TEXT,
      avg_rating REAL DEFAULT 0,
      total_ratings INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 10),
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      game_id INTEGER NOT NULL,
      status TEXT DEFAULT 'want_to_play',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
      UNIQUE(user_id, game_id)
    );
  `);

  const stmt = db.prepare("SELECT COUNT(*) as count FROM games");
  const { count } = stmt.get();

  if (count === 0) {
    console.log('Seeding database with sample games...');
    seedData();
  }
}

function splitText(text, maxLen) {
  if (text.length <= maxLen) return [text];
  const mid = Math.floor(text.length / 2);
  let splitAt = -1;
  for (let i = mid; i < text.length; i++) { if (text[i] === ' ') { splitAt = i; break; } }
  if (splitAt === -1) { for (let i = mid; i >= 0; i--) { if (text[i] === ' ') { splitAt = i; break; } } }
  return splitAt > 0 ? [text.substring(0, splitAt), text.substring(splitAt + 1)] : [text];
}

function generateImagePlaceholder(name, year, category) {
  const colors = [
    ['#1a3a5c', '#4a8ed4'], ['#3a1a5c', '#8a4ed4'], ['#1a5c3a', '#4ad48a'],
    ['#5c3a1a', '#d48a4a'], ['#5c1a2a', '#d44a6a'], ['#2a5c1a', '#6ad44a'],
    ['#1a4a5c', '#4a8ad4'], ['#5c4a1a', '#d4aa4a'], ['#3a5c4a', '#6ad48a'],
    ['#4a1a5c', '#aa4ad4'], ['#5c2a1a', '#d47a4a'], ['#1a5c5c', '#4ad4d4'],
    ['#2a1a5c', '#6a4ad4'], ['#5c1a4a', '#d44aaa'], ['#1a3a3a', '#4a8a8a'],
    ['#4a5c1a', '#aad44a'], ['#5c3a3a', '#d48a8a'], ['#1a2a5c', '#4a6ad4'],
    ['#3a5c1a', '#7ad44a'], ['#5c1a1a', '#d44a4a']
  ];
  const idx = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
  const [c1, c2] = colors[idx];
  const safeName = name.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const cat = (category || 'Board Game').replace(/&/g, '&amp;');
  const lines = splitText(safeName, 18);
  const fs = lines.length > 1 ? 16 : 22;
  const lineH = fs + 4;
  const totalH = lines.length * lineH;
  const startY = 160 + (40 - totalH) / 2;
  const textLines = lines.map((line, i) =>
    `<text x="150" y="${startY + i * lineH}" fill="white" font-family="Georgia,serif" font-size="${fs}" font-weight="bold" text-anchor="middle" text-decoration="underline">${line}</text>`
  ).join('\n  ');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${c1}"/>
      <stop offset="100%" style="stop-color:${c2}"/>
    </linearGradient>
  </defs>
  <rect width="300" height="400" fill="url(#bg)"/>
  <rect x="20" y="20" width="260" height="360" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
  <rect x="25" y="25" width="250" height="350" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
  ${textLines}
  <text x="150" y="220" fill="rgba(255,255,255,0.7)" font-family="Trebuchet MS,sans-serif" font-size="14" text-anchor="middle">${cat}</text>
  ${year ? `<text x="150" y="250" fill="rgba(255,255,255,0.5)" font-family="Trebuchet MS,sans-serif" font-size="12" text-anchor="middle">${year}</text>` : ''}
  <text x="150" y="370" fill="rgba(255,255,255,0.25)" font-family="Trebuchet MS,sans-serif" font-size="10" text-anchor="middle">BoardGameGeek</text>
</svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

function seedData() {
  const insertUser = db.prepare('INSERT OR IGNORE INTO users (username, email, password) VALUES (?, ?, ?)');
  const hashedPw = bcrypt.hashSync('password123', 10);
  insertUser.run('admin', 'admin@bggclone.com', hashedPw);
  insertUser.run('boardgamefan', 'fan@bggclone.com', hashedPw);
  insertUser.run('meeples4life', 'meeples@bggclone.com', hashedPw);

  const games = [
    {
      name: 'Gloomhaven',
      description: 'A campaign-driven tactical combat game set in a persistent world. Players take on the roles of wandering adventurers who explore dungeons, fight monsters, and complete quests in a dark fantasy setting.',
      min_players: 1, max_players: 4, play_time: 120, min_age: 14,
      complexity: 3.9, year_published: 2017, designer: 'Isaac Childres',
      publisher: 'Cephalofair Games', category: 'Fantasy, Adventure',
      mechanism: 'Action Selection, Card Drafting, Grid Movement',
    },
    {
      name: 'Brass: Birmingham',
      description: 'A game of economic development in the Industrial Revolution. Players build networks, develop industries, and compete for dominance in the Birmingham region of England.',
      min_players: 2, max_players: 4, play_time: 120, min_age: 14,
      complexity: 3.9, year_published: 2018, designer: 'Gavan Brown, Matt Tolman, Rustan Håkansson',
      publisher: 'Roxley', category: 'Economic, Industry',
      mechanism: 'Network Building, Hand Management, Action Points',
    },
    {
      name: 'Pandemic Legacy: Season 1',
      description: 'A cooperative campaign game where the world changes with every play. Work together to stop deadly diseases from spreading across the globe while managing your resources.',
      min_players: 2, max_players: 4, play_time: 60, min_age: 13,
      complexity: 2.8, year_published: 2015, designer: 'Rob Daviau, Matt Leacock',
      publisher: 'Z-Man Games', category: 'Cooperative, Legacy',
      mechanism: 'Cooperative, Point to Point, Hand Management',
    },
    {
      name: 'Terraforming Mars',
      description: 'Compete to make Mars habitable by raising temperature, creating oceans, and growing greenery. Use project cards to develop your corporation and transform the red planet.',
      min_players: 1, max_players: 5, play_time: 120, min_age: 12,
      complexity: 3.2, year_published: 2016, designer: 'Jacob Fryxelius',
      publisher: 'FryxGames', category: 'Economic, Science Fiction',
      mechanism: 'Card Drafting, Engine Building, Open Drafting',
    },
    {
      name: 'Twilight Imperium: Fourth Edition',
      description: 'An epic space opera game of political intrigue, warfare, and exploration. Lead your alien civilization to galactic supremacy in this grand strategy game.',
      min_players: 3, max_players: 6, play_time: 480, min_age: 14,
      complexity: 4.3, year_published: 2017, designer: 'Christian T. Petersen',
      publisher: 'Fantasy Flight Games', category: 'Science Fiction, Strategy',
      mechanism: 'Area Control, Voting, Trading, Dice Rolling',
    },
    {
      name: 'Wingspan',
      description: 'A relaxing engine-building game where you attract birds to your wildlife preserve. Each bird enables a chain reaction that makes subsequent birds more powerful.',
      min_players: 1, max_players: 5, play_time: 70, min_age: 10,
      complexity: 2.5, year_published: 2019, designer: 'Elizabeth Hargrave',
      publisher: 'Stonemaier Games', category: 'Animals, Card Game',
      mechanism: 'Engine Building, Card Drafting, Dice Placement',
    },
    {
      name: 'Scythe',
      description: 'An alternate-history 1920s Europa game of farming, manufacturing, and warfare. Guide your faction to power and prosperity in this engine-building strategy game.',
      min_players: 1, max_players: 5, play_time: 115, min_age: 14,
      complexity: 3.5, year_published: 2016, designer: 'Jamey Stegmaier',
      publisher: 'Stonemaier Games', category: 'Strategy, Alternate History',
      mechanism: 'Action Selection, Area Control, Engine Building',
    },
    {
      name: 'Spirit Island',
      description: 'A complex cooperative game where players are powerful spirits defending their island from colonizing invaders. Use unique powers to drive off the invaders.',
      min_players: 1, max_players: 4, play_time: 120, min_age: 13,
      complexity: 4.1, year_published: 2017, designer: 'R. Eric Reuss',
      publisher: 'Greater Than Games', category: 'Cooperative, Fantasy',
      mechanism: 'Cooperative, Action Points, Card Play',
    },
    {
      name: 'Catan',
      description: 'The classic resource management and trading game. Settle the island of Catan, build roads and settlements, and trade resources to become the dominant force.',
      min_players: 3, max_players: 4, play_time: 90, min_age: 10,
      complexity: 2.3, year_published: 1995, designer: 'Klaus Teuber',
      publisher: 'KOSMOS', category: 'Economic, Negotiation',
      mechanism: 'Dice Rolling, Trading, Modular Board',
    },
    {
      name: 'Ticket to Ride',
      description: 'A cross-country train adventure game. Collect matching train cards to claim railway routes connecting cities across North America.',
      min_players: 2, max_players: 5, play_time: 60, min_age: 8,
      complexity: 1.8, year_published: 2004, designer: 'Alan R. Moon',
      publisher: 'Days of Wonder', category: 'Travel, Trains',
      mechanism: 'Set Collection, Route Building, Card Drafting',
    },
    {
      name: '7 Wonders',
      description: 'A card drafting civilization game. Lead your city through ancient ages, developing military power, scientific discoveries, and architectural wonders.',
      min_players: 2, max_players: 7, play_time: 30, min_age: 10,
      complexity: 2.3, year_published: 2010, designer: 'Antoine Bauza',
      publisher: 'Repos Production', category: 'Civilization, Card Game',
      mechanism: 'Card Drafting, Hand Management, Set Collection',
    },
    {
      name: 'Azul',
      description: 'A beautiful abstract tile-placement game. Compete to create the most ornate mosaic floor by strategically selecting and placing colored tiles.',
      min_players: 2, max_players: 4, play_time: 45, min_age: 8,
      complexity: 1.8, year_published: 2017, designer: 'Michael Kiesling',
      publisher: 'Plan B Games', category: 'Abstract Strategy, Tiles',
      mechanism: 'Tile Placement, Set Collection, Pattern Building',
    },
    {
      name: 'Everdell',
      description: 'A worker placement game in a charming woodland city. Assign critters to gather resources, build structures, and attract visitors to your thriving city.',
      min_players: 1, max_players: 4, play_time: 80, min_age: 13,
      complexity: 3.0, year_published: 2018, designer: 'James A. Wilson',
      publisher: 'Starling Games', category: 'Animals, Fantasy',
      mechanism: 'Worker Placement, Card Drafting, Engine Building',
    },
    {
      name: 'Ark Nova',
      description: 'A zoo design and management game. Plan and build your modern, scientifically managed zoo to attract visitors and support conservation projects.',
      min_players: 1, max_players: 4, play_time: 150, min_age: 14,
      complexity: 3.7, year_published: 2021, designer: 'Mathias Wigge',
      publisher: 'Feuerland Spiele', category: 'Animals, Zoo',
      mechanism: 'Card Drafting, Engine Building, Worker Placement',
    },
    {
      name: 'Dune: Imperium',
      description: 'A deck-building and worker placement game set in the Dune universe. Build your forces, gather resources, and compete for control of Arrakis.',
      min_players: 1, max_players: 4, play_time: 120, min_age: 14,
      complexity: 3.2, year_published: 2020, designer: 'Paul Dennen',
      publisher: 'Dire Wolf Digital', category: 'Science Fiction, Deck Building',
      mechanism: 'Deck Building, Worker Placement, Area Control',
    },
    {
      name: 'Cascadia',
      description: 'A relaxing puzzle game about creating the most harmonious ecosystem in the Pacific Northwest. Place habitat tiles and wildlife tokens to maximize your score.',
      min_players: 1, max_players: 4, play_time: 45, min_age: 10,
      complexity: 1.9, year_published: 2021, designer: 'Randy Flynn',
      publisher: 'Flatout Games', category: 'Animals, Puzzle',
      mechanism: 'Tile Placement, Pattern Building, Set Collection',
    },
    {
      name: 'Root',
      description: 'An asymmetric strategy game of woodland creatures vying for control of a vast forest. Each faction has unique rules, abilities, and paths to victory.',
      min_players: 2, max_players: 4, play_time: 90, min_age: 10,
      complexity: 3.7, year_published: 2018, designer: 'Cole Wehrle',
      publisher: 'Leder Games', category: 'Animals, Strategy',
      mechanism: 'Area Control, Asymmetric Powers, Engine Building',
    },
    {
      name: 'Viticulture Essential Edition',
      description: 'A worker placement game about winemaking. Develop your vineyard, plant grapes, harvest wine, and fulfill orders to build a successful winery.',
      min_players: 1, max_players: 6, play_time: 90, min_age: 13,
      complexity: 2.9, year_published: 2015, designer: 'Jamey Stegmaier, Alan R. Stone',
      publisher: 'Stonemaier Games', category: 'Economic, Agriculture',
      mechanism: 'Worker Placement, Card Drafting, Order Fulfillment',
    },
    {
      name: 'Clank! Legacy: Acquisitions Incorporated',
      description: 'A deck-building dungeon adventure with legacy elements. Build your deck, explore the dungeon, acquire treasure, and avoid making too much noise!',
      min_players: 2, max_players: 4, play_time: 120, min_age: 14,
      complexity: 3.0, year_published: 2019, designer: 'Rob Daviau, Paul Dennen',
      publisher: 'Renegade Game Studios', category: 'Fantasy, Deck Building, Legacy',
      mechanism: 'Deck Building, Push Your Luck, Dice Rolling',
    },
    {
      name: 'The Quacks of Quedlinburg',
      description: 'A push-your-luck bag building game where you play as charlatan alchemists brewing potions. Add ingredients carefully or your pot might explode!',
      min_players: 2, max_players: 4, play_time: 45, min_age: 10,
      complexity: 2.1, year_published: 2018, designer: 'Wolfgang Warsch',
      publisher: 'Schmidt Spiele', category: 'Medieval, Push Your Luck',
      mechanism: 'Bag Building, Push Your Luck, Set Collection',
    }
  ];

  const insertGame = db.prepare(`
    INSERT INTO games (name, description, min_players, max_players, play_time, min_age, complexity, year_published, designer, publisher, category, mechanism, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertStmt = db.transaction((game) => {
    const img = generateImagePlaceholder(game.name, game.year_published, game.category);
    insertGame.run(
      game.name, game.description, game.min_players, game.max_players,
      game.play_time, game.min_age, game.complexity, game.year_published,
      game.designer, game.publisher, game.category, game.mechanism, img
    );
  });

  for (const game of games) {
    insertStmt(game);
  }

  const gameIds = db.prepare('SELECT id FROM games ORDER BY id').all().map(g => g.id);

  const insertReview = db.prepare('INSERT INTO reviews (game_id, user_id, rating, comment) VALUES (?, ?, ?, ?)');
  const insertCollection = db.prepare('INSERT INTO collections (user_id, game_id, status) VALUES (?, ?, ?)');

  const reviewData = [
    [1, 1, 9, 'Absolutely incredible game. The campaign is epic.'],
    [1, 2, 10, 'Best board game ever made. Period.'],
    [1, 3, 8, 'Amazing but setup takes forever.'],
    [2, 1, 10, 'The best economic game on the market.'],
    [2, 2, 9, 'Brilliant design, every decision matters.'],
    [3, 1, 10, 'The legacy format is revolutionary.'],
    [3, 3, 9, 'Incredible narrative experience.'],
    [4, 2, 8, 'Great engine builder, can run long.'],
    [4, 3, 7, 'Good but takes a while to learn.'],
    [5, 1, 9, 'Epic space opera. Needs the right group.'],
    [6, 2, 9, 'Beautiful game, relaxing yet strategic.'],
    [6, 3, 8, 'Love the bird theme and engine building.'],
    [7, 1, 8, 'Great art and gameplay. Analysis prone though.'],
    [8, 2, 10, 'Best co-op game out there.'],
    [8, 3, 9, 'Challenging and rewarding.'],
    [9, 1, 7, 'Classic for a reason. Still fun after all these years.'],
    [10, 2, 7, 'Great gateway game.'],
    [11, 1, 8, 'Fast and engaging card drafting.'],
    [12, 3, 9, 'Beautiful abstract game.'],
    [14, 1, 9, 'Complex but rewarding zoo builder.'],
    [15, 2, 8, 'Dune theme done right.'],
    [16, 3, 8, 'Chill puzzle game.'],
    [17, 1, 9, 'Asymmetric perfection.'],
    [20, 2, 8, 'Push your luck done well.']
  ];

  for (const [gameId, userId, rating, comment] of reviewData) {
    if (gameIds.includes(gameId)) {
      insertReview.run(gameId, userId, rating, comment);
    }
  }

  const statuses = ['own', 'played', 'want_to_play', 'want_to_buy'];
  for (const userId of [1, 2, 3]) {
    for (const gameId of gameIds.slice(0, Math.floor(Math.random() * 10) + 5)) {
      insertCollection.run(userId, gameId, statuses[Math.floor(Math.random() * statuses.length)]);
    }
  }

  db.exec(`
    UPDATE games SET avg_rating = COALESCE((
      SELECT AVG(rating) FROM reviews WHERE reviews.game_id = games.id
    ), 0);
    UPDATE games SET total_ratings = COALESCE((
      SELECT COUNT(*) FROM reviews WHERE reviews.game_id = games.id
    ), 0);
  `);

  console.log('Database seeded successfully!');
}

initDb();
module.exports = db;
module.exports.generateImagePlaceholder = generateImagePlaceholder;
