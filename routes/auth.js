const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const auth = require('../middleware/auth'); // Waa in middleware-ka la soo qaataa
const { httpError } = require('../utils/helpers');

// ==========================================
// POST /api/auth/login (Gelitaanka System-ka)
// ==========================================
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) throw httpError(400, 'Username iyo Password waa loo baahan yahay');

    const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = rows[0];
    if (!user) throw httpError(401, 'Username ama Password-ka waa khaldan yahay');

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw httpError(401, 'Username ama Password-ka waa khaldan yahay');

    // Samee Token-ka (wuxuu dhacayaa 8 saacadood kadib)
    const token = jwt.sign(
      { user_id: user.user_id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, user: { id: user.user_id, username: user.username, role: user.role } });
  } catch (e) { next(e); }
});

// ==========================================
// GET /api/auth/me (Hubi qofka hadda login-ka ah)
// ==========================================
router.get('/me', auth, async (req, res) => {
  res.json(req.user);
});

// ==========================================
// GET /api/auth/users (Admin kaliya ayaa arki kara)
// ==========================================
router.get('/users', auth, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') throw httpError(403, 'Ma lihid fasax (Admin kaliya ayaa arki kara)');
    
    const { rows } = await pool.query('SELECT user_id, username, role, created_at FROM users ORDER BY user_id DESC');
    res.json(rows);
  } catch (e) { next(e); }
});

// ==========================================
// POST /api/auth/users (Admin kaliya ayaa dad cusub dari kara)
// ==========================================
router.post('/users', auth, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') throw httpError(403, 'Ma lihid fasax');
    
    const { username, password, role } = req.body;
    if (!username || !password || !role) throw httpError(400, 'Dhammaan xogta waa loo baahan yahay');

    // Hubi haddii username-ku horay u jiray
    const { rows: existing } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (existing.length > 0) throw httpError(400, 'Username-kan hore ayaa loo isticmaalay');

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING user_id, username, role`,
      [username, hash, role]
    );
    
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
});

// ==========================================
// DELETE /api/auth/users/:id (Admin kaliya)
// ==========================================
router.delete('/users/:id', auth, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') throw httpError(403, 'Ma lihid fasax');
    
    const id = Number(req.params.id);
    if (id === req.user.user_id) throw httpError(400, 'Ma tirtiri kartid account-kaaga');
    
    await pool.query('DELETE FROM users WHERE user_id = $1', [id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;