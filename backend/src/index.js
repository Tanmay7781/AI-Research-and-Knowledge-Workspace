const path = require('path');
const dotenv = require('dotenv');

// Load .env from root project folder first, fallback to backend folder
const rootEnvPath = path.resolve(__dirname, '../../.env');
const backendEnvPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: rootEnvPath });
dotenv.config({ path: backendEnvPath });

/**
 * Safe configuration check: confirms whether GEMINI_API_KEY is present
 * without ever logging or exposing the actual secret key.
 */
function isGeminiConfigured() {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key.trim().length > 0 && !key.includes('your_gemini_api_key_here'));
}

const express = require('express');
const cors = require('cors');
const { checkDatabaseConnection } = require('./db');
const documentRoutes = require('./routes/documentRoutes');
const workspaceRoutes = require('./routes/workspaceRoutes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration for React frontend running on port 5173
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint with safe configuration status
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'ai-knowledge-workspace-backend',
    timestamp: new Date().toISOString(),
    geminiConfigured: isGeminiConfigured()
  });
});

// Dedicated safe configuration check endpoint
app.get('/api/config', (req, res) => {
  res.status(200).json({
    geminiConfigured: isGeminiConfigured(),
    model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
    database: process.env.DB_NAME || 'ai_knowledge_workspace'
  });
});

// Mount document routes
app.use('/api/documents', documentRoutes);

// Mount workspace routes
app.use('/api/workspaces', workspaceRoutes);

// Catch 404
app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.originalUrl}` });
});

// Centralized error handling
app.use(errorHandler);

// Start server
const server = app.listen(PORT, async () => {
  console.log(`\n==============================================`);
  console.log(`Backend API server running on: http://localhost:${PORT}`);
  console.log(`Frontend expected origin: http://localhost:5173`);
  console.log(`==============================================`);

  // Safe configuration status check without exposing secrets
  const hasGeminiKey = isGeminiConfigured();
  console.log(`Gemini API: ${hasGeminiKey ? 'Configured (key detected in root .env)' : 'NOT configured (missing GEMINI_API_KEY in .env)'}`);

  // Verify database connection asynchronously
  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.connected) {
    console.log(`Database connected successfully to [${dbStatus.database}].`);
  } else {
    console.warn(`PostgreSQL notice: ${dbStatus.error}`);
    console.warn(`(Ensure credentials in .env are configured and PostgreSQL service is active.)\n`);
  }
});

module.exports = app;
