const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection pool configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'tybacha',
  charset: 'utf8mb4',
  ssl: {
    rejectUnauthorized: true
  },
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000
};

let pool;

// Initialize database connection pool
async function initDB() {
  try {
    pool = mysql.createPool(dbConfig);
    console.log('Connected to MySQL database with connection pool');
    
    // Test the connection
    const connection = await pool.getConnection();
    await connection.execute('SELECT 1');
    connection.release();
    console.log('Database connection test successful');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

// Middleware to check database connection
function checkDB(req, res, next) {
  if (!pool) {
    return res.status(500).json({ error: 'Database not connected' });
  }
  next();
}

// Routes

// Test endpoint
app.get('/api/test', checkDB, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    await connection.execute('SELECT 1');
    connection.release();
    res.json({ status: 'OK', message: 'Database connection successful' });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ error: 'Database test failed' });
  }
});

// Execute query endpoint
app.post('/api/query', checkDB, async (req, res) => {
  let connection;
  try {
    const { sql, params = [] } = req.body;
    
    if (!sql) {
      return res.status(400).json({ error: 'SQL query is required' });
    }

    // Only allow SELECT, SHOW, and DESCRIBE queries for safety
    if (!sql.trim().toUpperCase().startsWith('SELECT') && 
        !sql.trim().toUpperCase().startsWith('SHOW') && 
        !sql.trim().toUpperCase().startsWith('DESCRIBE')) {
      return res.status(403).json({ error: 'Only SELECT, SHOW, and DESCRIBE queries are allowed' });
    }

    connection = await pool.getConnection();
    const [rows] = await connection.execute(sql, params);
    res.json(rows);
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// Execute statement endpoint (INSERT, UPDATE, DELETE)
app.post('/api/execute', checkDB, async (req, res) => {
  let connection;
  try {
    const { sql, params = [] } = req.body;
    
    if (!sql) {
      return res.status(400).json({ error: 'SQL statement is required' });
    }

    connection = await pool.getConnection();
    const [result] = await connection.execute(sql, params);
    
    const response = {
      insertId: result.insertId,
      affectedRows: result.affectedRows,
      data: null
    };

    // For INSERT statements that return data, fetch the inserted record
    if (sql.trim().toUpperCase().startsWith('INSERT') && result.insertId) {
      const tableName = sql.match(/INSERT INTO (\w+)/i)?.[1];
      if (tableName) {
        try {
          const [rows] = await connection.execute(`SELECT * FROM ${tableName} WHERE id = ?`, [result.insertId]);
          response.data = rows;
        } catch (fetchError) {
          console.error('Error fetching inserted data:', fetchError);
        }
      }
    }

    res.json(response);
  } catch (error) {
    console.error('Execute error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// Transaction endpoints
app.post('/api/transaction/begin', checkDB, async (req, res) => {
  try {
    const transactionId = uuidv4();
    // For simplicity, we'll use a single connection for transactions
    // In production, you'd want proper connection pooling
    res.json({ transactionId });
  } catch (error) {
    console.error('Begin transaction error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/transaction/commit', checkDB, async (req, res) => {
  try {
    // For simplicity, just acknowledge
    res.json({ success: true });
  } catch (error) {
    console.error('Commit transaction error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/transaction/rollback', checkDB, async (req, res) => {
  try {
    // For simplicity, just acknowledge
    res.json({ success: true });
  } catch (error) {
    console.error('Rollback transaction error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Authentication endpoints
app.post('/api/auth/login', async (req, res) => {
  let connection;
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    connection = await pool.getConnection();

    // Find user by email
    const [users] = await connection.execute(
      'SELECT * FROM users WHERE email = ? AND is_active = TRUE',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get user profile
    const [profiles] = await connection.execute(
      'SELECT * FROM user_profiles WHERE user_id = ?',
      [user.id]
    );

    const profile = profiles.length > 0 ? profiles[0] : null;

    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = user;

    res.json({
      success: true,
      user: userWithoutPassword,
      profile
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, fullName, role, phone, address, licenseNumber, specialization } = req.body;
    
    if (!email || !password || !fullName || !role) {
      return res.status(400).json({ error: 'Required fields are missing' });
    }

    // Check if user already exists
    const [existingUsers] = await db.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Start transaction
    await db.beginTransaction();

    try {
      // Create user
      const [userResult] = await db.execute(
        'INSERT INTO users (email, password_hash, rol) VALUES (?, ?, ?)',
        [email, passwordHash, role]
      );

      const userId = userResult.insertId;

      // Create user profile
      await db.execute(
        'INSERT INTO user_profiles (user_id, full_name, phone, address, license_number, specialization) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, fullName, phone || null, address || null, licenseNumber || null, specialization || null]
      );

      await db.commit();

      // Get created user and profile
      const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [userId]);
      const [profiles] = await db.execute('SELECT * FROM user_profiles WHERE user_id = ?', [userId]);

      const { password_hash, ...userWithoutPassword } = users[0];

      res.json({
        success: true,
        user: userWithoutPassword,
        profile: profiles[0]
      });
    } catch (transactionError) {
      await db.rollback();
      throw transactionError;
    }
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Patient endpoints
app.get('/api/patients', checkDB, async (req, res) => {
  try {
    const { limit = 20, offset = 0, search } = req.query;
    
    let sql = 'SELECT * FROM patients WHERE is_active = TRUE';
    let params = [];

    if (search) {
      sql += ' AND (first_name LIKE ? OR first_lastname LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [patients] = await db.execute(sql, params);
    res.json(patients);
  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/patients', checkDB, async (req, res) => {
  try {
    const {
      first_name,
      second_name,
      first_lastname,
      second_lastname,
      birth_date,
      gender,
      phone,
      address,
      emergency_contact,
      emergency_phone,
      medical_history,
      allergies,
      medications
    } = req.body;

    if (!first_name || !first_lastname || !gender) {
      return res.status(400).json({ error: 'Required fields are missing' });
    }

    const [result] = await db.execute(
      `INSERT INTO patients (
        first_name, second_name, first_lastname, second_lastname,
        birth_date, gender, phone, address, emergency_contact,
        emergency_phone, medical_history, allergies, medications
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        first_name,
        second_name || null,
        first_lastname,
        second_lastname || null,
        birth_date || null,
        gender,
        phone || null,
        address || null,
        emergency_contact || null,
        emergency_phone || null,
        medical_history || null,
        allergies || null,
        medications || null
      ]
    );

    // Get the created patient
    const [patients] = await db.execute('SELECT * FROM patients WHERE id = ?', [result.insertId]);
    res.json(patients[0]);
  } catch (error) {
    console.error('Create patient error:', error);
    res.status(500).json({ error: error.message });
  }
});

// User profile update endpoint
app.put('/api/user/profile', checkDB, async (req, res) => {
  try {
    const { userId, firstName, lastName, phone } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Update user profile
    const [result] = await db.execute(
      'UPDATE users SET first_name = ?, last_name = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [firstName || null, lastName || null, phone || null, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get updated user data
    const [users] = await db.execute(
      'SELECT id, email, first_name, last_name, phone, rol, created_at, updated_at, is_active FROM users WHERE id = ?',
      [userId]
    );

    const updatedUser = users[0];

    res.json({
      success: true,
      user: updatedUser
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user profile endpoint
app.get('/api/user/profile/:userId', checkDB, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const [users] = await db.execute(
      'SELECT id, email, first_name, last_name, phone, rol, created_at, updated_at, is_active FROM users WHERE id = ? AND is_active = TRUE',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: users[0]
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      services: {
        mysql: false,
        api: true
      }
    };

    if (db) {
      try {
        await db.execute('SELECT 1');
        health.database = 'connected';
        health.services.mysql = true;
      } catch (error) {
        health.status = 'degraded';
        health.database = 'error';
      }
    } else {
      health.status = 'unhealthy';
    }

    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(health);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
async function startServer() {
  await initDB();
  
  app.listen(PORT, () => {
    console.log(`Tybacha backend server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(`Test endpoint: http://localhost:${PORT}/api/test`);
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  if (pool) {
    await pool.end();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  if (pool) {
    await pool.end();
  }
  process.exit(0);
});

startServer().catch(console.error);
