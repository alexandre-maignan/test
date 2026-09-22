const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- cursor ---------- */
function initCursor(){
  if(reduced){ document.querySelector('.cursor').style.display='none'; return; }
  gsap.set('.cursor',{xPercent:-50,yPercent:-50});
  const cx = gsap.quickTo('.cursor','x',{duration:.6,ease:'power3'});
  const cy = gsap.quickTo('.cursor','y',{duration:.6,ease:'power3'});
  window.addEventListener('mousemove', e=>{cx(e.clientX); cy(e.clientY);});
}

/* ---------- loader (first load only) ---------- */
function initLoader(){
  const loader = document.getElementById('loader');
  if(!loader) return;
  if(sessionStorage.getItem('oblique-loaded')){ loader.remove(); return; }
  sessionStorage.setItem('oblique-loaded','1');
  const bar = loader.querySelector('.bar');
  const mark = loader.querySelector('.mark');
  gsap.timeline({defaults:{ease:'power4.inOut'}})
    .to(bar,{scaleX:1,duration:1.1})
    .to(mark,{opacity:1,duration:.5},'<')
    .to(loader,{autoAlpha:0,duration:.6,onComplete:()=>loader.remove()},'+=.2');
}

/* ---------- per-page widgets ---------- */
function numberWork(root=document){
  root.querySelectorAll('[data-worklist]').forEach(list=>{
    list.querySelectorAll('[data-work-item]').forEach((item,i)=>{
      item.querySelector('.work-idx').textContent = '['+String(i+1).padStart(2,'0')+']';
    });
  });
}
function initTabs(root=document){
  const btns = root.querySelectorAll('.tab-btn');
  btns.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      btns.forEach(b=>b.classList.remove('active'));
      root.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
      btn.classList.add('active');
      root.querySelector(`[data-panel="${btn.dataset.tab}"]`).classList.add('active');
    });
  });
}
let clockTimer;
function initClock(root=document){
  clearInterval(clockTimer);
  const el = root.querySelector('[data-clock]');
  if(!el) return;
  const fmt = new Intl.DateTimeFormat([], {timeZone:'Australia/Sydney', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false});
  const set = ()=> el.textContent = fmt.format(new Date());
  set(); clockTimer = setInterval(set,1000);
}
function initPage(root=document){
  numberWork(root);
  initTabs(root);
  initClock(root);
}

/* ---------- nav active state ---------- */
function currentFile(){
  return location.pathname.split('/').pop() || 'index.html';
}
function setActiveLink(){
  const file = currentFile();
  document.querySelectorAll('.links a').forEach(a=>{
    a.classList.toggle('is-current', a.getAttribute('href') === file);
  });
}

/* ---------- transition router (fetches real, separate .html pages) ---------- */
let navigating = false;

async function navigateTo(url){
  if(navigating || url === currentFile()) return;
  navigating = true;

  let html;
  try{
    const res = await fetch(url, {cache:'no-store'});
    if(!res.ok) throw new Error('HTTP '+res.status);
    html = await res.text();
  }catch(err){
    location.href = url; // fallback: plain navigation (e.g. blocked fetch, running from file://)
    return;
  }

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const parsedMain = doc.querySelector('main[data-barba]');
  const liveMain = document.querySelector('main[data-barba]');
  if(!parsedMain || !liveMain){ location.href = url; return; }
  const nextMain = document.adoptNode(parsedMain);

  history.pushState({}, '', url);
  document.title = doc.title;

  const settle = ()=>{
    liveMain.remove();
    gsap.set(nextMain, {clearProps:'position,top,left,width,height,overflow,background,zIndex,clipPath'});
    afterSwap(nextMain);
    navigating = false;
  };

  if(reduced){
    document.body.appendChild(nextMain);
    settle();
    return;
  }

  // While it wipes in, the incoming page is a fixed full-viewport layer:
  // this keeps the clip-path percentages relative to the visible window
  // instead of the (possibly much taller) page content.
  gsap.set(nextMain, {
    position:'fixed', top:0, left:0, width:'100%', height:'100vh',
    overflow:'hidden', zIndex:10, background:'var(--bg)',
    clipPath:'polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)'
  });
  document.body.appendChild(nextMain);

  gsap.timeline({defaults:{duration:1.1, ease:'power4.inOut'}, onComplete:settle})
    .to(liveMain, {yPercent:-100, overwrite:'auto'}, 0)
    .fromTo(nextMain, {clipPath:'polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)'},
                        {clipPath:'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', overwrite:'auto'}, 0);
}

function initRouter(){
  if(!document.querySelector('main[data-barba]')) return;

  document.body.addEventListener('click', (e)=>{
    const a = e.target.closest('a[data-link]');
    if(!a) return;
    const url = a.getAttribute('href');
    if(!url || url.startsWith('#') || url.startsWith('http') || a.target === '_blank') return;
    e.preventDefault();
    navigateTo(url);
  });

  window.addEventListener('popstate', ()=> location.reload());
}
function afterSwap(nextMain, url){
  setActiveLink();
  initPage(nextMain);
  window.scrollTo(0,0);
}

/* ---------- init ---------- */
initCursor();
initLoader();
setActiveLink();
initPage();
initRouter();
