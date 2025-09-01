// js/admin.js
import { db } from '../config/firebase-config.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { Progress } from './progress.js';

function getUser(){ try { return JSON.parse(localStorage.getItem('currentUser')); } catch { return null; } }

async function loadReports(){
  const q = query(collection(db, 'reports'), orderBy('ts','desc'));
  const snap = await getDocs(q);
  const rows = [];
  const students = new Set();
  snap.forEach(d=>{
    const data = d.data();
    rows.push({ id: d.id, email: data.email, quizId: data.quizId, attempt: data.attempt, score: data.score, best: data.best, ts: data.ts ? data.ts.toDate().toLocaleString() : '' });
    students.add(data.email);
  });
  renderReports(rows);
  populateStudentFilter(Array.from(students));
  return rows;
}

function renderReports(rows){
  const target = document.getElementById('reportsTable');
  if(!target) return;
  if(!rows.length){ target.innerHTML = '<div class="muted">No reports yet.</div>'; return; }
  let html = `<table style="width:100%;border-collapse:collapse"><thead><tr style="text-align:left"><th>Email</th><th>Quiz</th><th>Attempt</th><th>Score</th><th>Best</th><th>When</th></tr></thead><tbody>`;
  rows.forEach(r=>{
    html += `<tr style="border-top:1px solid rgba(0,0,0,0.06)"><td>${r.email}</td><td>${r.quizId}</td><td>${r.attempt}</td><td>${r.score}%</td><td>${r.best}%</td><td>${r.ts}</td></tr>`;
  });
  html += `</tbody></table>`;
  target.innerHTML = html;
}

function populateStudentFilter(list){
  const sel = document.getElementById('filterStudent');
  if(!sel) return;
  sel.innerHTML = '<option value="">All students</option>' + list.map(s => `<option value="${s}">${s}</option>`).join('');
}

// CSV export utility
function toCSV(rows){
  if(!rows.length) return '';
  const keys = Object.keys(rows[0]);
  const lines = [keys.join(',')];
  rows.forEach(r => {
    lines.push(keys.map(k => `"${String(r[k]||'').replace(/"/g,'""')}"`).join(','));
  });
  return lines.join('\n');
}

async function downloadCsv(){
  const rows = await loadReports(); // latest
  const csv = toCSV(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `trial-lms-reports-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', ()=>{
  // ensure admin
  const user = getUser();
  if(!user || user.role !== 'admin'){ alert('Admin access required'); window.location.href = './index.html'; return; }

  // wire buttons
  document.getElementById('refreshReports').addEventListener('click', loadReports);
  document.getElementById('downloadCsv').addEventListener('click', downloadCsv);
  loadReports();
});
