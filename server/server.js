/**
 * GCare Backend Server (Node.js ESM - no external dependencies)
 * Uses a JSON file for data persistence.
 * Run with: node server/server.js
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'db.json');

// ── Simple password hashing (sha256 + salt) ────────────────────────────────
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHmac('sha256', salt).update(password).digest('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const check = crypto.createHmac('sha256', salt).update(password).digest('hex');
  return check === hash;
}

// ── JSON "database" helpers ────────────────────────────────────────────────
function loadDb() {
  if (!fs.existsSync(DB_FILE)) {
    const db = {
      users: [
        {
          id: 1,
          // ✏️  CHANGE ADMIN CREDENTIALS HERE ↓
          email: 'ganesanadmin@gmail.com',          // ← your admin email
          password_hash: hashPassword('Gcare$321'), // ← your admin password
          // ✏️  ──────────────────────────────
          full_name: 'Super Admin',
          role: 'admin',
          service_location: '',
          latitude: 9.5916, // Virudhunagar lat
          longitude: 77.9515, // Virudhunagar lng
          status: 'approved'
        }
      ],
      nextId: 2
    };
    saveDb(db);
    return db;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function saveDb(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// ── HTTP helpers ───────────────────────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => (data += chunk));
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

function send(res, status, body) {
  const isJson = typeof body === 'object' && body !== null;
  res.writeHead(status, {
    'Content-Type': isJson ? 'application/json' : 'text/plain',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(isJson ? JSON.stringify(body) : String(body));
}

// ── Route handlers ─────────────────────────────────────────────────────────
async function handleRegister(req, res) {
  const body = await readBody(req);
  const { email, password, full_name, service_location, latitude, longitude, security_answer } = body;
  if (!email || !password || !full_name || !security_answer) {
    return send(res, 400, 'Missing required fields (including security answer)');
  }
  const db = loadDb();
  if (db.users.find(u => u.email === email)) {
    return send(res, 400, 'Email already exists');
  }
  const newUser = {
    id: db.nextId++,
    email,
    password_hash: hashPassword(password),
    security_hash: hashPassword(security_answer.toLowerCase()),
    role: 'service_member',
    full_name,
    service_location: service_location || '',
    latitude: parseFloat(latitude) || 0,
    longitude: parseFloat(longitude) || 0,
    status: 'pending'
  };
  db.users.push(newUser);
  saveDb(db);
  send(res, 200, 'Registered successfully');
}

async function handleLogin(req, res) {
  const { email, password } = await readBody(req);
  const db = loadDb();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user || !verifyPassword(password, user.password_hash)) {
    return send(res, 401, 'Invalid email or password');
  }
  if (user.status !== 'approved' && user.role !== 'admin') {
    return send(res, 401, 'Account not approved by admin yet.');
  }
  const { password_hash, ...safeUser } = user;
  send(res, 200, { user: safeUser });
}

function handleGetMembers(req, res) {
  const db = loadDb();
  const members = db.users
    .filter(u => u.role === 'service_member')
    .map(({ password_hash, ...u }) => u);
  send(res, 200, members);
}

async function handleUpdateStatus(req, res, id) {
  const { status } = await readBody(req);
  const db = loadDb();
  const user = db.users.find(u => u.id === Number(id));
  if (!user) return send(res, 404, 'User not found');
  user.status = status;
  saveDb(db);
  send(res, 200, 'Status updated');
}

async function handleGoogleLogin(req, res) {
  const { email } = await readBody(req);
  if (!email) return send(res, 400, 'Missing email');
  
  const db = loadDb();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (!user) {
    return send(res, 404, 'This Google account is not registered in GCare. Please register first.');
  }

  const { password_hash, ...safeUser } = user;
  send(res, 200, { user: safeUser });
}

async function handleResetPassword(req, res) {
  const { email, new_password } = await readBody(req);
  if (!email || !new_password) {
    return send(res, 400, 'Missing email or new password');
  }
  const db = loadDb();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return send(res, 404, 'User not found');
  }
  
  user.password_hash = hashPassword(new_password);
  saveDb(db);
  console.log(`\n✅ SUCCESS: Password reset for ${email}`);
  send(res, 200, 'Password updated successfully');
}

// ── Main server ────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = req.url;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return send(res, 204, '');
  }

  if (method === 'POST' && url === '/register') return handleRegister(req, res);
  if (method === 'POST' && url === '/login') return handleLogin(req, res);
  if (method === 'POST' && url === '/google-login') return handleGoogleLogin(req, res);
  if (method === 'POST' && url === '/reset-password') return handleResetPassword(req, res);
  if (method === 'GET' && url === '/members') return handleGetMembers(req, res);

  const statusMatch = url.match(/^\/members\/(\d+)\/status$/);
  if (method === 'POST' && statusMatch) return handleUpdateStatus(req, res, statusMatch[1]);

  send(res, 404, 'Not found');
});

// Seed DB on start
loadDb();

// ── Admin credentials (shown at startup) ─────────────────────────────────
const ADMIN_EMAIL = 'ganesanadmin@gmail.com';
const ADMIN_PASSWORD = 'Gcare$321';

server.listen(PORT, () => {
  console.log(`\n✅ GCare backend running on http://localhost:${PORT}`);
  console.log(`   Admin login: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}\n`);
});
