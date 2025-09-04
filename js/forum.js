// js/forum.js - simple per-quiz forum stored in localStorage
const FORUM = (function(){
  const PREFIX = 'trial.forum.';
  function key(quizId){ return PREFIX + quizId; }

  function get(quizId){ 
    try {
      return JSON.parse(localStorage.getItem(key(quizId)) || '[]'); 
    } catch(e) {
      console.error('Forum get error', e);
      return [];
    }
  }

  function save(quizId, arr){ 
    localStorage.setItem(key(quizId), JSON.stringify(arr)); 
  }

  function post(quizId, text){
    const s = AUTH.getSession(); 
    if(!s) return alert('Please login to post.');
    if(!text || !text.trim()) return;

    const arr = get(quizId);
    arr.push({
      id: Date.now()+'-'+Math.random().toString(36).slice(2,8),
      author: s.username || s.email,
      role: s.role,
      text: text.trim(),
      ts: Date.now()
    });
    save(quizId, arr);
    render(quizId);
  }

  function del(quizId, id){
    const s = AUTH.getSession(); 
    if(!s || s.role !== 'admin') return alert('Only admin can delete posts.');
    const arr = get(quizId).filter(m => m.id !== id); 
    save(quizId, arr); 
    render(quizId);
  }

  function render(quizId){
    const el = document.getElementById(quizId + '-forum-messages') || document.getElementById('forum-messages');
    if(!el) return;

    const arr = get(quizId);
    if(!arr.length){ 
      el.innerHTML = '<div class="muted">No posts yet — start the discussion.</div>'; 
      return; 
    }

    el.innerHTML = arr.map(m=>`
      <div class="msg" data-id="${m.id}">
        <div class="meta"><strong>${escapeHtml(m.author)}</strong> <span class="muted">${m.role}</span> <small class="muted">${new Date(m.ts).toLocaleString()}</small></div>
        <div class="text">${escapeHtml(m.text)}</div>
        ${ (AUTH.getSession()?.role === 'admin') ? `<div style="margin-top:6px"><button data-del="${m.id}" class="btn btn-ghost">Delete</button></div>` : '' }
      </div>`).join('');

    el.querySelectorAll('button[data-del]').forEach(b=>{
      b.addEventListener('click', ()=>{
        if(confirm('Delete post?')) del(quizId, b.getAttribute('data-del'));
      });
    });
  }

  function escapeHtml(s){ 
    return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); 
  }

  return { post, render, get, del };
})();
