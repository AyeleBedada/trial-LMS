/* js/progress.js
   Helpers to update various progress widgets:
   - linear bar (.linear .bar)
   - circular (svg circle stroke-dashoffset)
   - stepper (.step elements)
   - animated runner (.animated .runner)
*/

const PROGRESS = (function(){

  /* UPDATE linear bar by selector and percentage 0..100 */
  function updateLinear(selector, percent){
    const el = document.querySelector(selector);
    if(!el) return;
    const bar = el.querySelector('.bar');
    if(bar) bar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
    // update aria
    el.setAttribute('aria-valuenow', String(Math.round(percent)));
  }

  /* UPDATE circular widget inside container selector
     Expects an SVG with a circle.ring (background) and circle.fill (front)
  */
  function updateCircular(selector, percent){
    const wrap = document.querySelector(selector);
    if(!wrap) return;
    const circle = wrap.querySelector('circle.fill');
    if(!circle) return;
    const r = parseFloat(circle.getAttribute('r'));
    const c = 2 * Math.PI * r;
    const offset = c * (1 - Math.max(0, Math.min(100, percent))/100);
    circle.style.strokeDasharray = String(c);
    circle.style.strokeDashoffset = String(offset);
    const label = wrap.querySelector('.value');
    if(label) label.textContent = `${Math.round(percent)}%`;
  }

  /* UPDATE stepper: steps have class 'step' and data-step index 1..N
     completedCount (integer)
  */
  function updateStepper(containerSelector, completedCount){
    const cont = document.querySelector(containerSelector);
    if(!cont) return;
    const steps = Array.from(cont.querySelectorAll('.step'));
    steps.forEach((s,i)=>{
      s.classList.toggle('done', i < completedCount);
      s.classList.toggle('active', i === completedCount);
    });
  }

  /* UPDATE animated runner width */
  function updateAnimated(selector, percent){
    const cont = document.querySelector(selector);
    if(!cont) return;
    const runner = cont.querySelector('.runner');
    if(runner) runner.style.width = `${Math.max(0, Math.min(100, percent))}%`;
  }

  return { updateLinear, updateCircular, updateStepper, updateAnimated };
})();
