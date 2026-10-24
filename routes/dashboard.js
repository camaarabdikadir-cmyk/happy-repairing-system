const router = require('express').Router();
const pool = require('../db/pool');

router.get('/', async (req, res, next) => {
  try {
    const [repairs, money, recent, low] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS total,
                         COUNT(*) FILTER (WHERE status = 'In Progress')::int AS in_progress,
                         COUNT(*) FILTER (WHERE status = 'Delivered')::int AS delivered
                  FROM repairs`),
      pool.query(`SELECT COALESCE((SELECT SUM(repair_cost) FROM repairs),0)::numeric AS billed,
                         COALESCE((SELECT SUM(amount_paid) FROM repair_payments),0)::numeric AS paid`),
      pool.query(`SELECT r.repair_id, r.customer_name, r.device_type, r.brand, r.model,
                         r.repair_cost, r.status,
                         COALESCE((SELECT SUM(amount_paid) FROM repair_payments p
                                   WHERE p.repair_id = r.repair_id),0)::numeric AS paid
                  FROM repairs r ORDER BY r.repair_id DESC LIMIT 8`),
      pool.query(`SELECT part_id, part_name, brand, current_stock, minimum_stock
                  FROM spare_parts
                  WHERE current_stock <= minimum_stock
                  ORDER BY current_stock ASC`),
    ]);

    const billed = Number(money.rows[0].billed);
    const paid = Number(money.rows[0].paid);

    res.json({
      repairs: repairs.rows[0],
      money: { billed, paid, outstanding: billed - paid },
      recent: recent.rows,
      low_stock: low.rows,
    });
  } catch (e) { next(e); }
});

module.exports = router;