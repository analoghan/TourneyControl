const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Authentication credentials (in production, use environment variables)
const PASSWORDS = {
  judge: process.env.JUDGES_PASSWORD || 'ata',
  staff: process.env.STAFF_PASSWORD || 'compete2win'
};

const SESSION_DURATION_MS = 48 * 60 * 60 * 1000; // 48 hours, matches the client

if (process.env.NODE_ENV === 'production' && (!process.env.JUDGES_PASSWORD || !process.env.STAFF_PASSWORD)) {
  console.warn('WARNING: JUDGES_PASSWORD and/or STAFF_PASSWORD not set; using the default passwords.');
}

// Secret used to sign session tokens. It is saved to disk so sessions survive a server restart
// mid-tournament; set AUTH_SECRET to manage it yourself.
const loadSecret = () => {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  const secretFile = path.join(__dirname, '.auth-secret');
  try {
    return fs.readFileSync(secretFile, 'utf8').trim();
  } catch {
    const secret = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(secretFile, secret, { mode: 0o600 });
    return secret;
  }
};
const SECRET = loadSecret();

// Each role's signing key includes its password, so changing a password logs out that role
const signingKey = (role) => crypto.createHmac('sha256', SECRET).update(`${role}:${PASSWORDS[role]}`).digest();

const sign = (role, payload) => crypto.createHmac('sha256', signingKey(role)).update(payload).digest('base64url');

const safeEqual = (a, b) => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

const checkPassword = (role, password) =>
  Object.hasOwn(PASSWORDS, role) && typeof password === 'string' && safeEqual(password, PASSWORDS[role]);

// Token format: base64url(JSON {role, exp}) + '.' + HMAC signature
const createToken = (role) => {
  const payload = Buffer.from(JSON.stringify({ role, exp: Date.now() + SESSION_DURATION_MS })).toString('base64url');
  return `${payload}.${sign(role, payload)}`;
};

// Returns { role, exp } for a valid, unexpired token, otherwise null
const verifyToken = (token) => {
  if (typeof token !== 'string') return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!Object.hasOwn(PASSWORDS, session.role)) return null;
    if (!safeEqual(signature, sign(session.role, payload))) return null;
    if (typeof session.exp !== 'number' || session.exp < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
};

// Routes judges may use; every other /api route requires staff. New routes are staff-only by default.
const JUDGE_ROUTES = [
  ['GET', /^\/auth\/session$/],
  ['GET', /^\/tournaments\/active$/],
  ['GET', /^\/tournaments\/\d+\/rings$/],
  ['GET', /^\/rings\/\d+$/],
  ['PUT', /^\/rings\/\d+$/],
  ['GET', /^\/rings\/\d+\/stacked$/],
  ['POST', /^\/rings\/\d+\/stacked$/],
  ['PUT', /^\/stacked-rings\/\d+$/],
  ['DELETE', /^\/stacked-rings\/\d+$/]
];

const isJudgeRoute = (method, routePath) =>
  JUDGE_ROUTES.some(([m, pattern]) => m === method && pattern.test(routePath));

// Express middleware for everything mounted under /api (except login, which is registered first)
const requireAuth = (req, res, next) => {
  const header = req.get('Authorization') || '';
  const session = verifyToken(header.startsWith('Bearer ') ? header.slice(7) : null);
  if (!session) {
    return res.status(401).json({ error: 'Not logged in or session expired' });
  }
  if (session.role !== 'staff' && !isJudgeRoute(req.method, req.path)) {
    return res.status(403).json({ error: 'Staff access required' });
  }
  req.auth = session;
  next();
};

// ws verifyClient hook: the browser can't set headers on a WebSocket, so the token comes in the query string
const verifyWebSocketClient = ({ req }) => {
  const { searchParams } = new URL(req.url, 'http://localhost');
  return verifyToken(searchParams.get('token')) !== null;
};

module.exports = { checkPassword, createToken, requireAuth, verifyWebSocketClient };
