/* js/forum.js
   Simple per-quiz forum saved to localStorage.
   Keys: 'ayele.forum.quiz1', 'ayele.forum.quiz2'
   Supports posting, listing, and admin deleting.
*/

const FORUM = (function(){
  const PREFIX = 'ayele.forum.';
  function keyFor(quizId){ return PREFIX + quizId; }

  function getMessages(quizId){
    try{ return JSON.parse(localStorage.getItem(keyFor(quizId)) || '[]'); } catch { return []; }
  }
  function saveMessages(quizId, arr){ localStorage.setItem(keyFor(quizId), JSON.stringify(arr)); }

  function postMessage(quizId, author, role, text){
    if(!text || !text.trim()) return;
    const arr = getMessages(quizId);
    const msg = { id: Date.now() + '-' + Math.random().toString(36).slice(2,7), author, role, text: text.trim(), ts: Date.now() };
    arr.push(msg);
    saveMessages(quizId, arr);
    return msg;
  }

  function deleteMessage(quizId, id){
    const arr = getMessages(quizId).filter(m=>m.id !== id);
    saveMessages(quizId, arr);
  }

  /* render forum area (expects container elements) */
  function renderForum(quizId){
    const msgs = getMessages(quizId);
    const el = document.getElementById('forum-messages');
    if(!el) return;
    el.innerHTML = msgs.length ? msgs.map(m=>{
      return `<div class="msg" data-id="${m.id}">
        <div class="meta"><strong>${escapeHtml(m.author)}</strong> <span class="muted">${m.role}</span> <small class="muted">${new Date(m.ts).toLocaleString()}</small></div>
        <div class="text">${escapeHtml(m.text)}</div>
        ${isAdmin() ? `<div style="margin-top:6px"><button data-del="${m.id}" class="btn ghost">Delete</button></div>` : ''}
      </div>`;
    }).join('') : '<div class="muted">No messages yet — be first to post.</div>';

    // wire delete buttons if admin
    el.querySelectorAll('button[data-del]').forEach(btn=>{
      btn.addEventListener('click', (ev)=>{
        const id = btn.getAttribute('data-del');
        if(confirm('Delete this message?')){ deleteMessage(quizId, id); renderForum(quizId); }
      });
    });
  }

  /* small helper */
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, (c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

  /* helper to detect admin via AUTH module (if present) */
  function isAdmin(){
    try{
      return (AUTH.getSession && AUTH.getSession().role === 'admin');
    }catch{return false;}
  }

  /* wire posting UI (expects text area with id 'forum-input' and button to call postForum()) */
  function wireForum(quizId){
    const postBtn = document.getElementById('forum-post-btn') || document.querySelector('[data-forum-post]');
    const txt = document.getElementById('forum-input');
    const msgs = document.getElementById('forum-messages');
    if(!txt || !postBtn) return;
    postBtn.addEventListener('click', ()=>{
      const session = (AUTH && AUTH.getSession && AUTH.getSession()) || null;
      if(!session){ alert('Please login'); return location.href = './index.html'; }
      const text = txt.value;
      postMessage(quizId, session.username || session.email, session.role || 'student', text);
      txt.value = '';
      renderForum(quizId);

      // scroll to bottom
      msgs && msgs.scrollTo({ top: msgs.scrollHeight, behavior: 'smooth' });
    });
  }

  return { getMessages, postMessage, deleteMessage, renderForum, wireForum };
})();
