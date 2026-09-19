const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const multer = require('multer');
const path = require('path'); // Path মডিউল যোগ করা হয়েছে

const upload = multer({ storage: multer.memoryStorage() });

const app = express();
app.use(express.json());
app.use(cors());

// public ফোল্ডারের html/js ফাইলগুলো লোড করার জন্য
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Verify Credentials
app.post('/api/connect', async (req, res) => {
  try {
    const connection = await mysql.createConnection({
      host: req.body.host,
      port: Number(req.body.port),
      user: req.body.user,
      password: req.body.password,
      database: req.body.database,
      ssl: { rejectUnauthorized: false }
    });
    await connection.end();
    res.json({ success: true, message: "Connected!" });
  } catch (error) {
    res.status(401).json({ success: false, error: error.message });
  }
});

async function getDbConnection(dbConfig) {
  return await mysql.createConnection({
    host: dbConfig.host,
    port: Number(dbConfig.port),
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    ssl: { rejectUnauthorized: false }
  });
}

// Get Tables List
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

// Browse Table Data (Rows & Columns)
app.post('/api/browse-table', async (req, res) => {
  const { config, table } = req.body;
  try {
    const connection = await getDbConnection(config);
    const [rows] = await connection.query(`SELECT * FROM \`${table}\` LIMIT 500`);
    const [fields] = await connection.query(`SHOW COLUMNS FROM \`${table}\``);
    await connection.end();
    res.json({ success: true, rows, columns: fields });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete Single Row
app.post('/api/delete-row', async (req, res) => {
  const { config, table, primaryKeyColumn, primaryKeyValue } = req.body;
  try {
    const connection = await getDbConnection(config);
    await connection.query(`DELETE FROM \`${table}\` WHERE \`${primaryKeyColumn}\` = ?`, [primaryKeyValue]);
    await connection.end();
    res.json({ success: true, message: "Row deleted successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update Single Row
app.post('/api/update-row', async (req, res) => {
  const { config, table, primaryKeyColumn, primaryKeyValue, updatedData } = req.body;
  try {
    const connection = await getDbConnection(config);
    const setClause = Object.keys(updatedData).map(key => `\`${key}\` = ?`).join(', ');
    const values = [...Object.values(updatedData), primaryKeyValue];
    await connection.query(`UPDATE \`${table}\` SET ${setClause} WHERE \`${primaryKeyColumn}\` = ?`, values);
    await connection.end();
    res.json({ success: true, message: "Row updated successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Drop/Delete Column
app.post('/api/drop-column', async (req, res) => {
  const { config, table, column } = req.body;
  try {
    const connection = await getDbConnection(config);
    await connection.query(`ALTER TABLE \`${table}\` DROP COLUMN \`${column}\``);
    await connection.end();
    res.json({ success: true, message: `Column ${column} dropped!` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Drop Entire Table
app.post('/api/drop-table', async (req, res) => {
  const { config, table } = req.body;
  try {
    const connection = await getDbConnection(config);
    await connection.query(`DROP TABLE \`${table}\``);
    await connection.end();
    res.json({ success: true, message: `Table ${table} deleted!` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Custom SQL Execution
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

// Upload SQL Script
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
