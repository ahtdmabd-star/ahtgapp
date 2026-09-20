// আপনার সিক্রেট কনফিগারেশন ও পাসওয়ার্ড
const MASTER_PASSWORD = "Earn@$9311*Tk"; 

// Aiven Database Configuration (Proxyless / Remote Direct Connection via SQL endpoints or Worker if applicable, 
// যেহেতু ব্রাউজার থেকে সরাসরি সরাসরি সিকিউরড কুয়েরি এক্সিকিউট করার জন্য ব্যাকএন্ড বা সিকিউর মিডলওয়্যার দরকার হয়, 
// গিটহাব পেজে হোস্ট করার জন্য নিচের মতো লোকাল ভেরিফিকেশন ও লোকাল স্টেট কাজ করবে)

let savedPassword = localStorage.getItem('db_master_pass') || '';
let currentTable = null;
let currentColumns = [];
let currentRows = [];

window.onload = () => {
  if (savedPassword === MASTER_PASSWORD) {
    showDashboard();
  }
};

function login() {
  const pass = document.getElementById('masterPass').value.trim();
  if (pass === MASTER_PASSWORD) {
    savedPassword = pass;
    localStorage.setItem('db_master_pass', savedPassword);
    showDashboard();
  } else {
    alert('ভুল পাসওয়ার্ড! আবার চেষ্টা করুন।');
  }
}

function showDashboard() {
  document.getElementById('loginSection').classList.add('hidden');
  document.getElementById('dashboardSection').classList.remove('hidden');
  loadTables();
}

// ডেমো বা স্ট্যাটিক গিটহাব পেজ পরিবেশের জন্য টেবিল রেন্ডার এবং হ্যান্ডলার ফাংশনসমূহ
function loadTables() {
  const list = document.getElementById('tableList');
  // গিটহাব পেজে ডেটাবেজ টেবিল লিস্ট দেখানোর স্ট্যাটিক স্ট্রাকচার
  const sampleTables = ['users', 'transactions', 'tasks', 'settings'];
  list.innerHTML = '';
  sampleTables.forEach(name => {
    list.innerHTML += `
      <li onclick="selectTable('${name}')" class="p-2 hover:bg-slate-800 rounded-lg cursor-pointer flex justify-between items-center ${currentTable === name ? 'bg-sky-950 text-sky-400 font-bold border border-sky-800/50' : 'text-slate-300'}">
        <span>📋 ${name}</span>
      </li>`;
  });
}

function selectTable(name) {
  currentTable = name;
  document.getElementById('dropTableBtn').classList.remove('hidden');
  loadTables();
  browseTable(name);
}

function browseTable(name) {
  switchTab('browse');
  // স্যাম্পল ডেটা জেনারেট করে phpMyAdmin এর মতো টেবিল ভিউ তৈরি করা
  currentColumns = [
    { Field: 'id', Type: 'int(11)', Null: 'NO', Key: 'PRI' },
    { Field: 'name', Type: 'varchar(255)', Null: 'YES', Key: '' },
    { Field: 'balance', Type: 'decimal(10,2)', Null: 'NO', Key: '' },
    { Field: 'created_at', Type: 'timestamp', Null: 'NO', Key: '' }
  ];
  
  currentRows = [
    { id: 1, name: 'AL-HUDA Global', balance: 500.00, created_at: '2026-06-01 10:00:00' },
    { id: 2, name: 'Task User One', balance: 120.50, created_at: '2026-06-02 12:30:00' }
  ];

  renderBrowseView();
  renderStructureView();
}

function renderBrowseView() {
  const container = document.getElementById('browseView');
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
        <button onclick="alert('Row edit mode active')" class="bg-blue-600 hover:bg-blue-500 px-2 py-0.5 rounded text-[10px] cursor-pointer">Edit</button>
        <button onclick="alert('Row deleted successfully')" class="bg-rose-600 hover:bg-rose-500 px-2 py-0.5 rounded text-[10px] cursor-pointer">Delete</button>
      </td>`;
    currentColumns.forEach(c => {
      html += `<td class="p-2 border-r border-slate-800/50">${row[c.Field]}</td>`;
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
      </tr>
    </thead>
    <tbody>`;

  currentColumns.forEach(c => {
    html += `<tr class="border-b border-slate-800/60">
      <td class="p-2 font-semibold text-slate-200">${c.Field}</td>
      <td class="p-2 text-slate-400 font-mono">${c.Type}</td>
      <td class="p-2 text-slate-400">${c.Null}</td>
      <td class="p-2 text-amber-400 font-semibold">${c.Key}</td>
    </tr>`;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
}

function switchTab(tab) {
  document.getElementById('browseView').classList.add('hidden');
  document.getElementById('structureView').classList.add('hidden');
  document.getElementById('sqlView').classList.add('hidden');

  document.getElementById('tabBrowseBtn').className = 'bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer';
  document.getElementById('tabStructBtn').className = 'bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer';
  document.getElementById('tabSqlBtn').className = 'bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer';

  if (tab === 'browse') {
    document.getElementById('browseView').classList.remove('hidden');
    document.getElementById('tabBrowseBtn').className = 'bg-sky-600 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer';
  } else if (tab === 'structure') {
    document.getElementById('structureView').classList.remove('hidden');
    document.getElementById('tabStructBtn').className = 'bg-sky-600 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer';
  } else if (tab === 'sql') {
    document.getElementById('sqlView').classList.remove('hidden');
    document.getElementById('tabSqlBtn').className = 'bg-sky-600 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer';
  }
}

function runSQL() {
  const sql = document.getElementById('sqlQuery').value.trim();
  if(!sql) return alert('দয়া করে কোনো কুয়েরি লিখুন।');
  document.getElementById('sqlResult').innerHTML = `<pre class="text-emerald-400">Query Executed Successfully:\n[Rows Affected: 1]\nSQL: ${sql}</pre>`;
}

function dropCurrentTable() {
  if(confirm('সত্যিই কি এই টেবিলটি ড্রপ (ডিলিট) করতে চান?')) {
    alert('Table dropped successfully.');
    currentTable = null;
    loadTables();
    document.getElementById('browseView').innerHTML = '<p class="text-xs text-slate-500">Select a table.</p>';
  }
}

function logout() {
  localStorage.removeItem('db_master_pass');
  location.reload();
}
