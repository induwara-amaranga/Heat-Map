// db.js - PostgreSQL Connection Pool Setup

const { Pool } = require('pg');

// Create a new PostgreSQL pool using your local database credentials
const pool = new Pool({
  user: 'postgres',           // PostgreSQL username (default: 'postgres')
  host: 'localhost',          // Database server host (default: 'localhost')
  database: 'heatmap_db',     // Database name (the one you created in pgAdmin)
  password: '###123induwara',  // Your chosen password
  port: 5432,                 // PostgreSQL server port (default: 5432)
});

// Export the pool to use in your API routes
module.exports = pool;
