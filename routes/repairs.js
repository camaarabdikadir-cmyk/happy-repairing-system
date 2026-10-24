const router = require('express').Router();
const pool = require('../db/pool');
const { httpError, intParam } = require('../utils/helpers');

const LIST_SQL = `
  SELECT r.*,
         sp.part_name,
         COALESCE(p.paid, 0)::numeric AS paid,
         (COALESCE(r.repair_cost, 0) - COALESCE(p.paid, 0))::numeric AS balance
  FROM repairs r
  LEFT JOIN spare_parts sp ON sp.part_id = r.spare_part_id
  LEFT JOIN (
    SELECT repair_id, SUM(amount_paid) AS paid
    FROM repair_payments
    GROUP BY repair_id
  ) p ON p.repair_id = r.repair_id
`;

router.get('/', async (req, res, next) => {
  try {
    const { status, q } = req.query;
    const where = [];
    const params = [];

    if (status) {
      params.push(status);
      where.push(`r.status = $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      where.push(`(r.customer_name ILIKE $${params.length} OR r.customer_phone ILIKE $${params.length} OR r.model ILIKE $${params.length})`);
    }

    const sql = LIST_SQL + (where.length ? ' WHERE ' + where.join(' AND ') : '') + ' ORDER BY r.repair_id DESC';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (e) { next(e); }
});
/* GET /api/repairs/:id */
router.get('/:id', async (req, res, next) => {
  try {
    const id = intParam(req.params.id);
    const { rows } = await pool.query(LIST_SQL + ' WHERE r.repair_id = $1', [id]);
    if (!rows[0]) throw httpError(404, 'Repair-ka lama helin');

    const { rows: payments } = await pool.query(
      'SELECT * FROM repair_payments WHERE repair_id = $1 ORDER BY payment_id DESC',
      [id]
    );
    res.json({ ...rows[0], payments });
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const b = req.body;
    if (!b.customer_name) throw httpError(400, 'Magaca macmiilka waa loo baahan yahay');

    const repairType = b.repair_type === 'Spare Part' ? 'Spare Part' : 'No Spare Part';
    const qty = Math.max(1, Number.parseInt(b.spare_part_quantity, 10) || 1);

    let part = null;
    let sparePartsCost = 0;

    if (repairType === 'Spare Part' && b.spare_part_id) {
      const { rows } = await client.query('SELECT * FROM spare_parts WHERE part_id = $1 FOR UPDATE', [b.spare_part_id]);
      part = rows[0];
      if (!part) throw httpError(400, 'Qeybta spare part-ka lama helin');
      if (part.current_stock < qty) throw httpError(400, `Stock-ku kuma filna. Waxaa hadhay: ${part.current_stock}`);
      sparePartsCost = Number(part.sell_price || 0) * qty;
    }

    const { rows } = await client.query(
      `INSERT INTO repairs
        (customer_name, customer_phone, customer_address, device_type, brand, model,
         imei_serial, problem, repair_description, repair_cost, received_date, start_date,
         status, repair_type, spare_part_id, spare_part_quantity, spare_parts_cost)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, COALESCE($11, CURRENT_DATE), $12, $13, $14, $15, $16, $17)
       RETURNING *`,
      [b.customer_name, b.customer_phone || null, b.customer_address || null, b.device_type || null,
       b.brand || null, b.model || null, b.imei_serial || null, b.problem || null,
       b.repair_description || null, b.repair_cost ?? 0, b.received_date || null, b.start_date || null,
       b.status || 'In Progress', repairType, part ? part.part_id : null, part ? qty : 1, sparePartsCost]
    );

    const repair = rows[0];

    if (part) {
      await client.query('UPDATE spare_parts SET current_stock = current_stock - $1 WHERE part_id = $2', [qty, part.part_id]);
      await client.query(
        `INSERT INTO spare_parts_stock_out (part_id, quantity, sell_price, repair_id, date, note)
         VALUES ($1,$2,$3,$4, CURRENT_DATE, $5)`,
        [part.part_id, qty, part.sell_price, repair.repair_id, `Used for repair #${repair.repair_id}`]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(repair);
  } catch (e) {
    await client.query('ROLLBACK');
    next(e);
  } finally {
    client.release();
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = intParam(req.params.id);
    const allowed = ['customer_name', 'customer_phone', 'customer_address', 'device_type', 'brand', 'model', 'imei_serial', 'problem', 'repair_description', 'repair_cost', 'received_date', 'start_date', 'status'];
    const sets = [], params = [];
    for (const key of allowed) {
      if (key in req.body) { params.push(req.body[key] === '' ? null : req.body[key]); sets.push(`${key} = $${params.length}`); }
    }
    if (!sets.length) throw httpError(400, 'Waxba lama beddelin');
    params.push(id);
    const { rows } = await pool.query(`UPDATE repairs SET ${sets.join(', ')} WHERE repair_id = $${params.length} RETURNING *`, params);
    res.json(rows[0]);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const id = intParam(req.params.id);
    const { rows } = await client.query('SELECT * FROM repairs WHERE repair_id = $1 FOR UPDATE', [id]);
    const repair = rows[0];
    if (!repair) throw httpError(404, 'Repair-ka lama helin');
    if (repair.spare_part_id && repair.spare_part_quantity) {
      await client.query('UPDATE spare_parts SET current_stock = current_stock + $1 WHERE part_id = $2', [repair.spare_part_quantity, repair.spare_part_id]);
    }
    await client.query('DELETE FROM repairs WHERE repair_id = $1', [id]);
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    next(e);
  } finally { client.release(); }
});

module.exports = router;