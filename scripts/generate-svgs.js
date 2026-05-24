const path = require('path');
const db = require(path.join(__dirname, '..', 'database'));

const colors = [
  ['#1a3a5c', '#4a8ed4'], ['#3a1a5c', '#8a4ed4'], ['#1a5c3a', '#4ad48a'],
  ['#5c3a1a', '#d48a4a'], ['#5c1a2a', '#d44a6a'], ['#2a5c1a', '#6ad44a'],
  ['#1a4a5c', '#4a8ad4'], ['#5c4a1a', '#d4aa4a'], ['#3a5c4a', '#6ad48a'],
  ['#4a1a5c', '#aa4ad4'], ['#5c2a1a', '#d47a4a'], ['#1a5c5c', '#4ad4d4'],
  ['#2a1a5c', '#6a4ad4'], ['#5c1a4a', '#d44aaa'], ['#1a3a3a', '#4a8a8a'],
  ['#4a5c1a', '#aad44a'], ['#5c3a3a', '#d48a8a'], ['#1a2a5c', '#4a6ad4'],
  ['#3a5c1a', '#7ad44a'], ['#5c1a1a', '#d44a4a']
];

function splitText(text, maxLen) {
  if (text.length <= maxLen) return [text];
  // Try to split at a space around the middle
  const mid = Math.floor(text.length / 2);
  let splitAt = -1;
  for (let i = mid; i < text.length; i++) {
    if (text[i] === ' ') { splitAt = i; break; }
  }
  if (splitAt === -1) {
    for (let i = mid; i >= 0; i--) {
      if (text[i] === ' ') { splitAt = i; break; }
    }
  }
  if (splitAt > 0) {
    return [text.substring(0, splitAt), text.substring(splitAt + 1)];
  }
  return [text];
}

function makeSvg(name, cat, year, c1, c2) {
  const lines = splitText(name, 18);
  const fs = lines.length > 1 ? 16 : 22;
  const lineH = fs + 4;
  const totalH = lines.length * lineH;
  const startY = 160 + (40 - totalH) / 2;
  const textLines = lines.map((line, i) =>
    `<text x="150" y="${startY + i * lineH}" fill="white" font-family="Georgia,serif" font-size="${fs}" font-weight="bold" text-anchor="middle" text-decoration="underline">${line}</text>`
  ).join('\n  ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400">
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
  <text x="150" y="370" fill="rgba(255,255,255,0.25)" font-family="Trebuchet MS,sans-serif" font-size="10" text-anchor="middle">BGWiki</text>
</svg>`;
}

const games = db.prepare('SELECT id, name, year_published, category FROM games ORDER BY id').all();
const update = db.prepare('UPDATE games SET image_url = ? WHERE id = ?');

let i = 0;
for (const game of games) {
  const [c1, c2] = colors[i % colors.length];
  const name = game.name.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const cat = (game.category || 'Board Game').replace(/&/g, '&amp;');
  const year = game.year_published || '';
  const svg = makeSvg(name, cat, year, c1, c2);
  update.run('data:image/svg+xml,' + encodeURIComponent(svg), game.id);
  console.log(`OK ${game.id} ${game.name}`);
  i++;
}
db.close();
console.log('Done');
