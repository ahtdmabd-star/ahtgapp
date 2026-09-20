const mysql = require('mysql2/promise');

// 🔐 আপনার পছন্দমতো ১টি Master Password সেট করুন
const MASTER_PASSWORD = "Earn@$9311*Tk"; // <-- এখানে আপনার পছন্দের লগইন পাসওয়ার্ড লিখুন

// 🗄️ আপনার Aiven Database-এর আসল তথ্যসমূহ
const AIVEN_CONFIG = {
  host: 'mysql-14cc93c7-alhudatechglobal-601b.i.aivencloud.com', // সঠিক host (.i. ছাড়া)
  port: 14363,
  user: 'avnadmin',
  password: 'AVNS_hhfXItvXPam49_lMnOU',
  database: 'defaultdb'
};

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, loginPassword, ...bodyData } = req.body || {};

  // 🔒 Master Password Verification
  if (loginPassword !== MASTER_PASSWORD) {
    return res.status(401).json({ success: false, error: 'ভুল পাসওয়ার্ড! আবার চেষ্টা করুন।' });
  }

  let connection;
  try {
    connection = await mysql.createConnection({
      host: AIVEN_CONFIG.host,
      port: Number(AIVEN_CONFIG.port),
      user: AIVEN_CONFIG.user,
      password: AIVEN_CONFIG.password,
      database: AIVEN_CONFIG.database,
      ssl: { rejectUnauthorized: false },
      connectTimeout: 10000
    });

    if (action === 'connect') {
      await connection.end();
      return res.json({ success: true, message: 'কানেকশন সফল হয়েছে!' });
    }

    if (action === 'tables') {
      const [rows] = await connection.query('SHOW TABLES');
      await connection.end();
      return res.json({ success: true, tables: rows });
    }

    if (action === 'browse-table') {
      const { table } = bodyData;
      const [rows] = await connection.query(`SELECT * FROM \`${table}\` LIMIT 500`);
      const [fields] = await connection.query(`SHOW COLUMNS FROM \`${table}\``);
      await connection.end();
      return res.json({ success: true, rows, columns: fields });
    }

    if (action === 'delete-row') {
      const { table, primaryKeyColumn, primaryKeyValue } = bodyData;
      await connection.query(`DELETE FROM \`${table}\` WHERE \`${primaryKeyColumn}\` = ?`, [primaryKeyValue]);
      await connection.end();
      return res.json({ success: true, message: 'Row deleted' });
    }

    if (action === 'update-row') {
      const { table, primaryKeyColumn, primaryKeyValue, updatedData } = bodyData;
      const setClause = Object.keys(updatedData).map(k => `\`${k}\` = ?`).join(', ');
      const values = [...Object.values(updatedData), primaryKeyValue];
      await connection.query(`UPDATE \`${table}\` SET ${setClause} WHERE \`${primaryKeyColumn}\` = ?`, values);
      await connection.end();
      return res.json({ success: true, message: 'Row updated' });
    }

    if (action === 'drop-column') {
      const { table, column } = bodyData;
      await connection.query(`ALTER TABLE \`${table}\` DROP COLUMN \`${column}\``);
      await connection.end();
      return res.json({ success: true, message: 'Column dropped' });
    }

    if (action === 'drop-table') {
      const { table } = bodyData;
      await connection.query(`DROP TABLE \`${table}\``);
      await connection.end();
      return res.json({ success: true, message: 'Table dropped' });
    }

    if (action === 'execute-sql') {
      const { sql } = bodyData;
      const [result] = await connection.query(sql);
      await connection.end();
      return res.json({ success: true, result });
    }

    await connection.end();
    return res.status(400).json({ success: false, error: 'Invalid Action' });

  } catch (error) {
    if (connection) await connection.end();
    return res.status(500).json({ success: false, error: error.message });
  }
};

