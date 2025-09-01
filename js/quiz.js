// js/quiz.js - handles quiz rendering, live feedback, attempts, scoring and admin report push
(function(){
  const MAX_ATTEMPTS = 3;
  const QUIZ_WEIGHT = { quiz1: 40, quiz2: 60 }; // weights for final calculation

  // Utility: collect question DOM blocks; expects .question elements with data-answer (for radio/text/multi)
  function collectQuestions(container){
    return Array.from(container.querySelectorAll('.question')).map(q => {
      return {
        el: q,
        name: q.getAttribute('data-name'),
        type: q.getAttribute('data-type') || 'radio',
        answerRaw: q.getAttribute('data-answer') || ''
      };
    });
  }

  // Live feedback for a question element
  function evaluateQuestion(q){
    const el = q.el;
    const type = q.type;
    const correct = q.answerRaw;
    const feedbackEl = el.querySelector('.feedback');
    feedbackEl.textContent = '';
    el.querySelectorAll('.option').forEach(o=>o.classList.remove('correct','wrong'));

    if(type === 'radio'){
      const sel = el.querySelector('input[type="radio"]:checked');
      if(!sel) return null; // unanswered
      const val = sel.value;
      if(val === correct){
        sel.closest('.option').classList.add('correct');
        feedbackEl.textContent = 'Correct ✔';
        return true;
      } else {
        sel.closest('.option').classList.add('wrong');
        feedbackEl.textContent = 'Incorrect ✖';
        return false;
      }
    } else if(type === 'multi'){
      const checked = Array.from(el.querySelectorAll('input[type="checkbox"]:checked')).map(i=>i.value).sort();
      const expected = (''+correct).split('|').filter(Boolean).sort();
      // mark each option
      el.querySelectorAll('.option').forEach(opt=>{
        const v = opt.querySelector('input').value;
        if(expected.includes(v) && checked.includes(v)) opt.classList.add('correct');
        else if(checked.includes(v) && !expected.includes(v)) opt.classList.add('wrong');
      });
      const isSame = checked.join('|') === expected.join('|');
      feedbackEl.textContent = isSame ? 'Correct ✔' : 'Incorrect ✖';
      return isSame;
    } else if(type === 'text'){
      const input = el.querySelector('input[type="text"]');
      const val = (input.value || '').trim().toLowerCase();
      const ok = val === (''+correct).trim().toLowerCase();
      feedbackEl.textContent = ok ? 'Correct ✔' : 'Check answer ✖';
      return ok;
    }
    return null;
  }

  // Grade all questions in a container; return percent 0..100
  function gradeAll(container){
    const qs = collectQuestions(container);
    let correct = 0;
    let total = qs.length;
    qs.forEach(q => {
      const res = evaluateQuestion(q);
      if(res === true) correct++;
      // unanswered counts as incorrect
    });
    return total === 0 ? 0 : Math.round((correct/total) * 100);
  }

  // Live wire: attach change/input listeners to give instant feedback and update live progress.
  function wireLive(container, quizId){
    collectQuestions(container).forEach(q=>{
      if(q.type === 'text'){
        q.el.querySelector('input[type="text"]').addEventListener('input', ()=>{
          evaluateQuestion(q);
          updateLiveProgress(container, quizId);
        });
      } else {
        q.el.querySelectorAll('input').forEach(i=>{
          i.addEventListener('change', ()=>{
            evaluateQuestion(q);
            updateLiveProgress(container, quizId);
          });
        });
      }
    });
  }

  // Update live progress widgets when answering
  function updateLiveProgress(container, quizId){
    const sess = AUTH.getSession();
    if(!sess) return;
    const thisQuizPercent = gradeAll(container); // 0..100 for the quiz
    // Show live potential in element if present
    const liveEl = document.getElementById('livePotential');
    if(liveEl) liveEl.textContent = `${thisQuizPercent}% (this attempt)`;

    // compute global percent by substituting thisQuizPercent for current quiz's best
    const scores = AUTH.getScores(sess.email);
    const q1 = quizId === 'quiz1' ? thisQuizPercent : scores.quiz1.best;
    const q2 = quizId === 'quiz2' ? thisQuizPercent : scores.quiz2.best;
    const global = Math.round((q1 * 0.4) + (q2 * 0.6)); // final weighted percent
    // update UI widgets
    LMS.updateLinear('.linear', global);
    LMS.updateAnimated('.animated', global);
    LMS.updateCircular('.circular', global);
    LMS.updateStepper('.stepper', Math.round((global/100)*4));
    const gs = document.getElementById('globalScore'); if(gs) gs.textContent = `${global}%`;
  }

  // Submit attempt: checks attempts left, grades, stores best and attempts, pushes report
  function submitAttempt(container, quizId){
    const sess = AUTH.getSession(); if(!sess) return alert('Please login.');
    const open = AUTH.getQuizOpen();
    if(!open[quizId]) return alert('This quiz is currently closed by the administrator.');
    const scores = AUTH.getScores(sess.email);
    const current = scores[quizId] || {best:0,attempts:0};
    if(current.attempts >= MAX_ATTEMPTS) return alert('You have exhausted your attempts for this quiz.');

    // grade
    const percent = gradeAll(container);
    const attempts = (current.attempts || 0) + 1;
    const best = Math.max(current.best || 0, percent);
    scores[quizId] = { best, attempts };
    AUTH.setScores(sess.email, scores);

    // push report
    AUTH.pushReport({ email: sess.email, quizId, attempt: attempts, score: percent, best, ts: Date.now() });

    // update UI
    const attemptBadge = document.getElementById('attemptBadge');
    if(attemptBadge) attemptBadge.textContent = `${attempts}/${MAX_ATTEMPTS}`;
    const quizScoreEl = document.getElementById('quizScore'); if(quizScoreEl) quizScoreEl.textContent = `${percent}% (best ${best}%)`;

    // update global
    const global = LMS.globalPercentFor(sess.email);
    const globalEl = document.getElementById('globalScore'); if(globalEl) globalEl.textContent = `${global}%`;
    LMS.updateLinear('.linear', global); LMS.updateAnimated('.animated', global); LMS.updateCircular('.circular', global); LMS.updateStepper('.stepper', Math.round((global/100)*4));

    if(attempts >= MAX_ATTEMPTS){
      disableInputs(container);
      alert('You have used all attempts for this quiz.');
    } else {
      alert(`Attempt recorded: ${percent}% (attempt ${attempts}/${MAX_ATTEMPTS})`);
    }
  }

  function disableInputs(container){
    container.querySelectorAll('input, button, textarea').forEach(el => el.disabled = true);
  }

  // Initialize a quiz page: container: DOM element containing .question blocks, quizId: 'quiz1'|'quiz2'
  function initQuizPage(container, quizId){
    const sess = AUTH.getSession(); if(!sess) return location.href='./index.html';
    // check open
    const open = AUTH.getQuizOpen();
    if(!open[quizId]){
      container.innerHTML = '<div class="card"><strong>Quiz currently closed by admin.</strong></div>';
      return;
    }
    // wire live
    wireLive(container, quizId);
    // wire submit
    const submitBtn = document.getElementById('submitAttempt');
    if(submitBtn){
      submitBtn.addEventListener('click', ()=> submitAttempt(container, quizId));
    }
    // set initial attempts display
    const scores = AUTH.getScores(sess.email);
    const attempts = scores[quizId].attempts || 0;
    const attemptBadge = document.getElementById('attemptBadge'); if(attemptBadge) attemptBadge.textContent = `${attempts}/${MAX_ATTEMPTS}`;
    const quizScoreEl = document.getElementById('quizScore'); if(quizScoreEl) quizScoreEl.textContent = `${scores[quizId].best || 0}%`;

    // if exhausted attempts => disable
    if(attempts >= MAX_ATTEMPTS) disableInputs(container);
    // set initial progress global
    const global = LMS.globalPercentFor(sess.email);
    document.getElementById('globalScore') && (document.getElementById('globalScore').textContent = `${global}%`);
    LMS.updateLinear('.linear', global); LMS.updateAnimated('.animated', global); LMS.updateCircular('.circular', global); LMS.updateStepper('.stepper', Math.round((global/100)*4));
  }

  window.Quiz = { initQuizPage, gradeAll, updateLiveProgress }; // expose
})();
