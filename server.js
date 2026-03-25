require('dotenv').config();
const express       = require('express');
const path          = require('path');
const helmet        = require('helmet');
const cors          = require('cors');
const rateLimit     = require('express-rate-limit');
const session       = require('express-session');
const methodOverride = require('method-override');

const indexRoutes        = require('./routes/index');
const courseRoutes       = require('./routes/courses');
const registrationRoutes = require('./routes/registration');
const adminRoutes        = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 3000;

// Trust Railway's reverse proxy so secure cookies work over HTTPS
app.set('trust proxy', 1);

// ── Security headers ─────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'",
        "https://cdnjs.cloudflare.com",
        "https://fonts.googleapis.com",
        "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  }
}));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

// ── Session ──────────────────────────────────────────────────────────────────
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'kanban-uno-dev-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
};

// Use PostgreSQL session store in production
if (process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
  const pgSession = require('connect-pg-simple')(session);
  const { pool } = require('./config/database');
  sessionConfig.store = new pgSession({ pool, createTableIfMissing: true });
}

app.use(session(sessionConfig));

// ── Static files & view engine ─────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/',        indexRoutes);
app.use('/courses', courseRoutes);
app.use('/api',     registrationRoutes);
app.use('/admin',   adminRoutes);

// ── Error pages ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('404', { title: '404 - Page Not Found', currentPage: '' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).render('500', { title: 'Server Error', currentPage: '' });
});

// ── Start ────────────────────────────────────────────────────────────────────
async function start() {
  if (process.env.DATABASE_URL) {
    const { initializeDatabase } = require('./config/database');
    await initializeDatabase();
  } else {
    console.warn('⚠️  DATABASE_URL not set — running without database.');
  }

  app.listen(PORT, () => {
    console.log(`✅ Kanban.UNO server running on http://localhost:${PORT}`);
    console.log(`   Admin panel: http://localhost:${PORT}/admin`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
