// js/auth.js
// Lightweight client-side auth for Trial LMS demo
const AUTH = (function(){
  const USER_FILE = './data/users.json';
  const KEYS = {
    SESSION: 'trial.session',
    OVERRIDES: 'trial.pwd',
    SCORES: 'trial.scores',
    REPORTS: 'trial.reports',
    QUIZ_OPEN: 'trial.quizopen'
  };

  async function fetchUsers(){
    try {
      const r = await fetch(USER_FILE, {cache:'no-store'});
      if(!r.ok) throw new Error('users.json load failed');
      return await r.json();
    } catch(e){
      console.error('fetchUsers error', e);
      return [];
    }
  }

  /* session helpers */
  function setSession(obj){ localStorage.setItem(KEYS.SESSION, JSON.stringify(obj)); }
  function getSession(){ return JSON.parse(localStorage.getItem(KEYS.SESSION) || 'null'); }
  function clearSession(){ localStorage.removeItem(KEYS.SESSION); }

  function getOverrides(){ return JSON.parse(localStorage.getItem(KEYS.OVERRIDES) || '{}'); }
  function setOverride(email, pwd){ const m = getOverrides(); m[email]=pwd; localStorage.setItem(KEYS.OVERRIDES, JSON.stringify(m)); }

  /* scores */
  function ensureScores(email){
    const all = JSON.parse(localStorage.getItem(KEYS.SCORES) || '{}');
    if(!all[email]) all[email] = { quiz1:{best:0,attempts:0}, quiz2:{best:0,attempts:0}, quiz3:{best:0,attempts:0} };
    localStorage.setItem(KEYS.SCORES, JSON.stringify(all));
    return all;
  }
  function getScores(email){ ensureScores(email); return JSON.parse(localStorage.getItem(KEYS.SCORES))[email]; }
  function setScores(email, data){ const all = JSON.parse(localStorage.getItem(KEYS.SCORES) || '{}'); all[email] = data; localStorage.setItem(KEYS.SCORES, JSON.stringify(all)); }

  /* reports push */
  function pushReport(r){ const arr = JSON.parse(localStorage.getItem(KEYS.REPORTS) || '[]'); arr.unshift(r); localStorage.setItem(KEYS.REPORTS, JSON.stringify(arr.slice(0,500))); }
  function getReports(){ return JSON.parse(localStorage.getItem(KEYS.REPORTS) || '[]'); }

  /* quiz open */
  function getQuizOpen(){ return Object.assign({quiz1:true,quiz2:true,quiz3:true}, JSON.parse(localStorage.getItem(KEYS.QUIZ_OPEN) || '{}')); }
  function setQuizOpen(state){ localStorage.setItem(KEYS.QUIZ_OPEN, JSON.stringify(state)); }

  /* wire login form on index.html */
  function wireLogin(){
    const form = document.getElementById('loginForm');
    if(!form) return;
    const err = document.getElementById('loginError');
    form.addEventListener('submit', async (ev)=>{
      ev.preventDefault();
      err.textContent = '';
      const email = (document.getElementById('email').value || '').trim().toLowerCase();
      const pwd = (document.getElementById('password').value || '').trim();
      const users = await fetchUsers();
      const user = users.find(u => u.email.toLowerCase() === email);
      const overrides = getOverrides();
      const expected = overrides[email] || user?.password;
      if(user && expected && expected === pwd){
        setSession({ email: user.email, username: user.username || user.email, role: user.role || 'student', name: user.name || user.username });
        ensureScores(user.email);
        // go to dashboard
        location.href = './dashboard.html';
      } else {
        err.textContent = 'Invalid email or password (demo).';
      }
    });
  }

  /* logout helper used by pages */
  function logout(){ clearSession(); location.href = './index.html'; }

  /* change password (stored only locally) */
  function changePassword(){
    const s = getSession(); if(!s) return alert('Not signed in');
    const np = prompt('Enter new password (stored locally for demo only):');
    if(!np || np.length < 4) return alert('Password must be at least 4 characters.');
    setOverride(s.email, np);
    alert('Password updated locally.');
  }

  /* render header + sidebar on protected pages */
  function renderChrome(active){
    const session = getSession(); if(!session) return location.href='./index.html';
    // header
    const header = document.querySelector('.topbar');
    if(header){
      header.innerHTML = `
        <div class="brand">
          <div class="logo" aria-hidden="true"></div>
          <div>
            <div style="font-weight:800">Trial LMS</div>
            <div style="font-size:12px;color:var(--muted)">A demo learning environment</div>
          </div>
        </div>
        <div class="menu" role="navigation" aria-label="Main nav">
          <a href="./dashboard.html" ${active === 'dashboard' ? 'class="active"': ''}>Dashboard</a>
          <a href="./lesson1.html" ${active === 'lesson1' ? 'class="active"': ''}>Lesson 1</a>
          <a href="./lesson2.html" ${active === 'lesson2' ? 'class="active"': ''}>Lesson 2</a>
          <a href="./complete.html" ${active === 'complete' ? 'class="active"': ''}>Complete</a>
          <button id="chgPwd" class="btn btn-ghost">Change password</button>
          <button id="logoutBtn" class="btn">Logout</button>
        </div>`;
      document.getElementById('logoutBtn').addEventListener('click', logout);
      document.getElementById('chgPwd').addEventListener('click', changePassword);
    }
    // sidebar
    const side = document.querySelector('.sidebar');
    if(side){
      const scores = getScores(session.email);
      const global = Math.round((scores.quiz1.best * 0.4) + (scores.quiz2.best * 0.3) + (scores.quiz3.best * 0.3));
      side.innerHTML = `
        <div class="user">
          <div class="avatar" aria-hidden="true"></div>
          <div>
            <div style="font-weight:800">${session.username}</div>
            <div style="font-size:13px;color:var(--muted)">${session.role}</div>
          </div>
        </div>
        <nav class="side-nav" aria-label="Course nav">
          <a href="./dashboard.html" aria-current="${active==='dashboard'?'page':'false'}">Intro <span class="muted">${''}</span></a>
          <a href="./lesson1.html" aria-current="${active==='lesson1'?'page':'false'}">Lesson 1 <span class="muted">${scores.quiz1.best}%</span></a>
          <a href="./lesson2.html" aria-current="${active==='lesson2'?'page':'false'}">Lesson 2 <span class="muted">${scores.quiz2.best}%</span></a>
          <a href="./lesson3.html" aria-current="${active==='lesson3'?'page':'false'}">Lesson 3 <span class="muted">${scores.quiz3.best}%</span></a>
          <a href="./complete.html" aria-current="${active==='complete'?'page':'false'}">Complete <span class="muted">${global}%</span></a>
        </nav>
        <div style="margin-top:12px" class="card">
          <div style="display:flex;justify-content:space-between;align-items:center"><strong>Progress</strong><small class="muted">${global}%</small></div>
          <div style="height:10px;border-radius:8px;background:rgba(255,255,255,0.02);margin-top:10px;overflow:hidden">
            <div style="height:100%;width:${global}%;background:linear-gradient(90deg,var(--accent),var(--accent2));transition:width .35s"></div>
          </div>
        </div>`;
      if(session.role === 'admin'){
        const open = getQuizOpen();
        const adminHtml = document.createElement('div');
        adminHtml.className = 'card';
        adminHtml.style.marginTop='12px';
        adminHtml.innerHTML = `
          <strong>Admin</strong>
          <div style="margin-top:8px;display:flex;flex-direction:column;gap:8px">
            <label><input type="checkbox" id="openQ1"> Quiz1 open</label>
            <label><input type="checkbox" id="openQ2"> Quiz2 open</label>
            <label><input type="checkbox" id="openQ3"> Quiz3 open</label>
            <button id="viewReports" class="btn btn-ghost">View Reports</button>
          </div>
          <div id="adminReports" style="margin-top:10px;max-height:180px;overflow:auto"></div>`;
        side.appendChild(adminHtml);
        document.getElementById('openQ1').checked = !!open.quiz1;
        document.getElementById('openQ2').checked = !!open.quiz2;
        document.getElementById('openQ2').checked = !!open.quiz3;
        document.getElementById('openQ1').addEventListener('change', e=>{ open.quiz1 = e.target.checked; setQuizOpen(open); });
        document.getElementById('openQ2').addEventListener('change', e=>{ open.quiz2 = e.target.checked; setQuizOpen(open); });
        document.getElementById('openQ3').addEventListener('change', e=>{ open.quiz3 = e.target.checked; setQuizOpen(open); });
        document.getElementById('viewReports').addEventListener('click', ()=>renderReports());
        renderReportsSummary();
      }
    }
  }

  function renderReportsSummary(){
    const el = document.getElementById('adminReports');
    if(!el) return;
    const r = getReports().slice(0,6);
    el.innerHTML = r.length ? r.map(rep=>`<div style="padding:8px;border-bottom:1px dashed rgba(255,255,255,0.02)"><strong>${rep.email}</strong> <div style="font-size:13px;color:var(--muted)">${rep.quizId} — ${rep.score}% — ${new Date(rep.ts).toLocaleString()}</div></div>`).join('') : '<div class="muted">No reports</div>';
  }

  function renderReports(){
    const el = document.getElementById('adminReports');
    if(!el) return;
    const arr = getReports();
    el.innerHTML = arr.length ? arr.map(rep=>`<div style="padding:8px;border-bottom:1px dashed rgba(255,255,255,0.02)"><div style="display:flex;justify-content:space-between"><strong>${rep.email}</strong><small class="muted">${new Date(rep.ts).toLocaleString()}</small></div><div style="font-size:13px;color:var(--muted)">${rep.quizId} — attempt ${rep.attempt} — ${rep.score}%</div></div>`).join('') : '<div class="muted">No reports</div>';
  }

  /* Expose */
  return {
    fetchUsers, setSession, getSession, clearSession, wireLogin,
    logout: () => { clearSession(); location.href='./index.html' },
    ensureScores, getScores, setScores, pushReport, getReports,
    getQuizOpen, setQuizOpen, renderChrome
  };
})();

/* Auto-wire login if form on page */
document.addEventListener('DOMContentLoaded', ()=>{ AUTH.wireLogin?.(); });
