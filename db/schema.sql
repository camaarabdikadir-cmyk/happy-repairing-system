CREATE TABLE IF NOT EXISTS users (
  user_id     SERIAL PRIMARY KEY,
  username    VARCHAR(50) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  role        VARCHAR(20) NOT NULL DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS products (
  product_id    SERIAL PRIMARY KEY,
  product_name  VARCHAR(100) NOT NULL,
  category      VARCHAR(50),
  buy_price     NUMERIC(10,2),
  sell_price    NUMERIC(10,2),
  current_stock INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS stock_in (
  stock_in_id SERIAL PRIMARY KEY,
  product_id  INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  quantity    INTEGER NOT NULL,
  buy_price   NUMERIC(10,2),
  date        DATE,
  note        VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS stock_out (
  stock_out_id SERIAL PRIMARY KEY,
  product_id   INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  quantity     INTEGER NOT NULL,
  sell_price   NUMERIC(10,2),
  date         DATE,
  note         VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS spare_parts (
  part_id       SERIAL PRIMARY KEY,
  part_name     VARCHAR(100) NOT NULL,
  brand         VARCHAR(50),
  buy_price     NUMERIC(10,2),
  sell_price    NUMERIC(10,2),
  current_stock INTEGER DEFAULT 0,
  minimum_stock INTEGER DEFAULT 5,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS repairs (
  repair_id            SERIAL PRIMARY KEY,
  customer_name        VARCHAR(100) NOT NULL,
  customer_phone       VARCHAR(20),
  customer_address     TEXT,
  device_type          VARCHAR(50),
  brand                VARCHAR(50),
  model                VARCHAR(50),
  imei_serial          VARCHAR(50),
  problem              TEXT,
  repair_description   TEXT,
  repair_cost          NUMERIC(10,2),
  received_date        DATE,
  start_date           DATE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status               VARCHAR(30) NOT NULL DEFAULT 'In Progress',
  repair_type          VARCHAR(30) NOT NULL DEFAULT 'No Spare Part',
  spare_part_id        INTEGER REFERENCES spare_parts(part_id) ON DELETE SET NULL,
  spare_part_quantity  INTEGER DEFAULT 1,
  spare_parts_cost     NUMERIC(10,2) DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS repair_payments (
  payment_id     SERIAL PRIMARY KEY,
  repair_id      INTEGER NOT NULL REFERENCES repairs(repair_id) ON DELETE CASCADE,
  amount_paid    NUMERIC(10,2),
  payment_method VARCHAR(50),
  payment_date   DATE,
  note           TEXT
);

CREATE TABLE IF NOT EXISTS spare_parts_stock_in (
  stock_in_id SERIAL PRIMARY KEY,
  part_id     INTEGER NOT NULL REFERENCES spare_parts(part_id) ON DELETE CASCADE,
  quantity    INTEGER NOT NULL,
  buy_price   NUMERIC(10,2),
  date        DATE,
  note        VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS spare_parts_stock_out (
  stock_out_id SERIAL PRIMARY KEY,
  part_id      INTEGER NOT NULL REFERENCES spare_parts(part_id) ON DELETE CASCADE,
  quantity     INTEGER NOT NULL,
  sell_price   NUMERIC(10,2),
  repair_id    INTEGER REFERENCES repairs(repair_id) ON DELETE SET NULL,
  date         DATE,
  note         VARCHAR(100)
);