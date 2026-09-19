const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const app = express();
app.use(express.json());
app.use(cors());

// Dynamic Aiven SSL DB Connection
async function getDbConnection(dbConfig) {
  return await mysql.createConnection({
    host: dbConfig.host,
    port: Number(dbConfig.port),
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    ssl: {
      rejectUnauthorized: false
    }
  });
}

// 1. Verify Credentials & Test Connection
app.post('/api/connect', async (req, res) => {
  try {
    const connection = await getDbConnection(req.body);
    await connection.end();
    res.json({ success: true, message: "Aiven Database Connected Successfully!" });
  } catch (error) {
    res.status(401).json({ success: false, error: error.message });
  }
});

// 2. Fetch All Tables
app.post('/api/tables', async (req, res) => {
  try {
    const connection = await getDbConnection(req.body.config);
    const [rows] = await connection.query('SHOW TABLES');
    await connection.end();
    res.json({ success: true, tables: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Execute Custom SQL Queries
app.post('/api/execute-sql', async (req, res) => {
  const { config, sql } = req.body;
  try {
    const connection = await getDbConnection(config);
    const [result] = await connection.query(sql);
    await connection.end();
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Upload & Execute SQL Script File
app.post('/api/upload-sql', upload.single('file'), async (req, res) => {
  try {
    const config = JSON.parse(req.body.config);
    const sqlScript = req.file.buffer.toString('utf8');
    const connection = await getDbConnection(config);
    
    const queries = sqlScript.split(';').filter(q => q.trim() !== '');
    for (let q of queries) {
      if (q.trim()) await connection.query(q);
    }
    await connection.end();
    res.json({ success: true, message: "SQL File Executed Successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = app;

if (process.env.NODE_ENV !== 'production') {
  app.listen(3000, () => console.log('Server running on port 3000'));
}
