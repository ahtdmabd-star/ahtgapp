// ⚠️ আপনার Render ব্যাকএন্ড লাইভ লিংক এখানে বসাবেন:
const API_URL = "https://your-app-name.onrender.com"; 

let savedPassword = localStorage.getItem('db_master_pass') || '';
let currentTable = null;
let currentColumns = [];
let currentRows = [];

async function apiCall(action, extraData = {}) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, loginPassword: savedPassword, ...extraData })
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: 'Server connection failed: ' + err.message };
  }
}

window.onload = () => {
  if (savedPassword) {
    verifyAndLoad();
  }
};

async function login() {
  savedPassword = document.getElementById('masterPass').value.trim();
  if (!savedPassword) return alert('পাসওয়ার্ড লিখুন');
  verifyAndLoad();
}

async function verifyAndLoad() {
  const data = await apiCall('connect');
  if (data.success) {
    localStorage.setItem('db_master_pass', savedPassword);
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('dashboardSection').classList.remove('hidden');
    loadTables();
  } else {
    alert(data.error || 'লগইন ব্যর্থ হয়েছে!');
    localStorage.removeItem('db_master_pass');
    savedPassword = '';
  }
}

async function loadTables() {
  const data = await apiCall('tables');
  if (data.success) {
    const list = document.getElementById('tableList');
    list.innerHTML = '';
    data.tables.forEach(t => {
      const name = Object.values(t)[0];
      list.innerHTML += `
        <li onclick="selectTable('${name}')" class="p-2 hover:bg-slate-800 rounded cursor-pointer flex justify-between items-center ${currentTable === name ? 'bg-sky-950 text-sky-400 font-bold' : 'text-slate-300'}">
          <span>📋 ${name}</span>
        </li>`;
    });
  } else {
    alert(data.error);
  }
}

function selectTable(name) {
  currentTable = name;
  document.getElementById('dropTableBtn').classList.remove('hidden');
  loadTables();
  browseTable(name);
}

async function browseTable(name) {
  switchTab('browse');
  const data = await apiCall('browse-table', { table: name });
  if (data.success) {
    currentColumns = data.columns;
    currentRows = data.rows;
    renderBrowseView();
    renderStructureView();
  } else {
    alert(data.error);
  }
}

