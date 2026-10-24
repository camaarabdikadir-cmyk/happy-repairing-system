require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../db/pool');

(async () => {
  try {
    const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
    await pool.query(sql);
    console.log('✅ Schema applied successfully');
  } catch (e) {
    console.error('❌ Migration failed:', e.message);
  } finally {
    await pool.end();
  }
})();