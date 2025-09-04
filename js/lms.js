// js/lms.js - shared helpers for progress widgets and small utilities
const LMS = (function(){
  function updateLinear(selector, percent){
    const el = document.querySelector(selector);
    if(!el) return;
    const bar = el.querySelector('.bar');
    if(bar) bar.style.width = `${Math.max(0,Math.min(100,percent))}%`;
    el.setAttribute('aria-valuenow', String(Math.round(percent)));
  }

  function updateCircular(selector, percent){
    const wrap = document.querySelector(selector);
    if(!wrap) return;
    const circle = wrap.querySelector('circle.progress-fill');
    if(!circle) return;
    const r = parseFloat(circle.getAttribute('r'));
    const c = 2 * Math.PI * r;
    circle.style.strokeDasharray = String(c);
    circle.style.strokeDashoffset = String(c * (1 - Math.max(0,Math.min(100,percent))/100));
    const label = wrap.querySelector('.value');
    if(label) label.textContent = `${Math.round(percent)}%`;
  }

  function updateStepper(containerSelector, completedSteps, total=4){
    const cont = document.querySelector(containerSelector);
    if(!cont) return;
    cont.innerHTML = '';
    for(let i=1;i<=total;i++){
      const div = document.createElement('div');
      div.className = 'step' + (i<=completedSteps ? ' done' : '');
      div.textContent = `Step ${i}`;
      cont.appendChild(div);
    }
  }

  function updateAnimated(selector, percent){
    const el = document.querySelector(selector);
    if(!el) return;
    const runner = el.querySelector('.runner');
    if(runner) runner.style.width = `${Math.max(0,Math.min(100,percent))}%`;
  }

  function globalPercentFor(email){
    const s = AUTH.getScores(email);
    if(!s) return 0;
    return Math.round(( (s.quiz1?.best||0) * 0.4 + (s.quiz2?.best||0) * 0.3 + (s.quiz3?.best||0) * 0.3 ));
  }

  return { updateLinear, updateCircular, updateStepper, updateAnimated, globalPercentFor };
})();
