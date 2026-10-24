require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const auth = require('./middleware/auth');

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/repairs', auth, require('./routes/repairs'));
app.use('/api/payments', auth, require('./routes/payments'));
app.use('/api/spare-parts', auth, require('./routes/spareParts'));
app.use('/api/products', auth, require('./routes/products'));
app.use('/api/dashboard', auth, require('./routes/dashboard'));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ Server-ku wuxuu ka shaqaynayaa: http://localhost:${port}`));