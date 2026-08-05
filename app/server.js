const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const express = require('express');
const { WebSocketServer, WebSocket } = require('ws');

const REPLAY_HOST = '127.0.0.1';
const REPLAY_PORT = 2999;
const PORT = 3000;
const POLL_INTERVAL_MS = 100;
const ROSTER_POLL_INTERVAL_MS = 1000;
const PORTRAIT_CACHE_DIR = path.join(__dirname, 'cache', 'portraits');

const agent = new https.Agent({ rejectUnauthorized: false });

function replayGet(replayPath) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      { hostname: REPLAY_HOST, port: REPLAY_PORT, path: replayPath, agent, headers: { Accept: 'application/json' } },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(buf.length ? JSON.parse(buf.toString()) : {});
            } catch (e) {
              reject(new Error('bad_json'));
            }
          } else {
            reject(new Error(`status_${res.statusCode}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(2000, () => req.destroy(new Error('timeout')));
  });
}

// --- Data Dragon champion portraits (cached locally so the panel survives being offline) ---

function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { Accept: 'application/json' } }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`status_${res.statusCode}`));
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString()));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function httpsDownload(url, destPath) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`status_${res.statusCode}`));
      }
      const file = fs.createWriteStream(destPath);
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', reject);
    }).on('error', reject);
  });
}

function normalizeChampionKey(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Maps a normalized champion name/id to its Data Dragon id (the "MonkeyKing" vs "Wukong" trap).
let championKeyMap = new Map();
let ddragonVersion = null;

async function loadChampionMap() {
  try {
    const versions = await httpsGetJson('https://ddragon.leagueoflegends.com/api/versions.json');
    ddragonVersion = versions[0];
    const data = await httpsGetJson(
      `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/data/en_US/champion.json`
    );
    const map = new Map();
    for (const champ of Object.values(data.data)) {
      map.set(normalizeChampionKey(champ.id), champ.id);
      map.set(normalizeChampionKey(champ.name), champ.id);
    }
    championKeyMap = map;
    console.log(`[portraits] Data Dragon ${ddragonVersion} loaded, ${map.size / 2} champions`);
  } catch (err) {
    console.log(`[portraits] Data Dragon unavailable, portraits will fall back (${err.message})`);
  }
}

fs.mkdirSync(PORTRAIT_CACHE_DIR, { recursive: true });
loadChampionMap();

async function servePortrait(req, res) {
  const ddragonId = championKeyMap.get(normalizeChampionKey(req.params.champion));
  if (!ddragonId) return res.status(404).end();

  const cachePath = path.join(PORTRAIT_CACHE_DIR, `${ddragonId}.png`);
  if (!fs.existsSync(cachePath)) {
    try {
      await httpsDownload(
        `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/champion/${ddragonId}.png`,
        cachePath
      );
    } catch (err) {
      return res.status(404).end();
    }
  }
  res.sendFile(cachePath);
}

function proxyToReplayApi(req, res) {
  const targetPath = req.originalUrl.replace(/^\/api/, '');
  const hasBody = req.method === 'POST' || req.method === 'PUT';
  const bodyData = hasBody ? JSON.stringify(req.body ?? {}) : null;

  const options = {
    hostname: REPLAY_HOST,
    port: REPLAY_PORT,
    path: targetPath,
    method: req.method,
    agent,
    headers: { Accept: 'application/json' },
  };
  if (bodyData) {
    options.headers['Content-Type'] = 'application/json';
    options.headers['Content-Length'] = Buffer.byteLength(bodyData);
  }

  const proxyReq = https.request(options, (proxyRes) => {
    const chunks = [];
    proxyRes.on('data', (c) => chunks.push(c));
    proxyRes.on('end', () => {
      const buf = Buffer.concat(chunks);
      res.status(proxyRes.statusCode || 502);
      const contentType = proxyRes.headers['content-type'];
      if (contentType) res.set('Content-Type', contentType);
      res.send(buf);
    });
  });
  proxyReq.on('error', (err) => {
    res.status(502).json({ error: 'proxy_error', message: err.message });
  });
  if (bodyData) proxyReq.write(bodyData);
  proxyReq.end();
}

const app = express();
app.use('/api', express.json(), proxyToReplayApi);
app.get('/portraits/:champion.png', servePortrait);
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

function broadcast(msg) {
  const data = JSON.stringify(msg);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(data);
  }
}

let pollInFlight = false;
let lastState = null; // 'connected' | 'no-replay'

async function pollPlayback() {
  if (pollInFlight) return;
  pollInFlight = true;
  try {
    const playback = await replayGet('/replay/playback');
    if (lastState !== 'connected') {
      lastState = 'connected';
      console.log('[replay] connected');
    }
    broadcast({ type: 'playback', state: 'connected', playback });
  } catch (err) {
    if (lastState !== 'no-replay') {
      lastState = 'no-replay';
      console.log(`[replay] no replay / unreachable (${err.message})`);
    }
    broadcast({ type: 'playback', state: 'no-replay' });
  } finally {
    pollInFlight = false;
  }
}

setInterval(pollPlayback, POLL_INTERVAL_MS);
pollPlayback();

// Roster + camera lock state — narration reference, not transport, so 1Hz is plenty.
let rosterPollInFlight = false;

async function pollRoster() {
  if (lastState !== 'connected' || rosterPollInFlight) return;
  rosterPollInFlight = true;
  try {
    const [players, render, eventdata, game] = await Promise.all([
      replayGet('/liveclientdata/playerlist'),
      replayGet('/replay/render'),
      replayGet('/liveclientdata/eventdata'),
      replayGet('/replay/game'),
    ]);
    broadcast({
      type: 'roster',
      players,
      camera: { attached: render.cameraAttached, selectionName: render.selectionName },
      processID: game.processID,
    });
    broadcast({ type: 'events', events: eventdata.Events || [], processID: game.processID });
  } catch (err) {
    // Roster is reference data — a miss here isn't worth spamming the console.
  } finally {
    rosterPollInFlight = false;
  }
}

setInterval(pollRoster, ROSTER_POLL_INTERVAL_MS);

wss.on('connection', (ws) => {
  ws.on('error', () => {}); // swallow — client disconnects don't need to crash the helper
});

server.listen(PORT, () => {
  console.log(`LoL Replay Controller helper listening on http://localhost:${PORT}`);
});
