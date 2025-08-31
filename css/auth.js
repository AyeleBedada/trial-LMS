/* js/auth.js
   Authentication & session for demo LMS.
   - Reads ./data/users.json
   - Stores session in localStorage under 'ayele.session'
   - Allows password override stored locally (not updating users.json)
   - Admin controls for opening/closing quizzes and viewing reports
*/

const AUTH = (function(){
  const USER_FILE = './data/users.json';
  const STORAGE = {
    SESSION: 'ayele.session',
    OVERRIDES: 'ayele.overrides',     // { email: newPassword }
    SCORES: 'ayele.scores',           // { email: { quiz1:{best:0,attempts:0}, quiz2:{...} } }
    QUIZ_OPEN: 'ayele.quizOpen',      // { quiz1:true, quiz2:true }
    REPORTS: 'ayele.reports'          // array of report objects
  };

  /* fetch users.json (no-cache for dev) */
  async function fetchUsers(){
    try {
      const res = await fetch(USER_FILE, {cache: 'no-store'});
      if(!res.ok) throw new Error('Failed to load users.json');
      return await res.json();
    } catch(e){
      console.error('fetchUsers:', e);
      return [];
    }
  }

  /* session helpers */
  function getSession(){ try { return JSON.parse(localStorage.getItem(STORAGE.SESSION)); } catch { return null; } }
  function setSession(obj){ localStorage.setItem(STORAGE.SESSION, JSON.stringify(obj)); }
  function clearSession(){ localStorage.removeItem(STORAGE.SESSION); }

  /* override passwords */
  function getOverrides(){ try { return JSON.parse(localStorage.getItem(STORAGE.OVERRIDES)) || {}; } catch { return {}; } }
  function setOverride(email, newPwd){
    const map = getOverrides(); map[email]=newPwd; localStorage.setItem(STORAGE.OVERRIDES, JSON.stringify(map));
  }

  /* scores init */
  function ensureScoresFor(email){
    const all = JSON.parse(localStorage.getItem(STORAGE.SCORES) || '{}');
    if(!all[email]){
      all[email] = { quiz1:{best:0,attempts:0}, quiz2:{best:0,attempts:0} };
      localStorage.setItem(STORAGE.SCORES, JSON.stringify(all));
    }
  }
  function getScoresFor(email){
    ensureScoresFor(email);
    return JSON.parse(localStorage.getItem(STORAGE.SCORES))[email];
  }
  function setScoresFor(email, data){
    const all = JSON.parse(localStorage.getItem(STORAGE.SCORES) || '{}');
    all[email] = data; localStorage.setItem(STORAGE.SCORES, JSON.stringify(all));
  }

  /* quiz open state (admin controlled) */
  function getQuizOpen(){
    const def = { quiz1: true, quiz2: true };
    try{
      return Object.assign(def, JSON.parse(localStorage.getItem(STORAGE.QUIZ_OPEN) || '{}'));
    }catch{
      return def;
    }
  }
  function setQuizOpen(state){ localStorage.setItem(STORAGE.QUIZ_OPEN, JSON.stringify(state)); }

  /* reports */
  function pushReport(report){
    const arr = JSON.parse(localStorage.getItem(STORAGE.REPORTS) || '[]');
    arr.unshift(report);
    // limit to last 200 reports to keep storage sane
    localStorage.setItem(STORAGE.REPORTS, JSON.stringify(arr.slice(0,200)));
  }
  function getReports(){ return JSON.parse(localStorage.getItem(STORAGE.REPORTS) || '[]'); }

  /* Public: login form wiring (on index page) */
  function wireLoginForm(){
    const form = document.getElementById('loginForm');
    if(!form) return;
    const err = document.getElementById('loginError');

    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      err.textContent = '';
      const email = (document.getElementById('email').value || '').trim().toLowerCase();
      const password = (document.getElementById('password').value || '').trim();

      const users = await fetchUsers();
      const found = users.find(u=>u.email.toLowerCase() === email);
      const overrides = getOverrides();
      const expected = overrides[email] || found?.password;

      if(found && expected && expected === password){
        // success
        setSession({ email: found.email, username: found.username || found.email, role: found.role || 'student', name: found.name || found.username || found.email });
        ensureScoresFor(found.email);
        // redirect to first quiz
        location.href = './quiz1.html';
      } else {
        err.textContent = 'Invalid email or password (demo).';
      }
    });
  }

  /* render header + sidebar on protected pages */
  function renderChrome(activePage){
    const sess = getSession();
    if(!sess) return;

    // topbar
    const headerEl = document.querySelector('.topbar');
    if(headerEl){
      headerEl.innerHTML = `
        <div class="brand">
          <div class="logo" aria-hidden="true"></div>
          <div>
            <div style="font-weight:800">Ayele's College</div>
            <div style="font-size:13px;color:var(--muted)">Demo LMS</div>
          </div>
        </div>
        <div class="topnav" role="navigation" aria-label="Main navigation">
          <a href="./quiz1.html" ${activePage==='quiz1' ? 'class="active"' : ''}>Quiz 1</a>
          <a href="./quiz2.html" ${activePage==='quiz2' ? 'class="active"' : ''}>Quiz 2</a>
          <a href="./completion.html" ${activePage==='complete' ? 'class="active"' : ''}>Complete</a>
          <button id="changePwdBtn" class="btn ghost">Change Password</button>
          <button id="logoutBtn" class="btn">Logout</button>
        </div>
      `;
      document.getElementById('logoutBtn').addEventListener('click', ()=>{
        clearSession(); location.href = './index.html';
      });
      document.getElementById('changePwdBtn').addEventListener('click', showChangePassword);
    }

    // sidebar
    const sidebarEl = document.querySelector('.sidebar');
    if(sidebarEl){
      const scores = getScoresFor(sess.email);
      const global = Math.round((scores.quiz1.best * 0.4) + (scores.quiz2.best * 0.6));
      sidebarEl.innerHTML = `
        <div class="usercard">
          <div class="user-avatar" aria-hidden="true"></div>
          <div>
            <div class="user-name">${sess.username || sess.email}</div>
            <div class="muted">${sess.role}</div>
          </div>
        </div>

        <nav class="side-nav" aria-label="Course navigation">
          <a href="./quiz1.html" aria-current="${activePage==='quiz1' ? 'page' : 'false'}">Quiz 1 <span class="badge">${scores.quiz1.best}%</span></a>
          <a href="./quiz2.html" aria-current="${activePage==='quiz2' ? 'page' : 'false'}">Quiz 2 <span class="badge">${scores.quiz2.best}%</span></a>
          <a href="./completion.html" aria-current="${activePage==='complete' ? 'page' : 'false'}">Complete <span class="badge">${global}%</span></a>
        </nav>

        <div style="margin-top:12px" class="card">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <strong>Progress</strong><small class="muted">${global}%</small>
          </div>
          <div style="height:10px;border-radius:10px;background:rgba(255,255,255,0.02);margin-top:8px;overflow:hidden">
            <div style="height:100%;width:${global}%;background:linear-gradient(90deg,var(--accent),var(--accent-2));transition:width .4s"></div>
          </div>
        </div>
      `;

      // admin panel if admin
      if(sess.role === 'admin'){
        const open = getQuizOpen();
        const adminHtml = document.createElement('div');
        adminHtml.className = 'admin-panel card';
        adminHtml.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center">
            <strong>Admin</strong>
            <small class="muted">Control</small>
          </div>
          <div style="margin-top:10px;display:flex;flex-direction:column;gap:8px">
            <label><input type="checkbox" id="toggleQ1"> Quiz 1 Open</label>
            <label><input type="checkbox" id="toggleQ2"> Quiz 2 Open</label>
            <button id="viewReports" class="btn ghost">View Reports</button>
          </div>
          <div id="adminReports" style="margin-top:12px;max-height:220px;overflow:auto"></div>
        `;
        sidebarEl.appendChild(adminHtml);

        document.getElementById('toggleQ1').checked = !!open.quiz1;
        document.getElementById('toggleQ2').checked = !!open.quiz2;
        document.getElementById('toggleQ1').addEventListener('change', (e)=>{
          open.quiz1 = e.target.checked; setQuizOpen(open); renderReportsShort();
        });
        document.getElementById('toggleQ2').addEventListener('change', (e)=>{
          open.quiz2 = e.target.checked; setQuizOpen(open); renderReportsShort();
        });
        document.getElementById('viewReports').addEventListener('click', ()=>{
          renderReportsFull();
        });
        renderReportsShort();
      }
    }
  }

  /* small admin reports view */
  function renderReportsShort(){
    const adminBox = document.getElementById('adminReports');
    if(!adminBox) return;
    const reports = getReports().slice(0,6);
    adminBox.innerHTML = reports.map(r=>{
      return `<div style="padding:8px;border-bottom:1px dashed rgba(255,255,255,0.02)">
        <div style="font-weight:700">${r.email} <small class="muted">${r.quizId}</small></div>
        <div style="font-size:13px;color:var(--muted)">${r.score}% — ${new Date(r.ts).toLocaleString()}</div>
      </div>`;
    }).join('') || '<div class="muted">No reports yet</div>';
  }

  /* full reports (admin) */
  function renderReportsFull(){
    const panel = document.getElementById('adminReports');
    if(!panel) return;
    const reports = getReports();
    panel.innerHTML = reports.length ? reports.map(r=>{
      return `<div style="padding:8px;border-bottom:1px dashed rgba(255,255,255,0.02)">
        <div style="display:flex;justify-content:space-between">
          <div><strong>${r.email}</strong> <small class="muted">${r.quizId}</small></div>
          <div><small class="muted">${new Date(r.ts).toLocaleString()}</small></div>
        </div>
        <div style="margin-top:6px;color:var(--muted)">Attempt ${r.attempt} — Score: ${r.score}%</div>
      </div>`;
    }).join('') : '<div class="muted">No reports yet</div>';
  }

  /* show change password prompt (simple) */
  function showChangePassword(){
    const sess = getSession();
    if(!sess) return alert('No session');
    const newPwd = prompt('Enter a new password (stored locally for demo only):');
    if(!newPwd || newPwd.length < 4) return alert('Password must be at least 4 characters.');
    setOverride(sess.email, newPwd);
    alert('Password updated locally. This is a demo — users.json is not changed on GitHub.');
  }

  /* Utility: ensure page requires auth */
  function requireAuth(){
    const s = getSession();
    if(!s) location.href = './index.html';
  }

  /* Utility to get/set quizOpen in storage (wrapper) */
  function setQuizOpen(state){ localStorage.setItem(STORAGE.QUIZ_OPEN, JSON.stringify(state)); }
  function getQuizOpen(){
    try{ return Object.assign({quiz1:true,quiz2:true}, JSON.parse(localStorage.getItem(STORAGE.QUIZ_OPEN) || '{}')); }
    catch{return {quiz1:true, quiz2:true}; }
  }

  /* Init on load */
  document.addEventListener('DOMContentLoaded', ()=>{
    // if login page present, wire it
    wireLoginForm();

    // If other pages, require auth and render chrome
    if(document.body.dataset.lms === 'protected'){
      requireAuth();
      // active page guess via data-page attribute
      const page = document.body.getAttribute('data-page') || '';
      renderChrome(page);
    }
  });

  /* Expose functions */
  return {
    fetchUsers, getSession, setSession, clearSession, setOverride,
    getScoresFor, setScoresFor, getQuizOpen, setQuizOpen,
    pushReport, getReports,
    requireAuth, renderChrome
  };
})();
