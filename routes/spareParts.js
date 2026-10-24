const router = require('express').Router();
const pool = require('../db/pool');
const { httpError, intParam } = require('../utils/helpers');

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM spare_parts ORDER BY part_name');
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { part_name, brand, buy_price, sell_price, current_stock, minimum_stock } = req.body;
    if (!part_name) throw httpError(400, 'Magaca qeybta waa loo baahan yahay');
    const { rows } = await pool.query(
      `INSERT INTO spare_parts (part_name, brand, buy_price, sell_price, current_stock, minimum_stock)
       VALUES ($1,$2,$3,$4, COALESCE($5,0), COALESCE($6,5)) RETURNING *`,
      [part_name, brand || null, buy_price || 0, sell_price || 0, current_stock || 0, minimum_stock || 5]
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
});

router.post('/:id/stock-in', async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const id = intParam(req.params.id);
    const { quantity, buy_price, note } = req.body;
    const qty = Number.parseInt(quantity, 10);
    if (qty <= 0) throw httpError(400, 'Tirada waa in ay ka badan tahay 0');

    await client.query(
      `INSERT INTO spare_parts_stock_in (part_id, quantity, buy_price, date, note) VALUES ($1,$2,$3, CURRENT_DATE, $4)`,
      [id, qty, buy_price || 0, note || '']
    );
    await client.query('UPDATE spare_parts SET current_stock = current_stock + $1 WHERE part_id = $2', [qty, id]);
    await client.query('COMMIT');
    res.status(201).json({ ok: true });
  } catch (e) { await client.query('ROLLBACK'); next(e); } finally { client.release(); }
});

module.exports = router;