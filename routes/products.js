const router = require('express').Router();
const pool = require('../db/pool');
const { httpError, intParam } = require('../utils/helpers');

// 1. Soo qaado dhammaan alaabta
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM products ORDER BY product_name');
    res.json(rows);
  } catch (e) { next(e); }
});

// 2. Ku dar alaab cusub
router.post('/', async (req, res, next) => {
  try {
    const { product_name, category, buy_price, sell_price, current_stock } = req.body;
    if (!product_name) throw httpError(400, 'Magaca alaabta waa loo baahan yahay');

    const { rows } = await pool.query(
      `INSERT INTO products (product_name, category, buy_price, sell_price, current_stock)
       VALUES ($1,$2,$3,$4, COALESCE($5,0)) RETURNING *`,
      [product_name, category || null, buy_price ?? 0, sell_price ?? 0, current_stock ?? 0]
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
});

// 3. Tirtir alaabta
router.delete('/:id', async (req, res, next) => {
  try {
    const id = intParam(req.params.id);
    await pool.query('DELETE FROM products WHERE product_id = $1', [id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// 4. Soo geli Stock (Stock In)
router.post('/:id/stock-in', async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const id = intParam(req.params.id);
    const { quantity, buy_price, note } = req.body;
    const qty = Number.parseInt(quantity, 10);
    if (!Number.isInteger(qty) || qty <= 0) throw httpError(400, 'Tirada waa in ay ka badan tahay 0');

    const { rows } = await client.query('SELECT * FROM products WHERE product_id = $1 FOR UPDATE', [id]);
    if (!rows[0]) throw httpError(404, 'Alaabta lama helin');

    await client.query(
      `INSERT INTO stock_in (product_id, quantity, buy_price, date, note)
       VALUES ($1,$2,$3, CURRENT_DATE, $4)`,
      [id, qty, buy_price ?? rows[0].buy_price, note || null]
    );
    await client.query('UPDATE products SET current_stock = current_stock + $1 WHERE product_id = $2', [qty, id]);
    
    await client.query('COMMIT');
    res.status(201).json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    next(e);
  } finally { client.release(); }
});

// 5. IIB ALAABTA (Stock Out / Sales)
router.post('/:id/sell', async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const id = intParam(req.params.id);
    const { quantity, sell_price, note } = req.body;
    const qty = Number.parseInt(quantity, 10);
    if (!Number.isInteger(qty) || qty <= 0) throw httpError(400, 'Tirada waa in ay ka badan tahay 0');

    const { rows } = await client.query('SELECT * FROM products WHERE product_id = $1 FOR UPDATE', [id]);
    const p = rows[0];
    if (!p) throw httpError(404, 'Alaabta lama helin');
    if (p.current_stock < qty) throw httpError(400, `Stock-ku kuma filna. Waxaa hadhay kaliya: ${p.current_stock}`);

    // Keydi iibka
    await client.query(
      `INSERT INTO stock_out (product_id, quantity, sell_price, date, note)
       VALUES ($1,$2,$3, CURRENT_DATE, $4)`,
      [id, qty, sell_price ?? p.sell_price, note || 'Sale']
    );
    // Ka jar stock-ga
    await client.query('UPDATE products SET current_stock = current_stock - $1 WHERE product_id = $2', [qty, id]);

    await client.query('COMMIT');
    res.status(201).json({ ok: true, message: 'Alaabta si guul leh ayaa loo iibiyay' });
  } catch (e) {
    await client.query('ROLLBACK');
    next(e);
  } finally { client.release(); }
});

module.exports = router;