// js/quiz.js
// Generic quiz engine (works with lesson pages).
// Expects container with .question blocks (data-name, data-type, data-answer).
// Uses Firestore for persistence and reporting.
// Import usage: import { Quiz } from './js/quiz.js';

import { db } from '../config/firebase-config.js';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, addDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { Progress } from './progress.js';

function getCurrentUser(){
  try { return JSON.parse(localStorage.getItem('currentUser')); } catch { return null; }
}

// collect question objects from container
function collectQuestions(container){
  return Array.from(container.querySelectorAll('.question')).map(q=>{
    return {
      el: q,
      name: q.dataset.name,
      type: q.dataset.type || 'radio',
      answer: q.dataset.answer || ''
    };
  });
}

function markOption(optionEl, status){
  optionEl.classList.remove('correct','wrong');
  if(status === 'correct') optionEl.classList.add('correct');
  if(status === 'wrong') optionEl.classList.add('wrong');
}

// evaluate single question -> returns true/false/null (unanswered)
function evaluateQuestion(q){
  const el = q.el;
  const type = q.type;
  const correctRaw = q.answer;
  const fb = el.querySelector('.feedback');
  fb.textContent = '';
  el.querySelectorAll('.option').forEach(o=>o.classList.remove('correct','wrong'));

  if(type === 'radio'){
    const sel = el.querySelector('input[type="radio"]:checked');
    if(!sel) { fb.textContent = ''; return null; }
    const ok = sel.value === correctRaw;
    const opt = sel.closest('.option');
    markOption(opt, ok ? 'correct' : 'wrong');
    fb.textContent = ok ? 'Correct ✔' : 'Incorrect ✖';
    return ok;
  } else if(type === 'multi'){
    const checked = Array.from(el.querySelectorAll('input[type="checkbox"]:checked')).map(i=>i.value).sort();
    const expected = (''+correctRaw).split('|').filter(Boolean).sort();
    el.querySelectorAll('.option').forEach(opt=>{
      const v = opt.querySelector('input').value;
      if(expected.includes(v) && checked.includes(v)) markOption(opt, 'correct');
      else if(checked.includes(v) && !expected.includes(v)) markOption(opt, 'wrong');
    });
    const ok = checked.join('|') === expected.join('|');
    fb.textContent = ok ? 'Correct ✔' : 'Incorrect ✖';
    return ok;
  } else if(type === 'text'){
    const val = (el.querySelector('input[type="text"]').value || '').trim().toLowerCase();
    const ok = val === (''+correctRaw).trim().toLowerCase();
    fb.textContent = ok ? 'Correct ✔' : 'Check answer';
    return ok;
  }
  return null;
}

function gradeAll(container){
  const qs = collectQuestions(container);
  let tot = qs.length, correct = 0;
  qs.forEach(q=>{ const r = evaluateQuestion(q); if(r === true) correct++; });
  return tot === 0 ? 0 : Math.round((correct / tot) * 100); // percent 0..100
}

// update live progress widgets (uses Progress)
async function updateLiveProgress(container, quizId){
  const user = getCurrentUser(); if(!user) return;
  const thisQuizPercent = gradeAll(container);
  const userScoresRef = doc(db, 'scores', user.email);
  const snap = await getDoc(userScoresRef);
  let stored = { quiz1: {best:0, attempts:0}, quiz2:{best:0, attempts:0} };
  if(snap.exists()) stored = snap.data();

  const q1 = quizId === 'quiz1' ? thisQuizPercent : (stored.quiz1?.best || 0);
  const q2 = quizId === 'quiz2' ? thisQuizPercent : (stored.quiz2?.best || 0);
  const global = Math.round((q1 * 0.4) + (q2 * 0.6));

  // update DOM
  const liveEl = document.getElementById('livePotential'); if(liveEl) liveEl.textContent = `${thisQuizPercent}% (this attempt)`;
  const globalEl = document.getElementById('globalScore'); if(globalEl) globalEl.textContent = `${global}%`;

  // update widgets
  Progress.updateLinear('.linear', global);
  Progress.updateAnimated('.animated', global);
  Progress.updateCircular('.circular', global);
  Progress.renderStepper('.stepper', ['Login','Intro','Quiz 1','Quiz 2','Complete'].findIndex((s,i,a)=>false) /* we'll compute differently below */);

  // render stepper with completed count (compute from stored + potential)
  const completed = 
    1 // login
    + 1 // intro always available
    + ((q1 >= 50) ? 1 : 0) // heuristic: if quiz1 >= 50 considered done
    + ((q2 >= 50) ? 1 : 0)
    + ((global >= 80) ? 1 : 0); // completion if global >= 80
  Progress.renderStepper('.stepper', ['Login','Intro','Quiz 1','Quiz 2','Complete'], completed);
}

