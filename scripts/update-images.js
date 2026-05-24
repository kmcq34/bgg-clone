const https = require('https');
const path = require('path');
const db = require(path.join(__dirname, '..', 'database'));

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

const games = db.prepare("SELECT id, name FROM games ORDER BY id").all();

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': UA } }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    }).on('error', reject);
  });
}

async function getImageUrl(gameName) {
  // Step 1: Search Wikipedia for the game
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(gameName + ' board game')}&format=json&srlimit=5`;
  const searchBody = await httpGet(searchUrl);
  if (!searchBody) return null;
  let searchData;
  try { searchData = JSON.parse(searchBody); } catch { return null; }
  if (!searchData.query || !searchData.query.search) return null;

  // Step 2: For each result, get pageprops to find page_image
  for (const page of searchData.query.search) {
    const propsUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=pageprops&format=json&titles=${encodeURIComponent(page.title)}`;
    const propsBody = await httpGet(propsUrl);
    if (!propsBody) continue;
    let propsData;
    try { propsData = JSON.parse(propsBody); } catch { continue; }
    if (!propsData.query) continue;
    
    for (const p of Object.values(propsData.query.pages)) {
      if (!p.pageprops || !p.pageprops.page_image) continue;
      
      const imageFilename = p.pageprops.page_image; // e.g. "Gloomhaven_Cover_Art.jpg"
      
      // Step 3: Get the URL for this image file
      const imgUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=imageinfo&format=json&iiprop=url&titles=File:${encodeURIComponent(imageFilename)}`;
      const imgBody = await httpGet(imgUrl);
      if (!imgBody) continue;
      let imgData;
      try { imgData = JSON.parse(imgBody); } catch { continue; }
      if (!imgData.query) continue;
      
      for (const ip of Object.values(imgData.query.pages)) {
        if (ip.imageinfo && ip.imageinfo[0] && ip.imageinfo[0].url) {
          return ip.imageinfo[0].url;
        }
      }
    }
  }
  return null;
}

(async () => {
  const update = db.prepare('UPDATE games SET image_url = ? WHERE id = ?');
  let found = 0;
  for (const game of games) {
    try {
      const url = await getImageUrl(game.name);
      if (url) {
        update.run(url, game.id);
        console.log(`OK ${game.name} -> ${url}`);
        found++;
      } else {
        console.log(`NO IMAGE ${game.name}`);
      }
    } catch (err) {
      console.log(`FAIL ${game.name}: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 1500));
  }
  console.log(`\nFound ${found}/${games.length} images`);
  db.close();
})();
