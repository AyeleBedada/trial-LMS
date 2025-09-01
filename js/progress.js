// js/progress.js
// Helpers to update progress widgets and stepper with checkmarks
export const Progress = (function(){
  function clamp(v){ return Math.max(0, Math.min(100, Math.round(v))); }

  function updateLinear(selector, percent){
    const el = document.querySelector(selector);
    if(!el) return;
    const bar = el.querySelector('.bar') || el;
    bar.style.width = clamp(percent) + '%';
    el.setAttribute('aria-valuenow', String(clamp(percent)));
  }

  function updateAnimated(selector, percent){
    const el = document.querySelector(selector);
    if(!el) return;
    const runner = el.querySelector('.runner');
    if(runner) runner.style.width = clamp(percent) + '%';
  }

  function updateCircular(wrapperSelector, percent){
    const wrap = document.querySelector(wrapperSelector);
    if(!wrap) return;
    const circle = wrap.querySelector('circle.progress-fill');
    if(!circle) return;
    const r = parseFloat(circle.getAttribute('r'));
    const c = 2 * Math.PI * r;
    circle.style.strokeDasharray = String(c);
    circle.style.strokeDashoffset = String(c * (1 - clamp(percent)/100));
    const label = wrap.querySelector('.value');
    if(label) label.textContent = `${clamp(percent)}%`;
  }

  // stepNames: array of step labels; completedSteps: integer count
  function renderStepper(containerSelector, stepNames, completedSteps){
    const c = document.querySelector(containerSelector);
    if(!c) return;
    c.innerHTML = '';
    stepNames.forEach((name, idx) => {
      const step = document.createElement('div');
      step.className = 'step' + (idx < completedSteps ? ' done' : '') + (idx === completedSteps ? ' active' : '');
      step.setAttribute('aria-current', idx === completedSteps ? 'step' : 'false');
      step.innerHTML = `<span class="step-label">${name}</span>${idx < completedSteps ? ' <span class="check">✔</span>' : ''}`;
      c.appendChild(step);
    });
  }

  return { updateLinear, updateCircular, updateAnimated, renderStepper, clamp };
})();
