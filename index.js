const mysql = require('mysql2/promise');

// 🔐 আপনার Master Password
const MASTER_PASSWORD = "Earn@$9311*Tk";

// 🗄️ আপনার Aiven Database-এর আসল তথ্যসমূহ
const AIVEN_CONFIG = {
  host: 'mysql-14cc93c7-alhudatechglobal-601b.i.aivencloud.com',
  port: 14363,
  user: 'avnadmin',
  password: 'AVNS_hhfXItvXPam49_lMnOU',
  database: 'defaultdb'
};

const server = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      const reqData = JSON.parse(body || '{}');
      const { action, loginPassword, ...bodyData } = reqData;

      // 🔒 Master Password Verification
      if (loginPassword !== MASTER_PASSWORD) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'ভুল পাসওয়ার্ড! আবার চেষ্টা করুন।' }));
        return;
      }

      let connection = await mysql.createConnection({
        host: AIVEN_CONFIG.host,
        port: Number(AIVEN_CONFIG.port),
        user: AIVEN_CONFIG.user,
        password: AIVEN_CONFIG.password,
        database: AIVEN_CONFIG.database,
        ssl: { rejectUnauthorized: false },
        connectTimeout: 10000
      });

      let responseData = {};

      if (action === 'connect') {
        responseData = { success: true, message: 'কানেকশন সফল হয়েছে!' };
      } else if (action === 'tables') {
        const [rows] = await connection.query('SHOW TABLES');
        responseData = { success: true, tables: rows };
      } else if (action === 'browse-table') {
        const { table } = bodyData;
        const [rows] = await connection.query(`SELECT * FROM \`${table}\` LIMIT 500`);
        const [fields] = await connection.query(`SHOW COLUMNS FROM \`${table}\``);
        responseData = { success: true, rows, columns: fields };
      } else if (action === 'delete-row') {
        const { table, primaryKeyColumn, primaryKeyValue } = bodyData;
        await connection.query(`DELETE FROM \`${table}\` WHERE \`${primaryKeyColumn}\` = ?`, [primaryKeyValue]);
        responseData = { success: true, message: 'Row deleted' };
      } else if (action === 'update-row') {
        const { table, primaryKeyColumn, primaryKeyValue, updatedData } = bodyData;
        const setClause = Object.keys(updatedData).map(k => `\`${k}\` = ?`).join(', ');
        const values = [...Object.values(updatedData), primaryKeyValue];
        await connection.query(`UPDATE \`${table}\` SET ${setClause} WHERE \`${primaryKeyColumn}\` = ?`, values);
        responseData = { success: true, message: 'Row updated' };
      } else if (action === 'drop-column') {
        const { table, column } = bodyData;
        await connection.query(`ALTER TABLE \`${table}\` DROP COLUMN \`${column}\``);
        responseData = { success: true, message: 'Column dropped' };
      } else if (action === 'drop-table') {
        const { table } = bodyData;
        await connection.query(`DROP TABLE \`${table}\``);
        responseData = { success: true, message: 'Table dropped' };
      } else if (action === 'execute-sql') {
        const { sql } = bodyData;
        const [result] = await connection.query(sql);
        responseData = { success: true, result };
      } else {
        responseData = { success: false, error: 'Invalid Action' };
      }

      await connection.end();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(responseData));

    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  });
};

const http = require('http');
const PORT = process.env.PORT || 3000;
http.createServer(server).listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
          
