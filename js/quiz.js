// js/quiz.js - handles quiz rendering, live feedback, attempts, scoring and admin report push
(function(){
  const MAX_ATTEMPTS = 3;

  // Collect .question blocks from a container
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

  // Evaluate one question and mark feedback
  function evaluateQuestion(q){
    const el = q.el;
    const type = q.type;
    const correct = q.answerRaw;
    const feedbackEl = el.querySelector('.feedback');
    if(feedbackEl) feedbackEl.textContent = '';
    el.querySelectorAll('.option').forEach(o=>o.classList.remove('correct','wrong'));

    if(type === 'radio'){
      const sel = el.querySelector('input[type="radio"]:checked');
      if(!sel) return null;
      const val = sel.value;
      if(val === correct){
        sel.closest('.option').classList.add('correct');
        if(feedbackEl) feedbackEl.textContent = 'Correct ✔';
        return true;
      } else {
        sel.closest('.option').classList.add('wrong');
        if(feedbackEl) feedbackEl.textContent = 'Incorrect ✖';
        return false;
      }
    } else if(type === 'multi'){
      const checked = Array.from(el.querySelectorAll('input[type="checkbox"]:checked')).map(i=>i.value).sort();
      const expected = (''+correct).split('|').filter(Boolean).sort();
      el.querySelectorAll('.option').forEach(opt=>{
        const v = opt.querySelector('input').value;
        if(expected.includes(v) && checked.includes(v)) opt.classList.add('correct');
        else if(checked.includes(v) && !expected.includes(v)) opt.classList.add('wrong');
      });
      const isSame = checked.join('|') === expected.join('|');
      if(feedbackEl) feedbackEl.textContent = isSame ? 'Correct ✔' : 'Incorrect ✖';
      return isSame;
    } else if(type === 'text'){
      const input = el.querySelector('input[type="text"]');
      const val = (input.value || '').trim().toLowerCase();
      const ok = val === (''+correct).trim().toLowerCase();
      if(feedbackEl) feedbackEl.textContent = ok ? 'Correct ✔' : 'Check answer ✖';
      return ok;
    }
    return null;
  }

  // Grade all questions in a container
  function gradeAll(container){
    const qs = collectQuestions(container);
    let correct = 0;
    qs.forEach(q=>{
      const res = evaluateQuestion(q);
      if(res === true) correct++;
    });
    return qs.length === 0 ? 0 : Math.round((correct/qs.length)*100);
  }

  // Wire live feedback events
  function wireLive(container, quizId, widgets){
    collectQuestions(container).forEach(q=>{
      if(q.type === 'text'){
        const input = q.el.querySelector('input[type="text"]');
        if(input) input.addEventListener('input', ()=>{
          evaluateQuestion(q);
          updateLiveProgress(container, quizId, widgets);
        });
      } else {
        q.el.querySelectorAll('input').forEach(i=>{
          i.addEventListener('change', ()=>{
            evaluateQuestion(q);
            updateLiveProgress(container, quizId, widgets);
          });
        });
      }
    });
  }

  // Update progress display
  function updateLiveProgress(container, quizId, widgets){
    const sess = AUTH.getSession();
    if(!sess) return;

    const thisQuizPercent = gradeAll(container);
    if(widgets.livePotential) widgets.livePotential.textContent = `${thisQuizPercent}% (this attempt)`;

    const scores = AUTH.getScores(sess.email);
    const q1 = quizId === 'quiz1' ? thisQuizPercent : scores.quiz1?.best || 0;
    const q2 = quizId === 'quiz2' ? thisQuizPercent : scores.quiz2?.best || 0;
    const q3 = quizId === 'quiz3' ? thisQuizPercent : scores.quiz3?.best || 0;
    const global = Math.round((q1*0.4)+(q2*0.3)+(q3*0.3));

    LMS.updateLinear('.linear', global);
    LMS.updateAnimated('.animated', global);
    LMS.updateCircular('.circular', global);
    LMS.updateStepper('.stepper', Math.round((global/100)*4));
    if(widgets.globalScore) widgets.globalScore.textContent = `${global}%`;
  }

  // Submit attempt
  function submitAttempt(container, quizId, widgets){
    const sess = AUTH.getSession(); 
    if(!sess) return alert('Please login.');
    const open = AUTH.getQuizOpen();
    if(!open[quizId]) return alert('This quiz is currently closed by the administrator.');

    const scores = AUTH.getScores(sess.email);
    const current = scores[quizId] || {best:0, attempts:0};
    if(current.attempts >= MAX_ATTEMPTS) return alert('You have exhausted your attempts for this quiz.');

    const percent = gradeAll(container);
    const attempts = (current.attempts||0)+1;
    const best = Math.max(current.best||0, percent);
    scores[quizId] = {best, attempts};
    AUTH.setScores(sess.email, scores);
    AUTH.pushReport({ email:sess.email, quizId, attempt:attempts, score:percent, best, ts:Date.now() });

    if(widgets.attemptBadge) widgets.attemptBadge.textContent = `${attempts}/${MAX_ATTEMPTS}`;
    if(widgets.quizScore) widgets.quizScore.textContent = `${percent}% (best ${best}%)`;

    const global = LMS.globalPercentFor(sess.email);
    if(widgets.globalScore) widgets.globalScore.textContent = `${global}%`;
    LMS.updateLinear('.linear', global);
    LMS.updateAnimated('.animated', global);
    LMS.updateCircular('.circular', global);
    LMS.updateStepper('.stepper', Math.round((global/100)*4));

    if(attempts >= MAX_ATTEMPTS){
      disableInputs(container);
      alert('You have used all attempts for this quiz.');
    } else {
      alert(`Attempt recorded: ${percent}% (attempt ${attempts}/${MAX_ATTEMPTS})`);
    }
  }

  function disableInputs(container){
    container.querySelectorAll('input, button, textarea').forEach(el=>el.disabled=true);
  }

  // Initialize quiz in a container
  function initQuizPage(container, quizId){
    const sess = AUTH.getSession(); 
    if(!sess) return location.href='./index.html';

    const open = AUTH.getQuizOpen();
    if(!open[quizId]){
      container.innerHTML = '<div class="card"><strong>Quiz currently closed by admin.</strong></div>';
      return;
    }

    const root = container.closest('main') || document;
    const widgets = {
      submitBtn: root.querySelector('.submitAttempt'),
      attemptBadge: root.querySelector('.attemptBadge'),
      quizScore: root.querySelector('.quizScore'),
      globalScore: root.querySelector('.globalScore'),
      livePotential: root.querySelector('.livePotential')
    };

    wireLive(container, quizId, widgets);

    if(widgets.submitBtn){
      widgets.submitBtn.addEventListener('click', ()=>submitAttempt(container, quizId, widgets));
    }

    const scores = AUTH.getScores(sess.email);
    const attempts = scores[quizId]?.attempts || 0;
    if(widgets.attemptBadge) widgets.attemptBadge.textContent = `${attempts}/${MAX_ATTEMPTS}`;
    if(widgets.quizScore) widgets.quizScore.textContent = `${scores[quizId]?.best||0}%`;

    if(attempts >= MAX_ATTEMPTS) disableInputs(container);

    const global = LMS.globalPercentFor(sess.email);
    if(widgets.globalScore) widgets.globalScore.textContent = `${global}%`;
    LMS.updateLinear('.linear', global);
    LMS.updateAnimated('.animated', global);
    LMS.updateCircular('.circular', global);
    LMS.updateStepper('.stepper', Math.round((global/100)*4));
  }

  window.Quiz = { initQuizPage, gradeAll, updateLiveProgress };
})();