function renderBrowseView() {
  const container = document.getElementById('browseView');
  if (!currentRows || currentRows.length === 0) {
    container.innerHTML = `<p class="text-xs text-amber-400">Table '${currentTable}' is empty.</p>`;
    return;
  }

  const primaryCol = currentColumns.find(c => c.Key === 'PRI')?.Field || currentColumns[0].Field;

  let html = `<table class="w-full text-xs text-left border-collapse min-w-[600px]">
    <thead>
      <tr class="bg-slate-950 border-b border-slate-800 text-sky-400">
        <th class="p-2">Actions</th>
        ${currentColumns.map(c => `<th class="p-2 border-r border-slate-800">${c.Field}</th>`).join('')}
      </tr>
    </thead>
    <tbody>`;

  currentRows.forEach((row, idx) => {
    html += `<tr class="border-b border-slate-800/60 hover:bg-slate-800/40">
      <td class="p-2 space-x-1 whitespace-nowrap">
        <button onclick="editRow(${idx}, '${primaryCol}')" class="bg-blue-600 hover:bg-blue-500 px-2 py-0.5 rounded text-[10px] cursor-pointer">Edit</button>
        <button onclick="deleteRow('${primaryCol}', '${row[primaryCol]}')" class="bg-rose-600 hover:bg-rose-500 px-2 py-0.5 rounded text-[10px] cursor-pointer">Delete</button>
      </td>`;
    currentColumns.forEach(c => {
      html += `<td class="p-2 border-r border-slate-800/50 max-w-[200px] truncate" title="${row[c.Field]}">${row[c.Field] === null ? '<span class="text-slate-600">NULL</span>' : row[c.Field]}</td>`;
    });
    html += `</tr>`;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
}

function renderStructureView() {
  const container = document.getElementById('structureView');
  let html = `<table class="w-full text-xs text-left border-collapse">
    <thead>
      <tr class="bg-slate-950 border-b border-slate-800 text-sky-400">
        <th class="p-2">Column Field</th>
        <th class="p-2">Data Type</th>
        <th class="p-2">Null</th>
        <th class="p-2">Key</th>
        <th class="p-2">Action</th>
      </tr>
    </thead>
    <tbody>`;

  currentColumns.forEach(c => {
    html += `<tr class="border-b border-slate-800/60">
      <td class="p-2 font-semibold text-slate-200">${c.Field}</td>
      <td class="p-2 text-slate-400 font-mono">${c.Type}</td>
      <td class="p-2 text-slate-400">${c.Null}</td>
      <td class="p-2 text-amber-400 font-semibold">${c.Key}</td>
      <td class="p-2">
        <button onclick="dropColumn('${c.Field}')" class="bg-rose-600 hover:bg-rose-500 px-2 py-0.5 rounded text-[10px] cursor-pointer">Drop Column</button>
      </td>
    </tr>`;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
}

async function deleteRow(primaryCol, primaryVal) {
  if (!confirm(`Delete row where ${primaryCol} = '${primaryVal}'?`)) return;
  const data = await apiCall('delete-row', { table: currentTable, primaryKeyColumn: primaryCol, primaryKeyValue: primaryVal });
  if (data.success) browseTable(currentTable);
  else alert(data.error);
}

async function editRow(rowIdx, primaryCol) {
  const row = currentRows[rowIdx];
  const newVal = prompt(`Update JSON for ${primaryCol} = ${row[primaryCol]}:`, JSON.stringify(row));
  if (!newVal) return;
  try {
    const updatedData = JSON.parse(newVal);
    const data = await apiCall('update-row', { table: currentTable, primaryKeyColumn: primaryCol, primaryKeyValue: row[primaryCol], updatedData });
    if (data.success) browseTable(currentTable);
    else alert(data.error);
  } catch (err) { alert('Invalid JSON format'); }
}

async function dropColumn(colName) {
  if (!confirm(`Drop column '${colName}'?`)) return;
  const data = await apiCall('drop-column', { table: currentTable, column: colName });
  if (data.success) browseTable(currentTable);
  else alert(data.error);
}

async function dropCurrentTable() {
  if (!confirm(`DROP table '${currentTable}'?`)) return;
  const data = await apiCall('drop-table', { table: currentTable });
  if (data.success) {
    currentTable = null;
    loadTables();
    document.getElementById('browseView').innerHTML = '<p class="text-xs text-slate-500">Select a table.</p>';
  } else alert(data.error);
}

function switchTab(tab) {
  document.getElementById('browseView').classList.add('hidden');
  document.getElementById('structureView').classList.add('hidden');
  document.getElementById('sqlView').classList.add('hidden');

  document.getElementById('tabBrowseBtn').className = 'bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded text-xs font-semibold cursor-pointer';
  document.getElementById('tabStructBtn').className = 'bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded text-xs font-semibold cursor-pointer';
  document.getElementById('tabSqlBtn').className = 'bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded text-xs font-semibold cursor-pointer';

  if (tab === 'browse') {
    document.getElementById('browseView').classList.remove('hidden');
    document.getElementById('tabBrowseBtn').className = 'bg-sky-600 px-3 py-1.5 rounded text-xs font-semibold cursor-pointer';
  } else if (tab === 'structure') {
    document.getElementById('structureView').classList.remove('hidden');
    document.getElementById('tabStructBtn').className = 'bg-sky-600 px-3 py-1.5 rounded text-xs font-semibold cursor-pointer';
  } else if (tab === 'sql') {
    document.getElementById('sqlView').classList.remove('hidden');
    document.getElementById('tabSqlBtn').className = 'bg-sky-600 px-3 py-1.5 rounded text-xs font-semibold cursor-pointer';
  }
}

async function runSQL() {
  const sql = document.getElementById('sqlQuery').value.trim();
  const data = await apiCall('execute-sql', { sql });
  document.getElementById('sqlResult').innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
  loadTables();
}

function logout() {
  localStorage.removeItem('db_master_pass');
  location.reload();
}
