// js/forum.js
// Real-time forum using Firestore. Simple collection 'forums' with docs per message.

import { db } from '../config/firebase-config.js';
import { collection, addDoc, query, where, orderBy, onSnapshot, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

function getUser(){ try { return JSON.parse(localStorage.getItem('currentUser')); } catch{ return null; } }

function renderMessageHtml(m){
  return `<div class="msg" data-id="${m.id}">
    <div class="meta"><strong>${escapeHtml(m.author)}</strong> <span class="muted">${escapeHtml(m.role)}</span> <small class="muted">${new Date(m.ts).toLocaleString()}</small></div>
    <div class="text">${escapeHtml(m.text)}</div>
    ${ (getUser() && getUser().role === 'admin') ? `<div style="margin-top:6px"><button data-del="${m.id}" class="btn btn-ghost">Delete</button></div>` : '' }
  </div>`;
}

function escapeHtml(s){ return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]); }

// subscribe to messages for a quizId and render to containerId (string)
export function subscribeForum(quizId, containerId){
  const container = document.getElementById(containerId);
  if(!container) return;
  const q = query(collection(db, 'forums'), where('quizId','==',quizId), orderBy('ts','asc'));
  // subscribe
  return onSnapshot(q, snap => {
    const msgs = [];
    snap.forEach(docSnap => {
      const d = docSnap.data();
      msgs.push({ id: docSnap.id, author: d.author, role: d.role, text: d.text, ts: d.ts ? d.ts.toDate() : new Date() });
    });
    container.innerHTML = msgs.map(m => renderMessageHtml(m)).join('') || '<div class="muted">No posts yet</div>';
    // wire delete buttons if admin
    container.querySelectorAll('button[data-del]').forEach(btn=>{
      btn.addEventListener('click', async ()=> {
        if(!confirm('Delete this post?')) return;
        const id = btn.getAttribute('data-del');
        await deleteDoc(doc(db, 'forums', id));
      });
    });
    // scroll to bottom
    container.scrollTop = container.scrollHeight;
  });
}

export async function postForumMessage(quizId, text){
  if(!text || !text.trim()) return;
  const user = getUser(); if(!user) return alert('Please login.');
  await addDoc(collection(db, 'forums'), {
    quizId,
    author: user.username || user.email,
    role: user.role || 'student',
    text: text.trim(),
    ts: new Date()
  });
}
