const API_BASE = '';

let authToken = localStorage.getItem('token') || null;
let currentUser = null;
let journals = [];
let currentJournalId = null;
let entries = [];
let currentEntry = null;

// Auth Tabs Switch
document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    document.getElementById(tab.dataset.tab + '-form').classList.add('active');
  });
});

// Signup
document.getElementById('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = signupUsername.value.trim();
  const email = signupEmail.value.trim();
  const password = signupPassword.value.trim();
  const res = await fetch(`${API_BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password })
  });
  const data = await res.json();
  if (res.ok) {
    localStorage.setItem('token', data.token);
    authToken = data.token;
    loadApp();
  } else alert(data.error);
});

// Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = loginEmail.value.trim();
  const password = loginPassword.value.trim();
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (res.ok) {
    localStorage.setItem('token', data.token);
    authToken = data.token;
    loadApp();
  } else alert(data.error);
});

// Load App
async function loadApp() {
  document.getElementById('authModal').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  const res = await fetch(`${API_BASE}/api/journals`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  journals = await res.json();
  renderJournals();
}

// Render Journals
function renderJournals() {
  const list = document.getElementById('journalsList');
  list.innerHTML = '';
  journals.forEach(j => {
    const div = document.createElement('div');
    div.textContent = j.title;
    div.className = 'entry-card';
    div.onclick = () => selectJournal(j._id);
    list.appendChild(div);
  });
}

async function selectJournal(id) {
  currentJournalId = id;
  const res = await fetch(`${API_BASE}/api/entries?journalId=${id}`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  entries = await res.json();
  renderEntries();
  document.getElementById('currentJournalTitle').textContent =
    journals.find(j => j._id === id)?.title || 'Journal';
}

function renderEntries() {
  const list = document.getElementById('entriesList');
  list.innerHTML = '';
  entries.forEach(e => {
    const div = document.createElement('div');
    div.className = 'entry-card';
    div.innerHTML = `<h3>${e.title}</h3><p>${e.content.substring(0, 100)}...</p>`;
    div.onclick = () => openEditor(e);
    list.appendChild(div);
  });
}

document.getElementById('newJournalBtn').addEventListener('click', async () => {
  const title = prompt('Enter new journal title:');
  if (!title) return;
  const res = await fetch(`${API_BASE}/api/journals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({ title })
  });
  const journal = await res.json();
  journals.push(journal);
  renderJournals();
});

document.getElementById('newEntryBtn').addEventListener('click', () => {
  if (!currentJournalId) return alert('Select a journal first!');
  openEditor({ title: '', content: '' });
});

function openEditor(entry) {
  currentEntry = entry;
  document.getElementById('entriesList').style.display = 'none';
  document.getElementById('entryEditor').style.display = 'flex';
  document.getElementById('entryTitle').value = entry.title || '';
  document.getElementById('richEditor').innerHTML = entry.content || '';
}

document.getElementById('closeEditorBtn').addEventListener('click', () => {
  document.getElementById('entryEditor').style.display = 'none';
  document.getElementById('entriesList').style.display = 'grid';
});

document.getElementById('saveEntryBtn').addEventListener('click', async () => {
  const title = entryTitle.value.trim() || 'Untitled';
  const content = document.getElementById('richEditor').innerHTML;
  const method = currentEntry._id ? 'PUT' : 'POST';
  const url = currentEntry._id
    ? `${API_BASE}/api/entries/${currentEntry._id}`
    : `${API_BASE}/api/entries`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`
    },
    body: JSON.stringify({ title, content, journalId: currentJournalId })
  });
  const saved = await res.json();
  if (res.ok) {
    alert('Entry saved!');
    selectJournal(currentJournalId);
    document.getElementById('closeEditorBtn').click();
  } else alert(saved.error);
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('token');
  location.reload();
});

// Auto-login check
if (authToken) loadApp();