// submit attempt: update Firestore `scores` doc for this user, and push a `reports` doc
async function submitAttempt(container, quizId){
  const user = getCurrentUser(); if(!user) { alert('Please login'); return; }
  const uid = user.email;
  const scoresRef = doc(db, 'scores', uid);
  const snap = await getDoc(scoresRef);
  let scores = { quiz1:{best:0, attempts:0}, quiz2:{best:0, attempts:0} };
  if(snap.exists()) scores = snap.data();

  const cur = scores[quizId] || { best:0, attempts:0 };
  if(cur.attempts >= 3){ alert('You have used all attempts'); return; }

  const percent = gradeAll(container);
  const attempts = (cur.attempts || 0) + 1;
  const best = Math.max((cur.best||0), percent);

  // write back
  await setDoc(scoresRef, { ...scores, [quizId]: { best, attempts } }, { merge: true });

  // push report
  await addDoc(collection(db, 'reports'), {
    email: uid,
    quizId,
    attempt: attempts,
    score: percent,
    best,
    ts: serverTimestamp()
  });

  // update UI
  const attemptBadge = document.getElementById('attemptBadge'); if(attemptBadge) attemptBadge.textContent = `${attempts}/3`;
  const quizScoreEl = document.getElementById('quizScore'); if(quizScoreEl) quizScoreEl.textContent = `${percent}% (best ${best}%)`;

  // update global widgets using stored data
  await updateLiveProgress(container, quizId);

  if(attempts >= 3){
    container.querySelectorAll('input,textarea,button').forEach(i => i.disabled = true);
    alert('You have exhausted attempts for this quiz.');
  } else {
    alert(`Attempt recorded: ${percent}% (attempt ${attempts}/3)`);
  }
}

// initialize page for a quiz
async function initQuizPage(container, quizId){
  const user = getCurrentUser(); if(!user) return window.location.href = './index.html';
  // wire live change handlers
  collectQuestions(container).forEach(q=>{
    if(q.type === 'text'){
      const t = q.el.querySelector('input[type="text"]');
      t && t.addEventListener('input', ()=>{ evaluateQuestion(q); updateLiveProgress(container, quizId); });
    } else {
      q.el.querySelectorAll('input').forEach(inp => inp.addEventListener('change', ()=>{ evaluateQuestion(q); updateLiveProgress(container, quizId); }));
    }
  });

  // wire submit button
  const submitBtn = document.getElementById('submitAttempt');
  if(submitBtn) submitBtn.addEventListener('click', ()=> submitAttempt(container, quizId));

  // load stored attempts and best
  const scoresRef = doc(db, 'scores', user.email);
  const snap = await getDoc(scoresRef);
  let scores = { quiz1:{best:0,attempts:0}, quiz2:{best:0,attempts:0} };
  if(snap.exists()) scores = snap.data();
  const cur = scores[quizId] || { best:0, attempts:0 };
  document.getElementById('attemptBadge') && (document.getElementById('attemptBadge').textContent = `${cur.attempts || 0}/3`);
  document.getElementById('quizScore') && (document.getElementById('quizScore').textContent = `${cur.best || 0}%`);

  if(cur.attempts >= 3) container.querySelectorAll('input,textarea,button').forEach(i => i.disabled = true);

  // initial progress update (based on stored)
  await updateLiveProgress(container, quizId);
}

export const Quiz = { initQuizPage, gradeAll, updateLiveProgress };
