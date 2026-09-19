let dbConfig = null;
let lastOutputData = null;

async function login() {
  dbConfig = {
    host: document.getElementById('host').value.trim(),
    port: document.getElementById('port').value.trim(),
    user: document.getElementById('user').value.trim(),
    password: document.getElementById('password').value.trim(),
    database: document.getElementById('database').value.trim()
  };

  if(!dbConfig.host || !dbConfig.password) {
    alert("Please fill in Host and Password");
    return;
  }

  try {
    const res = await fetch('/api/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dbConfig)
    });

    const data = await res.json();
    if (data.success) {
      document.getElementById('loginSection').classList.add('hidden');
      document.getElementById('dashboardSection').classList.remove('hidden');
      loadTables();
    } else {
      alert('Connection Failed: ' + data.error);
    }
  } catch (err) {
    alert('Server Error: ' + err.message);
  }
}

async function loadTables() {
  try {
    const res = await fetch('/api/tables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: dbConfig })
    });
    const data = await res.json();
    if (data.success) {
      const list = document.getElementById('tableList');
      list.innerHTML = '';
      if(data.tables.length === 0) {
        list.innerHTML = '<li class="text-xs text-slate-500 italic p-1">No tables found</li>';
        return;
      }
      data.tables.forEach(t => {
        const tableName = Object.values(t)[0];
        list.innerHTML += `<li onclick="selectTable('${tableName}')" class="p-2 hover:bg-slate-700/50 rounded cursor-pointer transition text-emerald-300 hover:text-white">📄 ${tableName}</li>`;
      });
    }
  } catch (err) {
    console.error(err);
  }
}

async function runSQL() {
  const sql = document.getElementById('sqlQuery').value.trim();
  if(!sql) return alert("Please enter an SQL query");

  try {
    const res = await fetch('/api/execute-sql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: dbConfig, sql })
    });
    const data = await res.json();
    lastOutputData = data;
    document.getElementById('outputArea').innerHTML = `<pre class="whitespace-pre-wrap">${JSON.stringify(data, null, 2)}</pre>`;
    loadTables();
  } catch (err) {
    alert('Execution Error: ' + err.message);
  }
}

async function uploadSQL() {
  const fileInput = document.getElementById('sqlFile');
  if(!fileInput.files[0]) return alert("Please select an .sql file");

  const formData = new FormData();
  formData.append('file', fileInput.files[0]);
  formData.append('config', JSON.stringify(dbConfig));

  try {
    const res = await fetch('/api/upload-sql', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    alert(data.message || data.error);
    loadTables();
  } catch (err) {
    alert('Upload Error: ' + err.message);
  }
}

function selectTable(name) {
  document.getElementById('sqlQuery').value = `SELECT * FROM ${name};`;
  runSQL();
}

function downloadBackup() {
  if (!lastOutputData) return alert("No data to download!");
  const blob = new Blob([JSON.stringify(lastOutputData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `aiven_db_output_${Date.now()}.json`;
  a.click();
}

function logout() {
  location.reload();
}
