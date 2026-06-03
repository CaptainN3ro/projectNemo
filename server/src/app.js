require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Expose paths to plugins so they can resolve server modules and uploads
// without hard-coding environment-specific directory structures
process.env.SERVER_SRC_PATH = __dirname;
// __dirname = /app/src  →  ../uploads = /app/uploads  (where the Docker volume is mounted)
if (!process.env.UPLOAD_DIR) {
  process.env.UPLOAD_DIR = path.join(__dirname, '../uploads');
}
if (!process.env.PLUGINS_DIR) {
  process.env.PLUGINS_DIR = path.join(__dirname, '../plugins');
}

const { initDatabase } = require('./config/database');
const { loadPlugins } = require('./services/pluginService');
const { startReminderScheduler } = require('./services/reminderService');
const { UPLOAD_DIR } = require('./middleware/upload');

const app = express();

app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/uploads', express.static(UPLOAD_DIR));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/pets', require('./routes/pets'));
app.use('/api/pets', require('./routes/vetVisits'));
app.use('/api/pets', require('./routes/medications'));
app.use('/api/pets', require('./routes/bloodWork'));
app.use('/api/pets', require('./routes/stoolDiary'));
app.use('/api/pets', require('./routes/urineDiary'));
app.use('/api/vet-visits', require('./routes/vetVisits')); // attachment-types endpoint
app.use('/api/pets', require('./routes/behaviorDiary'));
app.use('/api/pets', require('./routes/feedingPlan'));
app.use('/api/pets', require('./routes/vaccinations'));
app.use('/api/pets', require('./routes/events'));
app.use('/api/pets', require('./routes/weightDiary'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/statistics', require('./routes/statistics'));
app.use('/api/admin/users', require('./routes/admin/users'));
app.use('/api/admin/plugins', require('./routes/admin/plugins'));
app.use('/api/admin/smtp', require('./routes/admin/smtp'));
app.use('/api/admin/settings', require('./routes/admin/settings'));
app.use('/api/admin/branding', require('./routes/admin/branding'));
app.use('/api/public', require('./routes/public'));

// Public active plugins list (for frontend menu)
const { authenticate } = require('./middleware/auth');
app.get('/api/plugins/active', authenticate, async (req, res) => {
  const { Plugin } = require('./models');
  const plugins = await Plugin.findAll({ where: { active: true } });
  res.json(plugins.map(p => ({
    name: p.name,
    shortName: p.short_name,
    iconPath: p.icon_path,
    menuPlacement: p.menu_placement || 'top'
  })));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3001;

async function start() {
  await initDatabase();
  await loadPlugins(app);
  startReminderScheduler();
  app.listen(PORT, () => console.log(`Project Nemo server running on port ${PORT}`));
}

start().catch(err => { console.error('Startup failed:', err); process.exit(1); });

module.exports = app;
