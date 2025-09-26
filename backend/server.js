import { createServer } from 'http';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3001;

const trips = [
  "Algarve",
  "Amsterdam",
  "Barcelona",
  "Birch",
  "Bordeaux",
  "Brighton",
  "Chamonix",
  "Cheltenham",
  "Edinburgh",
  "Galway",
  "Lisbon",
  "Lille",
  "Manchester",
  "New Forest",
  "Nice",
  "Vienna"
];

const dataDir = path.join(__dirname, 'data');
const ordersFile = path.join(dataDir, 'orders.json');

async function ensureDataFile() {
  if (!existsSync(dataDir)) {
    await mkdir(dataDir, { recursive: true });
  }
  if (!existsSync(ordersFile)) {
    await writeFile(ordersFile, '[]', 'utf8');
  }
}

async function loadOrders() {
  await ensureDataFile();
  const raw = await readFile(ordersFile, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to parse orders file, resetting.', err);
    await writeFile(ordersFile, '[]', 'utf8');
    return [];
  }
}

async function saveOrders(orders) {
  await ensureDataFile();
  await writeFile(ordersFile, JSON.stringify(orders, null, 2), 'utf8');
}

function validateRanking(ranking) {
  if (!Array.isArray(ranking)) return false;
  const unique = new Set();
  for (const item of ranking) {
    if (typeof item !== 'string') return false;
    if (!trips.includes(item)) return false;
    if (unique.has(item)) return false;
    unique.add(item);
  }
  return true;
}

function computeAggregate(orders) {
  const scoreMap = new Map();
  const appearanceMap = new Map();

  for (const trip of trips) {
    scoreMap.set(trip, 0);
    appearanceMap.set(trip, 0);
  }

  for (const entry of orders) {
    const ranking = Array.isArray(entry?.ranking) ? entry.ranking : [];
    const total = ranking.length;
    ranking.forEach((trip, index) => {
      const points = total - index;
      scoreMap.set(trip, scoreMap.get(trip) + points);
      appearanceMap.set(trip, appearanceMap.get(trip) + 1);
    });
  }

  const aggregate = trips.map((trip) => ({
    trip,
    score: scoreMap.get(trip),
    appearances: appearanceMap.get(trip)
  })).sort((a, b) => {
    if (b.score === a.score) {
      return a.trip.localeCompare(b.trip);
    }
    return b.score - a.score;
  });

  return {
    totalOrders: orders.length,
    aggregate
  };
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload));
}

const server = createServer(async (req, res) => {
  const { method, url } = req;

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  if (method === 'GET' && url === '/api/trips') {
    sendJson(res, 200, { trips });
    return;
  }

  if (method === 'GET' && url === '/api/aggregate') {
    try {
      const orders = await loadOrders();
      sendJson(res, 200, computeAggregate(orders));
    } catch (err) {
      console.error(err);
      sendJson(res, 500, { message: 'Failed to load aggregate data.' });
    }
    return;
  }

  if (method === 'POST' && url === '/api/rankings') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        if (!validateRanking(data.ranking)) {
          sendJson(res, 400, { message: 'Invalid ranking payload.' });
          return;
        }
        const orders = await loadOrders();
        const newOrder = {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          createdAt: new Date().toISOString(),
          ranking: data.ranking
        };
        orders.push(newOrder);
        await saveOrders(orders);
        sendJson(res, 201, computeAggregate(orders));
      } catch (err) {
        console.error(err);
        sendJson(res, 500, { message: 'Failed to save ranking.' });
      }
    });
    return;
  }

  res.writeHead(404, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify({ message: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
