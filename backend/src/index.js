const path = require('path');
const dotenv = require('dotenv');

// Load root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const express = require('express');
const cors = require('cors');
const { checkDatabaseConnection } = require('./db');
const documentRoutes = require('./routes/documentRoutes');
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
    // Allow requests with no origin (e.g., mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive in local dev environment
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'ai-knowledge-workspace-backend',
    timestamp: new Date().toISOString()
  });
});

// Mount document routes
app.use('/api/documents', documentRoutes);

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
