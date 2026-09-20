const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname))); // একই ফোল্ডার থেকে ফ্রন্টএন্ড ফাইল সার্ভ করবে

// 🔐 আপনার Master Password
const MASTER_PASSWORD = "Earn@$9311*Tk";

// 🗄️ Aiven Database Config
const AIVEN_CONFIG = {
  host: 'mysql-14cc93c7-alhudatechglobal-601b.i.aivencloud.com',
  port: 14363,
  user: 'avnadmin',
  password: 'AVNS_hhfXItvXPam49_lMnOU',
  database: 'defaultdb',
  ssl: { rejectUnauthorized: false }
};

// Middleware for Password Check
const verifyPass = (req, res, next) => {
  const pass = req.body.loginPassword;
  if (pass !== MASTER_PASSWORD) {
    return res.status(401).json({ success: false, error: 'ভুল পাসওয়ার্ড! আবার চেষ্টা করুন।' });
  }
  next();
};

// API Endpoints
app.post('/api/connect', verifyPass, (req, res) => {
  res.json({ success: true, message: 'কানেকশন সফল হয়েছে!' });
});

app.post('/api/tables', verifyPass, async (req, res) => {
  try {
    let connection = await mysql.createConnection(AIVEN_CONFIG);
    const [rows] = await connection.query('SHOW TABLES');
    await connection.end();
    res.json({ success: true, tables: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/browse-table', verifyPass, async (req, res) => {
  try {
    const { table } = req.body;
    let connection = await mysql.createConnection(AIVEN_CONFIG);
    const [rows] = await connection.query(`SELECT * FROM \`${table}\` LIMIT 500`);
    const [fields] = await connection.query(`SHOW COLUMNS FROM \`${table}\``);
    await connection.end();
    res.json({ success: true, rows, columns: fields });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/delete-row', verifyPass, async (req, res) => {
  try {
    const { table, primaryKeyColumn, primaryKeyValue } = req.body;
    let connection = await mysql.createConnection(AIVEN_CONFIG);
    await connection.query(`DELETE FROM \`${table}\` WHERE \`${primaryKeyColumn}\` = ?`, [primaryKeyValue]);
    await connection.end();
    res.json({ success: true, message: 'Row deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/update-row', verifyPass, async (req, res) => {
  try {
    const { table, primaryKeyColumn, primaryKeyValue, updatedData } = req.body;
    let connection = await mysql.createConnection(AIVEN_CONFIG);
    const setClause = Object.keys(updatedData).map(k => `\`${k}\` = ?`).join(', ');
    const values = [...Object.values(updatedData), primaryKeyValue];
    await connection.query(`UPDATE \`${table}\` SET ${setClause} WHERE \`${primaryKeyColumn}\` = ?`, values);
    await connection.end();
    res.json({ success: true, message: 'Row updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/drop-column', verifyPass, async (req, res) => {
  try {
    const { table, column } = req.body;
    let connection = await mysql.createConnection(AIVEN_CONFIG);
    await connection.query(`ALTER TABLE \`${table}\` DROP COLUMN \`${column}\``);
    await connection.end();
    res.json({ success: true, message: 'Column dropped' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/drop-table', verifyPass, async (req, res) => {
  try {
    const { table } = req.body;
    let connection = await mysql.createConnection(AIVEN_CONFIG);
    await connection.query(`DROP TABLE \`${table}\``);
    await connection.end();
    res.json({ success: true, message: 'Table dropped' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/execute-sql', verifyPass, async (req, res) => {
  try {
    const { sql } = req.body;
    let connection = await mysql.createConnection(AIVEN_CONFIG);
    const [result] = await connection.query(sql);
    await connection.end();
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
