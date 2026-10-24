require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');

(async () => {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  try {
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO users (username, password, role)
       VALUES ($1, $2, 'admin')
       ON CONFLICT (username)
       DO UPDATE SET password = EXCLUDED.password, role = 'admin'`,
      [username, hash]
    );
    console.log(`✅ Admin ready → ${username} / ${password}`);
  } catch (e) {
    console.error('❌ Seed failed:', e.message);
  } finally {
    await pool.end();
  }
})();