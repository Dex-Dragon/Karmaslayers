'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = __dirname;
const port = Number(process.env.PORT) || 8080;
const startedAt = Date.now();
const players = new Map();
const messages = [];
let messageSequence = 0;
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.ico': 'image/x-icon' };

function send(res, status, data, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' });
  res.end(typeof data === 'string' ? data : JSON.stringify(data));
}
function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 16_384) { reject(new Error('Request body too large')); req.destroy(); }
    });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (error) { reject(error); }
    });
    req.on('error', reject);
  });
}
function cleanName(value) { return String(value || 'Slayer').replace(/[<>&"'`]/g, '').slice(0, 20) || 'Slayer'; }
function cleanText(value) { return String(value || '').replace(/[<>&"'`]/g, '').trim().slice(0, 120); }

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
    return res.end();
  }
  if (url.pathname === '/api/sync' && req.method === 'POST') {
    try {
      const data = await readJson(req);
      const now = Date.now();
      const id = typeof data.id === 'string' && players.has(data.id) ? data.id : crypto.randomUUID();
      const x = Number(data.x), y = Number(data.y);
      players.set(id, {
        id, name: cleanName(data.name),
        level: Number.isFinite(Number(data.level)) ? Math.max(0, Math.min(50, Number(data.level))) : 1,
        x: Number.isFinite(x) ? Math.max(16, Math.min(2384, x)) : 1190,
        y: Number.isFinite(y) ? Math.max(16, Math.min(1584, y)) : 795,
        updated: now,
      });
      for (const [playerId, player] of players) if (now - player.updated > 7000) players.delete(playerId);
      return send(res, 200, {
        id,
        uptimeMinutes: Math.floor((now - startedAt) / 60_000),
        players: [...players.values()].map(({ id: playerId, name, level, x: px, y: py }) => ({ id: playerId, name, level, x: px, y: py })),
      });
    } catch (error) { return send(res, 400, { error: 'Invalid sync request' }); }
  }
  if (url.pathname === '/api/chat' && req.method === 'POST') {
    try {
      const data = await readJson(req);
      const text = cleanText(data.text);
      if (!text) return send(res, 400, { error: 'Message cannot be empty' });
      if (!players.has(data.id)) return send(res, 401, { error: 'Join the co-op session before chatting' });
      const player = players.get(data.id);
      messages.push({ seq: ++messageSequence, id: player.id, name: player.name, text, time: Date.now() });
      while (messages.length > 100) messages.shift();
      return send(res, 201, { ok: true });
    } catch (error) { return send(res, 400, { error: 'Invalid chat request' }); }
  }
  if (url.pathname === '/api/chat' && req.method === 'GET') {
    const since = Number(url.searchParams.get('since')) || 0;
    return send(res, 200, { messages: messages.filter(message => message.seq > since) });
  }
  const requested = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const file = path.resolve(root, `.${requested}`);
  if (!file.startsWith(root + path.sep) && file !== path.join(root, 'index.html')) return send(res, 403, 'Forbidden', 'text/plain; charset=utf-8');
  fs.readFile(file, (error, content) => {
    if (error) return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
    send(res, 200, content, mime[path.extname(file)] || 'application/octet-stream');
  });
});

server.listen(port, '0.0.0.0', () => console.log(`Slayer's Reach prototype listening on http://localhost:${port}`));
