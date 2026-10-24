const router = require('express').Router();
const pool = require('../db/pool');
const { intParam } = require('../utils/helpers');

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*, r.customer_name, r.model 
      FROM repair_payments p 
      JOIN repairs r ON r.repair_id = p.repair_id 
      ORDER BY p.payment_id DESC
    `);
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { repair_id, amount_paid, payment_method, note } = req.body;
    if (!repair_id || !amount_paid) throw new Error('Repair ID iyo lacagta waa loo baahan yahay');
    const { rows } = await pool.query(
      `INSERT INTO repair_payments (repair_id, amount_paid, payment_method, payment_date, note) 
       VALUES ($1, $2, $3, CURRENT_DATE, $4) RETURNING *`,
      [repair_id, amount_paid, payment_method || 'Cash', note || '']
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
});

module.exports = router;